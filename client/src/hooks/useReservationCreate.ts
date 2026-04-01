import { useState } from 'react'
import api from '../api/client'
import { useToast } from '../components/Toast'
import type { StaffReservationForm } from '../types/reservation'
import { getCalendarSyncWarningMessage } from '../utils/calendarSync'
import { formatDateISO } from '../utils/date'
import { getUxIdentity, trackUxEvent } from '../lib/uxAnalytics'

type UseReservationCreateOptions = {
  dateParam: string | null
  onSuccess: () => void
  uxSessionId: string
  onSessionEnd: (result: 'success' | 'error') => void
}

export function useReservationCreate({
  dateParam,
  onSuccess,
  uxSessionId,
  onSessionEnd,
}: UseReservationCreateOptions) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState<StaffReservationForm>({
    reservation_date: dateParam || formatDateISO(new Date()),
    reservation_time: '09:00',
    pickup_time: '17:00',
    reservation_type: 'regular',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { storeId, staffIdHash } = getUxIdentity()

    trackUxEvent({
      eventName: 'cta_click',
      flow: 'reservation',
      step: 'reservation_submit',
      sessionId: uxSessionId,
      path: window.location.pathname,
      storeId,
      staffIdHash,
      timestamp: new Date().toISOString(),
      meta: {
        current_step: currentStep,
      },
    })

    if (!selectedDogId) {
      trackUxEvent({
        eventName: 'form_error',
        flow: 'reservation',
        step: 'dog_select',
        sessionId: uxSessionId,
        path: window.location.pathname,
        storeId,
        staffIdHash,
        timestamp: new Date().toISOString(),
        meta: {
          reason: 'dog_not_selected',
        },
      })
      showToast('犬を選択してください', 'warning')
      return
    }

    setSaving(true)
    try {
      const response = await api.post('/reservations', {
        dog_id: selectedDogId,
        ...form,
        service_type: 'daycare',
      })
      const calendarWarning = getCalendarSyncWarningMessage(response.data)
      if (calendarWarning) {
        showToast(calendarWarning, 'warning')
      }

      trackUxEvent({
        eventName: 'submit_success',
        flow: 'reservation',
        step: 'reservation_submit',
        sessionId: uxSessionId,
        path: window.location.pathname,
        storeId,
        staffIdHash,
        timestamp: new Date().toISOString(),
      })
      onSessionEnd('success')
      onSuccess()
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined
      trackUxEvent({
        eventName: 'submit_fail',
        flow: 'reservation',
        step: 'reservation_submit',
        sessionId: uxSessionId,
        path: window.location.pathname,
        storeId,
        staffIdHash,
        timestamp: new Date().toISOString(),
        meta: {
          status: status ?? 'unknown',
        },
      })
      onSessionEnd('error')
      console.error('Error creating reservation:', error)
      showToast('予約登録に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    setForm,
    saving,
    currentStep,
    setCurrentStep,
    selectedDogId,
    setSelectedDogId,
    handleChange,
    handleSubmit,
  }
}
