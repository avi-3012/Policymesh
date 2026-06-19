'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { PolicyStatusIndicator } from '@/components/PolicyStatusIndicator';
import { api } from '@/lib/api';
import { Send } from 'lucide-react';

export default function AgentPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'I am PolicyMesh, your Hedera procurement agent. Ask me to procure Filecoin storage or Akash compute within policy limits.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.getStatus });
  const { data: agentStatus } = useQuery({ queryKey: ['agentStatus'], queryFn: api.getAgentStatus });

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await api.agentChat(userMsg);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: res.reply, toolCalls: res.toolCalls },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation status={status} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <h1 className="text-2xl font-semibold">AI Procurement Agent</h1>
        <p className="mt-1 text-sm text-slate-500">
          LangChain + Hedera Agent Kit · {agentStatus?.enabled ? agentStatus.model : 'Set OPENAI_API_KEY to enable'}
        </p>

        {agentStatus?.hooks && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {agentStatus.hooks.slice(0, 6).map((name) => (
              <PolicyStatusIndicator key={name} name={name} passed={true} />
            ))}
          </div>
        )}

        <div className="card mt-4 flex flex-1 flex-col min-h-[24rem]">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user' ? 'ml-8 bg-primary text-white' : 'mr-8 bg-slate-100 text-slate-800'
                }`}
              >
                {msg.content}
                {msg.toolCalls?.length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-200">
                    {JSON.stringify(msg.toolCalls, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            {loading && <p className="text-sm text-slate-400">PolicyMesh is thinking…</p>}
          </div>

          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="e.g. Procure 50GB Filecoin storage for 30 days, max 100 HBAR"
              className="input flex-1"
              disabled={loading}
            />
            <button type="button" onClick={send} className="btn-primary flex items-center gap-1" disabled={loading}>
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
