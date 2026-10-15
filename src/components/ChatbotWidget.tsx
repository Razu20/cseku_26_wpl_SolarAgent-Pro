import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

export interface ChatbotContextProps {
  page?: string;
  step?: number;
  projectType?: 'solar' | 'wind' | 'hybrid';
  systemType?: 'on-grid' | 'off-grid' | 'hybrid-grid';
  connectedLoadW?: number;
  dailyConsumptionKwh?: number;
  rooftopAreaSqFt?: number;
  rooftopType?: string;
  validationError?: string;
  orderNumber?: string;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  actionSuggestion?: string;
  timestamp: string;
}

export function ChatbotWidget({ context }: { context?: ChatbotContextProps }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'org_support' | 'technical_assistant'>('technical_assistant');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Hello! I am your SolarAgent Pro AI Assistant. You can ask me technical sizing questions about your renewable system, or switch to Organization Support to check order status, warranties, and service details.',
      actionSuggestion: 'Try asking about On-Grid vs Off-Grid, or type an Order Number to track status.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // If there is a validation error passed from the parent page, notify the user in technical mode
  useEffect(() => {
    if (context?.validationError && isOpen && mode === 'technical_assistant') {
      void sendContextAlert(`Validation error: ${context.validationError}`);
    }
  }, [context?.validationError]);

  async function sendContextAlert(errorMsg: string) {
    try {
      const res = await api<{ reply: string; actionSuggestion?: string }>('/chat', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'technical_assistant',
          message: errorMsg,
          context: { ...context, validationError: errorMsg },
        }),
      });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.reply,
          actionSuggestion: res.actionSuggestion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      // ignore
    }
  }

  async function handleSend(textToSend?: string) {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { sender: 'user', text, timestamp: userTimestamp }]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await api<{ reply: string; actionSuggestion?: string }>('/chat', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          message: text,
          context,
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.reply,
          actionSuggestion: res.actionSuggestion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'I am temporarily unable to connect to the assistant service. Please try again in a moment.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const promptChips =
    mode === 'org_support'
      ? [
          'What warranties are included?',
          'What payment methods do you support?',
          'Where is your headquarters located?',
          'Check order ORD-12345',
        ]
      : [
          'What is High-Grid architecture?',
          'How is suitability calculated?',
          'Explain surge power for motors',
          'What is Peak Sun Hours in Bangladesh?',
        ];

  return (
    <div className="chatbot-widget-container">
      {!isOpen && (
        <button
          className="chatbot-fab"
          onClick={() => setIsOpen(true)}
          title="Open SolarAgent AI Assistant"
          aria-label="Open AI Assistant"
        >
          <span className="chatbot-fab-icon">🤖</span>
          <span className="chatbot-fab-text">AI Assistant</span>
          {context?.validationError && <span className="chatbot-fab-badge">!</span>}
        </button>
      )}

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <span className="chatbot-header-avatar">🤖</span>
              <div>
                <strong>SolarAgent Pro Assistant</strong>
                <small>{mode === 'org_support' ? 'Mode A: Organization Support' : 'Mode B: Technical Assistant'}</small>
              </div>
            </div>
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)} title="Close assistant">
              ✕
            </button>
          </div>

          <div className="chatbot-mode-tabs">
            <button
              className={`chatbot-tab ${mode === 'technical_assistant' ? 'active' : ''}`}
              onClick={() => setMode('technical_assistant')}
            >
              ⚡ Technical Assistant
            </button>
            <button
              className={`chatbot-tab ${mode === 'org_support' ? 'active' : ''}`}
              onClick={() => setMode('org_support')}
            >
              🏢 Org Support & Orders
            </button>
          </div>

          <div className="chatbot-context-banner">
            <span className="context-indicator">Context Active</span>
            <span>
              {context?.projectType ? context.projectType.toUpperCase() : 'SOLAR'} ·{' '}
              {context?.systemType ? context.systemType.toUpperCase() : 'ON-GRID'}
              {context?.step ? ` · Step ${context.step}` : ''}
            </span>
          </div>

          <div className="chatbot-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-message ${m.sender}`}>
                <div className="chat-bubble">
                  <div className="chat-text" style={{ whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </div>
                  {m.actionSuggestion && (
                    <div className="chat-suggestion">
                      <em>💡 {m.actionSuggestion}</em>
                    </div>
                  )}
                  <div className="chat-timestamp">{m.timestamp}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant">
                <div className="chat-bubble loading-bubble">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-chips">
            {promptChips.map((chip, i) => (
              <button key={i} className="chip-btn" onClick={() => handleSend(chip)} type="button">
                {chip}
              </button>
            ))}
          </div>

          <form
            className="chatbot-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                mode === 'org_support'
                  ? 'Ask about orders, warranty, tickets...'
                  : 'Ask about solar sizing, rooftop, loads...'
              }
            />
            <button type="submit" disabled={loading || !inputMessage.trim()} className="primary-button chat-send-btn">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
