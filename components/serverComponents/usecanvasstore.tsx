import { create } from "zustand";

export type ElementType = "rectangle" | "text";

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
}

interface Store {
  elements: CanvasElement[];
  selected: string | null;
  tool: ElementType | null;
  setTool: (t: ElementType | null) => void;
  addElement: (el: CanvasElement) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  setSelected: (id: string | null) => void;
}

export const useCanvasStore = create<Store>((set) => ({
  elements: [],
  selected: null,
  tool: null,
  setTool: (tool) => set({ tool }),
  addElement: (el) => set((s) => ({ elements: [...s.elements, el] })),
  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  setSelected: (selected) => set({ selected }),
}));
