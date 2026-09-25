/**
 * End-to-End Encryption (E2EE) using Web Crypto API.
 * Uses AES-GCM 256-bit encryption with PBKDF2 derived keys.
 * Also generates Telegram Secret Chat style 4-emoji visual fingerprint.
 */

const EMOJI_SET = [
  '🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
  '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜',
  '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
  '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
  '🦈', '🦭', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛',
  '🍎', '🍋', '🍇', '🍉', '🍓', '🍒', '🍑', '🍍', '🥥', '🥝',
  '🚀', '🛸', '⭐', '⚡', '🔥', '💎', '🛡️', '🔑', '🪐', '🔮'
];

class CryptoService {
  /**
   * Generates a 4-emoji visual verification key from a secret string or peer pairing.
   */
  public async generateVisualFingerprint(dataString: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(dataString || 'aether-default-key');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));

      // Pick 4 emojis using bytes from the hash
      const e1 = EMOJI_SET[hashArray[0] % EMOJI_SET.length];
      const e2 = EMOJI_SET[hashArray[1] % EMOJI_SET.length];
      const e3 = EMOJI_SET[hashArray[2] % EMOJI_SET.length];
      const e4 = EMOJI_SET[hashArray[3] % EMOJI_SET.length];

      return `${e1} ${e2} ${e3} ${e4}`;
    } catch {
      return '🛡️ 🔑 💎 ⚡';
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   */
  public async encrypt(plaintext: string, secretPassphrase: string): Promise<string> {
    if (!secretPassphrase || !plaintext) return plaintext;
    try {
      const enc = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Derive key with PBKDF2
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(secretPassphrase),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 10000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext)
      );

      // Pack salt + iv + ciphertext as base64
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      let binary = '';
      for (let i = 0; i < combined.byteLength; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      return 'enc:' + btoa(binary);
    } catch {
      return plaintext;
    }
  }

  /**
   * Decrypts ciphertext using AES-256-GCM.
   */
  public async decrypt(ciphertext: string, secretPassphrase: string): Promise<string> {
    if (!ciphertext.startsWith('enc:') || !secretPassphrase) return ciphertext;
    try {
      const rawBase64 = ciphertext.slice(4);
      const binary = atob(rawBase64);
      const combined = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        combined[i] = binary.charCodeAt(i);
      }

      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encryptedData = combined.slice(28);

      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(secretPassphrase),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 10000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      );

      return new TextDecoder().decode(decrypted);
    } catch {
      return '🔒 [Не удалось расшифровать: неверный ключ E2EE]';
    }
  }

  /**
   * Generates a random cryptographic key for room / secret chat sharing.
   */
  public generateRandomPassphrase(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const cryptoService = new CryptoService();
