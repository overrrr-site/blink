import liffClient from '../api/client'

// LIFF API 用 fetcher
export const liffFetcher = (url: string) => liffClient.get(url).then((res) => res.data)
