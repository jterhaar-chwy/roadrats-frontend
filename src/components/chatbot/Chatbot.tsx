import React, { useState, useRef, useEffect } from 'react';
import { useChatbot, ChatMessage } from '@/hooks/useChatbot';
import { KibButtonNew } from '@chewy/kib-controls-react';
import styles from '@/styles/chatbot/chatbot.module.scss';

interface ChatbotProps {
  pageType: 'srm-download' | 'database-errors' | 'cls-management' | 'release-manager';
  getPageData: () => any;
}

export const Chatbot: React.FC<ChatbotProps> = ({ pageType, getPageData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const { messages, loading, error, sendMessage, analyzeData, summarizeData, clearHistory } = useChatbot();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message, pageType, getPageData());
  };

  const handleAnalyze = async () => {
    if (!queryInput.trim() || loading) return;

    const query = queryInput.trim();
    setQueryInput('');
    await analyzeData(pageType, getPageData(), query);
  };

  const handleSummarize = async () => {
    if (loading) return;
    await summarizeData(pageType, getPageData());
  };

  const handleClear = () => {
    clearHistory();
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={styles.chatbotButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open chatbot"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatbotWindow}>
          <div className={styles.chatbotHeader}>
            <h3>AI Assistant</h3>
            <div className={styles.headerActions}>
              <KibButtonNew
                size="small"
                onClick={handleSummarize}
                disabled={loading}
              >
                Summarize
              </KibButtonNew>
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className={styles.messagesArea}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <p>Ask me anything about the current page data!</p>
                <p className={styles.hint}>Try: "Summarize the data" or "What are the key issues?"</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.message} ${styles[message.role]}`}
              >
                <div className={styles.messageContent}>
                  {message.content}
                </div>
                {message.timestamp && (
                  <div className={styles.messageTimestamp}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={styles.messageContent}>
                  <span className={styles.typingIndicator}>Thinking...</span>
                </div>
              </div>
            )}
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={styles.inputArea}>
            <div className={styles.quickActions}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                placeholder="Type your message..."
                disabled={loading}
                className={styles.messageInput}
              />
              <KibButtonNew
                size="small"
                onClick={handleSend}
                disabled={loading || !input.trim()}
              >
                Send
              </KibButtonNew>
            </div>
            <div className={styles.analyzeSection}>
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAnalyze()}
                placeholder="Ask a specific question..."
                disabled={loading}
                className={styles.queryInput}
              />
              <KibButtonNew
                size="small"
                onClick={handleAnalyze}
                disabled={loading || !queryInput.trim()}
              >
                Analyze
              </KibButtonNew>
            </div>
            <div className={styles.footerActions}>
              <button
                className={styles.clearButton}
                onClick={handleClear}
                disabled={loading || messages.length === 0}
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
