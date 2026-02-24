import { useState, useCallback } from 'react';
import { getApiBaseUrl } from '@/utils/api';

const API_BASE = getApiBaseUrl();

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface UseChatbotReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (message: string, pageType: string, pageData: any) => Promise<void>;
  analyzeData: (pageType: string, pageData: any, query: string) => Promise<string | null>;
  summarizeData: (pageType: string, pageData: any) => Promise<string | null>;
  clearHistory: () => void;
}

export const useChatbot = (): UseChatbotReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string, pageType: string, pageData: any) => {
    if (!message.trim() || loading) return;

    setLoading(true);
    setError(null);

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`${API_BASE}/api/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType,
          pageData,
          message,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.response) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to send message'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const analyzeData = useCallback(async (pageType: string, pageData: any, query: string): Promise<string | null> => {
    if (!query.trim() || loading) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/chatbot/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType,
          pageData,
          query,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.analysis) {
        const analysisMessage: ChatMessage = {
          role: 'assistant',
          content: data.analysis,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, analysisMessage]);
        return data.analysis;
      } else {
        throw new Error(data.error || 'Failed to analyze data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze data');
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to analyze data'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const summarizeData = useCallback(async (pageType: string, pageData: any): Promise<string | null> => {
    if (loading) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/chatbot/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType,
          pageData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.summary) {
        const summaryMessage: ChatMessage = {
          role: 'assistant',
          content: data.summary,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, summaryMessage]);
        return data.summary;
      } else {
        throw new Error(data.error || 'Failed to summarize data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to summarize data');
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to summarize data'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    analyzeData,
    summarizeData,
    clearHistory,
  };
};
