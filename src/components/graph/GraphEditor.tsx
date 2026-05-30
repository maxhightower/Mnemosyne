"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { api } from "@/lib/client";
import type { SceneDTO } from "@/lib/dto";
import { NODE_DEFS, NODE_LIST, getNodeDef } from "@/lib/graph/registry";
import { runGraph } from "@/lib/graph/executor";
import type { GraphNode, GraphEdge } from "@/lib/graph/types";
import { NODE_RUNNERS } from "./runners";
import { GraphContext } from "./GraphContext";
import MnemoNode from "./MnemoNode";

const TRANSIENT_KEYS = ["_status", "_result"];

function stripTransient(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!TRANSIENT_KEYS.includes(k)) out[k] = v;
  }
  return out;
}

function Inner({ campaignId, scenes }: { campaignId: string; scenes: SceneDTO[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const nodesRef = useRef<Node[]>([]);
  nodesRef.current = nodes;

  const nodeTypes = useMemo<NodeTypes>(
    () =>
      Object.keys(NODE_DEFS).reduce((acc, t) => {
        acc[t] = MnemoNode;
        return acc;
      }, {} as NodeTypes),
    []
  );

  // Load persisted graph.
  useEffect(() => {
    api
      .get<{ data: string }>(`/api/campaigns/${campaignId}/graph`)
      .then((g) => {
        try {
          const parsed = JSON.parse(g.data) as { nodes: Node[]; edges: Edge[] };
          setNodes(parsed.nodes ?? []);
          setEdges(parsed.edges ?? []);
        } catch {
          /* empty graph */
        }
      })
      .finally(() => setLoaded(true));
  }, [campaignId, setNodes, setEdges]);

  const updateNodeData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
      );
    },
    [setNodes]
  );

  const addNode = useCallback(
    (type: string) => {
      const def = getNodeDef(type);
      if (!def) return;
      const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
      setNodes((nds) =>
        nds.concat({
          id,
          type,
          position: { x: 120 + Math.random() * 240, y: 80 + Math.random() * 240 },
          data: { ...def.defaultData },
        })
      );
    },
    [setNodes]
  );

  // Only connect ports of the same type.
  const isValidConnection = useCallback((c: Connection | Edge) => {
    const src = nodesRef.current.find((n) => n.id === c.source);
    const tgt = nodesRef.current.find((n) => n.id === c.target);
    if (!src || !tgt) return false;
    const srcType = getNodeDef(src.type!)?.outputs.find((p) => p.id === c.sourceHandle)?.type;
    const tgtType = getNodeDef(tgt.type!)?.inputs.find((p) => p.id === c.targetHandle)?.type;
    return Boolean(srcType && srcType === tgtType);
  }, []);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)),
    [setEdges]
  );

  const save = useCallback(async () => {
    const clean = nodesRef.current.map((n) => ({ ...n, data: stripTransient(n.data) }));
    await api.post(`/api/campaigns/${campaignId}/graph`, {
      data: { nodes: clean, edges },
    });
    setSavedMsg("Saved ✓");
    setTimeout(() => setSavedMsg(null), 1500);
  }, [campaignId, edges]);

  const run = useCallback(async () => {
    setRunning(true);
    // Reset statuses.
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, _status: "idle" } })));
    const gNodes: GraphNode[] = nodesRef.current.map((n) => ({
      id: n.id,
      type: n.type!,
      position: n.position,
      data: stripTransient(n.data),
    }));
    const gEdges: GraphEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));
    await runGraph(gNodes, gEdges, NODE_RUNNERS, { campaignId }, {
      onStatus: (id, status) => updateNodeData(id, { _status: status }),
      onResult: (id, outputs) => updateNodeData(id, { _result: outputs }),
    });
    setRunning(false);
  }, [campaignId, edges, setNodes, updateNodeData]);

  return (
    <GraphContext.Provider value={{ scenes, updateNodeData }}>
      <div className="flex h-screen flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 bg-ink-900 px-4 py-2">
          <span className="mr-2 text-sm font-semibold text-ember-400">Node Editor</span>
          <span className="text-xs text-stone-500">add:</span>
          {NODE_LIST.map((d) => (
            <button key={d.type} className="btn-secondary text-xs" onClick={() => addNode(d.type)}>
              + {d.title}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {savedMsg && <span className="text-xs text-emerald-400">{savedMsg}</span>}
            <button className="btn-secondary text-xs" onClick={save}>
              Save
            </button>
            <button className="btn-primary text-xs" onClick={run} disabled={running}>
              {running ? "Running…" : "▶ Run graph"}
            </button>
          </div>
        </div>

        <div className="relative flex-1">
          {loaded && nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <p className="rounded-md bg-ink-900/80 px-4 py-3 text-sm text-stone-400">
                Empty graph. Add <span className="text-stone-200">Scene → Prompt → Render →
                Preview</span> and wire them, then Run.
              </p>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#2e323d" gap={18} />
            <Controls />
            <MiniMap pannable zoomable className="!bg-ink-800" />
          </ReactFlow>
        </div>
      </div>
    </GraphContext.Provider>
  );
}

export default function GraphEditor(props: { campaignId: string; scenes: SceneDTO[] }) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
