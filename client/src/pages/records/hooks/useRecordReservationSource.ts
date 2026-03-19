import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import useSWR from 'swr'
import { fetcher } from '../../../lib/swr'
import type { HotelData, RecordType } from '../../../types/record'

interface ReservationSource {
  dog_id?: number
  service_type?: RecordType
  reservation_date?: string
  reservation_time?: string | null
  end_datetime?: string | null
  service_details?: {
    special_care?: string
  } | null
  memo?: string | null
  notes?: string | null
}

interface UseRecordReservationSourceArgs {
  reservationId?: string
  activeBusinessType: RecordType
  setSelectedDogId: Dispatch<SetStateAction<number | null>>
  setHotelData: Dispatch<SetStateAction<HotelData>>
}

function formatToDatetimeLocal(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function combineDateAndTime(date?: string, time?: string | null): string {
  if (!date) return ''
  const timeValue = time && /^\d{2}:\d{2}$/.test(time) ? time : '00:00'
  return `${date}T${timeValue}`
}

export function useRecordReservationSource({
  reservationId,
  activeBusinessType,
  setSelectedDogId,
  setHotelData,
}: UseRecordReservationSourceArgs) {
  const isCreatingFromReservation = Boolean(reservationId)
  const [reservationLookupDone, setReservationLookupDone] = useState(!isCreatingFromReservation)

  useEffect(() => {
    setReservationLookupDone(!isCreatingFromReservation)
  }, [isCreatingFromReservation, reservationId])

  const { error: reservationSourceError } = useSWR<ReservationSource>(
    reservationId ? `/reservations/${reservationId}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (typeof data?.dog_id === 'number' && data.dog_id > 0) {
          setSelectedDogId(data.dog_id)
        }

        if (data?.service_type === 'hotel' && activeBusinessType === 'hotel') {
          setHotelData((prev) => {
            if (prev.check_in || prev.check_out_scheduled) return prev

            const checkIn = formatToDatetimeLocal(combineDateAndTime(data.reservation_date, data.reservation_time))
            const checkOut = formatToDatetimeLocal(data.end_datetime)
            const diffMs = checkIn && checkOut
              ? new Date(checkOut).getTime() - new Date(checkIn).getTime()
              : 0
            const computedNights = diffMs > 0 ? Math.ceil(diffMs / 86_400_000) : 1

            return {
              ...prev,
              check_in: checkIn,
              check_out_scheduled: checkOut,
              nights: Math.max(1, computedNights),
              special_care: data.service_details?.special_care || data.memo || data.notes || prev.special_care || '',
            }
          })
        }

        setReservationLookupDone(true)
      },
      onError: () => {
        setReservationLookupDone(true)
      },
    }
  )

  return {
    reservationSourceError,
    waitingReservationSource: isCreatingFromReservation && !reservationLookupDone,
  }
}
