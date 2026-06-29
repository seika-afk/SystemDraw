import { create } from "zustand";

export type NodeType = "user" | "load_balancer" | "server" | "api_gateway";
export type ElementType = "rectangle" | "text" | NodeType;
export type ToolType = ElementType | "connector";

export type LbProviderKey =
  | "aws_alb"
  | "aws_nlb"
  | "aws_clb"
  | "azure_standard";
export type ServerProviderKey =
  | "aws_t3_micro"
  | "aws_t3_small"
  | "aws_t3_medium"
  | "aws_t3_large"
  | "aws_t3_xlarge"
  | "aws_m5_micro"
  | "aws_m5_small"
  | "aws_m5_medium"
  | "aws_m5_large"
  | "aws_m5_xlarge"
  | "azure_b1s"
  | "azure_b2s"
  | "azure_d2s_v3"
  | "azure_d4s_v3";

export type GatewayCloud = "aws" | "azure";
export type ApiType = "http" | "rest" | "websocket";
export type CacheSizeGb = 0.5 | 1.6 | 6.1;
export type AzureApimTier =
  | "consumption"
  | "developer"
  | "basic"
  | "standard"
  | "premium";

export interface GatewayRoute {
  path: string;
  targetIds: string[];
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;

  // user node
  rps?: number;
  payloadKb?: number;
  path?: string;

  // load balancer node
  lbProvider?: LbProviderKey;
  routingStrategy?: "round_robin" | "least_connections";

  // server node
  serverProvider?: ServerProviderKey;
  servedPaths?: string[];

  // api gateway node
  gatewayCloud?: GatewayCloud;
  apiType?: ApiType; // aws only
  cachingEnabled?: boolean; // aws rest only
  cachingSizeGb?: CacheSizeGb; // aws rest only
  azureApimTier?: AzureApimTier; // azure only
  routes?: GatewayRoute[];
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

interface PendingNodeConfig {
  type: NodeType;
  data: Partial<CanvasElement>;
}

export interface NodeMetrics {
  rps: number;
  capacity: number;
  overloaded: boolean;
  costPerHour: number;
}

interface Store {
  elements: CanvasElement[];
  connections: Connection[];
  selected: string | null;
  tool: ToolType | null;

  // create-flow: searchbox picked a node type -> config card open -> confirmed -> waiting for canvas click
  pendingType: NodeType | null;
  pendingNodeConfig: PendingNodeConfig | null;

  // edit-flow: double-clicked an existing node
  configTarget: string | null;

  // connector tool: id of the node clicked first
  connectFrom: string | null;

  // cost/capacity engine + simulation
  metrics: Record<string, NodeMetrics>;
  simulating: boolean;

  setTool: (t: ToolType | null) => void;
  addElement: (el: CanvasElement) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  setSelected: (id: string | null) => void;

  setPendingType: (t: NodeType | null) => void;
  confirmPendingConfig: (data: Partial<CanvasElement>) => void;
  clearPendingNodeConfig: () => void;

  setConfigTarget: (id: string | null) => void;

  setConnectFrom: (id: string | null) => void;
  addConnection: (from: string, to: string) => void;
  removeConnection: (id: string) => void;

  setMetrics: (m: Record<string, NodeMetrics>) => void;
  toggleSimulation: () => void;
}

export const useCanvasStore = create<Store>((set, get) => ({
  elements: [],
  connections: [],
  selected: null,
  tool: null,

  pendingType: null,
  pendingNodeConfig: null,

  configTarget: null,
  connectFrom: null,

  metrics: {},
  simulating: false,

  setTool: (tool) => set({ tool }),
  addElement: (el) => set((s) => ({ elements: [...s.elements, el] })),
  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  removeElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      connections: s.connections.filter((c) => c.from !== id && c.to !== id),
      selected: s.selected === id ? null : s.selected,
      configTarget: s.configTarget === id ? null : s.configTarget,
    })),
  setSelected: (selected) => set({ selected }),

  setPendingType: (pendingType) => set({ pendingType }),
  confirmPendingConfig: (data) => {
    const type = get().pendingType;
    if (!type) return;
    set({
      pendingNodeConfig: { type, data },
      pendingType: null,
      tool: type,
    });
  },
  clearPendingNodeConfig: () => set({ pendingNodeConfig: null }),

  setConfigTarget: (configTarget) => set({ configTarget }),

  setConnectFrom: (connectFrom) => set({ connectFrom }),
  addConnection: (from, to) =>
    set((s) => {
      if (from === to) return s;
      if (s.connections.some((c) => c.from === from && c.to === to)) return s;
      return {
        connections: [...s.connections, { id: crypto.randomUUID(), from, to }],
      };
    }),
  removeConnection: (id) =>
    set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),

  setMetrics: (metrics) => set({ metrics }),
  toggleSimulation: () => set((s) => ({ simulating: !s.simulating })),
}));

