import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import { Icon } from './Icon'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    })
  }

  handleGoBack = () => {
    window.history.back()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
          <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <Icon icon="solar:danger-triangle-bold" width="40" height="40" className="text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">エラーが発生しました</h2>
          <p className="text-muted-foreground mb-6 text-center max-w-xs">
            申し訳ありません。問題が発生しました。<br />
            前のページに戻るか、再読み込みをお試しください。
          </p>

          <div className="flex gap-3">
            <button
              onClick={this.handleGoBack}
              className="px-5 py-3 bg-muted text-foreground rounded-xl font-medium flex items-center gap-2 hover:bg-muted/80 transition-colors min-h-[48px]"
            >
              <Icon icon="solar:arrow-left-linear" width="20" height="20" />
              戻る
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors min-h-[48px]"
            >
              <Icon icon="solar:refresh-bold" width="20" height="20" />
              再読み込み
            </button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details className="mt-8 w-full max-w-md">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                エラー詳細（開発用）
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs text-destructive overflow-auto max-h-40">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
