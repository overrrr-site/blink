import { useState } from 'react'
import api from '../api/client'
import { useToast } from '../components/Toast'
import type { StaffReservationForm } from '../types/reservation'
import { formatDateISO } from '../utils/date'

type UseReservationCreateOptions = {
  dateParam: string | null
  onSuccess: () => void
}

export function useReservationCreate({ dateParam, onSuccess }: UseReservationCreateOptions) {
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
    if (!selectedDogId) {
      showToast('犬を選択してください', 'warning')
      return
    }

    setSaving(true)
    try {
      await api.post('/reservations', {
        dog_id: selectedDogId,
        ...form,
        service_type: 'daycare',
      })

      onSuccess()
    } catch (error) {
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
