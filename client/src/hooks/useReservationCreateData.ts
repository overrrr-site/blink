import { useCallback, useEffect, useState } from 'react'
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
  reservations: unknown[]
): { dogs: ReservationDog[]; recentReservations: RecentReservation[] } {
  const dogReservationCounts: Record<number, number> = {}
  const dogLastReservation: Record<number, string> = {}

  const resList = reservations as Array<Record<string, unknown>>
  resList.forEach((r) => {
    const dogId = r.dog_id as number | undefined
    if (!dogId) return
    dogReservationCounts[dogId] = (dogReservationCounts[dogId] || 0) + 1
    const date = r.reservation_date as string
    if (!dogLastReservation[dogId] || date > dogLastReservation[dogId]) {
      dogLastReservation[dogId] = date
    }
  })

  const dogsWithStats = allDogs.map((dog) => ({
    ...dog,
    reservation_count: dogReservationCounts[dog.id] || 0,
    last_reservation_date: dogLastReservation[dog.id],
  }))

  dogsWithStats.sort((a, b) => (b.reservation_count || 0) - (a.reservation_count || 0))

  const recentMap = new Map<number, RecentReservation>()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  resList
    .filter((r) => new Date((r.reservation_date as string) || 0) >= thirtyDaysAgo)
    .sort(
      (a, b) =>
        new Date((b.reservation_date as string) || 0).getTime() -
        new Date((a.reservation_date as string) || 0).getTime()
    )
    .forEach((r) => {
      const dogId = r.dog_id as number | undefined
      if (dogId && !recentMap.has(dogId)) {
        recentMap.set(dogId, {
          dog_id: dogId,
          dog_name: (r.dog_name as string) ?? '',
          dog_photo: r.dog_photo as string | undefined,
          owner_name: (r.owner_name as string) ?? '',
          reservation_date: (r.reservation_date as string) ?? '',
        })
      }
    })

  const recentReservations = Array.from(recentMap.values()).slice(0, 5)
  return { dogs: dogsWithStats, recentReservations }
}

export function useReservationCreateData() {
  const [loading, setLoading] = useState(true)
  const [dogs, setDogs] = useState<ReservationDog[]>([])
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([])

  const invalidate = useCallback(() => {
    invalidateReservationCreateData()
  }, [])

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
          api.get<unknown[]>('/reservations', {
            params: { month: new Date().toISOString().slice(0, 7) },
          }),
        ])

        const allDogs = dogsResponse.data
        const reservations = reservationsResponse.data
        const { dogs: d, recentReservations: r } = processFetchResult(allDogs, reservations)

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
    invalidate,
  }
}
