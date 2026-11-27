import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  LogIn,
  LogOut,
  Lock,
  Trash2,
  ExternalLink,
  Clock,
  FileStack,
  History,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  // Create room state
  const [boardName, setBoardName] = useState('');
  const [boardPassword, setBoardPassword] = useState('');
  const [defaultPermission, setDefaultPermission] = useState('editor');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join room state
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const fetchBoards = async () => {
      if (!user || user.isGuest) return;
      setLoadingBoards(true);
      try {
        const { data } = await api.get('/boards/my-boards');
        setBoards(data);
      } catch (error) {
        console.error('Error loading boards:', error);
      } finally {
        setLoadingBoards(false);
      }
    };

    fetchBoards();
  }, [user]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const { data } = await api.post('/boards', {
        name: boardName.trim() || 'Untitled Architecture',
        password: boardPassword.trim(),
        defaultPermission,
        guestName: user?.name || 'Guest',
      });

      navigate(`/room/${data.roomId}`, {
        state: {
          password: boardPassword.trim(),
          initialBoard: data,
        },
      });
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setJoinError('');

    const normalizedId = joinRoomId.trim().toUpperCase();
    if (!normalizedId) {
      setJoinError('Please enter a Room ID');
      return;
    }

    setJoining(true);
    try {
      const { data } = await api.post(`/boards/${normalizedId}/join`, {
        password: joinPassword,
      });

      navigate(`/room/${data.roomId}`, {
        state: {
          password: joinPassword,
          initialBoard: data,
        },
      });
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Unable to join room');
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteBoard = async (roomId) => {
    const confirmed = window.confirm('Delete this board permanently?');
    if (!confirmed) return;

    try {
      await api.delete(`/boards/${roomId}`);
      setBoards((prev) => prev.filter((b) => b.roomId !== roomId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete board');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-screen w-screen overflow-y-auto bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">ArchBoard</h1>
              <p className="text-xs text-slate-400">System Design Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-500">
                {user?.isGuest ? 'Guest Session' : user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Room Card */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                <Plus className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Create New Room</h2>
                <p className="text-xs text-slate-400">
                  Start a collaborative architecture board
                </p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Board Name
                </label>
                <input
                  type="text"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="e.g., E-Commerce Microservices"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Room Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={boardPassword}
                    onChange={(e) => setBoardPassword(e.target.value)}
                    placeholder="Leave blank for open"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Default Access
                  </label>
                  <select
                    value={defaultPermission}
                    onChange={(e) => setDefaultPermission(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="editor">Editor (Can Draw)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                <span>{creating ? 'Creating Room...' : 'Create & Open Room'}</span>
              </button>
            </form>
          </section>

          {/* Join Room Card */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400">
                <LogIn className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Join Existing Room</h2>
                <p className="text-xs text-slate-400">
                  Enter a Room ID shared by your teammate
                </p>
              </div>
            </div>

            {joinError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Room ID
                </label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="e.g., A1B2C3D4"
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Room Password (If Protected)
                </label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="Enter room password"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={joining}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" />
                <span>{joining ? 'Joining...' : 'Join Room'}</span>
              </button>
            </form>
          </section>
        </div>

        {/* Saved Boards Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">My Saved Boards</h2>
            {!user?.isGuest && (
              <span className="text-xs text-slate-400">
                {boards.length} {boards.length === 1 ? 'board' : 'boards'}
              </span>
            )}
          </div>

          {user?.isGuest ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
              <p className="text-sm text-slate-300">
                You are currently using a Guest session.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Create an account to automatically list and manage your saved boards here.
                You can still create, join, and share rooms freely.
              </p>
            </div>
          ) : loadingBoards ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 py-12 text-sm text-slate-400">
              Loading your boards...
            </div>
          ) : boards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
              <p className="text-sm font-medium text-slate-300">No boards yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Create your first room above to start designing system architectures.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <div
                  key={board._id}
                  className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-700 hover:bg-slate-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-white">
                        {board.name}
                      </h3>
                      {board.hasPassword && (
                        <span
                          title="Password protected"
                          className="flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                        >
                          <Lock className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-blue-300">
                        {board.roomId}
                      </span>
                      <span className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-[11px] capitalize text-slate-300">
                        <Shield className="h-3 w-3 text-slate-400" />
                        {board.defaultPermission}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileStack className="h-3.5 w-3.5" />
                        {board.pagesCount} {board.pagesCount === 1 ? 'page' : 'pages'}
                      </span>
                      <span className="flex items-center gap-1">
                        <History className="h-3.5 w-3.5" />
                        {board.snapshotsCount} snapshots
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      {formatDate(board.updatedAt)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteBoard(board.roomId)}
                        title="Delete board"
                        className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/room/${board.roomId}`)}
                        className="flex items-center gap-1 rounded-md bg-blue-600/20 px-2.5 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-600 hover:text-white"
                      >
                        <span>Open</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}