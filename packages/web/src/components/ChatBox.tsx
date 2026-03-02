import { Check, ChevronDown, ChevronUp, Copy, Send, Terminal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Agent } from '../hooks/useAgents';
import { useSocket } from '../hooks/useSocket';
import { ApiClient } from '../lib/api';

interface ChatMessage {
    id: number | string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tools?: string | Array<{ tool: string; result: string }>;
}

interface ChatBoxProps {
    activeAgent: Agent | null;
}

export function ChatBox({ activeAgent }: ChatBoxProps) {
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const { socket } = useSocket();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const ToolResult = ({ tools }: { tools: string | Array<{ tool: string; result: string }> }) => {
        const [expanded, setExpanded] = useState(false);
        const parsedTools = typeof tools === 'string' ? JSON.parse(tools) : tools;
        
        if (!parsedTools || !Array.isArray(parsedTools) || parsedTools.length === 0) return null;

        return (
            <div className="mt-3 border border-border/50 rounded-md bg-background/30 overflow-hidden text-xs">
                <button 
                    onClick={() => setExpanded(!expanded)}
                    className="flex w-full items-center justify-between p-2 hover:bg-background/50 transition-colors"
                >
                    <div className="flex items-center gap-2 text-muted-foreground font-mono">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{parsedTools.length} tool{parsedTools.length > 1 ? 's' : ''} executed</span>
                    </div>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {expanded && (
                    <div className="p-2 pt-0 max-h-60 overflow-y-auto space-y-2 border-t border-border/50 font-mono">
                        {parsedTools.map((t, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                <span className="text-primary font-semibold">{t.tool}</span>
                                <span className="text-muted-foreground whitespace-pre-wrap break-all">{t.result}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const CopyButton = ({ text }: { text: string }) => {
        const [copied, setCopied] = useState(false);

        const handleCopy = () => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <button 
                onClick={handleCopy}
                className="p-1 hover:bg-background/20 rounded-md transition-colors"
                title="Copy message"
            >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
        );
    };

    useEffect(() => {
        if (!activeAgent) return;
        setHasMore(true);
        const fetchHistory = async () => {
            const token = localStorage.getItem('sigil_token');
            if (!token) return;
            try {
                const client = new ApiClient(token);
                const res = await client.getChats(activeAgent.id);
                const data = res.data || [];
                setMessages(data);
                setHasMore(data.length >= 100);
                scrollToBottom();
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        };
        fetchHistory();
    }, [activeAgent]);

    // Scroll-to-top: load older messages
    const handleScroll = async () => {
        const el = chatContainerRef.current;
        if (!el || !activeAgent || loadingMore || !hasMore) return;
        if (el.scrollTop < 60) {
            setLoadingMore(true);
            const oldestId = messages.length > 0 ? Number(messages[0].id) : undefined;
            const token = localStorage.getItem('sigil_token');
            if (!token) { setLoadingMore(false); return; }
            try {
                const client = new ApiClient(token);
                const res = await client.getChats(activeAgent.id, 50, oldestId);
                const older = res.data || [];
                if (older.length === 0) { setHasMore(false); }
                else {
                    const prevHeight = el.scrollHeight;
                    setMessages(prev => [...older, ...prev]);
                    // Preserve scroll position
                    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevHeight; });
                    if (older.length < 50) setHasMore(false);
                }
            } catch (e) { console.error('Failed to load older chats:', e); }
            finally { setLoadingMore(false); }
        }
    };

    // WebSocket listener for incoming messages
    useEffect(() => {
        if (!socket || !activeAgent) return;

        const handleMessage = (data: any) => {
            if (data.agent === activeAgent.name) {
                setMessages(prev => {
                    // Check to avoid duplicates just in case
                    const exists = prev.some(m => m.id === data.timestamp || (m.role === data.role && m.content === data.content && Date.now() - Number(m.id) < 1000));
                    if (exists && data.role === 'user') return prev;
                    
                    return [...prev, {
                        id: data.timestamp || Date.now(),
                        role: data.role,
                        content: data.content,
                        tools: data.tools
                    }];
                });
                if (data.role === 'assistant') {
                    setSending(false);
                }
            }
        };

        socket.on('chat:message', handleMessage);

        return () => {
            socket.off('chat:message', handleMessage);
        };
    }, [socket, activeAgent]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, sending]);

    const handleSend = () => {
        if (!input.trim() || !activeAgent || !socket) return;
        
        socket.emit('chat:message', { agentId: activeAgent.id, content: input.trim() });
        setInput('');
        setSending(true);
    };

    if (!activeAgent) return <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">Select an agent</div>;

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMore && (
                    <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    </div>
                )}
                {messages.length === 0 && !sending ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic opacity-50">
                        No active chat history. Start the conversation below.
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm relative ${
                                msg.role === 'user' 
                                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                                    : msg.role === 'system'
                                    ? 'bg-red-500/10 text-red-500 rounded-bl-sm italic'
                                    : 'bg-secondary text-secondary-foreground rounded-bl-sm border border-border'
                            }`}>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CopyButton text={msg.content || "No message content"} />
                                </div>
                                <div className="pr-6">
                                    {msg.role === 'assistant' ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({node, ...props}) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />,
                                                a: ({node, ...props}) => <a className="text-primary hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />,
                                                strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                                                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                                                li: ({node, ...props}) => <li className="" {...props} />,
                                                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 mt-4" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-3" {...props} />,
                                                code({node, className, children, ...props}: any) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const isInline = !match;
                                                    return isInline ? (
                                                        <code className="bg-background/50 rounded px-1 py-0.5 text-[0.9em]" {...props}>
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <pre className="bg-background/50 rounded-md p-3 my-2 overflow-x-auto text-[0.9em]">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </pre>
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.content || "No message content"}
                                        </ReactMarkdown>
                                    ) : (
                                        <div className="whitespace-pre-wrap">{msg.content || "No message content"}</div>
                                    )}
                                    {msg.tools && msg.role === 'assistant' && (
                                        <ToolResult tools={msg.tools} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                
                {sending && (
                    <div className="flex justify-start">
                        <div className="bg-secondary border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="p-3 border-t border-border bg-card/50">
                <div className="relative flex items-center">
                    <input 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder={`Message ${activeAgent.name}...`}
                        disabled={sending}
                        className="w-full pl-4 pr-12 py-2.5 bg-secondary border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm placeholder:text-muted-foreground disabled:opacity-50"
                    />
                    <button 
                        onClick={handleSend} 
                        disabled={!input.trim() || sending}
                        className="absolute right-2 p-1.5 text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-background/50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