// ---- Pricing / option presets — UI picks from these, never free-typed ----

export const LB_PRESETS: Record<
  LbProviderKey,
  { label: string; cost_per_hour: number }
> = {
  aws_alb: {
    label: "AWS Application Load Balancer (ALB)",
    cost_per_hour: 0.0225,
  },
  aws_nlb: { label: "AWS Network Load Balancer (NLB)", cost_per_hour: 0.0225 },
  aws_clb: { label: "AWS Classic Load Balancer (CLB)", cost_per_hour: 0.025 },
  azure_standard: {
    label: "Azure Standard Load Balancer",
    cost_per_hour: 0.025,
  },
};

export const SERVER_PRESETS: Record<
  ServerProviderKey,
  { label: string; vcpu: number; ram_gb: number; cost_per_hour: number }
> = {
  aws_t3_micro: {
    label: "AWS t3.micro",
    vcpu: 2,
    ram_gb: 1,
    cost_per_hour: 0.0104,
  },
  aws_t3_small: {
    label: "AWS t3.small",
    vcpu: 2,
    ram_gb: 2,
    cost_per_hour: 0.0208,
  },
  aws_t3_medium: {
    label: "AWS t3.medium",
    vcpu: 2,
    ram_gb: 4,
    cost_per_hour: 0.0416,
  },
  aws_t3_large: {
    label: "AWS t3.large",
    vcpu: 2,
    ram_gb: 8,
    cost_per_hour: 0.0832,
  },
  aws_t3_xlarge: {
    label: "AWS t3.xlarge",
    vcpu: 4,
    ram_gb: 16,
    cost_per_hour: 0.1664,
  },
  aws_m5_micro: {
    label: "AWS m5 (1 vCPU / 4GB)",
    vcpu: 1,
    ram_gb: 4,
    cost_per_hour: 0.024,
  },
  aws_m5_small: {
    label: "AWS m5 (1 vCPU / 8GB)",
    vcpu: 1,
    ram_gb: 8,
    cost_per_hour: 0.048,
  },
  aws_m5_medium: {
    label: "AWS m5.large",
    vcpu: 2,
    ram_gb: 8,
    cost_per_hour: 0.096,
  },
  aws_m5_large: {
    label: "AWS m5.xlarge",
    vcpu: 4,
    ram_gb: 16,
    cost_per_hour: 0.192,
  },
  aws_m5_xlarge: {
    label: "AWS m5.2xlarge",
    vcpu: 8,
    ram_gb: 32,
    cost_per_hour: 0.384,
  },
  azure_b1s: { label: "Azure B1s", vcpu: 1, ram_gb: 1, cost_per_hour: 0.0104 },
  azure_b2s: { label: "Azure B2s", vcpu: 2, ram_gb: 4, cost_per_hour: 0.0416 },
  azure_d2s_v3: {
    label: "Azure D2s_v3",
    vcpu: 2,
    ram_gb: 8,
    cost_per_hour: 0.096,
  },
  azure_d4s_v3: {
    label: "Azure D4s_v3",
    vcpu: 4,
    ram_gb: 16,
    cost_per_hour: 0.192,
  },
};

export const API_GATEWAY_PRICING = {
  http: {
    cost_per_million_requests: 1.0,
    free_tier_requests_per_month: 1_000_000,
  },
  rest: {
    cost_per_million_requests: 3.5,
    free_tier_requests_per_month: 1_000_000,
    cache_cost_per_hour_by_gb: {
      "0.5": 0.02,
      "1.6": 0.034,
      "6.1": 0.2,
    } as Record<string, number>,
  },
  websocket: {
    cost_per_million_messages: 1.0,
    cost_per_million_connection_minutes: 0.25,
    free_tier_messages_per_month: 1_000_000,
    free_tier_connection_minutes_per_month: 750_000,
  },
  data_transfer_out_per_gb: 0.09,
};

export const AZURE_APIM_PRICING: Record<
  AzureApimTier,
  {
    billing_model: "per_call" | "flat_monthly";
    cost_per_million_calls?: number;
    free_calls_per_month?: number;
    cost_per_month?: number;
    has_sla?: boolean;
    max_rps?: number;
    supports_vnet?: boolean;
    supports_multi_region?: boolean;
    supports_vnet_injection?: boolean;
  }
