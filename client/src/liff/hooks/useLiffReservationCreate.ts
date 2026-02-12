import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import liffClient from '../api/client'
import { getAxiosErrorMessage } from '../../utils/error'
import { useToast } from '../../components/Toast'
import type { LiffDog } from '../types/dog'
import type { LiffReservationForm } from '../../types/reservation'
import { useLiffAuthStore } from '../store/authStore'
import type { RecordType } from '../../types/record'

type LiffReservationCreateForm = LiffReservationForm & {
  dog_id: string
}

function getTomorrowString(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return format(date, 'yyyy-MM-dd')
}

function buildInitialForm(businessType: RecordType): LiffReservationCreateForm {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (businessType === 'grooming') {
    return {
      dog_id: '',
      reservation_date: today,
      reservation_time: '10:00',
      pickup_time: '',
      duration_minutes: 60,
      notes: '',
    }
  }
  if (businessType === 'hotel') {
    return {
      dog_id: '',
      reservation_date: today,
      reservation_time: '14:00',
      pickup_time: '',
      checkout_date: getTomorrowString(),
      checkout_time: '11:00',
      notes: '',
    }
  }
  return {
    dog_id: '',
    reservation_date: today,
    reservation_time: '09:00',
    pickup_time: '17:00',
    notes: '',
  }
}

export function useLiffReservationCreate() {
  const { showToast } = useToast()
  const selectedBusinessType = useLiffAuthStore((s) => s.selectedBusinessType || s.owner?.primaryBusinessType || 'daycare')
  const [dogs, setDogs] = useState<LiffDog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<LiffReservationCreateForm>(buildInitialForm(selectedBusinessType))

  useEffect(() => {
    const fetchDogs = async () => {
      try {
        const response = await liffClient.get('/me')
        setDogs(response.data.dogs || [])
        if (response.data.dogs && response.data.dogs.length > 0) {
          setFormData((prev) => ({
            ...prev,
            dog_id: String(response.data.dogs[0].id),
          }))
        }
      } catch (error) {
        console.error('Error fetching dogs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDogs()
  }, [])

  useEffect(() => {
    setFormData((prev) => {
      const next = buildInitialForm(selectedBusinessType)
      return {
        ...next,
        dog_id: prev.dog_id || next.dog_id,
        reservation_date: prev.reservation_date || next.reservation_date,
        notes: prev.notes,
      }
    })
  }, [selectedBusinessType])

  const handleSubmit = async () => {
    if (!formData.dog_id) {
      showToast('ワンちゃんを選択してください', 'warning')
      return false
    }
    if (selectedBusinessType === 'hotel') {
      if (!formData.checkout_date || !formData.checkout_time) {
        showToast('チェックアウト日時を入力してください', 'warning')
        return false
      }
      const startAt = new Date(`${formData.reservation_date}T${formData.reservation_time}`)
      const endAt = new Date(`${formData.checkout_date}T${formData.checkout_time}`)
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
        showToast('チェックアウト日時はチェックイン日時より後を指定してください', 'warning')
        return false
      }
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        dog_id: parseInt(formData.dog_id, 10),
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        notes: formData.notes || null,
        service_type: selectedBusinessType,
      }
      if (selectedBusinessType === 'grooming') {
        payload.service_details = {
          duration_minutes: formData.duration_minutes || 60,
        }
      }
      if (selectedBusinessType === 'hotel' && formData.checkout_date && formData.checkout_time) {
        payload.end_datetime = `${formData.checkout_date}T${formData.checkout_time}`
      }

      await liffClient.post('/reservations', {
        ...payload,
      })
      return true
    } catch (error) {
      console.error('Error creating reservation:', error)
      showToast(getAxiosErrorMessage(error, '予約の作成に失敗しました'), 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    dogs,
    loading,
    saving,
    formData,
    setFormData,
    handleSubmit,
  }
}
