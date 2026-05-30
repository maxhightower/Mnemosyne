// Core types for the in-app node editor.
//
// The graph document is stored in React Flow's shape: a list of nodes (each with
// id, type, position, data) and edges (id, source, target, sourceHandle,
// targetHandle). Ports are typed so the editor can validate connections and the
// executor can route values.

export type PortType = "scene" | "spec" | "image" | "text";

export interface PortDef {
  id: string; // also the React Flow handle id
  label: string;
  type: PortType;
}

export type NodeCategory = "memory" | "prompt" | "render" | "output";

export interface NodeDef {
  type: string;
  title: string;
  category: NodeCategory;
  description: string;
  inputs: PortDef[];
  outputs: PortDef[];
  defaultData: Record<string, unknown>;
}

// A serialized graph node (subset of React Flow's Node we persist).
export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type NodeStatus = "idle" | "running" | "ok" | "error" | "skipped";

export interface RunContext {
  campaignId: string;
}

// A runner executes one node: given its data and the values arriving on its input
// ports, it returns values keyed by output port id.
export type NodeRunner = (
  ctx: RunContext,
  inputs: Record<string, unknown>,
  data: Record<string, unknown>
) => Promise<Record<string, unknown>>;

export interface PortColors {
  [key: string]: string;
}

export const PORT_COLORS: Record<PortType, string> = {
  scene: "#7aa2f7", // arcane blue
  spec: "#f0b35b", // ember
  image: "#34d399", // emerald
  text: "#a78bfa", // violet
};
