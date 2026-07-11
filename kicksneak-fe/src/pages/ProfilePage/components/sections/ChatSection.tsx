import { useState, useRef, useEffect, useCallback } from 'react';
import { Chip } from '@mui/material';
import { Send, Add, History } from '@mui/icons-material';
import { GlassCard } from './GlassCard';
import { useAuthStore } from '../../../../store/authStore';
import type { UserProfile } from '../../../../types/profile';
import styles from './ChatSection.module.css';

interface Props {
    profile: UserProfile;
    onProfileUpdate: (p: UserProfile) => void;
}

type ChatMode = 'ai' | 'support';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'support';
    content: string;
    timestamp: Date;
}

interface ChatSession {
    id: string;
    title: string;
    status: string;
    createdAt: string;
}

const CHAT_WS_URL = import.meta.env.VITE_CHAT_WS_URL ?? 'ws://localhost:8080';
const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL ?? 'http://localhost:8080';
const SUPPORT_WS_URL = import.meta.env.VITE_SUPPORT_WS_URL ?? 'ws://localhost:3005';

export const ChatSection = ({ profile }: Props) => {
    const { user } = useAuthStore();
    const [mode, setMode] = useState<ChatMode>(() => {
        try { const s = sessionStorage.getItem('ks_chatMode'); return s === 'support' ? 'support' : 'ai'; }
        catch { return 'ai'; }
    });
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(() => {
        try { return sessionStorage.getItem('ks_chatSessionId'); }
        catch { return null; }
    });
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isWaitingResponse, setIsWaitingResponse] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const isFirstMount = useRef(true);
    const streamingContentRef = useRef('');
    // Messages typed while the support socket is down; flushed on (re)connect
    // instead of being silently dropped.
    const pendingSupportRef = useRef<string[]>([]);

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages, streamingContent]);

    useEffect(() => {
        try { sessionStorage.setItem('ks_chatMode', mode); } catch {}
    }, [mode]);
    useEffect(() => {
        try {
            if (sessionId) sessionStorage.setItem('ks_chatSessionId', sessionId);
            else sessionStorage.removeItem('ks_chatSessionId');
        } catch {}
    }, [sessionId]);

    const fetchSessions = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const res = await fetch(`${CHAT_API_URL}/api/chat/sessions`, {
                headers: { 'Authorization': `Bearer ${user.uid}` },
            });
            const data = await res.json();
            setSessions(data.sessions ?? []);
        } catch { }
    }, [user?.uid]);

    const connectWebSocket = useCallback(() => {
        if (!user?.uid || mode !== 'ai') return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(`${CHAT_WS_URL}/ws/chat?uid=${user.uid}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'session_created':
                    setSessionId(data.sessionId);
                    fetchSessions();
                    break;
                case 'history':
                    if (data.messages?.length > 0) {
                        setMessages(data.messages.map((m: any) => ({
                            id: m.id,
                            role: m.role === 'assistant' ? 'assistant' : (m.role === 'admin' ? 'support' : 'user'),
                            content: m.content,
                            timestamp: new Date(m.createdAt),
                        })));
                    }
                    break;
                case 'token':
                    setIsTyping(true);
                    if (data.content === '\n__ESCALATE__') {
                        setTimeout(() => {
                            setIsTyping(false);
                            escalateToSupport();
                        }, 2000);
                        break;
                    }
                    streamingContentRef.current += data.content;
                    setStreamingContent(streamingContentRef.current);
                    break;
                case 'message_complete': {
                    setIsTyping(false);
                    setIsWaitingResponse(false);
                    const content = streamingContentRef.current;
                    streamingContentRef.current = '';

                    if (content) {
                        setMessages(m => [...m, {
                            id: Date.now().toString(),
                            role: 'assistant',
                            content,
                            timestamp: new Date(),
                        }]);
                        setTimeout(() => setStreamingContent(''), 0);
                    } else {
                        setStreamingContent('');
                    }
                    break;
                }
                case 'error':
                    setIsTyping(false);
                    setIsWaitingResponse(false);
                    setStreamingContent('');
                    streamingContentRef.current = '';
                    setMessages(m => [...m, {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: `⚠️ ${data.content}`,
                        timestamp: new Date(),
                    }]);
                    break;
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            wsRef.current = null;
        };

        ws.onerror = () => {
            setIsConnected(false);
        };
    }, [user?.uid, mode, fetchSessions]);

    const connectSupportWebSocket = useCallback((currentSessionId: string) => {
        if (!user?.uid) return;
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

        const ws = new WebSocket(`${SUPPORT_WS_URL}/?role=client&sessionId=${currentSessionId}&userId=${user.uid}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            ws.send(JSON.stringify({ type: 'register_session', sessionId: currentSessionId }));
            // Flush anything the user typed while the socket was down.
            const pending = pendingSupportRef.current;
            pendingSupportRef.current = [];
            pending.forEach((content) => ws.send(JSON.stringify({
                type: 'message', content, sessionId: currentSessionId, role: 'user',
            })));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'message' && data.message) {
                if (data.message.role === 'user') return; // Evităm duplicarea mesajelor noastre optimiste trimise deja prin handleSend
                setMessages(m => {
                    if (m.some(msg => msg.id === data.message.id)) return m;
                    return [...m, {
                        id: data.message.id || Date.now().toString(),
                        role: data.message.role === 'admin' ? 'support' : 'user',
                        content: data.message.content,
                        timestamp: new Date(data.message.created_at || Date.now()),
                    }];
                });
            } else if (data.type === 'status_changed') {
                if (data.status === 'agent') {
                    setMessages(m => [...m, {
                        id: Date.now().toString(),
                        role: 'support',
                        content: "An agent has joined the chat.",
                        timestamp: new Date(),
                    }]);
                } else if (data.status === 'closed') {
                    setMessages(m => [...m, {
                        id: Date.now().toString(),
                        role: 'support',
                        content: "The support session has been closed.",
                        timestamp: new Date(),
                    }]);
                }
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            // Only auto-reconnect if this WS is still the active one (not replaced by useEffect cleanup)
            if (wsRef.current === ws) {
                wsRef.current = null;
                setTimeout(() => connectSupportWebSocket(currentSessionId), 2000);
            }
        };

        ws.onerror = () => {
            setIsConnected(false);
        };
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        if (mode === 'ai') connectWebSocket();
        else if (mode === 'support' && sessionId) connectSupportWebSocket(sessionId);

        return () => {
            const currentWs = wsRef.current;
            wsRef.current = null;
            if (currentWs?.readyState === WebSocket.OPEN || currentWs?.readyState === WebSocket.CONNECTING) {
                currentWs.close();
            }
        };
    }, [mode, user?.uid, sessionId, connectWebSocket, connectSupportWebSocket]);

    // Verificăm periodic dacă un admin a preluat manual sesiunea din dashboard
    useEffect(() => {
        if (mode !== 'ai' || !sessionId) return;
        const interval = setInterval(() => {
            fetchSessions();
        }, 3000);
        return () => clearInterval(interval);
    }, [mode, sessionId, fetchSessions]);

    useEffect(() => {
        if (mode === 'ai' && sessionId) {
            const current = sessions.find(s => s.id === sessionId);
            if (current && current.status === 'agent') {
                escalateToSupport();
            }
        }
    }, [sessions, mode, sessionId]);

    // NOTE: support sessions are closed only explicitly (admin's "Închide" or the
    // user starting a new chat). Auto-closing on unmount/refresh killed live
    // sessions whenever the user switched profile tabs, spawning fresh 'active'
    // sessions and resetting the admin takeover state mid-conversation.

    const escalateToSupport = () => {
        if (mode === 'support') return;

        const currentSessionId = sessionId || `session_${Date.now()}`;
        setSessionId(currentSessionId);

        setStreamingContent('');
        setIsTyping(false);
        // The AI socket is about to close — message_complete may never arrive,
        // and a stuck isWaitingResponse would swallow every support message.
        setIsWaitingResponse(false);

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'support',
            content: "You've been connected to KickSneak Live Support. A representative will respond shortly.",
            timestamp: new Date(),
        }]);

        setMode('support'); // triggers useEffect → closes old WS, opens support WS
    };

    const handleSend = () => {
        // Only throttle while waiting for the AI; live-support replies are free-form.
        if (!input.trim() || (mode === 'ai' && isWaitingResponse)) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        };
        setMessages(m => [...m, userMsg]);
        setInput('');

        if (mode === 'ai' && wsRef.current?.readyState === WebSocket.OPEN) {
            setIsWaitingResponse(true);
            wsRef.current.send(JSON.stringify({
                type: 'message',
                content: input,
                sessionId: sessionId,
            }));
        } else if (mode === 'support') {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'message',
                    content: input,
                    sessionId: sessionId,
                    role: 'user',
                }));
            } else {
                // Socket down — queue the message and reconnect; the onopen
                // handler flushes the queue so nothing is lost silently.
                pendingSupportRef.current.push(input);
                if (sessionId) connectSupportWebSocket(sessionId);
            }
        }
    };

    // Close the session both real-time (support WS, so the admin list updates
    // instantly) and via the Go REST API (guaranteed DB close even if the
    // socket is down). Leaving it open makes Go resurrect the same 'agent'
    // session on the next AI connect, which rejects every message.
    const closeCurrentSession = (sid: string) => {
        try {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const type = mode === 'support' ? 'close' : 'close_session';
                wsRef.current.send(JSON.stringify({ type, sessionId: sid }));
            }
        } catch { /* best effort */ }
        if (user?.uid) {
            fetch(`${CHAT_API_URL}/api/chat/sessions/${sid}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.uid}` },
            }).catch(() => { });
        }
    };

    const handleNewChat = () => {
        if (sessionId) closeCurrentSession(sessionId);

        streamingContentRef.current = '';
        pendingSupportRef.current = [];
        setMessages([]);
        setStreamingContent('');
        setIsTyping(false);
        setIsWaitingResponse(false);
        setSessionId(null);
        setShowHistory(false);
        setMode('ai'); // triggers useEffect → closes support WS, opens AI WS
    };

    const handleBackToAI = () => {
        if (sessionId) closeCurrentSession(sessionId);

        setMessages(m => [...m, {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Live support ended. Reconnected to KickSneak AI.',
            timestamp: new Date()
        }]);

        pendingSupportRef.current = [];
        setIsWaitingResponse(false);
        // Drop the session id: the old ('agent'/'closed') session must not be
        // reused — the Go server only answers on a fresh 'active' one.
        setSessionId(null);
        setMode('ai');
    };

    const handleLoadSession = async (sid: string) => {
        if (!user?.uid) return;

        try {
            const res = await fetch(`${CHAT_API_URL}/api/chat/sessions/${sid}/messages`, {
                headers: { 'Authorization': `Bearer ${user.uid}` },
            });
            const data = await res.json();
            setSessionId(sid);
            setShowHistory(false);
            setMessages((data.messages ?? []).map((m: any) => ({
                id: m.id,
                role: m.role === 'assistant' ? 'assistant' : (m.role === 'admin' ? 'support' : 'user'),
                content: m.content,
                timestamp: new Date(m.createdAt),
            })));
        } catch { }
    };

    const recentSessions = sessions
        .filter(s => s.id !== sessionId)
        .slice(0, 5);

    const formatMessage = (content: string) => {
        const lines = content.split('\n');
        const hasDataLines = lines.some(l => l.trim().startsWith('*') || l.trim().startsWith('-'));

        if (!hasDataLines) return content;

        return (
            <div className={styles.formattedMsg}>
                {lines.map((line, i) => {
                    const trimmed = line.trim();

                    if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
                        const clean = trimmed.replace(/^[\*\-]\s*/, '');
                        const parts = clean.split(':');

                        if (parts.length >= 2) {
                            const label = parts[0].trim().replace(/\*\*/g, '');
                            const value = parts.slice(1).join(':').trim().replace(/\*\*/g, '');
                            return (
                                <div key={i} className={styles.dataRow}>
                                    <span className={styles.dataLabel}>{label}</span>
                                    <span className={styles.dataValue}>{value}</span>
                                </div>
                            );
                        }

                        return <div key={i} className={styles.dataItem}>{clean.replace(/\*\*/g, '')}</div>;
                    }

                    if (trimmed === '') return null;
                    return <p key={i} style={{ margin: '4px 0' }}>{trimmed.replace(/\*\*/g, '')}</p>;
                })}
            </div>
        );
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <h2 className={styles.title}>Support Chat</h2>
                {mode === 'support' && (
                    <Chip label="CONNECTED TO LIVE SUPPORT" size="small" sx={{
                        height: 20, fontSize: '0.6rem', fontWeight: 700,
                        background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                        fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
                    }} />
                )}
            </div>

            <GlassCard noPadding className={styles.chatCard}>
                <div className={styles.statusBar}>
                    <span className={`${styles.statusDot} ${mode === 'support' ? styles.statusDotLive :
                        isConnected ? styles.statusDotAi : ''
                        }`} style={!isConnected && mode === 'ai' ? { background: '#ef4444' } : {}} />
                    <span className={styles.statusText}>
                        {mode === 'support'
                            ? '🧑‍💼 Live Support — A representative will respond shortly'
                            : isConnected ? 'KickSneak AI — Powered by Llama 3.1' : 'Connecting...'}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                        {mode === 'ai' && isConnected && (
                            <>
                                <button className={styles.newChatBtn} onClick={handleNewChat}>
                                    <Add sx={{ fontSize: 14 }} /> New
                                </button>
                                {recentSessions.length > 0 && (
                                    <button
                                        className={`${styles.newChatBtn} ${showHistory ? styles.sessionBtnActive : ''}`}
                                        onClick={() => setShowHistory(v => !v)}
                                    >
                                        <History sx={{ fontSize: 14 }} />
                                    </button>
                                )}
                            </>
                        )}
                        {mode === 'support' && (
                            <button className={styles.newChatBtn} onClick={handleBackToAI}>
                                Back to AI
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.messages} ref={messagesRef}>
                    {messages.length === 0 && !isTyping && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
                            Ask me anything about KickSneak!
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAssistant}`}
                        >
                            <div className={styles.bubble}>
                                {msg.role !== 'user' ? formatMessage(msg.content) : msg.content}
                            </div>
                            <span className={styles.time}>
                                {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}

                    {streamingContent && (
                        <div className={`${styles.message} ${styles.messageAssistant}`}>
                            <div className={styles.bubble}>{formatMessage(streamingContent)}</div>
                        </div>
                    )}

                    {isTyping && !streamingContent && (
                        <div className={styles.typing}>
                            <div className={styles.typingDots}>
                                <span /><span /><span />
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.inputRow}>
                    <input
                        className={styles.input}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder={isWaitingResponse ? 'Waiting for response...' : mode === 'ai' ? 'Ask anything...' : 'Type your message...'}
                        disabled={(mode === 'ai' && !isConnected) || isWaitingResponse}
                    />
                    <button className={styles.sendBtn} onClick={handleSend}
                        disabled={!input.trim() || (mode === 'ai' && !isConnected) || isWaitingResponse}>
                        <Send sx={{ fontSize: 18 }} />
                    </button>
                </div>

                {showHistory && recentSessions.length > 0 && (
                    <div className={styles.historyPanel}>
                        <span className={styles.historyTitle}>Recent Conversations</span>
                        {recentSessions.map(s => (
                            <button key={s.id}
                                className={styles.historyBtn}
                                onClick={() => handleLoadSession(s.id)}
                            >
                                <span className={styles.historyBtnTitle}>{s.title}</span>
                                <span className={styles.historyBtnDate}>
                                    {new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </GlassCard>
        </div>
    );
};