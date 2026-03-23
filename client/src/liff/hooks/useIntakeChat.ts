import { useState, useCallback, useMemo } from 'react';
import liffClient from '../api/client';
import { getAxiosErrorMessage } from '../../utils/error';

export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  type?: 'single_choice' | 'multi_choice' | 'text';
  choices?: { label: string; value: string }[];
  allowOther?: boolean;
  allowSupplementText?: boolean;
  skippable?: boolean;
}

export interface IntakeSummary {
  structured_data: Record<string, unknown>;
  ai_summary: string;
  education_plan: {
    daycare_plan: string;
    home_advice: string;
    three_month_goals: string;
  };
}

interface IntakeProgress {
  phase: number;
  totalPhases: number;
  percentage: number;
}

export interface UseIntakeChatReturn {
  messages: ChatMessage[];
  progress: IntakeProgress;
  isLoading: boolean;
  isSending: boolean;
  isComplete: boolean;
  summary: IntakeSummary | null;
  dogName: string;
  sessionId: number | null;
  error: string | null;
  startSession: (dogId: number) => Promise<void>;
  sendMessage: (content: string, choiceValues?: string[]) => Promise<void>;
  currentQuestion: ChatMessage | null;
}

export function useIntakeChat(): UseIntakeChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<IntakeProgress>({ phase: 1, totalPhases: 4, percentage: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [dogName, setDogName] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async (dogId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await liffClient.post('/intake/start', { dog_id: dogId });
      const data = response.data.data;
      setSessionId(data.session_id);
      setDogName(data.dog_name);
      setMessages(data.messages);
      setProgress(data.progress);
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'セッションの開始に失敗しました'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, choiceValues?: string[]) => {
    if (!sessionId) return;

    setIsSending(true);
    setError(null);

    const userMessage: ChatMessage = {
      role: 'user',
      content,
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await liffClient.post('/intake/respond', {
        session_id: sessionId,
        content: content || undefined,
        choice_values: choiceValues,
      });
      const data = response.data.data;

      setMessages(prev => [...prev, ...data.messages]);
      setProgress(data.progress);

      if (data.isComplete) {
        setIsComplete(true);
        setSummary(data.summary || null);
      }
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'メッセージの送信に失敗しました'));
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  }, [sessionId]);

  const currentQuestion = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  return {
    messages,
    progress,
    isLoading,
    isSending,
    isComplete,
    summary,
    dogName,
    sessionId,
    error,
    startSession,
    sendMessage,
    currentQuestion,
  };
}
