import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../liff/pages/Home'
import ReservationsCalendar from '../liff/pages/ReservationsCalendar'
import { useLiffAuthStore } from '../liff/store/authStore'

const navigateMock = vi.fn()
const useSWRMock = vi.fn()

vi.mock('swr', () => ({
  default: (key: string) => useSWRMock(key),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('../hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    dialogState: {
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: '',
      cancelLabel: '',
      variant: 'default',
    },
    confirm: vi.fn(async () => false),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
}))

vi.mock('../components/ConfirmDialog', () => ({
  default: () => null,
}))

describe('LIFF dashboard UI', () => {
  beforeEach(() => {
    localStorage.clear()
    navigateMock.mockReset()
    useSWRMock.mockReset()

    useLiffAuthStore.setState({
      token: 'test-token',
      owner: {
        id: 1,
        name: '飼い主',
        storeId: 10,
        storeName: 'BLINK',
        storeAddress: '東京都',
        lineUserId: 'line-user',
        primaryBusinessType: 'daycare',
        availableBusinessTypes: ['daycare', 'grooming', 'hotel'],
      },
      selectedBusinessType: 'daycare',
      isAuthenticated: true,
    })
  })

  it('renders dashboard cards and keeps a single h1 in home', () => {
    const today = new Date().toISOString().split('T')[0]
    const mutateOwner = vi.fn()
    const mutateSummary = vi.fn()
    const ownerPayload = {
      id: 1,
      name: '飼い主',
      store_id: 10,
      store_name: 'BLINK',
      store_address: '東京都',
      line_id: 'line-user',
      primary_business_type: 'daycare',
      available_business_types: ['daycare', 'grooming', 'hotel'],
    }
    const summaryPayload = {
      service_type: 'daycare',
      next_reservation: {
        id: 1,
        reservation_date: today,
        reservation_time: '09:00',
        status: '予定',
        checked_in_at: null,
        checked_out_at: null,
        dog_name: 'ココ',
        dog_photo: null,
        has_pre_visit_input: false,
      },
      latest_record: {
        id: 10,
        record_date: today,
        dog_name: 'ココ',
        dog_photo: null,
        excerpt: '本日も元気に過ごしました',
        photo_count: 3,
      },
      announcements: {
        total: 3,
        unread: 1,
        latest: {
          id: 7,
          title: '来週の営業案内',
          published_at: '2026-02-12T09:00:00.000Z',
          is_important: true,
        },
      },
    }

    useSWRMock.mockImplementation((key: string) => {
      if (key === '/me') {
        return {
          data: ownerPayload,
          isLoading: false,
          mutate: mutateOwner,
        }
      }

      if (key.startsWith('/dashboard/summary')) {
        return {
          data: summaryPayload,
          error: null,
          isLoading: false,
          mutate: mutateSummary,
        }
      }

      return { data: null, error: null, isLoading: false, mutate: vi.fn() }
    })

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1, name: 'ホーム' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('最新の連絡帳')).toBeInTheDocument()
    expect(screen.getByText('お知らせ')).toBeInTheDocument()
    expect(screen.queryByText('空き状況確認・予約変更')).not.toBeInTheDocument()
    expect(screen.queryByText('クイックアクション')).not.toBeInTheDocument()
  })

  it('separates calendar states and uses compact day cells', () => {
    const today = new Date().toISOString().split('T')[0]

    useSWRMock.mockImplementation((key: string) => {
      if (key.startsWith('/reservations?')) {
        return {
          data: [{
            id: 1,
            reservation_date: today,
            reservation_time: '09:00',
            dog_name: 'ココ',
            dog_photo: '',
            status: '登園済',
            has_pre_visit_input: false,
            daycare_data: null,
          }],
          isLoading: false,
          mutate: vi.fn(),
        }
      }

      return { data: null, error: null, isLoading: false, mutate: vi.fn() }
    })

    render(
      <MemoryRouter>
        <ReservationsCalendar />
      </MemoryRouter>
    )

    const todayCell = screen.getByRole('button', { name: /今日/ })
    expect(todayCell.className).toContain('min-w-[40px]')
    expect(screen.getByText('予約あり')).toBeInTheDocument()
    expect(screen.getByText('選択中')).toBeInTheDocument()
    expect(screen.getByText('登園中')).toHaveClass('bg-chart-3/10')
  })
})
