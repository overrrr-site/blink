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

export function useReservationCreateData() {
  const [loading, setLoading] = useState(true)
  const [dogs, setDogs] = useState<ReservationDog[]>([])
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dogsResponse, reservationsResponse] = await Promise.all([
          api.get('/dogs'),
          api.get('/reservations', {
            params: {
              month: new Date().toISOString().slice(0, 7),
            },
          }),
        ])

        const allDogs = dogsResponse.data
        const reservations = reservationsResponse.data

        const dogReservationCounts: Record<number, number> = {}
        const dogLastReservation: Record<number, string> = {}

        reservations.forEach((r: any) => {
          if (r.dog_id) {
            dogReservationCounts[r.dog_id] = (dogReservationCounts[r.dog_id] || 0) + 1
            if (!dogLastReservation[r.dog_id] || r.reservation_date > dogLastReservation[r.dog_id]) {
              dogLastReservation[r.dog_id] = r.reservation_date
            }
          }
        })

        const dogsWithStats = allDogs.map((dog: ReservationDog) => ({
          ...dog,
          reservation_count: dogReservationCounts[dog.id] || 0,
          last_reservation_date: dogLastReservation[dog.id],
        }))

        dogsWithStats.sort((a: ReservationDog, b: ReservationDog) => (b.reservation_count || 0) - (a.reservation_count || 0))

        setDogs(dogsWithStats)

        const recentMap = new Map<number, RecentReservation>()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        reservations
          .filter((r: any) => new Date(r.reservation_date) >= thirtyDaysAgo)
          .sort((a: any, b: any) => new Date(b.reservation_date).getTime() - new Date(a.reservation_date).getTime())
          .forEach((r: any) => {
            if (r.dog_id && !recentMap.has(r.dog_id)) {
              recentMap.set(r.dog_id, {
                dog_id: r.dog_id,
                dog_name: r.dog_name,
                dog_photo: r.dog_photo,
                owner_name: r.owner_name,
                reservation_date: r.reservation_date,
              })
            }
          })

        setRecentReservations(Array.from(recentMap.values()).slice(0, 5))
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
  }
}
