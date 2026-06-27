"use client";
import { useRef, useState } from "react";
import { useCanvasStore, CanvasElement as El } from "./usecanvasstore";
const HANDLES = [
  { cursor: "nwse-resize", x: 0, y: 0 },
  { cursor: "ns-resize", x: 0.5, y: 0 },
  { cursor: "nesw-resize", x: 1, y: 0 },
  { cursor: "ew-resize", x: 1, y: 0.5 },
  { cursor: "nwse-resize", x: 1, y: 1 },
  { cursor: "ns-resize", x: 0.5, y: 1 },
  { cursor: "nesw-resize", x: 0, y: 1 },
  { cursor: "ew-resize", x: 0, y: 0.5 },
];

export default function CanvasEl({ el, scale }: { el: El; scale: number }) {
  const { selected, setSelected, updateElement } = useCanvasStore();
  const isSelected = selected === el.id;
  const [editing, setEditing] = useState(false);

  const startDrag = (e: React.MouseEvent, handle: number | null) => {
    e.stopPropagation();
    e.preventDefault();
    setSelected(el.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const { x, y, w, h } = el;

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;

      if (handle === null) {
        updateElement(el.id, { x: x + dx, y: y + dy });
        return;
      }

      const hd = HANDLES[handle];
      let nx = x,
        ny = y,
        nw = w,
        nh = h;

      if (hd.x === 0) {
        nx = x + dx;
        nw = Math.max(40, w - dx);
      } else if (hd.x === 1) {
        nw = Math.max(40, w + dx);
      }

      if (hd.y === 0) {
        ny = y + dy;
        nh = Math.max(24, h - dy);
      } else if (hd.y === 1) {
        nh = Math.max(24, h + dy);
      }

      updateElement(el.id, { x: nx, y: ny, w: nw, h: nh });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onMouseDown={(e) => {
        if (!useCanvasStore.getState().tool) startDrag(e, null);
      }}
      onClick={(e) => {
        if (!useCanvasStore.getState().tool) e.stopPropagation();
      }}
      style={{
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        cursor: "move",
        boxSizing: "border-box",
      }}
    >
      {el.type === "rectangle" ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            border: `1.5px solid ${isSelected ? "#B7ADCF" : "#3a3a4a"}`,
            borderRadius: 6,
            background: "#1e1e1e",
            boxSizing: "border-box",
          }}
        />
      ) : editing ? (
        <textarea
          autoFocus
          defaultValue={el.text ?? "Text"}
          onBlur={(e) => {
            updateElement(el.id, { text: e.target.value });
            setEditing(false);
          }}
          style={{
            width: "100%",
            height: "100%",
            background: "transparent",
            border: "1.5px solid #B7ADCF",
            borderRadius: 4,
            color: "#fff",
            fontSize: 14,
            padding: 4,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          style={{
            width: "100%",
            height: "100%",
            color: "#fff",
            fontSize: 14,
            padding: 4,
            border: `1.5px solid ${isSelected ? "#B7ADCF" : "transparent"}`,
            borderRadius: 4,
            userSelect: "none",
            wordBreak: "break-word",
            boxSizing: "border-box",
          }}
        >
          {el.text ?? "Text"}
        </div>
      )}

      {isSelected &&
        !editing &&
        HANDLES.map((h, i) => (
          <div
            key={i}
            onMouseDown={(e) => startDrag(e, i)}
            style={{
              position: "absolute",
              left: `calc(${h.x * 100}% - 4px)`,
              top: `calc(${h.y * 100}% - 4px)`,
              width: 8,
              height: 8,
              background: "#B7ADCF",
              border: "1.5px solid #0f0f13",
              borderRadius: 2,
              cursor: h.cursor,
              zIndex: 10,
            }}
          />
        ))}
    </div>
  );
}
