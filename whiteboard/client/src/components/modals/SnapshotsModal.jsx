import { useState } from 'react';
import { X, History, Plus, RotateCcw, Trash2, Clock, User } from 'lucide-react';

export default function SnapshotsModal({
  isOpen,
  onClose,
  snapshots = [],
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  isReadOnly = false,
}) {
  const [snapshotName, setSnapshotName] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isReadOnly || !onCreateSnapshot) return;
    setError('');
    setCreating(true);

    try {
      await onCreateSnapshot(snapshotName.trim());
      setSnapshotName('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save snapshot');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (snapshot) => {
    if (isReadOnly || !onRestoreSnapshot) return;
    const confirmed = window.confirm(
      `Restore "${snapshot.name}"? This will replace all current pages on the board for everyone.`
    );
    if (!confirmed) return;

    setError('');
    setBusyId(snapshot.id);
    try {
      await onRestoreSnapshot(snapshot.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore snapshot');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (snapshotId) => {
    if (isReadOnly || !onDeleteSnapshot) return;
    setError('');
    setBusyId(snapshotId);
    try {
      await onDeleteSnapshot(snapshotId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete snapshot');
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-xs">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Version Snapshots</h2>
              <p className="text-xs text-slate-400">
                Save milestones and roll back anytime
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Create Snapshot Form */}
          {!isReadOnly && (
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="Snapshot label (e.g., v1 Auth Flow)"
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={creating}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                <span>{creating ? 'Saving...' : 'Save Now'}</span>
              </button>
            </form>
          )}

          {/* Snapshot List */}
          <div className="space-y-2.5">
            {snapshots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 py-10 text-center">
                <p className="text-sm font-medium text-slate-300">No snapshots yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Save a snapshot to bookmark the current architecture state.
                </p>
              </div>
            ) : (
              snapshots.map((snap) => {
                const isBusy = busyId === snap.id;
                const pageCount = Array.isArray(snap.pages) ? snap.pages.length : 1;

                return (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 transition hover:border-slate-700"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-white">
                        {snap.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-500" />
                          {snap.createdBy || 'Guest'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {formatDate(snap.createdAt)}
                        </span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      </div>
                    </div>

                    {!isReadOnly && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRestore(snap)}
                          title="Restore this snapshot"
                          className="flex items-center gap-1 rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(snap.id)}
                          title="Delete snapshot"
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}