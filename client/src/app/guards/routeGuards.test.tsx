import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import { PrivateRoute } from './PrivateRoute'
import { OwnerRoute } from './OwnerRoute'
import { useAuthStore } from '../../store/authStore'

const STAFF_USER = {
  id: 1,
  email: 'staff@example.com',
  name: 'Staff',
  storeId: 1,
  isOwner: false,
}

const OWNER_USER = {
  ...STAFF_USER,
  isOwner: true,
}

describe('route guards', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      supabaseUser: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('redirects unauthenticated users to login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/dashboard"
            element={(
              <PrivateRoute>
                <div>dashboard page</div>
              </PrivateRoute>
            )}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('shows loading state while auth initialization is running', () => {
    useAuthStore.setState({
      isLoading: true,
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={(
              <PrivateRoute>
                <div>dashboard page</div>
              </PrivateRoute>
            )}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('redirects non-owner users away from owner-only routes', () => {
    useAuthStore.setState({
      user: STAFF_USER,
      isAuthenticated: true,
    })

    render(
      <MemoryRouter initialEntries={['/billing']}>
        <Routes>
          <Route path="/settings" element={<div>settings page</div>} />
          <Route
            path="/billing"
            element={(
              <OwnerRoute>
                <div>billing page</div>
              </OwnerRoute>
            )}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('settings page')).toBeInTheDocument()
  })

  it('allows owner users to enter owner-only routes', () => {
    useAuthStore.setState({
      user: OWNER_USER,
      isAuthenticated: true,
    })

    render(
      <MemoryRouter initialEntries={['/billing']}>
        <Routes>
          <Route path="/settings" element={<div>settings page</div>} />
          <Route
            path="/billing"
            element={(
              <OwnerRoute>
                <div>billing page</div>
              </OwnerRoute>
            )}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('billing page')).toBeInTheDocument()
  })
})
