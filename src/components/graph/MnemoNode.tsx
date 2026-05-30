"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { getNodeDef } from "@/lib/graph/registry";
import { PORT_COLORS, type NodeStatus, type PortDef } from "@/lib/graph/types";
import { useGraphContext } from "./GraphContext";

const STATUS_COLOR: Record<NodeStatus, string> = {
  idle: "#52525b",
  running: "#f0b35b",
  ok: "#34d399",
  error: "#f87171",
  skipped: "#71717a",
};

function Ports({ ports, kind }: { ports: PortDef[]; kind: "target" | "source" }) {
  const isInput = kind === "target";
  return (
    <>
      {ports.map((p, i) => {
        const top = 44 + i * 26;
        return (
          <div key={p.id}>
            <Handle
              id={p.id}
              type={kind}
              position={isInput ? Position.Left : Position.Right}
              style={{
                top,
                width: 12,
                height: 12,
                background: PORT_COLORS[p.type],
                border: "2px solid #0b0c10",
              }}
            />
            <span
              className="absolute text-[10px] uppercase tracking-wide text-stone-400"
              style={{ top: top - 8, [isInput ? "left" : "right"]: 14 } as React.CSSProperties}
            >
              {p.label}
            </span>
          </div>
        );
      })}
    </>
  );
}

export default function MnemoNode({ id, type, data }: NodeProps) {
  const def = getNodeDef(type);
  const { scenes, updateNodeData } = useGraphContext();
  if (!def) return null;

  const status: NodeStatus = (data._status as NodeStatus) ?? "idle";
  const result = data._result as Record<string, unknown> | undefined;
  const rows = Math.max(def.inputs.length, def.outputs.length);
  const minHeight = 64 + rows * 26;

  return (
    <div
      className="relative rounded-lg border border-ink-600 bg-ink-900 shadow-lg"
      style={{ width: 240, minHeight }}
    >
      <Ports ports={def.inputs} kind="target" />
      <Ports ports={def.outputs} kind="source" />

      {/* Header */}
      <div className="flex items-center justify-between rounded-t-lg border-b border-ink-700 bg-ink-800 px-3 py-2">
        <span className="text-sm font-medium text-stone-100">{def.title}</span>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: STATUS_COLOR[status] }}
          title={status}
        />
      </div>

      {/* Body */}
      <div className="space-y-2 px-3 py-3 text-xs text-stone-300">
        {type === "scene" && (
          <select
            className="input nodrag w-full text-xs"
            value={String(data.sceneId ?? "")}
            onChange={(e) => updateNodeData(id, { sceneId: e.target.value })}
          >
            <option value="">— pick scene —</option>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
                {s.isActive ? " (active)" : ""}
              </option>
            ))}
          </select>
        )}

        {type === "prompt" && (
          <label className="nodrag flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(data.useAI)}
              onChange={(e) => updateNodeData(id, { useAI: e.target.checked })}
              className="accent-ember-500"
            />
            Use AI
          </label>
        )}

        {type === "render" && (
          <div className="nodrag flex gap-2">
            <label className="flex-1">
              w
              <input
                type="number"
                className="input text-xs"
                value={Number(data.width ?? 1024)}
                onChange={(e) => updateNodeData(id, { width: Number(e.target.value) })}
              />
            </label>
            <label className="flex-1">
              h
              <input
                type="number"
                className="input text-xs"
                value={Number(data.height ?? 1024)}
                onChange={(e) => updateNodeData(id, { height: Number(e.target.value) })}
              />
            </label>
          </div>
        )}

        {/* Result surfaces */}
        {type === "prompt" && result?.spec ? (
          <p className="line-clamp-3 text-[11px] text-stone-400">
            {(result.spec as { shortPrompt?: string }).shortPrompt}
          </p>
        ) : null}

        {(type === "preview" || type === "render") && imageUrl(result) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(result)!}
            alt="render"
            className="nodrag mt-1 w-full rounded border border-ink-700"
          />
        ) : null}
      </div>
    </div>
  );
}

function imageUrl(result: Record<string, unknown> | undefined): string | null {
  const img = result?.image as { url?: string } | undefined;
  return img?.url ?? null;
}
