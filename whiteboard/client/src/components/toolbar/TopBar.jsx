import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Square,
  History,
  Download,
  Share2,
  MessageSquare,
  Save,
  Plus,
  X,
  Eye,
  Pencil,
  Check,
} from 'lucide-react';

export default function TopBar({
  boardName,
  onRenameBoard,
  roomId,
  pages = [],
  activePageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  isFlowPlaying,
  onToggleFlow,
  onOpenSnapshots,
  onExportPng,
  onOpenShare,
  onToggleChat,
  unreadCount = 0,
  onManualSave,
  saveStatus = 'saved',
  roomUsers = [],
  isReadOnly = false,
  onBackToDashboard,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(boardName || '');

  useEffect(() => {
    setTitleDraft(boardName || '');
  }, [boardName]);

  const commitTitle = () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== boardName && onRenameBoard) {
      onRenameBoard(trimmed);
    } else {
      setTitleDraft(boardName || '');
    }
  };

  return (
    <header className="z-20 flex h-14 w-full shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3 backdrop-blur">
      {/* Left: Back, Title, Room ID, Role */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onBackToDashboard}
          title="Back to Dashboard"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition hover:border-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            {editingTitle && !isReadOnly ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTitle();
                    if (e.key === 'Escape') {
                      setTitleDraft(boardName || '');
                      setEditingTitle(false);
                    }
                  }}
                  className="w-44 rounded border border-blue-500 bg-slate-950 px-2 py-0.5 text-sm font-semibold text-white outline-none"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={commitTitle}
                  className="rounded p-0.5 text-emerald-400 hover:bg-slate-800"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && setEditingTitle(true)}
                title={isReadOnly ? boardName : 'Click to rename board'}
                className="group flex max-w-[180px] items-center gap-1.5 truncate text-left text-sm font-semibold text-white disabled:cursor-default"
              >
                <span className="truncate">{boardName || 'Untitled Architecture'}</span>
                {!isReadOnly && (
                  <Pencil className="h-3 w-3 shrink-0 text-slate-500 opacity-0 transition group-hover:opacity-100" />
                )}
              </button>
            )}

            <span className="hidden rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-blue-300 sm:inline-block">
              {roomId}
            </span>

            {isReadOnly && (
              <span className="flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                <Eye className="h-3 w-3" />
                View Only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Multi-Canvas / Page Tabs */}
      <div className="mx-2 flex max-w-md items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-1">
        {pages.map((page) => {
          const isActive = page.id === activePageId;
          return (
            <div
              key={page.id}
              className={`group flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPage(page.id)}
                className="max-w-[90px] truncate"
              >
                {page.name}
              </button>
              {!isReadOnly && pages.length > 1 && (
                <button
                  type="button"
                  title="Delete page"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(page.id);
                  }}
                  className="rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-slate-700 hover:text-red-400 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {!isReadOnly && (
          <button
            type="button"
            onClick={onAddPage}
            title="Add new canvas page"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Right: Presence, Play Flow, Save, Snapshots, Export, Share, Chat */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Online Collaborators */}
        <div className="mr-1 hidden items-center -space-x-1.5 lg:flex">
          {roomUsers.slice(0, 4).map((u) => (
            <div
              key={u.socketId}
              title={`${u.userName} (${u.permission})`}
              style={{ backgroundColor: u.color || '#3B82F6' }}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 text-[11px] font-bold text-white"
            >
              {(u.userName || 'G').charAt(0).toUpperCase()}
            </div>
          ))}
          {roomUsers.length > 4 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-[10px] font-semibold text-slate-200">
              +{roomUsers.length - 4}
            </div>
          )}
        </div>

        {/* Play Flow Toggle */}
        <button
          type="button"
          onClick={onToggleFlow}
          title="Animate data packets along arrows"
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
            isFlowPlaying
              ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
              : 'border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white'
          }`}
        >
          {isFlowPlaying ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          <span className="hidden md:inline">{isFlowPlaying ? 'Stop Flow' : 'Play Flow'}</span>
        </button>

        {/* Save Button */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={onManualSave}
            title="Save board to database"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </span>
          </button>
        )}

        {/* Snapshots */}
        <button
          type="button"
          onClick={onOpenSnapshots}
          title="Version Snapshots"
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Snapshots</span>
        </button>

        {/* Export PNG */}
        <button
          type="button"
          onClick={onExportPng}
          title="Export canvas as PNG"
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">PNG</span>
        </button>

        {/* Share Modal */}
        <button
          type="button"
          onClick={onOpenShare}
          title="Share room link & settings"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Chat & Voice Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleChat}
          title="Room Chat & Voice Notes"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-300 transition hover:border-slate-700 hover:text-white"
        >
          <MessageSquare className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}