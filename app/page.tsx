"use client";
import InfiniteCanvas from "@/components/infiniteCanvas";
import SearchBox from "@/components/searchBox";
import { useEffect, useState } from "react";
export default function Home() {
  const [showMenu, setshowMenu] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setshowMenu((prev) => !prev);
      }
      if (e.key == "Escape") {
        setshowMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="h-screen w-screen">
      {showMenu && <SearchBox onClose={() => setshowMenu(false)} />}
      <InfiniteCanvas>
        <div className="absolute w-max text-gray-400">
          Press Ctrl +K for menu
        </div>
      </InfiniteCanvas>
    </div>
  );
}
