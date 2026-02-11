import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { Icon } from './Icon'

interface ToastData {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface ToastContextType {
  showToast: (message: string, type?: ToastData['type']) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const TOAST_ICONS: Record<ToastData['type'], string> = {
  success: 'solar:check-circle-bold',
  error: 'solar:close-circle-bold',
  info: 'solar:info-circle-bold',
  warning: 'solar:danger-triangle-bold',
}

const TOAST_COLORS: Record<ToastData['type'], string> = {
  success: 'bg-chart-2 text-white',
  error: 'bg-destructive text-white',
  info: 'bg-primary text-primary-foreground',
  warning: 'bg-chart-4 text-white',
}

function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: () => void }): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onRemove, 3000)
    return () => clearTimeout(timer)
  }, [onRemove])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${TOAST_COLORS[toast.type]} animate-in slide-in-from-top-2 fade-in duration-200`}
      role="alert"
    >
      <Icon icon={TOAST_ICONS[toast.type]} width="20" height="20" aria-hidden="true" />
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={onRemove}
        className="ml-auto min-h-[48px] min-w-[48px] flex items-center justify-center hover:opacity-80 transition-opacity"
        aria-label="閉じる"
      >
        <Icon icon="solar:close-circle-linear" width="18" height="18" aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
