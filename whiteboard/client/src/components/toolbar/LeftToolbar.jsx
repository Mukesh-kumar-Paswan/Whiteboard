import {
  MousePointer2,
  Hand,
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Type,
  Trash2,
  Monitor,
  Network,
  Server,
  Database,
  Zap,
  Inbox,
} from 'lucide-react';

const DRAWING_TOOLS = [
  { id: 'select', label: 'Select / Move (V)', icon: MousePointer2 },
  { id: 'pan', label: 'Pan Canvas (H)', icon: Hand },
  { id: 'pencil', label: 'Freehand Pencil (P)', icon: Pencil },
  { id: 'rect', label: 'Rectangle (R)', icon: Square },
  { id: 'circle', label: 'Circle (C)', icon: Circle },
  { id: 'arrow', label: 'Smart Arrow Connector (A)', icon: ArrowRight },
  { id: 'text', label: 'Text Label (T)', icon: Type },
];

const TECH_BLOCKS = [
  { type: 'client', label: 'Client', icon: Monitor, color: 'text-sky-400' },
  { type: 'api-gateway', label: 'API Gateway', icon: Network, color: 'text-purple-400' },
  { type: 'server', label: 'App Server', icon: Server, color: 'text-emerald-400' },
  { type: 'database', label: 'Database', icon: Database, color: 'text-amber-400' },
  { type: 'cache', label: 'Redis Cache', icon: Zap, color: 'text-red-400' },
  { type: 'queue', label: 'Msg Queue', icon: Inbox, color: 'text-pink-400' },
];

const STROKE_COLORS = [
  '#F8FAFC',
  '#38BDF8',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#A855F7',
  '#EC4899',
];

const FILL_COLORS = [
  'transparent',
  '#0F172A',
  '#1E293B',
  '#0C4A6E',
  '#14532D',
  '#78350F',
  '#4C1D95',
];

const STROKE_WIDTHS = [2, 3, 5];

export default function LeftToolbar({
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
  strokeWidth,
  setStrokeWidth,
  onAddTechNode,
  selectedId,
  onDeleteSelected,
  isReadOnly = false,
}) {
  return (
    <aside className="z-20 flex h-full w-16 shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-slate-800 bg-slate-900/95 py-3 select-none">
      {/* Drawing & Navigation Tools */}
      <div className="flex flex-col items-center gap-1">
        {DRAWING_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isDisabled = isReadOnly && tool.id !== 'pan';
          const isActive = (isReadOnly ? 'pan' : activeTool) === tool.id;

          return (
            <button
              key={tool.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              } disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      <div className="h-px w-8 shrink-0 bg-slate-800" />

      {/* System Design Building Blocks */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">
          Nodes
        </span>
        {TECH_BLOCKS.map((block) => {
          const Icon = block.icon;
          return (
            <button
              key={block.type}
              type="button"
              disabled={isReadOnly}
              onClick={() => onAddTechNode(block.type)}
              title={`Add ${block.label} Node`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Icon className={`h-4 w-4 ${block.color}`} />
            </button>
          );
        })}
      </div>

      <div className="h-px w-8 shrink-0 bg-slate-800" />

      {/* Stroke Color */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">
          Stroke
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {STROKE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              disabled={isReadOnly}
              onClick={() => setStrokeColor(color)}
              title={`Stroke: ${color}`}
              style={{ backgroundColor: color }}
              className={`h-4 w-4 rounded-full border transition ${
                strokeColor === color
                  ? 'scale-110 border-white ring-2 ring-blue-500'
                  : 'border-slate-700 hover:scale-105'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            />
          ))}
        </div>
      </div>

      {/* Fill Color */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">
          Fill
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {FILL_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              disabled={isReadOnly}
              onClick={() => setFillColor(color)}
              title={`Fill: ${color}`}
              style={{
                backgroundColor: color === 'transparent' ? '#020617' : color,
                backgroundImage:
                  color === 'transparent'
                    ? 'linear-gradient(135deg, transparent 45%, #EF4444 45%, #EF4444 55%, transparent 55%)'
                    : 'none',
              }}
              className={`h-4 w-4 rounded-full border transition ${
                fillColor === color
                  ? 'scale-110 border-white ring-2 ring-blue-500'
                  : 'border-slate-700 hover:scale-105'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">
          Size
        </span>
        <div className="flex flex-col gap-1">
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              disabled={isReadOnly}
              onClick={() => setStrokeWidth(width)}
              title={`Stroke width: ${width}px`}
              className={`flex h-6 w-9 items-center justify-center rounded-md border transition ${
                strokeWidth === width
                  ? 'border-blue-500 bg-blue-600/20'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span
                style={{ height: `${width}px` }}
                className="w-5 rounded-full bg-slate-200"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Delete Selected Element */}
      {!isReadOnly && (
        <>
          <div className="h-px w-8 shrink-0 bg-slate-800" />
          <button
            type="button"
            disabled={!selectedId}
            onClick={onDeleteSelected}
            title="Delete Selected (Del)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </aside>
  );
}