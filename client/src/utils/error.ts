import axios from 'axios'

/**
 * Extract a user-facing error message from an Axios error response.
 * Falls back to the provided default message if no server error message is found.
 */
export function getAxiosErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as {
      error?: string
      message?: string
      reason?: string
    } | undefined
    if (payload?.error && payload?.reason) {
      return `${payload.error}: ${payload.reason}`
    }
    return payload?.error || payload?.message || payload?.reason || fallback
  }
  if (error instanceof Error) {
    return error.message || fallback
  }
  return fallback
}
