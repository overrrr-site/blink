import { useCallback, useRef } from 'react'
import useSWRInfinite from 'swr/infinite'
import { liffFetcher } from '../lib/swr'
import type { PaginatedResponse } from '../../types/api'

interface UsePaginatedDataOptions {
  baseUrl: string
  limit?: number
  params?: Record<string, string>
}

interface UsePaginatedDataReturn<T> {
  data: T[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  sentinelRef: (node: HTMLElement | null) => void
  error: Error | undefined
  mutate: () => void
}

function buildUrl(baseUrl: string, query: Record<string, string>): string {
  const separator = baseUrl.includes('?') ? '&' : '?'
  const params = new URLSearchParams(query)
  return `${baseUrl}${separator}${params.toString()}`
}

export function usePaginatedData<T>(
  options: UsePaginatedDataOptions
): UsePaginatedDataReturn<T> {
  const { baseUrl, limit = 20, params = {} } = options
  const observerRef = useRef<IntersectionObserver | null>(null)

  const getKey = (pageIndex: number, previousPageData?: PaginatedResponse<T>) => {
    if (previousPageData) {
      const { page, totalPages } = previousPageData.pagination
      if (page >= totalPages) return null
    }
    return buildUrl(baseUrl, {
      ...params,
      page: String(pageIndex + 1),
      limit: String(limit),
    })
  }

  const {
    data: pages,
    error,
    isLoading,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<PaginatedResponse<T>>(getKey, liffFetcher, {
    revalidateOnFocus: false,
  })

  const flatData = pages ? pages.flatMap((page) => page.data) : []
  const lastPage = pages ? pages[pages.length - 1] : undefined
  const hasMore = lastPage ? lastPage.pagination.page < lastPage.pagination.totalPages : false
  const isLoadingMore = Boolean(isLoading || (size > 0 && pages && typeof pages[size - 1] === 'undefined'))

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    setSize(size + 1)
  }, [hasMore, isLoadingMore, setSize, size])

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      if (!node || !hasMore) return

      observerRef.current = new IntersectionObserver((entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          loadMore()
        }
      })

      observerRef.current.observe(node)
    },
    [hasMore, loadMore]
  )

  return {
    data: flatData,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    sentinelRef,
    error,
    mutate: () => {
      void mutate()
    },
  }
}
