import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import GuideTooltip from './GuideTooltip'

interface GuideStep {
  target: string
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  path?: string
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

function getStepsForPath(pathname: string): GuideStep[] {
  return GUIDE_STEPS.filter((step) => !step.path || step.path === pathname)
}

function completeOnboarding(): void {
  localStorage.setItem('hasCompletedOnboarding', 'true')
}

function OnboardingGuide(): JSX.Element | null {
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(false)

  const stepsForPath = useMemo(
    () => getStepsForPath(location.pathname),
    [location.pathname],
  )

  useEffect(() => {
    const hasCompleted = localStorage.getItem('hasCompletedOnboarding') === 'true'
    if (hasCompleted) return

    if (stepsForPath.length > 0) {
      const timer = setTimeout(() => {
        setIsActive(true)
        setCurrentStep(0)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [stepsForPath])

  function handleComplete(): void {
    completeOnboarding()
    setIsActive(false)
    setCurrentStep(null)
  }

  function handleNext(): void {
    if (currentStep !== null && currentStep < stepsForPath.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  if (!isActive || currentStep === null) return null
  if (stepsForPath.length === 0 || currentStep >= stepsForPath.length) return null

  const step = stepsForPath[currentStep]

  const targetElement = document.querySelector(step.target)
  if (!targetElement) {
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
      onSkip={handleComplete}
      onComplete={handleComplete}
      isLast={currentStep === stepsForPath.length - 1}
      stepNumber={currentStep + 1}
      totalSteps={stepsForPath.length}
    />
  )
}

export default OnboardingGuide
