import { Check, Copy, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Agent } from '../hooks/useAgents';
import { ApiClient } from '../lib/api';

interface ChatMessage {
    id: number | string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatBoxProps {
    activeAgent: Agent | null;
}

export function ChatBox({ activeAgent }: ChatBoxProps) {
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        const fetchHistory = async () => {
            const token = localStorage.getItem('sigil_token');
            if (!token) return;
            try {
                const client = new ApiClient(token);
                const res = await client.getChats(activeAgent.id);
                setMessages(res.data || []);
                scrollToBottom();
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        };
        fetchHistory();
    }, [activeAgent]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, sending]);

    const handleSend = async () => {
        if (!input.trim() || !activeAgent) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        const userMsg: ChatMessage = {
            id: Date.now(),
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSending(true);

        try {
            const client = new ApiClient(token);
            const res = await client.sendChat(activeAgent.id, userMsg.content);
            
            const assistMsg: ChatMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: res.data?.response || 'No response.'
            };
            setMessages(prev => [...prev, assistMsg]);
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, {
                id: Date.now() + 2,
                role: 'system',
                content: 'Error communicating with agent.'
            }]);
        } finally {
            setSending(false);
        }
    };

    if (!activeAgent) return <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">Select an agent</div>;

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
