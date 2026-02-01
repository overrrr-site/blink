const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Supabase Storage の画像URLにサムネイルパラメータを追加。
 * render/image エンドポイントを使用してリサイズする。
 */
export function getThumbnailUrl(
  url: string | null | undefined,
  width: number,
  height?: number,
  quality: number = 80
): string {
  if (!url) return ''

  // Base64データの場合はそのまま返す（サムネイル変換不可）
  if (url.startsWith('data:')) {
    return url
  }

  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`

  if (!fullUrl.includes('supabase.co/storage')) {
    return fullUrl
  }

  let urlObj: URL
  try {
    urlObj = new URL(fullUrl)
  } catch {
    return fullUrl
  }

  const baseUrl = `${urlObj.origin}${urlObj.pathname}`
  const transformedUrl = baseUrl.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  )

  const params = new URLSearchParams(urlObj.searchParams)
  params.set('width', String(width))
  if (height) {
    params.set('height', String(height))
  }
  params.set('quality', String(quality))
  params.set('resize', 'cover')

  return `${transformedUrl}?${params.toString()}`
}

export function getAvatarUrl(url: string | null | undefined): string {
  return getThumbnailUrl(url, 160, 160)
}

export function getListThumbnailUrl(url: string | null | undefined): string {
  return getThumbnailUrl(url, 240, 240)
}

export function getDetailThumbnailUrl(url: string | null | undefined): string {
  return getThumbnailUrl(url, 640)
}
