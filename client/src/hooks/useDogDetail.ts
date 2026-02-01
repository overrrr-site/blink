import useSWR from 'swr'
import { fetcher } from '../lib/swr'

interface DogReservationItem {
  id: number
  reservation_date: string
  reservation_time: string
  status: string
  owner_name?: string | null
}

interface DogJournalItem {
  id: number
  journal_date: string
  comment?: string | null
  staff_name?: string | null
}

interface DogDetailData {
  id: number
  name: string
  breed: string
  birth_date: string
  gender: string
  photo_url?: string | null
  weight?: number | null
  color?: string | null
  neutered?: string | null
  health?: Record<string, unknown>
  personality?: Record<string, unknown>
  reservations?: DogReservationItem[]
  journals?: DogJournalItem[]
}

interface ContractData {
  id: number
  dog_id: number
  contract_type: string
  course_name?: string
  price?: number
  total_sessions?: number
  remaining_sessions?: number
  valid_until?: string
  calculated_remaining?: number
  monthly_sessions?: number
}

export function useDogDetail(id?: string) {
  const { data: dog, isLoading } = useSWR<DogDetailData>(
    id ? `/dogs/${id}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )
  const { data: contracts, isLoading: contractsLoading } = useSWR<ContractData[]>(
    id ? `/contracts?dog_id=${id}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  const normalizedDog = dog
    ? {
        ...dog,
        reservations: (dog.reservations ?? []).map((reservation) => ({
          ...reservation,
          owner_name: reservation.owner_name ?? '',
        })),
        journals: (dog.journals ?? []).map((journal) => ({
          ...journal,
          comment: journal.comment ?? undefined,
          staff_name: journal.staff_name ?? undefined,
        })),
      }
    : null

  return {
    dog: normalizedDog,
    loading: isLoading,
    contracts: contracts ?? [],
    loadingContracts: contractsLoading,
  }
}
