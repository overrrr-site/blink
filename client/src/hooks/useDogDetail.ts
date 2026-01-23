import { useEffect, useState } from 'react'
import api from '../api/client'

export function useDogDetail(id?: string) {
  const [dog, setDog] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<any[]>([])
  const [loadingContracts, setLoadingContracts] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchDog = async () => {
      try {
        const response = await api.get(`/dogs/${id}`)
        setDog(response.data)
      } catch (error) {
        console.error('Error fetching dog:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchContracts = async () => {
      try {
        const response = await api.get('/contracts', {
          params: { dog_id: id },
        })
        setContracts(response.data)
      } catch (error) {
        console.error('Error fetching contracts:', error)
      } finally {
        setLoadingContracts(false)
      }
    }

    fetchDog()
    fetchContracts()
  }, [id])

  return {
    dog,
    loading,
    contracts,
    loadingContracts,
  }
}
