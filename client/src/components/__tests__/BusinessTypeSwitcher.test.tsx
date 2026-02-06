import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import BusinessTypeSwitcher from '../BusinessTypeSwitcher'
import { useAuthStore } from '../../store/authStore'
import { useBusinessTypeStore } from '../../store/businessTypeStore'

const baseUser = {
  id: 1,
  email: 'tester@example.com',
  name: 'Tester',
  storeId: 10,
  isOwner: false,
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({
    user: null,
    supabaseUser: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
  })
  useBusinessTypeStore.setState({ selectedBusinessType: null })
})

describe('BusinessTypeSwitcher', () => {
  it('renders as display-only when only one business type is available', () => {
    useAuthStore.setState({
      user: {
        ...baseUser,
        businessTypes: ['grooming'],
        assignedBusinessTypes: null,
      },
    })

    render(<BusinessTypeSwitcher />)

    expect(screen.queryByRole('button', { name: '業種を切り替え' })).toBeNull()
  })

  it('updates selected business type when choosing from the dropdown', () => {
    useAuthStore.setState({
      user: {
        ...baseUser,
        businessTypes: ['daycare', 'grooming'],
        assignedBusinessTypes: null,
      },
    })

    render(<BusinessTypeSwitcher />)

    const trigger = screen.getByRole('button', { name: '業種を切り替え' })
    fireEvent.click(trigger)

    const groomingOption = screen.getByRole('option', { name: 'トリミング' })
    fireEvent.click(groomingOption)

    expect(useBusinessTypeStore.getState().selectedBusinessType).toBe('grooming')
  })
})
