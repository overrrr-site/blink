import { useMemo } from 'react'
import type { ReservationDog, RecentReservation } from './useReservationCreateData'

type UseDogFilterParams = {
  dogs: ReservationDog[]
  recentReservations: RecentReservation[]
  searchQuery: string
}

export function useDogFilter({ dogs, recentReservations, searchQuery }: UseDogFilterParams) {
  const filteredDogs = useMemo(
    () =>
      dogs.filter(
        (dog) =>
          dog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dog.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [dogs, searchQuery]
  )

  const recentDogs = useMemo(
    () =>
      recentReservations
        .map((r) => dogs.find((d) => d.id === r.dog_id))
        .filter((d): d is ReservationDog => d !== undefined),
    [dogs, recentReservations]
  )

  return { filteredDogs, recentDogs }
}
