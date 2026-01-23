import { useEffect, useState, createContext, useContext, useCallback } from 'react'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface ToastContextType {
  showToast: (message: string, type?: ToastItem['type']) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const ToastItem = ({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onRemove])

  const icons = {
    success: 'solar:check-circle-bold',
    error: 'solar:close-circle-bold',
    info: 'solar:info-circle-bold',
    warning: 'solar:danger-triangle-bold',
  }

  const colors = {
    success: 'bg-chart-2 text-white',
    error: 'bg-destructive text-white',
    info: 'bg-primary text-primary-foreground',
    warning: 'bg-chart-4 text-white',
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${colors[toast.type]} animate-in slide-in-from-top-2 fade-in duration-200`}
      role="alert"
    >
      <iconify-icon icon={icons[toast.type]} width="20" height="20" aria-hidden="true"></iconify-icon>
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={onRemove}
        className="ml-auto p-1 hover:opacity-80 transition-opacity"
        aria-label="閉じる"
      >
        <iconify-icon icon="solar:close-circle-linear" width="18" height="18" aria-hidden="true"></iconify-icon>
      </button>
    </div>
  )
}

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
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
