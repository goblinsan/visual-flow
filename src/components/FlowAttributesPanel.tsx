import React, { useMemo } from "react";
import { Select } from "./Select";
import type { Flow, FlowTransition } from "../layout-schema";

export interface FlowAttributesPanelProps {
  flows: Flow[];
  activeFlowId: string | null;
  setActiveFlowId: (id: string) => void;
  screenId: string;
  screenName: string;
  onUpdateFlows: (next: Flow[]) => void;
  onFocusScreen: (screenId: string) => void;
  onSelectScreen: (screenId: string) => void;
  onTriggerTransition?: (toScreenId: string, transition?: FlowTransition) => void;
}

const ANIMATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
];

const normalizeAnimation = (value: string) => {
  if (value.startsWith("slide")) return "slide";
  return value;
};

const EASING_OPTIONS = [
  { value: "linear", label: "Linear" },
  { value: "ease", label: "Ease" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In Out" },
];

export const FlowAttributesPanel: React.FC<FlowAttributesPanelProps> = ({
  flows,
  activeFlowId,
  setActiveFlowId,
  screenId,
  screenName,
  onUpdateFlows,
  onFocusScreen,
  onSelectScreen,
  onTriggerTransition,
}) => {
  const activeFlow = flows.find(f => f.id === activeFlowId) || flows.find(f => f.screenIds.includes(screenId)) || flows[0];

  const flowOptions = useMemo(() => flows.map(f => ({ value: f.id, label: f.name })), [flows]);

  const screenOptions = useMemo(() => {
    const ids = activeFlow?.screenIds ?? [];
    return ids.map(id => ({ value: id, label: id === screenId ? `${screenName} (current)` : id }));
  }, [activeFlow?.screenIds, screenId, screenName]);

  const ensureScreenInFlow = (flowId: string) => {
    const next = flows.map(f => {
      if (f.id !== flowId) return f;
      if (f.screenIds.includes(screenId)) return f;
      return { ...f, screenIds: [...f.screenIds, screenId] };
    });
    onUpdateFlows(next);
  };

  const moveScreen = (dir: -1 | 1) => {
    if (!activeFlow) return;
    const idx = activeFlow.screenIds.indexOf(screenId);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= activeFlow.screenIds.length) return;
    const nextIds = activeFlow.screenIds.slice();
    const tmp = nextIds[idx];
    nextIds[idx] = nextIds[nextIdx];
    nextIds[nextIdx] = tmp;
    onUpdateFlows(flows.map(f => f.id === activeFlow.id ? { ...f, screenIds: nextIds } : f));
  };

  const addTransition = () => {
    if (!activeFlow) return;
    const first = activeFlow.screenIds[0] || screenId;
    const second = activeFlow.screenIds[1] || screenId;
    const next: FlowTransition = {
      id: `trans_${Date.now().toString(36)}`,
      from: first,
      to: second,
      trigger: "",
      animation: "none",
      durationMs: 300,
      easing: "ease-out",
    };
    onUpdateFlows(flows.map(f => f.id === activeFlow.id ? { ...f, transitions: [...f.transitions, next] } : f));
  };

  const updateTransition = (id: string, patch: Partial<FlowTransition>) => {
    if (!activeFlow) return;
    const next = activeFlow.transitions.map(t => t.id === id ? { ...t, ...patch } : t);
    onUpdateFlows(flows.map(f => f.id === activeFlow.id ? { ...f, transitions: next } : f));
  };

  const removeTransition = (id: string) => {
    if (!activeFlow) return;
    const next = activeFlow.transitions.filter(t => t.id !== id);
    onUpdateFlows(flows.map(f => f.id === activeFlow.id ? { ...f, transitions: next } : f));
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold text-gray-600 flex items-center gap-2">
        <i className="fa-solid fa-diagram-project text-gray-400 text-[10px]" />
        Flow
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={activeFlow?.id || ""}
            onChange={(val) => {
              setActiveFlowId(val);
              ensureScreenInFlow(val);
            }}
            options={flowOptions}
            placeholder="Select flow"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const id = `flow_${Date.now().toString(36)}`;
            const next = [...flows, { id, name: `Flow ${flows.length + 1}`, screenIds: [screenId], transitions: [] }];
            onUpdateFlows(next);
            setActiveFlowId(id);
          }}
          className="px-2 py-1.5 rounded-md border border-gray-200 text-[11px] hover:bg-gray-50"
        >
          New
        </button>
      </div>

      {activeFlow && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Screen Order</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => moveScreen(-1)} className="px-2 py-1.5 rounded border border-gray-200 text-[11px] hover:bg-gray-50">Up</button>
            <button type="button" onClick={() => moveScreen(1)} className="px-2 py-1.5 rounded border border-gray-200 text-[11px] hover:bg-gray-50">Down</button>
            <button type="button" onClick={() => onFocusScreen(screenId)} className="ml-auto px-2 py-1.5 rounded border border-gray-200 text-[11px] hover:bg-gray-50">Focus</button>
          </div>
          <div className="space-y-1">
            {activeFlow.screenIds.map((id, idx) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelectScreen(id)}
                className={`w-full text-left px-2 py-1.5 rounded border text-[11px] ${id === screenId ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                {idx + 1}. {id === screenId ? `${screenName} (current)` : id}
              </button>
            ))}
          </div>

          <div className="text-[10px] uppercase tracking-wider text-gray-500 pt-2">Transitions</div>
          <div className="space-y-2">
            {activeFlow.transitions.map((t) => (
              <div key={t.id} className="rounded-lg border border-gray-200 p-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={t.from} onChange={(val) => updateTransition(t.id, { from: val })} options={screenOptions} />
                  <Select value={t.to} onChange={(val) => updateTransition(t.id, { to: val })} options={screenOptions} />
                </div>
                <input
                  value={t.trigger}
                  onChange={(e) => updateTransition(t.id, { trigger: e.target.value })}
                  placeholder="Trigger (e.g. button click)"
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-[11px]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={normalizeAnimation(t.animation)}
                    onChange={(val) => updateTransition(t.id, { animation: val as FlowTransition["animation"] })}
                    options={ANIMATION_OPTIONS}
                  />
                  <button type="button" onClick={() => removeTransition(t.id)} className="px-2 py-1.5 rounded border border-red-200 text-[11px] text-red-600 hover:bg-red-50">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400">Duration (ms)</div>
                    <input
                      type="number"
                      min={0}
                      value={t.durationMs ?? 300}
                      onChange={(e) => updateTransition(t.id, { durationMs: Math.max(0, Number(e.target.value || 0)) })}
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400">Easing</div>
                    <Select value={t.easing ?? "ease-out"} onChange={(val) => updateTransition(t.id, { easing: val as FlowTransition["easing"] })} options={EASING_OPTIONS} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addTransition} className="px-2 py-1.5 rounded border border-gray-200 text-[11px] hover:bg-gray-50">Add Transition</button>

          <div className="flex items-center gap-2 pt-2">
            <button type="button" onClick={() => {
              const idx = activeFlow.screenIds.indexOf(screenId);
              if (idx > 0) {
                const target = activeFlow.screenIds[idx - 1];
                const transition = activeFlow.transitions.find(t => t.from === screenId && t.to === target);
                if (onTriggerTransition) {
                  onTriggerTransition(target, transition);
                } else {
                  onSelectScreen(target);
                }
              }
            }} className="px-2 py-1.5 rounded border border-gray-200 text-[11px] hover:bg-gray-50">Previous</button>
            <button type="button" onClick={() => {
              const idx = activeFlow.screenIds.indexOf(screenId);
              if (idx >= 0 && idx < activeFlow.screenIds.length - 1) {
                const target = activeFlow.screenIds[idx + 1];
                const transition = activeFlow.transitions.find(t => t.from === screenId && t.to === target);
                if (onTriggerTransition) {
                  onTriggerTransition(target, transition);
                } else {
                  onSelectScreen(target);
                }
              }
            }} className="px-2 py-1.5 rounded border border-gray-200 text-[11px] hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};
