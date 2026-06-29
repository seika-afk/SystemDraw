"use client";
import {
  useCanvasStore,
  CanvasElement,
} from "./serverComponents/usecanvasstore";

function center(el: CanvasElement) {
  return { cx: el.x + el.w / 2, cy: el.y + el.h / 2 };
}

export default function Connector() {
  const elements = useCanvasStore((s) => s.elements);
  const connections = useCanvasStore((s) => s.connections);
  const metrics = useCanvasStore((s) => s.metrics);
  const simulating = useCanvasStore((s) => s.simulating);

  const byId = new Map(elements.map((e) => [e.id, e]));

  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1,
        height: 1,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <defs>
        <marker
          id="connector-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#B7ADCF" />
        </marker>
        <marker
          id="connector-arrow-bad"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#e07a7a" />
        </marker>
      </defs>
      {connections.map((c) => {
        const a = byId.get(c.from);
        const b = byId.get(c.to);
        if (!a || !b) return null;
        const pa = center(a);
        const pb = center(b);
        const bad = simulating && metrics[c.to]?.overloaded;
        const color = bad ? "#e07a7a" : "#B7ADCF";

        return (
          <g key={c.id}>
            <line
              x1={pa.cx}
              y1={pa.cy}
              x2={pb.cx}
              y2={pb.cy}
              stroke={color}
              strokeWidth={2}
              markerEnd={
                bad ? "url(#connector-arrow-bad)" : "url(#connector-arrow)"
              }
            />
            {simulating && (
              <circle r={3.5} fill={color}>
                <animateMotion
                  dur="1.1s"
                  repeatCount="indefinite"
                  path={`M${pa.cx},${pa.cy} L${pb.cx},${pb.cy}`}
                />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
