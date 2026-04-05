import { useState, useEffect } from "react";

interface Props {
  onSelect: (id: string) => void;
  locomotives: Array<{ locomotive_id: string; health_index: number | null; hi_category: string }>;
}

export default function BookmarkBar({ onSelect, locomotives }: Props) {
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = localStorage.getItem("bookmarks");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  const toggle = (id: string) => {
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const pinned = locomotives.filter((l) => bookmarks.includes(l.locomotive_id));

  if (pinned.length === 0) return null;

  return (
    <div className="bookmark-bar">
      <span className="bookmark-label">★ Закреплённые:</span>
      {pinned.map((l) => (
        <button
          key={l.locomotive_id}
          className={`bookmark-chip ${l.hi_category}`}
          onClick={() => onSelect(l.locomotive_id)}
        >
          {l.locomotive_id} ({l.health_index ?? "—"})
        </button>
      ))}
    </div>
  );
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = localStorage.getItem("bookmarks");
    return saved ? JSON.parse(saved) : [];
  });

  const toggle = (id: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id];
      localStorage.setItem("bookmarks", JSON.stringify(next));
      return next;
    });
  };

  const isBookmarked = (id: string) => bookmarks.includes(id);

  return { bookmarks, toggle, isBookmarked };
}
