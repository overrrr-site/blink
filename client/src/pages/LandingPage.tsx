import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, selectIsAuthenticated } from '../store/authStore'
import { lpStyles } from './landing/LandingStyles'
import HeroSection from './landing/HeroSection'
import FeatureSection from './landing/FeatureSection'
import CompanySection from './landing/CompanySection'
import CTASection from './landing/CTASection'

const LandingPage = () => {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  // ログイン済みならダッシュボードへ
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) return null

  return (
    <div className="lp">
      <style>{lpStyles}</style>
      <HeroSection />
      <FeatureSection />
      <CompanySection />
      <CTASection />
    </div>
  )
}

export default LandingPage
