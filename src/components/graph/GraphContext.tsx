"use client";

import { createContext, useContext } from "react";
import type { SceneDTO } from "@/lib/dto";

export interface GraphContextValue {
  scenes: SceneDTO[];
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
}

export const GraphContext = createContext<GraphContextValue>({
  scenes: [],
  updateNodeData: () => {},
});

export const useGraphContext = () => useContext(GraphContext);
