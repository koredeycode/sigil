import { Send } from 'lucide-react';
import { useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { ApiClient } from '../lib/api';

interface ChatBoxProps {
    activeAgent: Agent | null;
}

export function ChatBox({ activeAgent }: ChatBoxProps) {
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || !activeAgent) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setSending(true);
        try {
            const client = new ApiClient(token);
            await client.sendChat(activeAgent.id, input);
            setInput('');
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    if (!activeAgent) return <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">Select an agent</div>;

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Chat history placeholder */}
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic opacity-50">
                    No active chat history. Start the conversation below.
                </div>
            </div>
            
            <div className="p-3 border-t border-border bg-card/50">
                <div className="relative flex items-center">
                    <input 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder={`Message ${activeAgent.name}...`}
                        disabled={sending}
                        className="w-full pl-4 pr-12 py-2.5 bg-secondary border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm placeholder:text-muted-foreground"
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
