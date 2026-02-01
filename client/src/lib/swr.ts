import api from '../api/client'

export function fetcher(url: string) {
  return api.get(url).then((res) => res.data)
}
