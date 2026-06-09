import React, { useState, useEffect, useRef } from "react";

const EMOJI_PRESETS = [
  "🥩",
  "🍗",
  "🍚",
  "🍞",
  "🥗",
  "🍎",
  "🥪",
  "🍜",
  "🍔",
  "🍕",
  "☕",
  "🥛",
  "🥚",
  "🍰",
  "🥑",
  "🧀",
  "🐟",
  "🍣",
];

interface EmojiEditorProps {
  initialEmoji: string;
  onSave: (newEmoji: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function EmojiEditor({
  initialEmoji,
  onSave,
  className = "",
  disabled = false,
}: EmojiEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <span
        className={`select-none cursor-pointer hover:scale-110 transition-transform block ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        title={disabled ? undefined : "아이콘 이모지 변경"}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
      >
        {initialEmoji}
      </span>

      {isOpen && (
        <div
          className="absolute z-[999] top-full mt-1 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 shadow-xl rounded-xl p-2 w-48 flex flex-wrap gap-1 slide-in-from-top-2 animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full text-[10px] font-bold text-neutral-400 dark:text-slate-500 mb-1 px-1">
            이모지 변경
          </div>
          {EMOJI_PRESETS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="w-7 h-7 flex items-center justify-center text-sm rounded bg-neutral-50 dark:bg-slate-700/50 hover:bg-neutral-200 dark:hover:bg-slate-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onSave(emoji);
                setIsOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
