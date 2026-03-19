export function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <img src="/images/dog-running.webp" alt="" width={160} className="animate-bounce-x" />
      <p className="text-sm text-muted-foreground">読み込み中...</p>
    </div>
  )
}
