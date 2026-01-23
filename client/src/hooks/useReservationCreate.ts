import { useState } from 'react'
import api from '../api/client'
import { formatDateISO } from '../utils/date'

type ReservationForm = {
  reservation_date: string
  reservation_time: string
  pickup_time: string
  reservation_type: 'regular' | 'single'
  notes: string
}

type UseReservationCreateOptions = {
  dateParam: string | null
  onSuccess: () => void
}

export function useReservationCreate({ dateParam, onSuccess }: UseReservationCreateOptions) {
  const [saving, setSaving] = useState(false)
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState<ReservationForm>({
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
      alert('犬を選択してください')
      return
    }

    setSaving(true)
    try {
      await api.post('/reservations', {
        dog_id: selectedDogId,
        ...form,
      })

      onSuccess()
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert('予約登録に失敗しました')
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
