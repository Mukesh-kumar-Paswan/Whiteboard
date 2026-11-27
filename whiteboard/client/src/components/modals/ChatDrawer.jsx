import { useEffect, useRef, useState } from 'react';
import { X, Send, Mic, Square, MessageSquare } from 'lucide-react';

export default function ChatDrawer({
  isOpen,
  onClose,
  messages = [],
  currentUserId,
  onSendMessage,
}) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState('');

  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !onSendMessage) return;
    onSendMessage({ type: 'text', text: trimmed });
    setText('');
  };

  const startRecording = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        if (blob.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string' && onSendMessage) {
              onSendMessage({ type: 'audio', audioData: reader.result });
            }
          };
          reader.readAsDataURL(blob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setMicError('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <aside className="fixed top-14 right-0 bottom-0 z-30 flex w-80 max-w-full flex-col border-l border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Room Chat</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-xs font-medium text-slate-400">No messages yet</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Send a message or record a quick voice note.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="font-medium text-slate-400">
                    {isOwn ? 'You' : msg.senderName || 'Guest'}
                  </span>
                  <span>{formatTime(msg.createdAt)}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-800 bg-slate-950 text-slate-200'
                  }`}
                >
                  {msg.type === 'audio' && msg.audioData ? (
                    <audio
                      controls
                      src={msg.audioData}
                      className="h-8 w-52 max-w-full"
                    />
                  ) : (
                    <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mic Error */}
      {micError && (
        <div className="mx-3 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300">
          {micError}
        </div>
      )}

      {/* Input & Voice Recorder */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-slate-800 bg-slate-950/60 p-3"
      >
        {isRecording ? (
          <div className="flex flex-1 items-center justify-between rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="font-mono text-xs text-red-300">
                Recording {formatDuration(recordSeconds)}
              </span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              title="Stop & Send Voice Note"
              className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-red-500"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Send</span>
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecording}
              title="Record Voice Note"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:text-white"
            >
              <Mic className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={!text.trim()}
              title="Send Message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </>
        )}
      </form>
    </aside>
  );
}