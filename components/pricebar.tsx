"use client";
import { Play, Pause } from "lucide-react";
import { useCanvasStore } from "./serverComponents/usecanvasstore";
const TYPE_LABEL: Record<string, string> = {
  load_balancer: "Load Balancer",
  server: "Server",
  api_gateway: "API Gateway",
};

export default function PriceBar() {
  const elements = useCanvasStore((s) => s.elements);
  const metrics = useCanvasStore((s) => s.metrics);
  const simulating = useCanvasStore((s) => s.simulating);
  const toggleSimulation = useCanvasStore((s) => s.toggleSimulation);

  const billable = elements.filter(
    (e) =>
      e.type === "load_balancer" ||
      e.type === "server" ||
      e.type === "api_gateway",
  );
  const totalPerHour = billable.reduce(
    (sum, e) => sum + (metrics[e.id]?.costPerHour ?? 0),
    0,
  );
  const anyOverloaded =
    simulating && billable.some((e) => metrics[e.id]?.overloaded);

  return (
    <div className="fixed bottom-4 right-4 z-20 w-64 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e] text-white text-xs overflow-hidden">
      <div className="px-3 py-2 border-b border-[#2e2e2e] flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-[#888]">
          Estimated cost
        </span>
        {anyOverloaded && (
          <span className="text-[10px] text-[#e07a7a]">⚠ overloaded</span>
        )}
      </div>

      <div className="max-h-44 overflow-auto px-3 py-2 flex flex-col gap-1.5">
        {billable.length === 0 ? (
          <p className="text-[#666] py-2 text-center">
            No billable components yet
          </p>
        ) : (
          billable.map((e) => {
            const m = metrics[e.id];
            const bad = simulating && m?.overloaded;
            return (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2"
              >
                <span
                  className={`truncate ${bad ? "text-[#e07a7a]" : "text-[#ccc]"}`}
                >
                  {TYPE_LABEL[e.type]}
                  {bad ? " ⚠" : ""}
                </span>
                <span
                  className={`shrink-0 font-mono ${bad ? "text-[#e07a7a]" : "text-[#aaa]"}`}
                >
                  ${(m?.costPerHour ?? 0).toFixed(4)}/hr
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 py-2.5 border-t border-[#2e2e2e] flex items-center justify-between">
        <button
          onClick={toggleSimulation}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
            simulating
              ? "bg-[#B7ADCF] text-[#161616]"
              : "bg-[#2a2a2a] text-[#B7ADCF] hover:bg-[#333]"
          }`}
          title={simulating ? "Stop simulation" : "Run simulation"}
        >
          {simulating ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <div className="text-right">
          <div className="font-mono text-[13px]">
            ${totalPerHour.toFixed(4)}/hr
          </div>
          <div className="text-[10px] text-[#666]">
            ≈ ${(totalPerHour * 730).toFixed(2)}/mo
          </div>
        </div>
      </div>
    </div>
  );
}
