"use client";
import { useState } from "react";
import {
  useCanvasStore,
  CanvasElement as El,
  LB_PRESETS,
  SERVER_PRESETS,
  NodeMetrics,
} from "./usecanvasstore";

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

const NODE_TYPES = ["user", "load_balancer", "server", "api_gateway"] as const;
function isNode(t: El["type"]): t is (typeof NODE_TYPES)[number] {
  return (NODE_TYPES as readonly string[]).includes(t);
}

const NODE_COLORS: Record<string, string> = {
  user: "#B7ADCF",
  load_balancer: "#7ab8e0",
  server: "#7ed0a0",
  api_gateway: "#e0a87a",
};

function CostLine({ metrics }: { metrics?: NodeMetrics }) {
  if (!metrics) return null;
  return (
    <div className="text-[10px] text-[#666] mt-1">
      ${metrics.costPerHour.toFixed(4)}/hr
    </div>
  );
}

function NodeBadge({
  el,
  metrics,
  simulating,
}: {
  el: El;
  metrics?: NodeMetrics;
  simulating: boolean;
}) {
  const overloaded = simulating && metrics?.overloaded;

  if (el.type === "user") {
    return (
      <>
        <div
          className="text-[11px] uppercase tracking-wide"
          style={{ color: NODE_COLORS.user }}
        >
          User
        </div>
        <div className="text-[13px] text-white mt-1">{el.rps ?? 10} req/s</div>
        <div className="text-[11px] text-[#888] truncate">{el.path ?? "/"}</div>
      </>
    );
  }

  if (el.type === "load_balancer") {
    const preset = el.lbProvider ? LB_PRESETS[el.lbProvider] : null;
    return (
      <>
        <div
          className="text-[11px] uppercase tracking-wide"
          style={{ color: NODE_COLORS.load_balancer }}
        >
          Load Balancer
        </div>
        <div className="text-[13px] text-white mt-1 truncate">
          {preset?.label ?? "Not configured"}
        </div>
        <div className="text-[11px] text-[#888]">
          {el.routingStrategy ?? "round_robin"}
        </div>
        <CostLine metrics={metrics} />
      </>
    );
  }

  if (el.type === "server") {
    const preset = el.serverProvider ? SERVER_PRESETS[el.serverProvider] : null;
    return (
      <>
        <div
          className="text-[11px] uppercase tracking-wide"
          style={{ color: NODE_COLORS.server }}
        >
          Server
        </div>
        <div className="text-[13px] text-white mt-1 truncate">
          {preset?.label ?? "Not configured"}
        </div>
        <div className="text-[11px] text-[#888] truncate">
          {el.servedPaths?.length
            ? el.servedPaths.join(", ")
            : "No path assigned"}
        </div>
        {metrics && (
          <div
            className={`text-[10px] mt-1 ${overloaded ? "text-[#e07a7a]" : "text-[#666]"}`}
          >
            {metrics.rps.toFixed(0)} /{" "}
            {metrics.capacity === Infinity ? "∞" : metrics.capacity} req/s
            {overloaded ? " ⚠ overloaded" : ""}
          </div>
        )}
        <CostLine metrics={metrics} />
      </>
    );
  }

  // api_gateway
  const cloudLabel =
    el.gatewayCloud === "azure"
      ? `Azure APIM — ${el.azureApimTier ?? "consumption"}`
      : `AWS — ${el.apiType ?? "http"}`;
  return (
    <>
      <div
        className="text-[11px] uppercase tracking-wide"
        style={{ color: NODE_COLORS.api_gateway }}
      >
        API Gateway
      </div>
      <div className="text-[13px] text-white mt-1 truncate">{cloudLabel}</div>
      <div className="text-[11px] text-[#888] truncate">
        {el.routes?.length
          ? `${el.routes.length} route${el.routes.length > 1 ? "s" : ""}`
          : "No routes configured"}
      </div>
      {metrics && (
        <div
          className={`text-[10px] mt-1 ${overloaded ? "text-[#e07a7a]" : "text-[#666]"}`}
        >
          {metrics.rps.toFixed(0)} /{" "}
          {metrics.capacity === Infinity ? "∞" : metrics.capacity} req/s
          {overloaded ? " ⚠ overloaded" : ""}
        </div>
      )}
      <CostLine metrics={metrics} />
    </>
  );
}

export default function CanvasEl({ el, scale }: { el: El; scale: number }) {
  const {
    selected,
    setSelected,
    updateElement,
    tool,
    connectFrom,
    metrics,
    simulating,
  } = useCanvasStore();
  const isSelected = selected === el.id;
  const isConnectSource = connectFrom === el.id;
  const nodeMetrics = metrics[el.id];
  const overloaded = simulating && nodeMetrics?.overloaded;
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

  const handleClick = (e: React.MouseEvent) => {
    const state = useCanvasStore.getState();
    if (state.tool === "connector") {
      e.stopPropagation();
      if (!state.connectFrom) {
        state.setConnectFrom(el.id);
      } else if (state.connectFrom !== el.id) {
        state.addConnection(state.connectFrom, el.id);
        state.setConnectFrom(null);
        state.setTool(null);
      } else {
        state.setConnectFrom(null);
      }
      return;
    }
    if (!state.tool) e.stopPropagation();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNode(el.type)) {
      useCanvasStore.getState().setConfigTarget(el.id);
    } else if (el.type === "text") {
      setEditing(true);
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        if (!useCanvasStore.getState().tool) startDrag(e, null);
      }}
      onClick={handleClick}
      style={{
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        cursor: tool === "connector" ? "pointer" : "move",
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
      ) : el.type === "text" ? (
        editing ? (
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
            onDoubleClick={handleDoubleClick}
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
        )
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={{
            width: "100%",
            height: "100%",
            border: `1.5px solid ${overloaded ? "#e07a7a" : isConnectSource ? "#ffd479" : isSelected ? "#B7ADCF" : "#3a3a4a"}`,
            borderRadius: 8,
            background: "#1e1e1e",
            padding: 10,
            boxSizing: "border-box",
            overflow: "hidden",
            boxShadow: overloaded
              ? "0 0 0 3px rgba(224,122,122,0.2)"
              : undefined,
          }}
        >
          <NodeBadge el={el} metrics={nodeMetrics} simulating={simulating} />
        </div>
      )}

      {isSelected &&
        !editing &&
        tool !== "connector" &&
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
