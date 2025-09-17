
export type FileEntry = { id: string; name: string };

export function Sidebar({
  files,
  activeId,
  onSelect,
  onCreateSample,
}: {
  files: FileEntry[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  onCreateSample: () => void;
}) {
  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-semibold">Files</div>
      <div className="space-y-1">
        {files.length === 0 ? (
          <div className="text-xs opacity-70">No files yet.</div>
        ) : (
          files.map((f) => (
            <button key={f.id} className={`w-full text-left px-2 py-1 rounded ${activeId === f.id ? "bg-slate-800 border border-slate-700" : "hover:bg-slate-900/60"}`} onClick={() => onSelect(f.id)}>
              <div className="text-sm">{f.name}</div>
              <div className="text-[10px] opacity-60">{f.id}</div>
            </button>
          ))
        )}
      </div>
      <div className="pt-2 border-t border-slate-800/60">
        <button className="w-full px-2 py-1 rounded border border-slate-700 bg-slate-800" onClick={onCreateSample}>New from Sample</button>
      </div>
    </div>
  );
}
