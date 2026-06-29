"use client";
import InfiniteCanvas from "@/components/infiniteCanvas";
import SearchBox from "@/components/searchBox";
import { useCanvasStore } from "@/components/serverComponents/usecanvasstore";
import { useEffect, useState } from "react";
export default function Home() {
  
  const [showMenu, setshowMenu] = useState(false);
  const [started, setStarted] = useState(false);
  const elements = useCanvasStore((s) => s.elements);

  useEffect(() => {
    setStarted(elements.length > 0);
  }, [elements.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setshowMenu((prev) => !prev);
      }
      if (e.key === "Escape") {
        setshowMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen">
      {showMenu && <SearchBox onClose={() => setshowMenu(false)} />}
      <InfiniteCanvas>
        <div className="absolute w-max text-gray-400">
          {!started && <p>Press Ctrl+K for menu</p>}
        </div>
      </InfiniteCanvas>
    </div>
  );
}