> = {
  consumption: {
    billing_model: "per_call",
    cost_per_million_calls: 3.5,
    free_calls_per_month: 1_000_000,
  },
  developer: {
    billing_model: "flat_monthly",
    cost_per_month: 50,
    has_sla: false,
  },
  basic: { billing_model: "flat_monthly", cost_per_month: 152, max_rps: 1000 },
  standard: {
    billing_model: "flat_monthly",
    cost_per_month: 677,
    supports_vnet: true,
  },
  premium: {
    billing_model: "flat_monthly",
    cost_per_month: 2794,
    supports_multi_region: true,
    supports_vnet_injection: true,
  },
};

// ---- Cost / capacity / simulation engine ----

const RPS_CAPACITY_PER_VCPU = 200; // heuristic for demo purposes — tune as needed

export function getCapacityRps(el: CanvasElement): number {
  if (el.type === "server" && el.serverProvider) {
    return SERVER_PRESETS[el.serverProvider].vcpu * RPS_CAPACITY_PER_VCPU;
  }
  if (el.type === "api_gateway") {
    if (el.gatewayCloud === "azure") {
      const tier = el.azureApimTier ?? "consumption";
      return AZURE_APIM_PRICING[tier].max_rps ?? Infinity;
    }
    return Infinity;
  }
  return Infinity; // load balancers, users — no capacity ceiling modeled in this demo
}

export function getHourlyCost(el: CanvasElement, rps: number): number {
  if (el.type === "load_balancer" && el.lbProvider) {
    return LB_PRESETS[el.lbProvider].cost_per_hour;
  }
  if (el.type === "server" && el.serverProvider) {
    return SERVER_PRESETS[el.serverProvider].cost_per_hour;
  }
  if (el.type === "api_gateway") {
    const requestsPerHour = Math.max(0, rps) * 3600;

    if (el.gatewayCloud === "azure") {
      const tier = el.azureApimTier ?? "consumption";
      const preset = AZURE_APIM_PRICING[tier];
      if (preset.billing_model === "flat_monthly")
        return (preset.cost_per_month ?? 0) / 730;
      return (
        (requestsPerHour / 1_000_000) * (preset.cost_per_million_calls ?? 0)
      );
    }

    const apiType = el.apiType ?? "http";
    if (apiType === "websocket") {
      return (
        (requestsPerHour / 1_000_000) *
        API_GATEWAY_PRICING.websocket.cost_per_million_messages
      );
    }
    let cost =
      (requestsPerHour / 1_000_000) *
      API_GATEWAY_PRICING[apiType].cost_per_million_requests;
    if (apiType === "rest" && el.cachingEnabled && el.cachingSizeGb) {
      cost +=
        API_GATEWAY_PRICING.rest.cache_cost_per_hour_by_gb[
          String(el.cachingSizeGb)
        ] ?? 0;
    }
    return cost;
  }
  return 0;
}

/**
 * Propagates request load from User nodes through the wired connections
 * (fan-out split evenly across each node's outgoing connectors), then
 * derives capacity / overload / hourly-cost per node. Re-run whenever the
 * graph changes; gating the *visual* overload warning behind `simulating`
 * is left to the UI layer.
 */
export function computeMetrics(
  elements: CanvasElement[],
  connections: Connection[],
): Record<string, NodeMetrics> {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const outgoingCount = new Map<string, number>();
  const incoming = new Map<string, Connection[]>();
  connections.forEach((c) => {
    outgoingCount.set(c.from, (outgoingCount.get(c.from) ?? 0) + 1);
    incoming.set(c.to, [...(incoming.get(c.to) ?? []), c]);
  });
  console.log("outgoingCount", Object.fromEntries(outgoingCount));
  console.log("incoming", Object.fromEntries(incoming));
  const rpsCache = new Map<string, number>();
  const visiting = new Set<string>();

  function rpsOf(id: string): number {
    if (rpsCache.has(id)) return rpsCache.get(id)!;
    if (visiting.has(id)) return 0; // guard against accidental cycles
    visiting.add(id);

    const el = byId.get(id);
    let value = 0;
    if (el) {
      if (el.type === "user") {
        value = el.rps ?? 0;
      } else {
        const ins = incoming.get(id) ?? [];
        value = ins.reduce((sum, c) => {
          const fanOut = outgoingCount.get(c.from) ?? 1;
          return sum + rpsOf(c.from) / Math.max(1, fanOut);
        }, 0);
      }
    }

    visiting.delete(id);
    rpsCache.set(id, value);
    return value;
  }

  const metrics: Record<string, NodeMetrics> = {};
  elements.forEach((el) => {
    const rps = rpsOf(el.id);
    const capacity = getCapacityRps(el);
    const overloaded =
      (el.type === "server" || el.type === "api_gateway") && rps > capacity;
    metrics[el.id] = {
      rps,
      capacity,
      overloaded,
      costPerHour: getHourlyCost(el, rps),
    };
  });
  return metrics;
}
