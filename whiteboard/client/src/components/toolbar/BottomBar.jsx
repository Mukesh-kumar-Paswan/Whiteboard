import { Undo2, Redo2, ZoomIn, ZoomOut, RotateCcw, Trash } from 'lucide-react';

export default function BottomBar({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  stageScale = 1,
  onZoomIn,
  onZoomOut,
  onResetView,
  onClearPage,
  isReadOnly = false,
}) {
  const zoomPercent = Math.round(stageScale * 100);

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
      {/* Undo / Redo */}
      {!isReadOnly && (
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/95 p-1 shadow-xl backdrop-blur">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/95 p-1 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onResetView}
          title="Reset Zoom & Position"
          className="min-w-[54px] rounded-lg px-2 py-1 text-center font-mono text-xs font-medium text-slate-200 transition hover:bg-slate-800"
        >
          {zoomPercent}%
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="mx-0.5 h-5 w-px bg-slate-800" />

        <button
          type="button"
          onClick={onResetView}
          title="Center Canvas"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Clear Current Page */}
      {!isReadOnly && (
        <div className="pointer-events-auto flex items-center rounded-xl border border-slate-800 bg-slate-900/95 p-1 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={onClearPage}
            title="Clear Current Page"
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-red-400 transition hover:bg-red-500/15"
          >
            <Trash className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      )}
    </div>
  );
}