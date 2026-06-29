"use client";
import { useEffect, useState } from "react";
import {
  useCanvasStore,
  LB_PRESETS,
  SERVER_PRESETS,
  LbProviderKey,
  ServerProviderKey,
  CanvasElement,
  GatewayCloud,
  ApiType,
  CacheSizeGb,
  AzureApimTier,
  GatewayRoute,
} from "./serverComponents/usecanvasstore";
const LB_KEYS = Object.keys(LB_PRESETS) as LbProviderKey[];
const SERVER_KEYS = Object.keys(SERVER_PRESETS) as ServerProviderKey[];

export default function ConfigCard() {
  const pendingType = useCanvasStore((s) => s.pendingType);
  const configTarget = useCanvasStore((s) => s.configTarget);
  const elements = useCanvasStore((s) => s.elements);
  const setPendingType = useCanvasStore((s) => s.setPendingType);
  const confirmPendingConfig = useCanvasStore((s) => s.confirmPendingConfig);
  const setConfigTarget = useCanvasStore((s) => s.setConfigTarget);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const removeElement = useCanvasStore((s) => s.removeElement);

  const editingEl = configTarget
    ? (elements.find((e) => e.id === configTarget) ?? null)
    : null;
  const isEditing = !!editingEl;
  const mode =
    pendingType ??
    (editingEl?.type as
      | "user"
      | "load_balancer"
      | "server"
      | "api_gateway"
      | undefined) ??
    null;

  const [rps, setRps] = useState(10);
  const [payloadKb, setPayloadKb] = useState(1);
  const [path, setPath] = useState("/api/example");
  const [lbProvider, setLbProvider] = useState<LbProviderKey>("aws_alb");
  const [routingStrategy, setRoutingStrategy] = useState<
    "round_robin" | "least_connections"
  >("round_robin");
  const [serverProvider, setServerProvider] =
    useState<ServerProviderKey>("aws_t3_micro");
  const [servedPaths, setServedPaths] = useState<string[]>([]);

  const [gatewayCloud, setGatewayCloud] = useState<GatewayCloud>("aws");
  const [apiType, setApiType] = useState<ApiType>("http");
  const [cachingEnabled, setCachingEnabled] = useState(false);
  const [cachingSizeGb, setCachingSizeGb] = useState<CacheSizeGb>(0.5);
  const [azureApimTier, setAzureApimTier] =
    useState<AzureApimTier>("consumption");
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);

  // distinct paths typed in on User nodes — servers/gateways pick from this list, never free-type
  const availablePaths = Array.from(
    new Set(
      elements
        .filter((e) => e.type === "user" && e.path)
        .map((e) => e.path as string),
    ),
  );
  // routable targets for a gateway route — servers or load balancers already on the canvas
  const targetNodes = elements.filter(
    (e) =>
      (e.type === "server" || e.type === "load_balancer") &&
      e.id !== editingEl?.id,
  );

  useEffect(() => {
    setRps(editingEl?.rps ?? 10);
    setPayloadKb(editingEl?.payloadKb ?? 1);
    setPath(editingEl?.path ?? "/api/example");
    setLbProvider(editingEl?.lbProvider ?? "aws_alb");
    setRoutingStrategy(editingEl?.routingStrategy ?? "round_robin");
    setServerProvider(editingEl?.serverProvider ?? "aws_t3_micro");
    setServedPaths(editingEl?.servedPaths ?? []);
    setGatewayCloud(editingEl?.gatewayCloud ?? "aws");
    setApiType(editingEl?.apiType ?? "http");
    setCachingEnabled(editingEl?.cachingEnabled ?? false);
    setCachingSizeGb(editingEl?.cachingSizeGb ?? 0.5);
    setAzureApimTier(editingEl?.azureApimTier ?? "consumption");
    setRoutes(editingEl?.routes ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configTarget, pendingType]);

  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!mode) return null;

  function close() {
    setPendingType(null);
    setConfigTarget(null);
  }

  function addRoute() {
    if (availablePaths.length === 0) return;
    setRoutes((prev) => [...prev, { path: availablePaths[0], targetIds: [] }]);
  }
  function updateRoute(idx: number, patch: Partial<GatewayRoute>) {
    setRoutes((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }
  function removeRoute(idx: number) {
    setRoutes((prev) => prev.filter((_, i) => i !== idx));
  }
  function toggleRouteTarget(idx: number, id: string, checked: boolean) {
    setRoutes((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              targetIds: checked
                ? [...r.targetIds, id]
                : r.targetIds.filter((x) => x !== id),
            }
          : r,
      ),
    );
  }
  function nodeLabel(n: CanvasElement) {
    if (n.type === "server")
      return `Server — ${n.serverProvider ? SERVER_PRESETS[n.serverProvider].label : "?"}`;
    return `Load Balancer — ${n.lbProvider ? LB_PRESETS[n.lbProvider].label : "?"}`;
  }

  function buildData(): Partial<CanvasElement> {
    if (mode === "user") return { rps, payloadKb, path };
    if (mode === "load_balancer") return { lbProvider, routingStrategy };
    if (mode === "server") return { serverProvider, servedPaths };
    // api_gateway
    if (gatewayCloud === "azure")
      return { gatewayCloud, azureApimTier, routes };
    return {
      gatewayCloud,
      apiType,
      cachingEnabled: apiType === "rest" ? cachingEnabled : false,
      cachingSizeGb:
        apiType === "rest" && cachingEnabled ? cachingSizeGb : undefined,
      routes,
    };
  }

  function handleSubmit() {
    const data = buildData();
    if (isEditing && editingEl) {
      updateElement(editingEl.id, data);
      setConfigTarget(null);
    } else {
      confirmPendingConfig(data);
    }
  }

  const title =
    mode === "user"
      ? "Configure User"
      : mode === "load_balancer"
        ? "Configure Load Balancer"
        : mode === "server"
          ? "Configure Server"
          : "Configure API Gateway";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="w-[440px] max-h-[85vh] overflow-y-auto rounded-xl bg-[#1c1c1c] border border-[#2e2e2e] p-5 text-sm text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">{title}</h3>
          <kbd
            onClick={close}
            className="text-[11px] text-[#555] bg-[#2a2a2a] border border-[#3a3a3a] rounded px-1.5 py-0.5 font-mono cursor-pointer"
          >
            ESC
          </kbd>
        </div>

        <div className="flex flex-col gap-3">
          {mode === "user" && (
            <>
              <Field label="Requests per second">
                <input
                  type="number"
                  min={1}
                  value={rps}
                  onChange={(e) => setRps(Number(e.target.value))}
                  className="w-full bg-[#262626] border border-[#3a3a3a] rounded px-2 py-1.5 outline-none focus:border-[#B7ADCF]"
                />
              </Field>
              <Field label="Payload size (KB)">
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={payloadKb}
                  onChange={(e) => setPayloadKb(Number(e.target.value))}
                  className="w-full bg-[#262626] border border-[#3a3a3a] rounded px-2 py-1.5 outline-none focus:border-[#B7ADCF]"
                />
              </Field>
              <Field label="Path">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/api/example"
                  className="w-full bg-[#262626] border border-[#3a3a3a] rounded px-2 py-1.5 outline-none focus:border-[#B7ADCF]"
                />
              </Field>
            </>
          )}

          {mode === "load_balancer" && (
            <>
              <Field label="Provider">
                <Select
                  value={lbProvider}
                  onChange={(v) => setLbProvider(v as LbProviderKey)}
                  options={LB_KEYS.map((k) => ({
                    value: k,
                    label: LB_PRESETS[k].label,
                  }))}
                />
              </Field>
              <Field label="Routing strategy">
                <Select
                  value={routingStrategy}
                  onChange={(v) =>
                    setRoutingStrategy(v as "round_robin" | "least_connections")
                  }
                  options={[
                    { value: "round_robin", label: "Round robin" },
                    { value: "least_connections", label: "Least connections" },
                  ]}
                />
              </Field>
            </>
          )}

          {mode === "server" && (
            <>
              <Field label="Instance">
                <Select
                  value={serverProvider}
                  onChange={(v) => setServerProvider(v as ServerProviderKey)}
                  options={SERVER_KEYS.map((k) => ({
                    value: k,
                    label: `${SERVER_PRESETS[k].label} — ${SERVER_PRESETS[k].vcpu} vCPU / ${SERVER_PRESETS[k].ram_gb}GB`,
                  }))}
                />
              </Field>
              <Field label="Serves paths">
                {availablePaths.length === 0 ? (
                  <p className="text-[#666] text-xs">
                    Add a User node with a path first.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {availablePaths.map((p) => (
                      <label
                        key={p}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={servedPaths.includes(p)}
                          onChange={(e) =>
                            setServedPaths((prev) =>
                              e.target.checked
                                ? [...prev, p]
                                : prev.filter((x) => x !== p),
                            )
                          }
                        />
                        <span className="text-[#ccc]">{p}</span>
                      </label>
                    ))}
                  </div>
                )}
              </Field>
            </>
          )}

          {mode === "api_gateway" && (
            <>
              <Field label="Cloud">
                <Select
                  value={gatewayCloud}
                  onChange={(v) => setGatewayCloud(v as GatewayCloud)}
                  options={[
                    { value: "aws", label: "AWS API Gateway" },
                    { value: "azure", label: "Azure API Management" },
                  ]}
                />
              </Field>

              {gatewayCloud === "aws" && (
                <>
                  <Field label="API type">
                    <Select
                      value={apiType}
                      onChange={(v) => setApiType(v as ApiType)}
                      options={[
                        { value: "http", label: "HTTP API" },
                        { value: "rest", label: "REST API" },
                        { value: "websocket", label: "WebSocket API" },
                      ]}
                    />
                  </Field>
                  {apiType === "rest" && (
                    <Field label="Caching">
                      <label className="flex items-center gap-2 text-xs text-[#ccc] mb-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cachingEnabled}
                          onChange={(e) => setCachingEnabled(e.target.checked)}
                        />
                        Enable response caching
                      </label>
                      {cachingEnabled && (
                        <Select
                          value={String(cachingSizeGb)}
                          onChange={(v) =>
                            setCachingSizeGb(Number(v) as CacheSizeGb)
                          }
                          options={[
                            { value: "0.5", label: "0.5 GB cache" },
                            { value: "1.6", label: "1.6 GB cache" },
                            { value: "6.1", label: "6.1 GB cache" },
                          ]}
                        />
                      )}
                    </Field>
                  )}
                </>
              )}

              {gatewayCloud === "azure" && (
                <Field label="APIM tier">
                  <Select
                    value={azureApimTier}
                    onChange={(v) => setAzureApimTier(v as AzureApimTier)}
                    options={[
                      {
                        value: "consumption",
                        label: "Consumption (pay-per-call)",
                      },
                      { value: "developer", label: "Developer — $50/mo" },
                      {
                        value: "basic",
                        label: "Basic — $152/mo, max 1000 rps",
                      },
                      { value: "standard", label: "Standard — $677/mo" },
                      { value: "premium", label: "Premium — $2794/mo" },
                    ]}
                  />
                </Field>
              )}

              <Field label="Routes">
                <div className="flex flex-col gap-2">
                  {routes.map((r, idx) => (
                    <div
                      key={idx}
                      className="border border-[#333] rounded-md p-2 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Select
                            value={r.path}
                            onChange={(v) => updateRoute(idx, { path: v })}
                            options={availablePaths.map((p) => ({
                              value: p,
                              label: p,
                            }))}
                          />
                        </div>
                        <button
                          onClick={() => removeRoute(idx)}
                          className="text-[#e07a7a] text-xs px-1 hover:opacity-80"
                          title="Remove route"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex flex-col gap-1 pl-1">
                        {targetNodes.length === 0 ? (
                          <span className="text-[10px] text-[#666]">
                            No servers/load balancers on canvas yet.
                          </span>
                        ) : (
                          targetNodes.map((n) => (
                            <label
                              key={n.id}
                              className="flex items-center gap-2 text-[11px] text-[#ccc] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={r.targetIds.includes(n.id)}
                                onChange={(e) =>
                                  toggleRouteTarget(idx, n.id, e.target.checked)
                                }
                              />
                              {nodeLabel(n)}
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addRoute}
                    disabled={availablePaths.length === 0}
                    className="text-xs text-[#B7ADCF] self-start disabled:opacity-40 hover:opacity-80"
                  >
                    + Add route
                  </button>
                  {availablePaths.length === 0 && (
                    <span className="text-[10px] text-[#666]">
                      Add a User node with a path to define routes.
                    </span>
                  )}
                </div>
              </Field>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          {isEditing && (
            <button
              onClick={() => {
                removeElement(editingEl!.id);
                close();
              }}
              className="px-3 py-1.5 rounded-md text-[#e07a7a] hover:bg-[#2a2a2a] text-xs"
            >
              Delete
            </button>
          )}
          <button
            onClick={close}
            className="px-3 py-1.5 rounded-md text-[#aaa] hover:bg-[#2a2a2a] text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 rounded-md bg-[#B7ADCF] text-[#161616] text-xs font-medium hover:opacity-90"
          >
            {isEditing ? "Save" : "Place on canvas"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-[#888]">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#262626] border border-[#3a3a3a] rounded px-2 py-1.5 outline-none focus:border-[#B7ADCF] text-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
