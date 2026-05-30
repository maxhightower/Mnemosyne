import type {
  GraphNode,
  GraphEdge,
  NodeRunner,
  NodeStatus,
  RunContext,
} from "./types";

// A pure, client-runnable graph executor. It topologically orders the nodes,
// gathers each node's inputs from incoming edges, invokes the matching runner,
// and routes outputs forward. Async nodes (prompt, render) are awaited in order.
//
// Kept provider-agnostic and side-effect-free apart from the runners themselves,
// so it can later move server-side (into a job worker) without changes.

export interface RunCallbacks {
  onStatus?: (nodeId: string, status: NodeStatus) => void;
  onResult?: (nodeId: string, outputs: Record<string, unknown>) => void;
  onError?: (nodeId: string, message: string) => void;
}

export interface RunOutcome {
  outputsByNode: Record<string, Record<string, unknown>>;
  status: Record<string, NodeStatus>;
  errors: Record<string, string>;
}

/** Kahn topological sort. Returns null if the graph has a cycle. */
export function topoSort(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] | null {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (!indeg.has(e.source) || !indeg.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      indeg.set(next, (indeg.get(next) ?? 0) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  if (order.length !== nodes.length) return null; // cycle
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return order.map((id) => byId.get(id)!);
}

export async function runGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  runners: Record<string, NodeRunner>,
  ctx: RunContext,
  cb: RunCallbacks = {}
): Promise<RunOutcome> {
  const outcome: RunOutcome = { outputsByNode: {}, status: {}, errors: {} };
  for (const n of nodes) outcome.status[n.id] = "idle";

  const ordered = topoSort(nodes, edges);
  if (!ordered) {
    for (const n of nodes) {
      outcome.status[n.id] = "error";
      outcome.errors[n.id] = "Graph contains a cycle.";
      cb.onError?.(n.id, "Graph contains a cycle.");
    }
    return outcome;
  }

  // Precompute incoming edges per node for input gathering.
  const incoming = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target)!.push(e);
  }

  for (const node of ordered) {
    // Gather inputs: for each incoming edge, take the source node's output for
    // the source handle and place it under the target handle (input port id).
    const inputs: Record<string, unknown> = {};
    let upstreamFailed = false;
    for (const e of incoming.get(node.id) ?? []) {
      if (outcome.status[e.source] !== "ok") {
        upstreamFailed = true;
        break;
      }
      const srcOut = outcome.outputsByNode[e.source] ?? {};
      const portValue = e.sourceHandle ? srcOut[e.sourceHandle] : Object.values(srcOut)[0];
      if (e.targetHandle) inputs[e.targetHandle] = portValue;
    }

    if (upstreamFailed) {
      outcome.status[node.id] = "skipped";
      cb.onStatus?.(node.id, "skipped");
      continue;
    }

    const runner = runners[node.type];
    if (!runner) {
      outcome.status[node.id] = "error";
      outcome.errors[node.id] = `No runner for node type "${node.type}".`;
      cb.onStatus?.(node.id, "error");
      cb.onError?.(node.id, outcome.errors[node.id]);
      continue;
    }

    outcome.status[node.id] = "running";
    cb.onStatus?.(node.id, "running");
    try {
      const outputs = await runner(ctx, inputs, node.data ?? {});
      outcome.outputsByNode[node.id] = outputs ?? {};
      outcome.status[node.id] = "ok";
      cb.onStatus?.(node.id, "ok");
      cb.onResult?.(node.id, outputs ?? {});
    } catch (err) {
      outcome.status[node.id] = "error";
      outcome.errors[node.id] = (err as Error).message;
      cb.onStatus?.(node.id, "error");
      cb.onError?.(node.id, (err as Error).message);
    }
  }

  return outcome;
}
