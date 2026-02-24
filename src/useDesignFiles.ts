import { useEffect, useMemo, useState } from "react";
import type { RootSpec } from "./dsl";
import { buildInventoryAdvanced } from "./samples/inventoryAdvanced";
import { robloxHud } from "./samples/robloxHud";

type StoredFile = { id: string; name: string; spec: RootSpec };

const KEY = "vf.design.files.v1";
const ACTIVE_KEY = "vf.design.active";

function loadAll(): StoredFile[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredFile[]) : [];
  } catch {
    return [];
  }
}
function saveAll(files: StoredFile[]) {
  localStorage.setItem(KEY, JSON.stringify(files));
}

function uuid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useDesignFiles() {
  const [files, setFiles] = useState<StoredFile[]>(() => loadAll());
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(ACTIVE_KEY));

  useEffect(() => saveAll(files), [files]);
  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeId]);

  const active = useMemo(() => files.find((f) => f.id === activeId) ?? null, [files, activeId]);

  const selectFile = (id: string) => setActiveId(id);

  const createFromSample = () => {
    const spec = buildInventoryAdvanced({
      gold: 1200,
      gems: 5,
      level: 12,
      power: 200,
      items: Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i+1}`,
        name: `Item ${i+1}`,
        rarity: (['common','rare','epic','legendary','unique'] as const)[i % 5],
        icon: ["⚔️","🪖","🛡️","🧙","🧪"][i % 5],
        power: (i * 7) % 100,
        speed: (i * 11) % 100,
        area: (i * 17) % 100,
        enchantments: [],
      })),
      selectedId: "item-1",
    });
    const id = uuid();
    const name = `Sample ${new Date().toLocaleString()}`;
    const entry: StoredFile = { id, name, spec };
    const next = [entry, ...files];
    setFiles(next);
    setActiveId(id);
  };

  const createFromRobloxSample = () => {
    const id = uuid();
    const name = `Roblox HUD ${new Date().toLocaleString()}`;
    const entry: StoredFile = { id, name, spec: robloxHud };
    const next = [entry, ...files];
    setFiles(next);
    setActiveId(id);
  };

  const saveActive = (spec: RootSpec) => {
    if (!active) return;
    const next = files.map((f) => (f.id === active.id ? { ...f, spec } : f));
    setFiles(next);
  };

  const saveAs = (name: string, spec: RootSpec) => {
    const id = uuid();
    const entry: StoredFile = { id, name, spec };
    setFiles([entry, ...files]);
    setActiveId(id);
  };

  const importFromJsonText = (text: string) => {
    try {
      const spec = JSON.parse(text) as RootSpec;
      const name = `Imported ${new Date().toLocaleString()}`;
      const id = uuid();
      const entry: StoredFile = { id, name, spec };
      setFiles([entry, ...files]);
      setActiveId(id);
    } catch {
      alert("Invalid JSON");
    }
  };

  const exportActiveJson = () => {
    if (!active) return;
    const text = JSON.stringify(active.spec, null, 2);
    navigator.clipboard?.writeText(text).catch(() => {});
    alert("Design JSON copied to clipboard.");
  };

  return {
    files: files.map(({ id, name }) => ({ id, name })),
    activeId,
    active,
    selectFile,
    saveActive,
    saveAs,
    createFromSample,
    createFromRobloxSample,
    importFromJsonText,
    exportActiveJson,
  } as const;
}
