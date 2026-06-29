"use client";
import { useRef, useState, useEffect } from "react";
import {
  useCanvasStore,
  computeMetrics,
} from "./serverComponents/usecanvasstore";
import CanvasEl from "./serverComponents/canvaselement";
import Connector from "./connector";
import ConfigCard from "./configCard";
import PriceBar from "./pricebar";

type T = { x: number; y: number; s: number };

export default function InfiniteCanvas({
  children,
}: {
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<T>({ x: 0, y: 0, s: 0 });
  const drag = useRef<{ ox: number; oy: number } | null>(null);
  const {
    elements,
    connections,
    tool,
    setTool,
    addElement,
    setSelected,
    setMetrics,
    pendingNodeConfig,
    clearPendingNodeConfig,
    setConnectFrom,
  } = useCanvasStore();

  useEffect(() => {
    const m = computeMetrics(elements, connections);
    setMetrics(m);
  }, [elements, connections]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      const state = useCanvasStore.getState();
      if (state.pendingType || state.configTarget) return;
      if (!state.selected) return;
      state.removeElement(state.selected);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setT({ x: window.innerWidth / 2, y: window.innerHeight / 2, s: 1 });
    const el = ref.current!;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { left, top } = el.getBoundingClientRect();
      const mx = e.clientX - left,
        my = e.clientY - top;
      const ds = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setT(({ x, y, s }) => {
        const ns = Math.min(8, Math.max(0.1, s * ds));
        const r = ns / s;
        return { s: ns, x: mx - r * (mx - x), y: my - r * (my - y) };
      });
    };

    const onMove = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      setT((p) => ({ ...p, x: e.clientX - d.ox, y: e.clientY - d.oy }));
    };

    const onUp = () => {
      drag.current = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const sp = 28 * t.s;
  const ox = ((t.x % sp) + sp) % sp;
  const oy = ((t.y % sp) + sp) % sp;

  const onCanvasClick = (e: React.MouseEvent) => {
    if (!tool) {
      setSelected(null);
      return;
    }

    if (tool === "connector") {
      setConnectFrom(null);
      setTool(null);
      return;
    }

    const rect = ref.current!.getBoundingClientRect();
    const wx = (e.clientX - rect.left - t.x) / t.s;
    const wy = (e.clientY - rect.top - t.y) / t.s;

    if (tool === "rectangle" || tool === "text") {
      addElement({
        id: crypto.randomUUID(),
        type: tool,
        x: wx - (tool === "rectangle" ? 60 : 40),
        y: wy - (tool === "rectangle" ? 40 : 14),
        w: tool === "rectangle" ? 120 : 80,
        h: tool === "rectangle" ? 80 : 28,
        text: tool === "text" ? "Text" : undefined,
      });
      setTool(null);
      return;
    }

    if (pendingNodeConfig && pendingNodeConfig.type === tool) {
      const w = 170;
      const h = 76;
      addElement({
        id: crypto.randomUUID(),
        type: tool,
        x: wx - w / 2,
        y: wy - h / 2,
        w,
        h,
        ...pendingNodeConfig.data,
      });
      clearPendingNodeConfig();
      setTool(null);
    }
  };

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        if (tool) return;
        drag.current = { ox: e.clientX - t.x, oy: e.clientY - t.y };
      }}
      onClick={onCanvasClick}
      className="relative size-full overflow-hidden bg-[#161616] select-none"
      style={{
        cursor: tool ? "crosshair" : drag.current ? "grabbing" : "grab",
        backgroundImage:
          "radial-gradient(circle, #3a3a4a 1px, transparent 1px)",
        backgroundSize: `${sp}px ${sp}px`,
        backgroundPosition: `${ox}px ${oy}px`,
      }}
    >
      <Toolbar />
      <ConfigCard />
      <div
        className="absolute origin-top-left"
        style={{ transform: `translate(${t.x}px,${t.y}px) scale(${t.s})` }}
      >
        <Connector />
        {elements.map((el) => (
          <CanvasEl key={el.id} el={el} scale={t.s} />
        ))}
        {children}
      </div>
    </div>
  );
}

function Toolbar() {
  const { tool, setTool } = useCanvasStore();
  return (
    <div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg px-3 py-2">
        <button
          title="Rectangle"
          onClick={(e) => {
            e.stopPropagation();
            setTool(tool === "rectangle" ? null : "rectangle");
          }}
          className={`p-1 rounded-md text-white text-sm transition-colors duration-150 ${tool === "rectangle" ? "bg-[#B7ADCF]/20 text-[#B7ADCF]" : "hover:bg-[#3a3a4a]"}`}
        >
          <img src="/rectangle-horizontal.svg" className="invert w-5 h-5" />
        </button>
        <span className="w-0.5 h-4 rounded-xl bg-[#3a3a4a]" />
        <button
          title="Text"
          onClick={(e) => {
            e.stopPropagation();
            setTool(tool === "text" ? null : "text");
          }}
          className={`p-1 rounded-md text-white text-sm transition-colors duration-150 ${tool === "text" ? "bg-[#B7ADCF]/20 text-[#B7ADCF]" : "hover:bg-[#3a3a4a]"}`}
        >
          <img src="/type-outline.svg" className="w-5 h-5" />
        </button>
        {tool === "connector" && (
          <>
            <span className="w-0.5 h-4 rounded-xl bg-[#3a3a4a]" />
            <span className="text-[11px] text-[#B7ADCF] px-1">
              click a source node, then a target node
            </span>
          </>
        )}
      </div>

      <PriceBar />
    </div>
  );
}
