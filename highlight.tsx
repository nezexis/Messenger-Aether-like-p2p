import React from 'react';

/**
 * Highlights occurrences of `query` within `text` with a sleek iOS glass highlight mark.
 */
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !query.trim()) {
    return text;
  }

  const trimmedQuery = query.trim();
  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length <= 1) {
    return text;
  }

  return (
    <span>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === trimmedQuery.toLowerCase();
        if (isMatch) {
          return (
            <mark
              key={index}
              className="bg-sky-400/40 text-sky-100 rounded-[3px] px-0.5 py-0 font-bold shadow-xs not-italic"
            >
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
