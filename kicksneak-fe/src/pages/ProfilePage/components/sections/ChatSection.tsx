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

export const ChatSection = ({ profile }: Props) => {
    const { user } = useAuthStore();
    const [mode, setMode] = useState<ChatMode>('ai');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isWaitingResponse, setIsWaitingResponse] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const isFirstMount = useRef(true);
    const streamingContentRef = useRef('');
    const reconnectingRef = useRef(false);

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages, streamingContent]);

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
            reconnectingRef.current = false;
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
                            role: m.role === 'assistant' ? 'assistant' : 'user',
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

    useEffect(() => {
        if (mode !== 'ai' || !user?.uid) return;

        const timer = setTimeout(() => {
            connectWebSocket();
        }, 50);

        return () => {
            clearTimeout(timer);
            if (!reconnectingRef.current) {
                wsRef.current?.close();
                wsRef.current = null;
            }
        };
    }, [mode, user?.uid, connectWebSocket]);

    const escalateToSupport = () => {
        wsRef.current?.close();
        wsRef.current = null;

        setMode('support');
        setStreamingContent('');
        setIsTyping(false);
        setIsConnected(false);
        setSessionId(null);

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'support',
            content: "You've been connected to KickSneak Live Support. A representative will respond shortly.",
            timestamp: new Date(),
        }]);
    };

    const handleSend = () => {
        if (!input.trim() || isWaitingResponse) return;

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
            setTimeout(() => {
                setMessages(m => [...m, {
                    id: (Date.now() + 1).toString(),
                    role: 'support',
                    content: "Thank you for your message. A support agent will respond shortly.",
                    timestamp: new Date(),
                }]);
            }, 1000);
        }
    };

    const handleNewChat = () => {
        if (sessionId && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'close_session',
                sessionId: sessionId,
            }));
        }

        streamingContentRef.current = '';
        setMessages([]);
        setStreamingContent('');
        setIsTyping(false);
        setSessionId(null);
        setShowHistory(false);

        reconnectingRef.current = true;
        wsRef.current?.close();
        wsRef.current = null;
        setIsConnected(false);

        setMode('ai');

        setTimeout(() => {
            reconnectingRef.current = false;
            connectWebSocket();
        }, 200);
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
                role: m.role === 'assistant' ? 'assistant' : 'user',
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
                            <button className={styles.newChatBtn} onClick={handleNewChat}>
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