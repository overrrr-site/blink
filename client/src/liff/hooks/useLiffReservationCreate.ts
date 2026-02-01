import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import liffClient from '../api/client'
import { getAxiosErrorMessage } from '../../utils/error'
import type { LiffDog } from '../types/dog'
import type { LiffReservationForm } from '../../types/reservation'

type LiffReservationCreateForm = LiffReservationForm & {
  dog_id: string
}

export function useLiffReservationCreate() {
  const [dogs, setDogs] = useState<LiffDog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<LiffReservationCreateForm>({
    dog_id: '',
    reservation_date: format(new Date(), 'yyyy-MM-dd'),
    reservation_time: '09:00',
    pickup_time: '17:00',
    notes: '',
  })

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

  const handleSubmit = async () => {
    if (!formData.dog_id) {
      alert('ワンちゃんを選択してください')
      return false
    }

    setSaving(true)
    try {
      await liffClient.post('/reservations', {
        dog_id: parseInt(formData.dog_id, 10),
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        notes: formData.notes || null,
      })
      return true
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert(getAxiosErrorMessage(error, '予約の作成に失敗しました'))
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
