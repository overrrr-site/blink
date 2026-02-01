import { useEffect, useState } from 'react'
import api from '../api/client'

export type ReservationDog = {
  id: number
  name: string
  breed: string
  photo_url?: string
  owner_name: string
  owner_id: number
  reservation_count?: number
  last_reservation_date?: string
}

export type RecentReservation = {
  dog_id: number
  dog_name: string
  dog_photo?: string
  owner_name: string
  reservation_date: string
}

type ReservationRecord = {
  dog_id?: number
  dog_name?: string
  dog_photo?: string
  owner_name?: string
  reservation_date?: string
}

const CACHE_TTL_MS = 60_000

type ReservationCreateCache = {
  dogs: ReservationDog[]
  recentReservations: RecentReservation[]
  fetchedAt: number
}

let reservationCreateCache: ReservationCreateCache | null = null

function isCacheValid(cache: ReservationCreateCache | null): cache is ReservationCreateCache {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS
}

/**
 * 予約作成用データのキャッシュを破棄（作成成功後に呼ぶと次回マウントで再取得）
 */
export function invalidateReservationCreateData(): void {
  reservationCreateCache = null
}

function processFetchResult(
  allDogs: ReservationDog[],
  reservations: ReservationRecord[]
): { dogs: ReservationDog[]; recentReservations: RecentReservation[] } {
  const dogReservationCounts: Record<number, number> = {}
  const dogLastReservation: Record<number, string> = {}

  for (const r of reservations) {
    if (!r.dog_id) continue
    dogReservationCounts[r.dog_id] = (dogReservationCounts[r.dog_id] || 0) + 1
    const date = r.reservation_date ?? ''
    if (!dogLastReservation[r.dog_id] || date > dogLastReservation[r.dog_id]) {
      dogLastReservation[r.dog_id] = date
    }
  }

  const dogsWithStats = allDogs
    .map((dog) => ({
      ...dog,
      reservation_count: dogReservationCounts[dog.id] || 0,
      last_reservation_date: dogLastReservation[dog.id],
    }))
    .sort((a, b) => (b.reservation_count || 0) - (a.reservation_count || 0))

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentMap = new Map<number, RecentReservation>()
  const recentEntries = reservations
    .filter((r) => new Date(r.reservation_date ?? 0) >= thirtyDaysAgo)
    .sort(
      (a, b) =>
        new Date(b.reservation_date ?? 0).getTime() -
        new Date(a.reservation_date ?? 0).getTime()
    )

  for (const r of recentEntries) {
    if (r.dog_id && !recentMap.has(r.dog_id)) {
      recentMap.set(r.dog_id, {
        dog_id: r.dog_id,
        dog_name: r.dog_name ?? '',
        dog_photo: r.dog_photo,
        owner_name: r.owner_name ?? '',
        reservation_date: r.reservation_date ?? '',
      })
    }
  }

  const recentReservations = Array.from(recentMap.values()).slice(0, 5)
  return { dogs: dogsWithStats, recentReservations }
}

export function useReservationCreateData() {
  const [loading, setLoading] = useState(true)
  const [dogs, setDogs] = useState<ReservationDog[]>([])
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([])

  useEffect(() => {
    if (isCacheValid(reservationCreateCache)) {
      setDogs(reservationCreateCache.dogs)
      setRecentReservations(reservationCreateCache.recentReservations)
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const [dogsResponse, reservationsResponse] = await Promise.all([
          api.get<ReservationDog[]>('/dogs'),
          api.get<ReservationRecord[]>('/reservations', {
            params: { month: new Date().toISOString().slice(0, 7) },
          }),
        ])

        const { dogs: d, recentReservations: r } = processFetchResult(
          dogsResponse.data,
          reservationsResponse.data
        )

        reservationCreateCache = { dogs: d, recentReservations: r, fetchedAt: Date.now() }
        setDogs(d)
        setRecentReservations(r)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return {
    loading,
    dogs,
    recentReservations,
    invalidate: invalidateReservationCreateData,
  }
}
