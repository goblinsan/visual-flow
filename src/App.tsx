export default function App() {
  return (
    <div className="min-h-screen grid place-items-center bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-xl rounded-2xl border p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Vizail</h1>
        <p className="opacity-80">Vite + React + TS + Tailwind v4</p>

        <button
          className="mt-6 px-4 py-2 rounded-lg bg-[--color-brand] text-white"
          onClick={() => alert("Tailwind is wired up ✅")}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}
