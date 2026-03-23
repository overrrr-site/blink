import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { useIntakeChat } from '../hooks/useIntakeChat';
import type { ChatMessage, IntakeSummary } from '../hooks/useIntakeChat';

function ProgressDots({ phase, totalPhases }: { phase: number; totalPhases: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`進捗: ${phase}/${totalPhases}`}>
      {Array.from({ length: totalPhases }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < phase;
        const isCurrent = step === phase;
        return (
          <div
            key={step}
            className={`size-2.5 rounded-full transition-all ${
              isCompleted
                ? 'bg-primary'
                : isCurrent
                  ? 'bg-primary animate-pulse'
                  : 'bg-stone-300'
            }`}
          />
        );
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 max-w-[85%]">
      <div className="size-8 rounded-full bg-[#6366F1]/10 flex items-center justify-center shrink-0">
        <Icon icon="solar:paw-print-bold" width="16" height="16" className="text-[#6366F1]" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="size-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="size-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="size-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-2 max-w-[85%]">
      <div className="size-8 rounded-full bg-[#6366F1]/10 flex items-center justify-center shrink-0">
        <Icon icon="solar:paw-print-bold" width="16" height="16" className="text-[#6366F1]" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm p-4">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-primary/10 rounded-2xl rounded-tr-sm p-4 max-w-[85%]">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

function ChoiceInput({
  question,
  onSend,
  disabled,
}: {
  question: ChatMessage;
  onSend: (content: string, choiceValues?: string[]) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [supplementText, setSupplementText] = useState('');
  const isMulti = question.type === 'multi_choice';
  const choices = question.choices || [];

  const handleSelect = (value: string) => {
    if (isMulti) {
      setSelected(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else {
      setSelected([value]);
    }
  };

  const handleSubmit = () => {
    const values = [...selected];
    if (question.allowOther && otherText.trim()) {
      values.push(otherText.trim());
    }

    const labels = values.map(v => {
      const choice = choices.find(c => c.value === v);
      return choice ? choice.label : v;
    });

    let displayText = labels.join('、');
    if (supplementText.trim()) {
      displayText += `\n(${supplementText.trim()})`;
    }

    onSend(displayText, values);
    setSelected([]);
    setOtherText('');
    setSupplementText('');
  };

  const canSubmit = selected.length > 0 || (question.allowOther && otherText.trim());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {choices.map(choice => {
          const isSelected = selected.includes(choice.value);
          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => handleSelect(choice.value)}
              disabled={disabled}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium min-h-[44px]
                         active:scale-95 transition-all disabled:opacity-50 ${
                isSelected
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white border border-stone-300 text-foreground'
              }`}
            >
              {isMulti && (
                <span className="mr-1.5">
                  {isSelected ? (
                    <Icon icon="solar:check-circle-bold" width="16" height="16" className="inline-block -mt-0.5" />
                  ) : (
                    <Icon icon="solar:circle-linear" width="16" height="16" className="inline-block -mt-0.5 text-stone-400" />
                  )}
                </span>
              )}
              {choice.label}
            </button>
          );
        })}
      </div>

      {question.allowOther && (
        <input
          type="text"
          value={otherText}
          onChange={e => setOtherText(e.target.value)}
          placeholder="その他（自由入力）"
          disabled={disabled}
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20
                     focus-visible:border-primary disabled:opacity-50"
        />
      )}

      {question.allowSupplementText && (
        <input
          type="text"
          value={supplementText}
          onChange={e => setSupplementText(e.target.value)}
          placeholder="補足（任意）"
          disabled={disabled}
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20
                     focus-visible:border-primary disabled:opacity-50"
        />
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !canSubmit}
        className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm
                   min-h-[48px] active:scale-95 transition-all disabled:opacity-40"
      >
        決定
      </button>
    </div>
  );
}

function TextInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="メッセージを入力..."
        disabled={disabled}
        rows={1}
        className="flex-1 px-4 py-3 rounded-xl border border-border bg-input text-sm
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20
                   focus-visible:border-primary resize-none min-h-[48px] max-h-[120px]
                   disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="size-12 rounded-full bg-primary text-white flex items-center justify-center
                   shrink-0 active:scale-95 transition-all disabled:opacity-40"
        aria-label="送信"
      >
        <Icon icon="mdi:send" width="20" height="20" />
      </button>
    </div>
  );
}

function IntakeSummaryCard({ summary, dogName }: { summary: IntakeSummary; dogName: string }) {
  return (
    <div className="space-y-4 px-1">
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="bg-[#6366F1]/5 px-5 py-4 border-b border-stone-100">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Icon icon="solar:paw-print-bold" width="20" height="20" className="text-[#6366F1]" />
            {dogName}のカルテ
          </h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {summary.ai_summary}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="bg-primary/5 px-5 py-4 border-b border-stone-100">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Icon icon="solar:star-bold" width="20" height="20" className="text-primary" />
            おすすめ教育プラン
          </h3>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon icon="solar:home-2-bold" width="14" height="14" />
              園での過ごし方
            </h4>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {summary.education_plan.daycare_plan}
            </p>
          </div>
          <div className="border-t border-stone-100 pt-4">
            <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon icon="solar:home-smile-bold" width="14" height="14" />
              家庭でのアドバイス
            </h4>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {summary.education_plan.home_advice}
            </p>
          </div>
          <div className="border-t border-stone-100 pt-4">
            <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon icon="solar:flag-bold" width="14" height="14" />
              3ヶ月の目標
            </h4>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {summary.education_plan.three_month_goals}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntakeChat() {
  const { dogId } = useParams<{ dogId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    progress,
    isLoading,
    isSending,
    isComplete,
    summary,
    dogName,
    error,
    startSession,
    sendMessage,
    currentQuestion,
  } = useIntakeChat();

  useEffect(() => {
    if (dogId) {
      startSession(parseInt(dogId, 10));
    }
  }, [dogId, startSession]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, isComplete]);

  const handleSend = useCallback((content: string, choiceValues?: string[]) => {
    sendMessage(content, choiceValues);
  }, [sendMessage]);

  const handleSkip = useCallback(() => {
    sendMessage('スキップ', ['__skip__']);
  }, [sendMessage]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Icon icon="solar:spinner-bold" width="48" height="48" className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">準備中...</p>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="px-5 pt-6 text-center">
        <Icon icon="solar:cloud-cross-bold" width="64" height="64" className="text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => dogId && startSession(parseInt(dogId, 10))}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between shrink-0 safe-area-top">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="size-10 rounded-full flex items-center justify-center hover:bg-stone-100 active:scale-95 transition-all"
            aria-label="戻る"
          >
            <Icon icon="solar:alt-arrow-left-linear" width="20" height="20" />
          </button>
          <h1 className="text-sm font-bold">はじめてのカルテ</h1>
        </div>
        <ProgressDots phase={progress.phase} totalPhases={progress.totalPhases} />
      </header>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4"
      >
        {messages.map((msg, index) => (
          <div key={index}>
            {msg.role === 'assistant' ? (
              <AssistantBubble content={msg.content} />
            ) : (
              <UserBubble content={msg.content} />
            )}
          </div>
        ))}

        {isSending && <TypingIndicator />}

        {error && messages.length > 0 && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 text-destructive text-xs px-4 py-2 rounded-xl">
              {error}
              <button
                onClick={() => dogId && startSession(parseInt(dogId, 10))}
                className="ml-2 underline font-medium"
              >
                再試行
              </button>
            </div>
          </div>
        )}

        {isComplete && summary && (
          <div className="pt-4 space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-chart-2/10 text-chart-2 px-4 py-2 rounded-full text-sm font-bold">
                <Icon icon="solar:check-circle-bold" width="18" height="18" />
                カルテが完成しました
              </div>
            </div>

            <IntakeSummaryCard summary={summary} dogName={dogName} />

            <button
              onClick={() => navigate('/home')}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-sm
                         min-h-[48px] active:scale-95 transition-all shadow-sm"
            >
              ホームに戻る
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!isComplete && currentQuestion && (
        <div className="bg-white border-t border-stone-200 px-4 py-4 shrink-0 safe-area-bottom space-y-2">
          {currentQuestion.type === 'text' ? (
            <TextInput onSend={handleSend} disabled={isSending} />
          ) : (currentQuestion.type === 'single_choice' || currentQuestion.type === 'multi_choice') ? (
            <ChoiceInput
              question={currentQuestion}
              onSend={handleSend}
              disabled={isSending}
            />
          ) : null}

          {currentQuestion.skippable && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSending}
              className="w-full text-muted-foreground text-sm font-medium py-2
                         active:scale-95 transition-all disabled:opacity-50"
            >
              スキップ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
