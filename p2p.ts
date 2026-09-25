import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { P2PStats, UserProfile } from '../types';

export type P2PEventType =
  | 'message'
  | 'message_ack'
  | 'reaction'
  | 'pin'
  | 'delete'
  | 'typing'
  | 'soundboard'
  | 'peer_join'
  | 'peer_leave'
  | 'stats_update'
  | 'incoming_call'
  | 'signaling_state'
  | 'handshake_progress';

export interface P2PPacket {
  type: string;
  senderId: string;
  senderName: string;
  payload: unknown;
  timestamp: number;
}

class P2PManager {
  private peer: Peer | null = null;
  private myPeerId = '';
  private connections: Map<string, DataConnection> = new Map();
  private activeCalls: Map<string, MediaConnection> = new Map();
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private localStream: MediaStream | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private pingInterval: number | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private isReconnecting = false;
  private cachedProfile: UserProfile | null = null;
  private cachedStunServers: string[] = [];

  private currentStats: P2PStats = {
    peerId: '',
    connected: false,
    iceState: 'disconnected',
    rtt: 0,
    packetLoss: 0,
    bytesSent: 0,
    bytesReceived: 0,
    connectionType: 'disconnected',
    candidateType: 'unknown',
  };

  constructor() {
    try {
      this.broadcastChannel = new BroadcastChannel('aether_p2p_local_mesh');
      this.broadcastChannel.onmessage = (event) => {
        this.handleIncomingPacket(event.data, 'broadcast');
      };
    } catch {}
  }

  public getMyPeerId(): string {
    return this.myPeerId;
  }

  public getStats(): P2PStats {
    return { ...this.currentStats, peerId: this.myPeerId };
  }

  /**
   * Schedule reconnection to the signaling server with exponential backoff and jitter.
   */
  private scheduleSignalingReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    this.currentStats.connected = false;
    this.currentStats.iceState = 'disconnected';
    this.emit('stats_update', this.getStats());

    // Exponential backoff: 1s, 2s, 4s, 8s, up to 12s + random jitter
    const delay = Math.min(1000 * Math.pow(1.8, this.reconnectAttempt), 12000) + Math.random() * 400;
    this.reconnectAttempt++;

