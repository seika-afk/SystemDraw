"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Square, Type } from "lucide-react";
import { useCanvasStore } from "./serverComponents/usecanvasstore";

interface Item {
  label: string;
  shape: "rectangle" | "text";
}

const ITEMS: Item[] = [
  { label: "Rectangle", shape: "rectangle" },
  { label: "Text", shape: "text" },
];

function ItemIcon({ item, active }: { item: Item; active: boolean }) {
  const color = active ? "#B7ADCF" : "#555";
  if (item.shape === "rectangle") return <Square size={15} style={{ color }} />;
  return <Type size={15} style={{ color }} />;
}

export default function SearchBox({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setTool } = useCanvasStore();

  const results = ITEMS.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function handleSelect(item: Item) {
    setTool(item.shape);
    onClose?.();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown")
        setActive((a) => Math.min(a + 1, results.length - 1));
      if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter") handleSelect(results[active]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, active, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-[480px] rounded-xl overflow-hidden bg-[#1c1c1c] border border-[#2e2e2e]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2e2e2e]">
          <Search size={15} className="text-[#555] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shapes..."
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-[#555]"
          />
          <kbd
            onClick={onClose}
            className="text-[11px] text-[#555] bg-[#2a2a2a] border border-[#3a3a3a] rounded px-1.5 py-0.5 font-mono cursor-pointer"
          >
            ESC
          </kbd>
        </div>

        <div className="p-1.5">
          {results.length === 0 ? (
            <p className="text-sm text-[#555] text-center py-6">
              No results for "{query}"
            </p>
          ) : (
            results.map((item, i) => (
              <div
                key={item.label}
                onMouseEnter={() => setActive(i)}
                onClick={() => handleSelect(item)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  active === i ? "bg-white/5" : ""
                }`}
              >
                <ItemIcon item={item} active={active === i} />
                <span
                  className={`text-sm ${active === i ? "text-white" : "text-[#aaa]"}`}
                >
                  {item.label}
                </span>
                {active === i && (
                  <span className="ml-auto text-[11px] text-[#B7ADCF]">↵</span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3 px-4 py-2 border-t border-[#2e2e2e]">
          {[
            ["↑↓", "navigate"],
            ["↵", "select"],
          ].map(([key, label]) => (
            <span
              key={key}
              className="flex items-center gap-1.5 text-[11px] text-[#555]"
            >
              <kbd className="bg-[#2a2a2a] border border-[#3a3a3a] rounded px-1 py-0.5 font-mono">
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
