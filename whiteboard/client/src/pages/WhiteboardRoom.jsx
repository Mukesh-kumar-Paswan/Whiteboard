import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import CanvasBoard from '../components/canvas/CanvasBoard';
import { TECH_NODE_PRESETS } from '../components/canvas/TechNode';
import TopBar from '../components/toolbar/TopBar';
import LeftToolbar from '../components/toolbar/LeftToolbar';
import BottomBar from '../components/toolbar/BottomBar';
import ShareModal from '../components/modals/ShareModal';
import SnapshotsModal from '../components/modals/SnapshotsModal';
import ChatDrawer from '../components/modals/ChatDrawer';

const clonePages = (pages) => JSON.parse(JSON.stringify(pages));

export default function WhiteboardRoom() {
  const { roomId: rawRoomId } = useParams();
  const roomId = (rawRoomId || '').trim().toUpperCase();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role') || undefined;

  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const stageRef = useRef(null);
  const isChatOpenRef = useRef(false);

  // Room loading & access gate state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordRoomName, setPasswordRoomName] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Board data state
  const [boardMeta, setBoardMeta] = useState({
    name: 'Untitled Architecture',
    defaultPermission: 'editor',
    hasPassword: false,
    password: '',
    isOwner: false,
  });
  const [permission, setPermission] = useState('editor');
  const [pages, setPages] = useState([{ id: 'page-1', name: 'Page 1', elements: [] }]);
  const [activePageId, setActivePageId] = useState('page-1');
  const [snapshots, setSnapshots] = useState([]);
  const [messages, setMessages] = useState([]);

  // Collaboration state
  const [roomUsers, setRoomUsers] = useState([]);
  const [cursors, setCursors] = useState({});

  // Canvas & tool state
  const [activeTool, setActiveTool] = useState('select');
  const [strokeColor, setStrokeColor] = useState('#F8FAFC');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selectedId, setSelectedId] = useState(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isFlowPlaying, setIsFlowPlaying] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Modals & Chat Drawer
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isReadOnly = permission === 'viewer';

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) setUnreadCount(0);
  }, [isChatOpen]);

  const hydrateBoard = useCallback((data) => {
    const loadedPages =
      Array.isArray(data.pages) && data.pages.length > 0
        ? data.pages
        : [{ id: 'page-1', name: 'Page 1', elements: [] }];

    setBoardMeta({
      name: data.name || 'Untitled Architecture',
      defaultPermission: data.defaultPermission || 'editor',
      hasPassword: Boolean(data.hasPassword),
      password: data.password || '',
      isOwner: Boolean(data.isOwner) || Boolean(user && data.owner && data.owner === user._id),
    });
    setPermission(data.permission || 'editor');
    setPages(loadedPages);
    setActivePageId(loadedPages[0].id);
    setSnapshots(Array.isArray(data.snapshots) ? data.snapshots : []);
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setUndoStack([]);
    setRedoStack([]);
    setNeedsPassword(false);
    setLoadError('');
    setLoading(false);
  }, [user]);

  const joinRoomViaApi = useCallback(
    async (pwd = '') => {
      setLoading(true);
      setPasswordError('');
      try {
        const { data } = await api.post(`/boards/${roomId}/join`, {
          password: pwd,
          requestedRole,
        });
        hydrateBoard(data);
      } catch (err) {
        const res = err.response;
        if (res?.status === 403 && res.data?.requiresPassword) {
          setNeedsPassword(true);
          setPasswordRoomName(res.data.roomName || roomId);
          setPasswordError(pwd ? res.data.message || 'Incorrect password' : '');
          setLoading(false);
          return;
        }
        setLoadError(res?.data?.message || 'Failed to load room');
        setLoading(false);
      }
    },
    [roomId, requestedRole, hydrateBoard]
  );

  // Initial board load
  useEffect(() => {
    const initialBoard = location.state?.initialBoard;
    if (initialBoard && initialBoard.roomId === roomId) {
      hydrateBoard(initialBoard);
      return;
    }
    joinRoomViaApi(location.state?.password || '');
  }, [roomId, location.state, hydrateBoard, joinRoomViaApi]);

  // Socket.io room join & listeners
  useEffect(() => {
    if (!socket || !isConnected || loading || needsPassword || loadError || !user) return;

    socket.emit('join-room', {
      roomId,
      userId: user._id,
      userName: user.name,
      permission,
      activePageId,
    });

    const handleRoomUsers = (users) => setRoomUsers(users);

    const handleCursorUpdate = (cursor) => {
      setCursors((prev) => ({ ...prev, [cursor.socketId]: cursor }));
    };

    const handleCursorRemove = ({ socketId }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    const handleCanvasSync = ({ pages: syncedPages }) => {
      if (!Array.isArray(syncedPages) || syncedPages.length === 0) return;
      setPages(syncedPages);
      setActivePageId((curr) =>
        syncedPages.some((p) => p.id === curr) ? curr : syncedPages[0].id
      );
    };

    const handleMetaSync = ({ name, defaultPermission, hasPassword }) => {
      setBoardMeta((prev) => ({
        ...prev,
        name: name ?? prev.name,
        defaultPermission: defaultPermission ?? prev.defaultPermission,
        hasPassword: hasPassword ?? prev.hasPassword,
      }));
    };

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!isChatOpenRef.current) {
        setUnreadCount((c) => c + 1);
      }
    };

    socket.on('room-users', handleRoomUsers);
    socket.on('cursor-update', handleCursorUpdate);
    socket.on('cursor-remove', handleCursorRemove);
    socket.on('canvas-sync', handleCanvasSync);
    socket.on('board-meta-sync', handleMetaSync);
    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.emit('leave-room', { roomId });
      socket.off('room-users', handleRoomUsers);
      socket.off('cursor-update', handleCursorUpdate);
      socket.off('cursor-remove', handleCursorRemove);
      socket.off('canvas-sync', handleCanvasSync);
      socket.off('board-meta-sync', handleMetaSync);
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [socket, isConnected, loading, needsPassword, loadError, user, roomId, permission]);

  const activePage = useMemo(() => {
    return pages.find((p) => p.id === activePageId) || pages[0];
  }, [pages, activePageId]);

  const activeElements = activePage?.elements || [];

  const syncPages = useCallback(
    (nextPages, pushHistory = true) => {
      if (isReadOnly) return;
      if (pushHistory) {
        setUndoStack((prev) => [...prev.slice(-29), clonePages(pages)]);
        setRedoStack([]);
      }
      setPages(nextPages);
      socket?.emit('canvas-update', { roomId, pages: nextPages });
    },
    [isReadOnly, pages, socket, roomId]
  );

  const handleElementsChange = useCallback(
    (nextElements, commitHistory = true) => {
      const nextPages = pages.map((page) =>
        page.id === activePage.id ? { ...page, elements: nextElements } : page
      );
      syncPages(nextPages, commitHistory);
    },
    [pages, activePage, syncPages]
  );

  const handleUndo = useCallback(() => {
    if (isReadOnly || undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, clonePages(pages)]);
    setPages(previous);
    setSelectedId(null);
    socket?.emit('canvas-update', { roomId, pages: previous });
  }, [isReadOnly, undoStack, pages, socket, roomId]);

  const handleRedo = useCallback(() => {
    if (isReadOnly || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, clonePages(pages)]);
    setPages(next);
    setSelectedId(null);
    socket?.emit('canvas-update', { roomId, pages: next });
  }, [isReadOnly, redoStack, pages, socket, roomId]);

  const handleDeleteSelected = useCallback(() => {
    if (isReadOnly || !selectedId) return;
    const nextElements = activeElements.filter((el) => el.id !== selectedId);
    handleElementsChange(nextElements, true);
    setSelectedId(null);
  }, [isReadOnly, selectedId, activeElements, handleElementsChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !isReadOnly) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }

      if (isReadOnly) return;

      const key = e.key.toLowerCase();
      const toolMap = {
        v: 'select',
        h: 'pan',
        p: 'pencil',
        r: 'rect',
        c: 'circle',
        a: 'arrow',
        t: 'text',
      };
      if (toolMap[key]) {
        setActiveTool(toolMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteSelected, selectedId, isReadOnly]);

  const handleAddTechNode = (techType) => {
    if (isReadOnly) return;
    const preset = TECH_NODE_PRESETS[techType] || TECH_NODE_PRESETS.server;
    const stage = stageRef.current;

    const viewCenterX = stage
      ? (stage.width() / 2 - stagePos.x) / stageScale
      : 400;
    const viewCenterY = stage
      ? (stage.height() / 2 - stagePos.y) / stageScale
      : 300;

    const offset = (activeElements.length % 5) * 24 - 48;
    const newNode = {
      id: `tech-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      type: 'tech',
      techType: preset.techType,
      label: preset.label,
      subtitle: preset.subtitle,
      x: Math.round(viewCenterX - preset.width / 2 + offset),
      y: Math.round(viewCenterY - preset.height / 2 + offset),
      width: preset.width,
      height: preset.height,
      stroke: preset.accent,
      fill: '#0F172A',
    };

    handleElementsChange([...activeElements, newNode], true);
    setSelectedId(newNode.id);
    setActiveTool('select');
  };

  // Multi-page actions
  const handleAddPage = () => {
    if (isReadOnly) return;
    const newPage = {
      id: `page-${Date.now()}`,
      name: `Page ${pages.length + 1}`,
      elements: [],
    };
    const nextPages = [...pages, newPage];
    syncPages(nextPages, true);
    setActivePageId(newPage.id);
    setSelectedId(null);
  };

  const handleDeletePage = (pageId) => {
    if (isReadOnly || pages.length <= 1) return;
    const nextPages = pages.filter((p) => p.id !== pageId);
    syncPages(nextPages, true);
    if (activePageId === pageId) {
      setActivePageId(nextPages[0].id);
    }
    setSelectedId(null);
  };

  const handleClearPage = () => {
    if (isReadOnly || activeElements.length === 0) return;
    if (!window.confirm(`Clear all elements on "${activePage.name}"?`)) return;
    handleElementsChange([], true);
    setSelectedId(null);
  };

  // Save & Meta actions
  const handleManualSave = async () => {
    if (isReadOnly) return;
    setSaveStatus('saving');
    try {
      await api.put(`/boards/${roomId}`, { name: boardMeta.name, pages });
    } catch (err) {
      console.error('Manual save failed:', err);
    } finally {
      setSaveStatus('saved');
    }
  };

  const handleRenameBoard = async (newName) => {
    setBoardMeta((prev) => ({ ...prev, name: newName }));
    try {
      await api.put(`/boards/${roomId}`, { name: newName });
      socket?.emit('board-meta-update', {
        roomId,
        name: newName,
        defaultPermission: boardMeta.defaultPermission,
        hasPassword: boardMeta.hasPassword,
      });
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleSaveSettings = async ({ defaultPermission, password }) => {
    const { data } = await api.put(`/boards/${roomId}`, {
      defaultPermission,
      password,
    });
    setBoardMeta((prev) => ({
      ...prev,
      defaultPermission: data.defaultPermission,
      hasPassword: data.hasPassword,
      password: data.password || '',
    }));
    socket?.emit('board-meta-update', {
      roomId,
      name: boardMeta.name,
      defaultPermission: data.defaultPermission,
      hasPassword: data.hasPassword,
    });
  };

  // Snapshots actions
  const handleCreateSnapshot = async (name) => {
    const { data } = await api.post(`/boards/${roomId}/snapshots`, {
      name,
      pages,
      createdBy: user?.name || 'Guest',
    });
    setSnapshots(data.snapshots || []);
  };

  const handleRestoreSnapshot = async (snapshotId) => {
    const { data } = await api.post(`/boards/${roomId}/snapshots/${snapshotId}/restore`);
    if (Array.isArray(data.pages) && data.pages.length > 0) {
      setPages(data.pages);
      setActivePageId(data.pages[0].id);
      setSelectedId(null);
      socket?.emit('snapshot-restored', { roomId, pages: data.pages });
    }
  };

  const handleDeleteSnapshot = async (snapshotId) => {
    const { data } = await api.delete(`/boards/${roomId}/snapshots/${snapshotId}`);
    setSnapshots(data.snapshots || []);
  };

  // Export PNG
  const handleExportPng = () => {
    const stage = stageRef.current;
    if (!stage) return;
    setSelectedId(null);

    requestAnimationFrame(() => {
      const uri = stage.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${(boardMeta.name || 'archboard').replace(/\s+/g, '_')}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  // Zoom controls
  const handleZoomIn = () => setStageScale((s) => Math.min(3, Number((s * 1.15).toFixed(2))));
  const handleZoomOut = () => setStageScale((s) => Math.max(0.25, Number((s / 1.15).toFixed(2))));
  const handleResetView = () => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  const handleCursorMove = ({ x, y }) => {
    socket?.emit('cursor-move', { roomId, x, y, pageId: activePageId });
  };

  const handleSendMessage = ({ type, text, audioData }) => {
    socket?.emit('send-message', { roomId, type, text, audioData });
  };

  // Password Gate UI
  if (needsPassword) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">Password Required</h1>
              <p className="text-xs text-slate-400">{passwordRoomName}</p>
            </div>
          </div>

          {passwordError && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {passwordError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinRoomViaApi(passwordInput);
            }}
            className="space-y-4"
          >
            <input
              type="password"
              autoFocus
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter room password"
              required
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 rounded-lg border border-slate-700 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Unlock Room
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Loading UI
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm font-medium">Joining room {roomId}...</span>
        </div>
      </div>
    );
  }

  // Error UI
  if (loadError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center">
        <p className="text-base font-semibold text-white">{loadError}</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <TopBar
        boardName={boardMeta.name}
        onRenameBoard={handleRenameBoard}
        roomId={roomId}
        pages={pages}
        activePageId={activePageId}
        onSelectPage={(id) => {
          setActivePageId(id);
          setSelectedId(null);
        }}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        isFlowPlaying={isFlowPlaying}
        onToggleFlow={() => setIsFlowPlaying((p) => !p)}
        onOpenSnapshots={() => setIsSnapshotsOpen(true)}
        onExportPng={handleExportPng}
        onOpenShare={() => setIsShareOpen(true)}
        onToggleChat={() => setIsChatOpen((o) => !o)}
        unreadCount={unreadCount}
        onManualSave={handleManualSave}
        saveStatus={saveStatus}
        roomUsers={roomUsers}
        isReadOnly={isReadOnly}
        onBackToDashboard={() => navigate('/dashboard')}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <LeftToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          strokeColor={strokeColor}
          setStrokeColor={setStrokeColor}
          fillColor={fillColor}
          setFillColor={setFillColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          onAddTechNode={handleAddTechNode}
          selectedId={selectedId}
          onDeleteSelected={handleDeleteSelected}
          isReadOnly={isReadOnly}
        />

        <main className="relative flex-1 overflow-hidden">
          <CanvasBoard
            stageRef={stageRef}
            elements={activeElements}
            onElementsChange={handleElementsChange}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            strokeColor={strokeColor}
            fillColor={fillColor}
            strokeWidth={strokeWidth}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            stageScale={stageScale}
            setStageScale={setStageScale}
            stagePos={stagePos}
            setStagePos={setStagePos}
            isFlowPlaying={isFlowPlaying}
            isReadOnly={isReadOnly}
            cursors={cursors}
            activePageId={activePageId}
            onCursorMove={handleCursorMove}
          />
        </main>

        <BottomBar
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          stageScale={stageScale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          onClearPage={handleClearPage}
          isReadOnly={isReadOnly}
        />

        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={messages}
          currentUserId={user?._id}
          onSendMessage={handleSendMessage}
        />
      </div>

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        roomId={roomId}
        boardName={boardMeta.name}
        defaultPermission={boardMeta.defaultPermission}
        hasPassword={boardMeta.hasPassword}
        currentPassword={boardMeta.password}
        roomUsers={roomUsers}
        canManageSettings={!isReadOnly}
        onSaveSettings={handleSaveSettings}
      />

      <SnapshotsModal
        isOpen={isSnapshotsOpen}
        onClose={() => setIsSnapshotsOpen(false)}
        snapshots={snapshots}
        onCreateSnapshot={handleCreateSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}