    this.emit('signaling_state', {
      state: 'reconnecting',
      attempt: this.reconnectAttempt,
      delayMs: delay,
    });

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(async () => {
      try {
        if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
          this.peer.reconnect();
        } else if (this.cachedProfile) {
          await this.init(this.cachedProfile, this.cachedStunServers, false);
        }
      } catch (err) {
        console.warn('Signaling handshake retry failed, will back off further:', err);
      } finally {
        this.isReconnecting = false;
      }
    }, delay);
  }

  /**
   * Initialize PeerJS client with Google STUN servers and exponential backoff retry.
   */
  public async init(profile: UserProfile, stunServers: string[], resetAttempts = true): Promise<string> {
    this.cachedProfile = profile;
    this.cachedStunServers = stunServers;

    if (resetAttempts) {
      this.reconnectAttempt = 0;
    }

    if (this.peer && !this.peer.destroyed && !this.peer.disconnected) {
      return this.myPeerId;
    }

    // Generate stable or random Peer ID
    let savedId = profile.id;
    if (!savedId) {
      savedId = 'p2p_' + Math.random().toString(36).substring(2, 10);
    }
    this.myPeerId = savedId;
    this.currentStats.peerId = savedId;

    const iceServers =
      stunServers && stunServers.length > 0
        ? stunServers.map((url) => ({ urls: url }))
        : [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
          ];

    return new Promise((resolve) => {
      let resolved = false;

      const safeResolve = (id: string) => {
        if (!resolved) {
          resolved = true;
          resolve(id);
        }
      };

      try {
        if (this.peer && !this.peer.destroyed) {
          this.peer.destroy();
        }

        const peer = new Peer(savedId, {
          debug: 1,
          config: {
            iceServers,
            iceCandidatePoolSize: 10,
          },
        });

        peer.on('open', (id) => {
          this.myPeerId = id;
          this.currentStats.peerId = id;
          this.currentStats.connected = true;
          this.currentStats.connectionType = 'webrtc-direct';
          this.reconnectAttempt = 0;
          this.isReconnecting = false;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          this.startPingMonitor();
          this.emit('signaling_state', { state: 'connected', peerId: id });
          safeResolve(id);
        });

        peer.on('connection', (conn) => {
          this.setupDataConnection(conn);
        });

        peer.on('call', (call) => {
          this.activeCalls.set(call.peer, call);
          this.emit('incoming_call', {
            call,
            peerId: call.peer,
            metadata: call.metadata,
          });
        });

        peer.on('disconnected', () => {
          console.info('PeerJS signaling connection disconnected. Scheduling backoff reconnection...');
          this.scheduleSignalingReconnect();
        });

        peer.on('close', () => {
          this.currentStats.connected = false;
          this.emit('signaling_state', { state: 'closed' });
        });

        peer.on('error', (err: any) => {
          const errType = err?.type;

          // If ID is already taken, generate new ID
          if (errType === 'unavailable-id') {
            const newId = 'p2p_' + Math.random().toString(36).substring(2, 10);
            this.myPeerId = newId;
            this.peer = null;
            this.init({ ...profile, id: newId }, stunServers).then(safeResolve);
            return;
          }

          // Transient socket or network drop - handle with backoff
          if (
            errType === 'socket-error' ||
            errType === 'socket-closed' ||
            errType === 'server-error' ||
            errType === 'network' ||
            errType === 'disconnected'
          ) {
            this.scheduleSignalingReconnect();
            // Provide current peer ID as fallback so UI remains functional
            safeResolve(this.myPeerId);
          }
        });

        this.peer = peer;
      } catch {
        // Fallback to local mesh BroadcastChannel
        this.currentStats.connectionType = 'broadcast-channel';
        safeResolve(this.myPeerId);
      }
    });
  }

  /**
   * Connect to another peer by Peer ID with exponential backoff retry.
   */
  public async connectToPeer(
    targetPeerId: string,
    myProfile: UserProfile,
    maxRetries = 3,
    onProgress?: (attempt: number, maxRetries: number, delayMs: number) => void
  ): Promise<boolean> {
    if (!targetPeerId || targetPeerId === this.myPeerId) return false;

    const existing = this.connections.get(targetPeerId);
    if (existing && existing.open) return true;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Ensure signaling connection is active
      if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
        try {
          this.peer.reconnect();
          await new Promise((r) => setTimeout(r, 600));
        } catch {}
      }

      this.emit('handshake_progress', {
        targetPeerId,
        attempt,
        maxRetries,
        status: 'connecting',
      });

      const success = await this.attemptDataHandshake(targetPeerId, myProfile);
      if (success) {
        this.emit('handshake_progress', {
          targetPeerId,
          attempt,
          maxRetries,
          status: 'connected',
        });
        return true;
      }

      if (attempt < maxRetries) {
        // Exponential backoff delay with jitter
        const delay = Math.min(1000 * Math.pow(1.8, attempt - 1), 6000) + Math.random() * 300;
        this.emit('handshake_progress', {
          targetPeerId,
          attempt,
          maxRetries,
          delayMs: delay,
          status: 'retrying',
        });
        if (onProgress) {
          onProgress(attempt + 1, maxRetries, delay);
        }
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    this.emit('handshake_progress', {
      targetPeerId,
      attempt: maxRetries,
      maxRetries,
      status: 'failed',
    });
    return false;
  }

  /**
   * Internal single attempt at WebRTC DataConnection handshake with timeout.
   */
  private attemptDataHandshake(targetPeerId: string, myProfile: UserProfile): Promise<boolean> {
    const currentPeer = this.peer;
    if (!currentPeer || currentPeer.destroyed) return Promise.resolve(false);

    return new Promise((resolve) => {
      let settled = false;
      let timer: number | null = null;

      const finish = (ok: boolean) => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          resolve(ok);
        }
      };

      try {
        const conn = currentPeer.connect(targetPeerId, {
          reliable: true,
          metadata: {
            name: myProfile.displayName,
            avatarColor: myProfile.avatarColor,
            username: myProfile.username,
            badges: myProfile.badges,
          },
        });

        conn.on('open', () => {
          this.setupDataConnection(conn);
          this.emit('peer_join', { peerId: targetPeerId, name: conn.metadata?.name || targetPeerId });
          finish(true);
        });

        conn.on('close', () => {
          finish(false);
        });

        conn.on('error', () => {
          finish(false);
        });

        // 7-second handshake negotiation timeout
        timer = window.setTimeout(() => {
          if (!conn.open) {
            finish(false);
          }
        }, 7000);
      } catch {
        finish(false);
      }
    });
  }

  private setupDataConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on('open', () => {
      this.currentStats.connected = true;
      this.currentStats.iceState = 'connected';
      this.currentStats.candidateType = 'srflx';
      this.emit('stats_update', this.getStats());
      this.emit('peer_join', { peerId: conn.peer, name: conn.metadata?.name || conn.peer });
    });

    conn.on('data', (data) => {
      this.currentStats.bytesReceived += JSON.stringify(data).length;
      this.handleIncomingPacket(data as P2PPacket, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.emit('peer_leave', { peerId: conn.peer });
      if (this.connections.size === 0) {
        this.currentStats.connected = false;
        this.currentStats.iceState = 'disconnected';
      }
      this.emit('stats_update', this.getStats());
    });

    conn.on('error', () => {
      this.connections.delete(conn.peer);
    });
  }

  /**
   * Broadcast or send packet to a specific peer or all peers.
   */
  public sendPacket(type: string, payload: unknown, targetPeerId?: string): void {
    const packet: P2PPacket = {
      type,
      senderId: this.myPeerId,
      senderName: '',
      payload,
      timestamp: Date.now()
    };

    const str = JSON.stringify(packet);
    this.currentStats.bytesSent += str.length;

    // Send through WebRTC DataChannels
    if (targetPeerId && this.connections.has(targetPeerId)) {
      const conn = this.connections.get(targetPeerId);
      if (conn && conn.open) {
        conn.send(packet);
      }
    } else {
      this.connections.forEach((conn) => {
        if (conn.open) conn.send(packet);
      });
    }

    // Also mirror to BroadcastChannel for local tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch {}
    }
  }

  private handleIncomingPacket(packet: unknown, source: string) {
    if (!packet || typeof packet !== 'object') return;
    const p = packet as P2PPacket;

    // Ignore self packets from BroadcastChannel
    if (p.senderId === this.myPeerId) return;

    if (p.type === 'ping') {
      // Respond with pong
      this.sendPacket('pong', { originalTimestamp: (p.payload as { t: number })?.t || p.timestamp }, p.senderId);
      return;
    }

    if (p.type === 'pong') {
      const orig = (p.payload as { originalTimestamp: number })?.originalTimestamp;
      if (orig) {
        const rtt = Math.max(1, Date.now() - orig);
        this.currentStats.rtt = rtt;
        this.currentStats.packetLoss = 0; // SCTP is lossless
        this.emit('stats_update', this.getStats());
      }
      return;
    }

    this.emit(p.type, { ...p, source });
  }

  private startPingMonitor() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = window.setInterval(() => {
      if (this.connections.size > 0) {
        this.sendPacket('ping', { t: Date.now() });
      }
    }, 4000);
  }

  // --- Voice / Video Calls ---

  public async startCall(targetPeerId: string, stream: MediaStream, isVideo: boolean): Promise<MediaConnection | null> {
    if (!this.peer || !targetPeerId) return null;
    this.localStream = stream;

    try {
      const call = this.peer.call(targetPeerId, stream, {
        metadata: { isVideo }
      });
      this.activeCalls.set(targetPeerId, call);
      return call;
    } catch {
      return null;
    }
  }

  public endCall(targetPeerId?: string) {
    if (targetPeerId && this.activeCalls.has(targetPeerId)) {
      this.activeCalls.get(targetPeerId)?.close();
      this.activeCalls.delete(targetPeerId);
    } else {
      this.activeCalls.forEach(call => call.close());
      this.activeCalls.clear();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
  }

  // --- Event Emitter ---

  public on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(fn => {
        try {
          fn(data);
        } catch {}
      });
    }
  }

  public destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.endCall();
    this.connections.forEach(c => c.close());
    this.connections.clear();
    this.peer?.destroy();
    this.broadcastChannel?.close();
  }
}

export const p2pService = new P2PManager();
