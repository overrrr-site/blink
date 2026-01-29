import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import GuideTooltip from './GuideTooltip'

interface GuideStep {
  target: string
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  path?: string // 特定のパスでのみ表示
}

const GUIDE_STEPS: GuideStep[] = [
  {
    target: '[data-guide="nav-today"]',
    title: '今日のタブ',
    content: '今日の予約と登園状況を確認できます。チェックインや日誌作成もここから行えます。',
    position: 'top',
    path: '/dashboard',
  },
  {
    target: '[data-guide="fab-button"]',
    title: '新規作成ボタン',
    content: 'ここから予約・顧客・日誌を素早く作成できます。タップするとメニューが表示されます。',
    position: 'top',
    path: '/dashboard',
  },
  {
    target: '[data-guide="nav-reservations"]',
    title: '予定タブ',
    content: 'カレンダー形式で予約を確認できます。日付をタップして予約を追加することもできます。',
    position: 'top',
    path: '/dashboard',
  },
  {
    target: '[data-guide="nav-customers"]',
    title: '顧客タブ',
    content: '飼い主とワンちゃんの情報を管理できます。検索機能で素早く顧客を見つけられます。',
    position: 'top',
    path: '/dashboard',
  },
  {
    target: '[data-guide="nav-settings"]',
    title: '設定タブ',
    content: '店舗情報、スタッフ管理、各種連携設定などを行えます。',
    position: 'top',
    path: '/dashboard',
  },
]

const OnboardingGuide = () => {
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    // 初回表示フラグをチェック
    const hasCompleted = localStorage.getItem('hasCompletedOnboarding') === 'true'
    if (hasCompleted) return

    // 現在のパスに該当するステップを探す
    const stepsForPath = GUIDE_STEPS.filter(
      (step) => !step.path || step.path === location.pathname
    )

    if (stepsForPath.length > 0) {
      // 少し遅延させてから表示（ページ読み込み完了後）
      const timer = setTimeout(() => {
        setIsActive(true)
        setCurrentStep(0)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [location.pathname])

  const handleNext = () => {
    const stepsForPath = GUIDE_STEPS.filter(
      (step) => !step.path || step.path === location.pathname
    )

    if (currentStep !== null && currentStep < stepsForPath.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true')
    setIsActive(false)
    setCurrentStep(null)
  }

  if (!isActive || currentStep === null) return null

  const stepsForPath = GUIDE_STEPS.filter(
    (step) => !step.path || step.path === location.pathname
  )

  if (stepsForPath.length === 0 || currentStep >= stepsForPath.length) return null

  const step = stepsForPath[currentStep]

  // ターゲット要素が存在するか確認
  const targetElement = document.querySelector(step.target)
  if (!targetElement) {
    // 要素が見つからない場合は次のステップへ
    if (currentStep < stepsForPath.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 100)
    } else {
      handleComplete()
    }
    return null
  }

  return (
    <GuideTooltip
      target={step.target}
      title={step.title}
      content={step.content}
      position={step.position}
      onNext={handleNext}
      onSkip={handleSkip}
      onComplete={handleComplete}
      isLast={currentStep === stepsForPath.length - 1}
      stepNumber={currentStep + 1}
      totalSteps={stepsForPath.length}
    />
  )
}

export default OnboardingGuide
