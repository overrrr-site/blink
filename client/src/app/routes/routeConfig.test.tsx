import type { RouteObject } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { publicRoutes } from './publicRoutes'
import { staffRoutes } from './staffRoutes'

function collectPaths(routes: RouteObject[]): string[] {
  return routes.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...(route.children ? collectPaths(route.children) : []),
  ])
}

describe('route config', () => {
  it('keeps public entry points mounted', () => {
    const paths = collectPaths(publicRoutes)

    expect(paths).toEqual(expect.arrayContaining([
      '/',
      '/login',
      '/auth/callback',
      '/auth/reset-password',
      '/privacy',
      '/terms',
    ]))
  })

  it('keeps primary staff routes mounted under the authenticated shell', () => {
    const paths = collectPaths(staffRoutes)

    expect(paths).toEqual(expect.arrayContaining([
      '/dashboard',
      '/customers',
      '/owners',
      '/owners/:id',
      '/dogs/:id',
      '/reservations',
      '/reservations/:id',
      '/records',
      '/records/new',
      '/records/:id',
      '/settings',
      '/billing',
      '/help',
    ]))
  })
})
