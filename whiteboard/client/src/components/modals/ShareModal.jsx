import { useState } from 'react';
import { X, Copy, Check, Link2, Lock, Shield, Users } from 'lucide-react';

export default function ShareModal({
  isOpen,
  onClose,
  roomId,
  boardName,
  defaultPermission,
  hasPassword,
  currentPassword = '',
  roomUsers = [],
  canManageSettings = false,
  onSaveSettings,
}) {
  const [copiedField, setCopiedField] = useState('');
  const [permissionDraft, setPermissionDraft] = useState(defaultPermission || 'editor');
  const [passwordDraft, setPasswordDraft] = useState(currentPassword || '');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const baseUrl = `${window.location.origin}/room/${roomId}`;
  const editorLink = `${baseUrl}?role=editor`;
  const viewerLink = `${baseUrl}?role=viewer`;

  const copyText = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 1800);
    } catch {
      alert('Copy failed. Please copy manually.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!onSaveSettings) return;
    setSaving(true);
    setStatusMsg('');
    try {
      await onSaveSettings({
        defaultPermission: permissionDraft,
        password: passwordDraft,
      });
      setStatusMsg('Room settings updated');
      setTimeout(() => setStatusMsg(''), 2500);
    } catch (err) {
      setStatusMsg(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Share Room</h2>
            <p className="text-xs text-slate-400">{boardName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Room ID */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Room ID
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm tracking-widest text-blue-300">
                {roomId}
              </div>
              <button
                type="button"
                onClick={() => copyText(roomId, 'roomId')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
              >
                {copiedField === 'roomId' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Invite Links */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Link2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Direct Invite Links</span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => copyText(editorLink, 'editor')}
                className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-600/15 px-3 py-2.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-600/25"
              >
                {copiedField === 'editor' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied Editor Link</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Editor Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => copyText(viewerLink, 'viewer')}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                {copiedField === 'viewer' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied Viewer Link</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Viewer Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Access & Password Settings */}
          {canManageSettings && (
            <form
              onSubmit={handleSave}
              className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Shield className="h-3.5 w-3.5 text-blue-400" />
                  Room Security
                </span>
                {hasPassword && (
                  <span className="flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                    <Lock className="h-3 w-3" />
                    Protected
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">
                    Default Role
                  </label>
                  <select
                    value={permissionDraft}
                    onChange={(e) => setPermissionDraft(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500"
                  >
                    <option value="editor">Editor (Can Draw)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">
                    Room Password
                  </label>
                  <input
                    type="text"
                    value={passwordDraft}
                    onChange={(e) => setPasswordDraft(e.target.value)}
                    placeholder="Empty = no password"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-400">{statusMsg}</span>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Update Settings'}
                </button>
              </div>
            </form>
          )}

          {/* Active Collaborators */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span>Active in Room ({roomUsers.length})</span>
            </div>
            <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              {roomUsers.length === 0 ? (
                <p className="text-xs text-slate-500">No active collaborators</p>
              ) : (
                roomUsers.map((u) => (
                  <div
                    key={u.socketId}
                    className="flex items-center justify-between rounded-lg px-2 py-1 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: u.color || '#3B82F6' }}
                        className="h-2.5 w-2.5 rounded-full"
                      />
                      <span className="font-medium text-slate-200">{u.userName}</span>
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] capitalize text-slate-400">
                      {u.permission}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}