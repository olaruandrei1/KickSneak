"use client";

import { useState, useEffect, useRef } from "react";
import { 
  getChatSessions, 
  getSessionMessages, 
  sendAdminMessage, 
  takeOverSession, 
  closeSession 
} from "@/app/chat/actions";
import { MessageCircle, User, Bot, Send, ShieldAlert, Check, X, Loader } from "lucide-react";

interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: Date;
  closed_at: Date | null;
  chat_type: number;
  user: { name: string; avatar: string };
  lastMessage: { content: string; role: string; created_at: Date } | null;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: Date;
}

interface ChatSupportClientProps {
  initialSessions: ChatSession[];
}

export default function ChatSupportClient({ initialSessions }: ChatSupportClientProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesAreaRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectedSessionIdRef = useRef<string | null>(null);

  // Sync selectedSessionId ref to avoid stale closures in event listener
  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  // Connect to Standalone WebSocket Server
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let socket: WebSocket;

    const connect = () => {
      const wsUrl = process.env.NEXT_PUBLIC_SUPPORT_WS_URL || "ws://localhost:3005";
      socket = new WebSocket(`${wsUrl}?role=admin`);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("[WS] Connected to live support WS server");
        setIsWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "message" && data.message) {
            const newMsg: ChatMessage = {
              id: data.message.id,
              session_id: data.message.session_id,
              role: data.message.role,
              content: data.message.content,
              created_at: new Date(data.message.created_at)
            };

            // Update messages if it is the currently selected session
            if (newMsg.session_id === selectedSessionIdRef.current) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }

            // Update lastMessage and status in session list
            setSessions(prevSessions => {
              const updated = prevSessions.map(s => {
                if (s.id === newMsg.session_id) {
                  return {
                    ...s,
                    lastMessage: {
                      content: newMsg.content,
                      role: newMsg.role,
                      created_at: newMsg.created_at
                    }
                  };
                }
                return s;
              });

              // Bring updated session to top
              const matchIdx = updated.findIndex(s => s.id === newMsg.session_id);
              if (matchIdx > 0) {
                const match = updated[matchIdx];
                updated.splice(matchIdx, 1);
                updated.unshift(match);
              }
              return updated;
            });
          } else if (data.type === "status_changed") {
            const { sessionId, status } = data;
            setSessions(prevSessions =>
              prevSessions.map(s => s.id === sessionId ? { ...s, status } : s)
            );
          }
        } catch (err) {
          console.error("[WS] Error parsing websocket message:", err);
        }
      };

      socket.onclose = () => {
        console.log("[WS] Live support WS server disconnected. Retrying in 3s...");
        setIsWsConnected(false);
        wsRef.current = null;
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.warn("[WS] WebSocket error:", err);
        socket.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // Poll for new sessions and messages every 3 seconds (fallback/backup logic)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updatedSessions = await getChatSessions();
        setSessions(prev => {
          const prevMap = new Map(prev.map(s => [s.id, s]));
          return updatedSessions.map(dbSession => {
            const localSession = prevMap.get(dbSession.id);
            // DB is the source of truth for status (takeover/close can happen
            // on either server); keep whichever lastMessage is newest.
            const localLast = localSession?.lastMessage;
            const dbLast = dbSession.lastMessage;
            const lastMessage = localLast && dbLast
              ? (new Date(localLast.created_at) > new Date(dbLast.created_at) ? localLast : dbLast)
              : (localLast || dbLast);
            return { ...dbSession, lastMessage };
          });
        });

        // Always poll messages: user messages arrive via the Go chat server
        // (AI mode), not this WS server, so the socket alone never sees them.
        if (selectedSessionId) {
          const updatedMessages = await getSessionMessages(selectedSessionId);
          setMessages(prev => {
            const known = new Set(prev.map(m => m.id));
            const fresh = updatedMessages.filter(m => !known.has(m.id));
            if (fresh.length === 0) return prev;
            return [...prev, ...fresh].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      } catch (err) {
        console.error("Polling chat failed:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedSessionId, isWsConnected]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle select session
  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setLoadingMessages(true);
    try {
      const msgs = await getSessionMessages(sessionId);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const currentSession = sessions.find(s => s.id === selectedSessionId);

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !inputText.trim() || sending) return;

    const text = inputText;
    setInputText("");

    if (isWsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        // Auto-takeover if admin replies
        if (currentSession && currentSession.status === "active") {
          wsRef.current.send(JSON.stringify({ type: "takeover", sessionId: selectedSessionId }));
        }

        // Send message over WebSocket
        wsRef.current.send(JSON.stringify({
          type: "message",
          sessionId: selectedSessionId,
          content: text,
          role: "admin"
        }));
      } catch (err) {
        console.error("[WS] Failed to send over websocket, using HTTP fallback:", err);
        // Fallback to Server Action
        setSending(true);
        try {
          const newMsg = await sendAdminMessage(selectedSessionId, text);
          setMessages(prev => [...prev, newMsg as any]);
          if (currentSession && currentSession.status === "active") {
            await takeOverSession(selectedSessionId);
            const updatedSessions = await getChatSessions();
            setSessions(updatedSessions);
          }
        } catch (fallbackErr) {
          console.error("Fallback failed:", fallbackErr);
        } finally {
          setSending(false);
        }
      }
    } else {
      // Direct HTTP Fallback
      setSending(true);
      try {
        const newMsg = await sendAdminMessage(selectedSessionId, text);
        setMessages(prev => [...prev, newMsg as any]);
        
        if (currentSession && currentSession.status === "active") {
          await takeOverSession(selectedSessionId);
          const updatedSessions = await getChatSessions();
          setSessions(updatedSessions);
        }
      } catch (err) {
        console.error("Failed to send admin message (HTTP):", err);
      } finally {
        setSending(false);
      }
    }
  };

  // Take over from AI
  const handleTakeOver = async () => {
    if (!selectedSessionId) return;

    // Optimistically update the session status so the button disappears immediately
    setSessions(prev => prev.map(s =>
      s.id === selectedSessionId ? { ...s, status: 'agent' } : s
    ));

    if (isWsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "takeover", sessionId: selectedSessionId }));
    } else {
      try {
        await takeOverSession(selectedSessionId);
        const updatedSessions = await getChatSessions();
        setSessions(updatedSessions);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Close support session
  const handleCloseSession = async () => {
    if (!selectedSessionId) return;
    if (confirm("Sigur dorești să închizi această sesiune de suport?")) {
      if (isWsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "close", sessionId: selectedSessionId }));
        setSelectedSessionId(null);
        setMessages([]);
      } else {
        try {
          await closeSession(selectedSessionId);
          setSelectedSessionId(null);
          setMessages([]);
          const updatedSessions = await getChatSessions();
          setSessions(updatedSessions);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const getMessageBubbleClass = (role: string) => {
    if (role === "admin") return "bubble-admin";
    if (role === "user") return "bubble-user";
    if (role === "system") return "bubble-system";
    return "bubble-ai";
  };

  const getMessageSenderName = (role: string) => {
    if (role === "admin") return "Tu (Admin)";
    if (role === "user") return currentSession?.user.name || "Utilizator";
    if (role === "system") return "Sistem";
    return "AI Assistant";
  };

  return (
    <div className="chat-layout glass-card">
      {/* Left sidebar: Sessions List */}
      <div className="sessions-sidebar">
        <div className="sidebar-header">
          <h4>Sesiuni Active ({sessions.length})</h4>
        </div>
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="sessions-empty">Nu există chat-uri active.</div>
          ) : (
            sessions.map(s => {
              const isActive = s.id === selectedSessionId;
              return (
                <div 
                  key={s.id} 
                  className={`session-item ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectSession(s.id)}
                >
                  <div className="session-avatar">
                    <User size={18} />
                  </div>
                  <div className="session-info">
                    <div className="session-meta">
                      <span className="user-name">{s.user.name}</span>
                      <span className="session-time">
                        {s.lastMessage ? new Date(s.lastMessage.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="last-snippet">
                      {s.lastMessage ? s.lastMessage.content : "Niciun mesaj încă"}
                    </p>
                    <div className="session-status-badge">
                      {s.status === "active" ? (
                        <span className="badge badge-info" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>AI Răspunde</span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>Preluat Admin</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right side: Chat Window */}
      <div className="chat-window">
        {currentSession ? (
          <>
            {/* Active Chat Header */}
            <div className="chat-header">
              <div className="active-user-info">
                <div className="active-avatar">
                  <User size={18} />
                </div>
                <div className="active-meta">
                  <h4>{currentSession.user.name}</h4>
                  <span className="status-text" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    Status: {currentSession.status === "active" ? "Asistat de AI" : "Preluat de tine"}
                    {isWsConnected ? (
                      <span className="badge badge-success" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "4px" }}>Real-time</span>
                    ) : (
                      <span className="badge badge-secondary" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid var(--border-color)", borderRadius: "4px" }}>HTTP Polling</span>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="header-actions">
                {currentSession.status === "active" && (
                  <button className="btn btn-secondary btn-sm" onClick={handleTakeOver} title="Opreşte asistentul AI și răspunde manual">
                    <Bot size={14} /> Preia de la AI
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={handleCloseSession}>
                  <X size={14} /> Închide Chat
                </button>
              </div>
            </div>

            {/* Message History area */}
            <div className="messages-area" ref={messagesAreaRef}>
              {loadingMessages ? (
                <div className="messages-loading">
                  <Loader className="spin" size={24} />
                  <span>Se încarcă istoricul...</span>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((m) => (
                    <div key={m.id} className={`message-row ${m.role === "admin" ? "row-admin" : "row-other"}`}>
                      <div className={`message-bubble ${getMessageBubbleClass(m.role)}`}>
                        <div className="msg-sender">
                          {m.role === "assistant" && <Bot size={12} style={{ marginRight: "0.2rem" }} />}
                          {getMessageSenderName(m.role)}
                        </div>
                        <p className="msg-text">{m.content}</p>
                        <span className="msg-time">
                          {new Date(m.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSend} className="chat-input-bar">
              <input 
                type="text" 
                placeholder={currentSession.status === "active" ? "Scrie un mesaj (preia automat de la AI)..." : "Scrie un răspuns..."}
                className="form-control"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={sending || !inputText.trim()}>
                {sending ? <Loader className="spin" size={14} /> : <Send size={14} />}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty-state">
            <MessageCircle size={48} className="empty-icon" />
            <h3>Sistem Suport Live Chat</h3>
            <p>Selectează o sesiune de conversație din lista laterală pentru a interacționa cu clienții sau a prelua discuțiile de la asistentul AI.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .chat-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          height: 600px;
          padding: 0 !important;
          overflow: hidden;
        }

        /* Narrow: stack the sessions list above the conversation instead of
           squeezing two columns, and let the header actions wrap. */
        @media (max-width: 760px) {
          .chat-layout {
            grid-template-columns: 1fr;
            height: auto;
          }
          .sessions-sidebar {
            border-right: none;
            border-bottom: 1px solid var(--border-color);
            max-height: 240px;
          }
          .chat-window {
            height: 70vh;
          }
          .chat-header {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .header-actions {
            flex-wrap: wrap;
          }
        }

        .sessions-sidebar {
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.15);
        }

        .sidebar-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .sidebar-header h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
        }

        .sessions-list {
          flex: 1;
          overflow-y: auto;
        }

        .session-item {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .session-item:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .session-item.active {
          background: rgba(255, 96, 0, 0.05);
          border-left: 3px solid var(--primary-color);
        }

        .session-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .session-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .session-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .user-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .session-time {
          font-size: 0.7rem;
          color: var(--text-dim);
        }

        .last-snippet {
          font-size: 0.8rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .session-status-badge {
          align-self: flex-start;
          margin-top: 0.1rem;
        }

        .sessions-empty {
          padding: 2rem;
          font-size: 0.85rem;
          color: var(--text-dim);
          text-align: center;
        }

        /* Chat window */
        .chat-window {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          background: rgba(0, 0, 0, 0.05);
        }

        .chat-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0, 0, 0, 0.1);
        }

        .active-user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .active-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 96, 0, 0.1);
          border: 1px solid rgba(255, 96, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color);
        }

        .active-meta h4 {
          font-size: 0.95rem;
          color: #fff;
          margin-bottom: 0.15rem;
        }

        .status-text {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .header-actions {
          display: flex;
          gap: 0.6rem;
        }

        .btn-sm {
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
        }

        .messages-area {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .messages-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          gap: 0.8rem;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message-row {
          display: flex;
          width: 100%;
        }

        .row-admin {
          justify-content: flex-end;
        }

        .row-other {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 70%;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          position: relative;
          display: flex;
          flex-direction: column;
          line-height: 1.4;
        }

        .bubble-admin {
          background: var(--primary-color);
          color: #fff;
          border-bottom-right-radius: 2px;
        }

        .bubble-user {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: #fff;
          border-bottom-left-radius: 2px;
        }

        .bubble-ai {
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.2);
          color: #fff;
          border-bottom-left-radius: 2px;
        }

        .bubble-system {
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-color);
          color: var(--text-dim);
          font-size: 0.8rem;
          max-width: 80%;
          margin: 0.5rem auto;
          border-radius: var(--radius-sm);
        }

        .msg-sender {
          font-size: 0.72rem;
          font-weight: 600;
          margin-bottom: 0.2rem;
          opacity: 0.85;
          display: flex;
          align-items: center;
        }

        .msg-text {
          font-size: 0.9rem;
          word-break: break-word;
        }

        .msg-time {
          font-size: 0.68rem;
          align-self: flex-end;
          margin-top: 0.25rem;
          opacity: 0.6;
        }

        .chat-input-bar {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 0.75rem;
          background: rgba(0, 0, 0, 0.1);
        }

        .chat-input-bar input {
          flex: 1;
        }

        .chat-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--text-muted);
          text-align: center;
        }

        .empty-icon {
          color: var(--text-dim);
          margin-bottom: 1.5rem;
        }

        .chat-empty-state h3 {
          color: #fff;
          margin-bottom: 0.5rem;
          font-size: 1.2rem;
        }

        .chat-empty-state p {
          max-width: 400px;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
