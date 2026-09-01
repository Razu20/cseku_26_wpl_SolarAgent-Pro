import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { sendChat } from '../api.js';
import { useSession } from '../context/SessionContext.jsx';

export default function ChatPanel({ onClose }) {
  const { sessionId, results } = useSession();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || thinking || !sessionId) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);
    try {
      const { reply } = await sendChat(sessionId, userMsg.content);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Connection issue: ${e.message}` }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-paper dark:bg-dusk flex flex-col z-50">
      <div className="border-b border-slate-200 dark:border-panelBorder px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-solar" />
          <span className="font-semibold text-sm">Your Solar Engineer</span>
        </div>
        <button onClick={onClose} aria-label="Close chat"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-w-2xl mx-auto w-full">
        {messages.length === 0 && (
          <p className="text-steel text-sm">
            {results
              ? 'Ask anything about your plan — why a certain component, what happens if you change something, how to prioritize the budget.'
              : 'Fill in Site & Load first for a grounded answer, or ask a general solar question now.'}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
            <div className={`font-mono text-[9px] text-steel mb-0.5 ${m.role === 'user' ? 'text-right' : ''}`}>
              {m.role === 'user' ? 'YOU' : 'ENGINEER'}
            </div>
            <div
              className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user' ? 'bg-solar text-ink' : 'bg-white dark:bg-panel border border-slate-200 dark:border-panelBorder'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-steel text-xs">
            <Loader2 size={13} className="animate-spin" /> thinking through your numbers…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-200 dark:border-panelBorder p-3 flex gap-2 max-w-2xl mx-auto w-full">
        <input
          className="input"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <button onClick={handleSend} disabled={thinking} className="px-3.5 rounded-md bg-solar text-ink disabled:opacity-50">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
