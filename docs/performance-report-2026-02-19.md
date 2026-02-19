# Performance Report (2026-02-19)

## Scope
- Frontend + server optimization implementation verification
- Before/after comparison using local `git worktree` baseline (`HEAD: ed085b0`) vs current working tree

## Environment constraints
- Lighthouse CLI could not be installed because outbound network to npm was unavailable (`ENOTFOUND registry.npmjs.org`).
- Browser binary was not available in this environment, so React DevTools Profiler and browser Lighthouse could not be executed here.
- As an alternative, this report includes reproducible quantitative checks from build output and algorithm benchmarks.

## 1) Build output comparison (before vs after)

### Method
1. Baseline checkout with `git worktree` at `/tmp/pet-carte-baseline`.
2. `npm run build` in baseline and current client.
3. Compare emitted chunk sizes from Vite logs.

### Key results
- `Settings` chunk:
  - raw: `3.27 kB -> 2.90 kB` (`-11.3%`)
  - gzip: `1.51 kB -> 1.32 kB` (`-12.6%`)
- `StoreTab` chunk:
  - raw: `57.52 kB -> 58.44 kB` (`+1.6%`)
  - gzip: `14.78 kB -> 14.97 kB` (`+1.3%`)
- `ReservationsCalendar` (admin bundle):
  - raw: `10.80 kB -> 11.28 kB` (`+4.4%`)
  - gzip: `3.98 kB -> 4.27 kB` (`+7.3%`)
- `Dashboard` chunk:
  - raw: `13.16 kB -> 13.13 kB` (`-0.2%`)
  - gzip: `4.72 kB -> 4.71 kB` (`-0.2%`)

### Interpretation
- Bundle size is mostly flat; this optimization set is primarily render-path and request-behavior oriented, not bundle-size reduction oriented.
- `Settings` was reduced, while `StoreTab`/`ReservationsCalendar` gained slight code size due to extracted components and memoization logic.

## 2) ReservationsCalendar algorithm benchmark (synthetic)

### Method
- Synthetic benchmark script (`/tmp/calendar-bench.mjs`) compares old logic vs new logic.
- Same inputs, 1000 iterations each, reservation counts: 200/500/1000/2000.
- Old logic: per-cell `filter` over reservations.
- New logic: one-time date-key `Map` index + O(1) lookups.

### Results
- 200 reservations:
  - month: `384.57ms -> 30.84ms` (`-92.0%`)
  - week: `141.50ms -> 27.68ms` (`-80.4%`)
- 500 reservations:
  - month: `905.39ms -> 56.52ms` (`-93.8%`)
  - week: `276.06ms -> 54.27ms` (`-80.3%`)
- 1000 reservations:
  - month: `1787.78ms -> 109.60ms` (`-93.9%`)
  - week: `541.28ms -> 105.18ms` (`-80.6%`)
- 2000 reservations:
  - month: `3523.63ms -> 205.60ms` (`-94.2%`)
  - week: `1046.19ms -> 203.12ms` (`-80.6%`)

### Interpretation
- The grid-related compute path improves significantly under larger reservation volumes.
- Complexity shift is effectively from repeated `O(days * reservations)` filtering to `O(reservations + days)` indexing/lookup.

## 3) SWR and Zustand subscription reduction (static quantitative check)

### SWR `revalidateOnFocus: false` duplication
- Count in management-side code (excluding LIFF and excluded legacy pages):
  - before: `21`
  - after: `1` (global default in `App.tsx`)

### Zustand full-store subscriptions (`useAuthStore()`) 
- occurrences:
  - before: `12`
  - after: `0`

### Interpretation
- Global SWR config consolidation and selector-based Zustand subscriptions were applied as intended.

## 4) Dashboard response payload slimming (query-level)

### Before
- `SELECT r.*` + joined/derived fields.
- `reservations` table currently has `20` columns (initial schema + migrations).
- Result field count estimate: `~31` fields (`r.*` 20 + joined/derived 11).

### After
- Explicit select fields only:
  - reservation fields: `8`
  - joined/derived fields included by UI: `7`
- Result field count: `15`.

### Estimated reduction
- `31 -> 15` fields (`-16`, about `-51.6%`).

## 5) Type check status
- `client`: `npm exec -- tsc --noEmit` passed.
- `server`: `npm exec -- tsc --noEmit` passed.

