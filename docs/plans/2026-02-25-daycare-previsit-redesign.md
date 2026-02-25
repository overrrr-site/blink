# Daycare Pre-Visit Input Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate daycare pre-visit input from flat DB columns to `daycare_data` JSONB and redesign the LIFF form to match the physical ようちえん連絡帳.

**Architecture:** Add `daycare_data` JSONB column to `pre_visit_inputs`, backfill existing data, drop old columns. All daycare pre-visit data flows through this single JSONB field, matching the grooming_data/hotel_data pattern. Server routes and all client views updated to read/write `daycare_data`.

**Tech Stack:** PostgreSQL JSONB, Express.js routes, React + TypeScript + Tailwind CSS (LIFF & admin)

---

## Shared Type Definition

This interface is used across multiple tasks. Create it once and import everywhere.

```typescript
// client/src/types/daycarePreVisit.ts
export interface DaycarePreVisitData {
  pickup_time: '17:00' | '17:30' | '18:00' | 'other'
  pickup_time_other?: string
  energy: 'good' | 'poor'
  energy_detail?: string
  appetite: 'good' | 'poor'
  appetite_detail?: string
  poop: 'normal' | 'soft' | 'bloody'
  pee: 'normal' | 'dark' | 'bloody'
  vomiting: boolean
  vomiting_detail?: string
  itching: boolean
  itching_detail?: string
  medication: boolean
  medication_detail?: string
  last_poop_time?: string
  last_pee_time?: string
  last_meal_time?: string
  notes?: string
}

export const DEFAULT_DAYCARE_DATA: DaycarePreVisitData = {
  pickup_time: '17:00',
  energy: 'good',
  appetite: 'good',
  poop: 'normal',
  pee: 'normal',
  vomiting: false,
  itching: false,
  medication: false,
}

/** Human-readable labels for display */
export const DAYCARE_LABELS = {
  pickup_time: { '17:00': '17時', '17:30': '17時30分', '18:00': '18時', other: 'その他' },
  energy: { good: 'あり', poor: 'なし' },
  appetite: { good: 'あり', poor: 'なし' },
  poop: { normal: '問題なし', soft: '軟便', bloody: '血便' },
  pee: { normal: '問題なし', dark: '色が濃い', bloody: '血尿' },
} as const

/** Check if a daycare value is abnormal (for red badge display) */
export function isDaycareAbnormal(data: DaycarePreVisitData): boolean {
  return (
    data.energy === 'poor' ||
    data.appetite === 'poor' ||
    data.poop !== 'normal' ||
    data.pee !== 'normal' ||
    data.vomiting ||
    data.itching
  )
}
```

---

## Task 1: DB Migration

**Files:**
- Create: `server/src/db/migrations/042_daycare_data_migration.sql`

**Step 1: Write the migration SQL**

```sql
-- 042_daycare_data_migration.sql
-- Add daycare_data JSONB column
ALTER TABLE pre_visit_inputs
  ADD COLUMN IF NOT EXISTS daycare_data JSONB;

-- Backfill existing daycare rows
UPDATE pre_visit_inputs
SET daycare_data = jsonb_build_object(
  'pickup_time', '17:00',
  'energy', 'good',
  'appetite', CASE
    WHEN breakfast_status IN ('完食', '少し残した') THEN 'good'
    WHEN breakfast_status IN ('半分以下', '食べていない') THEN 'poor'
    ELSE 'good'
  END,
  'poop', 'normal',
  'pee', 'normal',
  'vomiting', false,
  'itching', false,
  'medication', false,
  'notes', COALESCE(health_status, '') || CASE WHEN health_status IS NOT NULL AND notes IS NOT NULL THEN E'\n' ELSE '' END || COALESCE(notes, '')
)
WHERE COALESCE(service_type, 'daycare') = 'daycare'
  AND daycare_data IS NULL;

-- Drop old columns
ALTER TABLE pre_visit_inputs
  DROP COLUMN IF EXISTS morning_urination,
  DROP COLUMN IF EXISTS morning_defecation,
  DROP COLUMN IF EXISTS afternoon_urination,
  DROP COLUMN IF EXISTS afternoon_defecation,
  DROP COLUMN IF EXISTS breakfast_status,
  DROP COLUMN IF EXISTS health_status,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS meal_data;
```

**Step 2: Run the migration on local DB**

Run: `psql $DATABASE_URL -f server/src/db/migrations/042_daycare_data_migration.sql`
Expected: ALTER TABLE, UPDATE, ALTER TABLE all succeed.

**Step 3: Commit**

```bash
git add server/src/db/migrations/042_daycare_data_migration.sql
git commit -m "feat: add daycare_data JSONB migration (042)"
```

---

## Task 2: Shared Type File

**Files:**
- Create: `client/src/types/daycarePreVisit.ts`

**Step 1: Create the shared type file**

Use the code from the "Shared Type Definition" section above.

**Step 2: Commit**

```bash
git add client/src/types/daycarePreVisit.ts
git commit -m "feat: add DaycarePreVisitData shared type"
```

---

## Task 3: Server Routes — LIFF Pre-Visit Inputs

**Files:**
- Modify: `server/src/routes/liff/preVisitInputs.ts`

**Step 1: Update GET (latest) query**

Replace the SELECT to include `daycare_data` instead of old columns:

```sql
SELECT pvi.service_type, pvi.daycare_data, pvi.grooming_data, pvi.hotel_data
FROM pre_visit_inputs pvi
JOIN reservations r ON pvi.reservation_id = r.id
WHERE r.dog_id = $1
  AND ($2::text IS NULL OR COALESCE(pvi.service_type, r.service_type, 'daycare') = $2)
ORDER BY pvi.submitted_at DESC
LIMIT 1
```

**Step 2: Update POST (create/upsert)**

Replace the destructured body fields and INSERT/UPDATE:
- Remove: `morning_urination`, `morning_defecation`, `afternoon_urination`, `afternoon_defecation`, `breakfast_status`, `health_status`, `notes`, `meal_data`
- Add: `daycare_data`
- INSERT: `reservation_id, service_type, daycare_data, grooming_data, hotel_data`
- ON CONFLICT: update `daycare_data`, `service_type`, `grooming_data`, `hotel_data`, `submitted_at`
- Remove `safeBreakfastStatus`, `safeHealthStatus`, `mealDataJson` variables

```typescript
const {
  reservation_id,
  service_type,
  daycare_data,
  grooming_data,
  hotel_data,
} = req.body;

// ... auth checks same as before ...

const daycareDataJson = daycare_data ? JSON.stringify(daycare_data) : null;
const groomingDataJson = grooming_data ? JSON.stringify(grooming_data) : null;
const hotelDataJson = hotel_data ? JSON.stringify(hotel_data) : null;

const result = await client.query(
  `INSERT INTO pre_visit_inputs (
    reservation_id, service_type, daycare_data, grooming_data, hotel_data
  ) VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (reservation_id) DO UPDATE SET
    service_type = EXCLUDED.service_type,
    daycare_data = EXCLUDED.daycare_data,
    grooming_data = EXCLUDED.grooming_data,
    hotel_data = EXCLUDED.hotel_data,
    submitted_at = CURRENT_TIMESTAMP
  RETURNING *`,
  [reservation_id, finalServiceType, daycareDataJson, groomingDataJson, hotelDataJson]
);
```

**Step 3: Commit**

```bash
git add server/src/routes/liff/preVisitInputs.ts
git commit -m "feat: update LIFF pre-visit routes for daycare_data JSONB"
```

---

## Task 4: Server Routes — Admin Pre-Visit Inputs

**Files:**
- Modify: `server/src/routes/preVisitInputs.ts`

**Step 1: Update GET (by reservation)**

No SQL change needed — `SELECT pvi.*` already picks up `daycare_data`.

**Step 2: Update POST (create/update)**

Same pattern as Task 3:
- Remove old flat fields from destructuring and queries
- Use `daycare_data` JSONB

```typescript
const {
  reservation_id,
  service_type,
  daycare_data,
  grooming_data,
  hotel_data,
} = req.body;

// UPDATE query:
`UPDATE pre_visit_inputs SET
  service_type = $1, daycare_data = $2,
  grooming_data = $3, hotel_data = $4
WHERE reservation_id = $5
RETURNING *`

// INSERT query:
`INSERT INTO pre_visit_inputs (
  reservation_id, service_type, daycare_data, grooming_data, hotel_data
) VALUES ($1, $2, $3, $4, $5)
RETURNING *`
```

**Step 3: Commit**

```bash
git add server/src/routes/preVisitInputs.ts
git commit -m "feat: update admin pre-visit routes for daycare_data JSONB"
```

---

## Task 5: Server Routes — Reservation & Dashboard Queries

**Files:**
- Modify: `server/src/routes/reservations.ts` (2 queries)
- Modify: `server/src/routes/dashboard.ts` (1 query)
- Modify: `server/src/routes/dogs.ts` (no column changes, `SELECT pvi.*` works)
- Modify: `server/src/routes/liff/reservations.ts` (1 query)

**Step 1: Update `server/src/routes/reservations.ts` line ~163-169**

Replace:
```sql
pvi.breakfast_status, pvi.health_status, pvi.notes as pre_visit_notes,
```
With:
```sql
pvi.daycare_data,
```

**Step 2: Update `server/src/routes/reservations.ts` line ~311-316**

Replace:
```sql
pvi.morning_urination, pvi.morning_defecation,
pvi.afternoon_urination, pvi.afternoon_defecation,
pvi.breakfast_status, pvi.health_status, pvi.notes as pre_visit_notes,
pvi.meal_data, pvi.service_type as pre_visit_service_type,
pvi.grooming_data, pvi.hotel_data,
```
With:
```sql
pvi.daycare_data, pvi.service_type as pre_visit_service_type,
pvi.grooming_data, pvi.hotel_data,
```

**Step 3: Update `server/src/routes/dashboard.ts` line ~61**

Replace:
```sql
pvi.breakfast_status, pvi.health_status, pvi.notes,
```
With:
```sql
pvi.daycare_data,
```

**Step 4: Update `server/src/routes/liff/reservations.ts` line ~37-41**

Replace:
```sql
pvi.morning_urination, pvi.morning_defecation,
pvi.afternoon_urination, pvi.afternoon_defecation,
pvi.breakfast_status, pvi.health_status, pvi.notes as pre_visit_notes,
pvi.meal_data, pvi.service_type as pre_visit_service_type,
pvi.grooming_data, pvi.hotel_data,
```
With:
```sql
pvi.daycare_data, pvi.service_type as pre_visit_service_type,
pvi.grooming_data, pvi.hotel_data,
```

**Step 5: Commit**

```bash
git add server/src/routes/reservations.ts server/src/routes/dashboard.ts server/src/routes/liff/reservations.ts
git commit -m "feat: update reservation/dashboard queries for daycare_data"
```

---

## Task 6: Client Models & Types — Admin

**Files:**
- Modify: `client/src/pages/dashboard/reservationDetailModel.ts`
- Modify: `client/src/pages/dashboard/reservationDetailModel.test.ts`
- Modify: `client/src/components/dashboard/reservationCardModel.ts`

**Step 1: Update `reservationDetailModel.ts`**

Replace `ReservationDetailPreVisitData` interface:

```typescript
import type { DaycarePreVisitData } from '../../types/daycarePreVisit'

interface ReservationDetailPreVisitData {
  daycare_data?: DaycarePreVisitData | null
  grooming_data?: unknown | null
  hotel_data?: unknown | null
}
```

Update `hasReservationPreVisitInput`:

```typescript
export function hasReservationPreVisitInput(
  reservation: ReservationDetailPreVisitData
): boolean {
  return Boolean(
    reservation.daycare_data ||
    reservation.grooming_data ||
    reservation.hotel_data
  )
}
```

Remove `MealData` interface.

**Step 2: Update `reservationDetailModel.test.ts`**

```typescript
it('matches existing pre-visit input decision for textual data', () => {
  expect(hasReservationPreVisitInput({})).toBe(false)
  expect(hasReservationPreVisitInput({ daycare_data: { pickup_time: '17:00', energy: 'good', appetite: 'good', poop: 'normal', pee: 'normal', vomiting: false, itching: false, medication: false, notes: '連絡あり' } })).toBe(true)
})

it('treats daycare_data presence as pre-visit input', () => {
  expect(hasReservationPreVisitInput({ daycare_data: { pickup_time: '17:00', energy: 'good', appetite: 'good', poop: 'normal', pee: 'normal', vomiting: false, itching: false, medication: false } })).toBe(true)
})
```

Remove the old boolean test case.

**Step 3: Update `reservationCardModel.ts`**

Replace `ReservationPreVisitSource` and `hasPreVisitInput`:

```typescript
interface ReservationPreVisitSource {
  daycare_data?: unknown | null
  grooming_data?: unknown | null
  hotel_data?: unknown | null
}

export function hasPreVisitInput(reservation: ReservationPreVisitSource): boolean {
  return Boolean(reservation.daycare_data || reservation.grooming_data || reservation.hotel_data)
}
```

**Step 4: Run tests**

Run: `cd /Users/shota/Desktop/claude/pet-carte && npx vitest run client/src/pages/dashboard/reservationDetailModel.test.ts`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add client/src/pages/dashboard/reservationDetailModel.ts client/src/pages/dashboard/reservationDetailModel.test.ts client/src/components/dashboard/reservationCardModel.ts
git commit -m "feat: update admin models for daycare_data JSONB"
```

---

## Task 7: Client — ReservationCard (Admin Dashboard)

**Files:**
- Modify: `client/src/components/ReservationCard.tsx`

**Step 1: Update `ReservationCardData` interface**

Remove: `pvi_morning_urination`, `pvi_morning_defecation`, `breakfast_status`, `health_status`, `notes`
Add: `daycare_data?: DaycarePreVisitData | null`

```typescript
import type { DaycarePreVisitData, DAYCARE_LABELS } from '../types/daycarePreVisit'

export interface ReservationCardData {
  // ... keep id, dog_id, dog_name, etc. ...
  daycare_data?: DaycarePreVisitData | null
  grooming_data?: unknown | null
  hotel_data?: unknown | null
  // ... keep end_datetime, service_type ...
}
```

**Step 2: Update the expanded pre-visit summary display**

Replace the `{hasPreVisitInput(reservation) && (` block with daycare_data-aware display:

```tsx
{hasPreVisitInput(reservation) && (
  <div className="bg-chart-3/5 px-4 py-3">
    <p className="text-xs font-bold text-chart-3 mb-1">
      <Icon icon="solar:clipboard-text-bold" className="size-4 mr-1" />
      飼い主さんからの連絡
    </p>
    {reservation.daycare_data && (
      <>
        {reservation.daycare_data.energy === 'poor' && (
          <p className="text-xs text-destructive">元気: なし {reservation.daycare_data.energy_detail && `(${reservation.daycare_data.energy_detail})`}</p>
        )}
        {reservation.daycare_data.vomiting && (
          <p className="text-xs text-destructive">嘔吐あり {reservation.daycare_data.vomiting_detail && `(${reservation.daycare_data.vomiting_detail})`}</p>
        )}
        {reservation.daycare_data.notes && (
          <p className="text-xs text-foreground">{reservation.daycare_data.notes}</p>
        )}
      </>
    )}
  </div>
)}
```

**Step 3: Commit**

```bash
git add client/src/components/ReservationCard.tsx
git commit -m "feat: update ReservationCard for daycare_data display"
```

---

## Task 8: Client — ReservationDetail (Admin)

**Files:**
- Modify: `client/src/pages/ReservationDetail.tsx`

**Step 1: Update `ReservationDetailData` interface**

Remove: `morning_urination`, `morning_defecation`, `afternoon_urination`, `afternoon_defecation`, `breakfast_status`, `health_status`, `pre_visit_notes`, `meal_data`
Add: `daycare_data?: DaycarePreVisitData | null`

**Step 2: Update the daycare pre-visit display section**

Replace the old excretion/breakfast/health/notes display with a daycare_data-aware section using `DAYCARE_LABELS` for human-readable values, with red badges for abnormal values:

```tsx
{showDaycare && reservation.daycare_data && (
  <div className="space-y-3">
    <div>
      <label className="text-xs text-muted-foreground">お迎え予定</label>
      <p className="text-base font-medium">{DAYCARE_LABELS.pickup_time[reservation.daycare_data.pickup_time] ?? reservation.daycare_data.pickup_time_other}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {/* Badges for each health item, red if abnormal */}
    </div>
    {/* Last times */}
    {/* Notes */}
  </div>
)}
```

Full implementation details to follow the existing code style in the file.

**Step 3: Commit**

```bash
git add client/src/pages/ReservationDetail.tsx
git commit -m "feat: update ReservationDetail for daycare_data display"
```

---

## Task 9: Client — HistoryTabs (Dog Detail, Admin)

**Files:**
- Modify: `client/src/components/dogs/HistoryTabs.tsx`

**Step 1: Update `PreVisitItem` type**

Remove: `morning_urination`, `morning_defecation`, `afternoon_urination`, `afternoon_defecation`, `breakfast_status`, `health_status`, `notes`, `meal_data`
Add: `daycare_data?: DaycarePreVisitData | null`

**Step 2: Update pre-visit history display**

Replace the old display logic (lines ~224-254) with `daycare_data`-based rendering. Show health badges and notes from `pvi.daycare_data`.

**Step 3: Commit**

```bash
git add client/src/components/dogs/HistoryTabs.tsx
git commit -m "feat: update HistoryTabs for daycare_data display"
```

---

## Task 10: Client — LIFF ReservationsCalendar

**Files:**
- Modify: `client/src/liff/pages/ReservationsCalendar.tsx`

**Step 1: Update `Reservation` interface**

Remove: `morning_urination`, `morning_defecation`, `afternoon_urination`, `afternoon_defecation`, `breakfast_status`, `health_status`, `pre_visit_notes`
Add: `daycare_data?: DaycarePreVisitData | null`

**Step 2: Update `hasNoExcretionRecords` function**

Remove entire function, or replace with daycare_data-based check.

**Step 3: Update the pre-visit display in the calendar card**

Replace old badge display (lines ~399-448) with `daycare_data` field rendering.

**Step 4: Commit**

```bash
git add client/src/liff/pages/ReservationsCalendar.tsx
git commit -m "feat: update LIFF ReservationsCalendar for daycare_data"
```

---

## Task 11: Client — LIFF Test File

**Files:**
- Modify: `client/src/__tests__/liffDashboardUI.test.tsx`

**Step 1: Update mock reservation data**

Remove: `morning_urination`, `morning_defecation`, `afternoon_urination`, `afternoon_defecation`, `breakfast_status`, `health_status`, `pre_visit_notes`
Add: `daycare_data: null`

**Step 2: Run tests**

Run: `cd /Users/shota/Desktop/claude/pet-carte && npx vitest run client/src/__tests__/liffDashboardUI.test.tsx`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add client/src/__tests__/liffDashboardUI.test.tsx
git commit -m "test: update LIFF dashboard test mocks for daycare_data"
```

---

## Task 12: Client — LIFF PreVisitInput Form (Major Rewrite)

**Files:**
- Modify: `client/src/liff/pages/PreVisitInput.tsx`

This is the biggest change. Replace the entire daycare form section.

**Step 1: Update imports and types**

```typescript
import type { DaycarePreVisitData } from '../../types/daycarePreVisit'
import { DEFAULT_DAYCARE_DATA } from '../../types/daycarePreVisit'
```

Remove `MealEntry` import. Remove old `DEFAULT_DAYCARE_DATA`. Remove `CheckboxItem` component.

**Step 2: Update `PreVisitReservation` interface**

Remove: `morning_urination`, `morning_defecation`, `afternoon_urination`, `afternoon_defecation`, `breakfast_status`, `health_status`, `pre_visit_notes`, `meal_data`
Add: `daycare_data?: DaycarePreVisitData`

**Step 3: Add new UI components**

Add `RadioRow` component for inline radio selections:

```tsx
function RadioRow<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string
  name: string
  value: T
  options: { value: T; label: string; danger?: boolean }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0">
      <span className="text-sm font-medium w-20 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              value === opt.value
                ? opt.danger ? 'border-destructive bg-destructive' : 'border-primary bg-primary'
                : 'border-muted-foreground/30'
            }`}>
              {value === opt.value && <div className="size-2 rounded-full bg-white" />}
            </div>
            <span className={`text-sm ${opt.danger && value === opt.value ? 'text-destructive font-medium' : ''}`}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
```

Add `BooleanRow` component for vomiting/itching/medication:

```tsx
function BooleanRow({
  label,
  name,
  value,
  detail,
  onValueChange,
  onDetailChange,
  detailPlaceholder,
}: {
  label: string
  name: string
  value: boolean
  detail?: string
  onValueChange: (v: boolean) => void
  onDetailChange: (v: string) => void
  detailPlaceholder?: string
}) {
  return (
    <div className="py-3 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium w-20 shrink-0">{label}</span>
        <div className="flex gap-2">
          {[false, true].map((opt) => (
            <label key={String(opt)} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name={name} checked={value === opt} onChange={() => onValueChange(opt)} className="sr-only" />
              <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                value === opt
                  ? opt ? 'border-destructive bg-destructive' : 'border-primary bg-primary'
                  : 'border-muted-foreground/30'
              }`}>
                {value === opt && <div className="size-2 rounded-full bg-white" />}
              </div>
              <span className={`text-sm ${opt && value === opt ? 'text-destructive font-medium' : ''}`}>{opt ? 'あり' : 'なし'}</span>
            </label>
          ))}
        </div>
      </div>
      {value && (
        <input
          type="text"
          value={detail ?? ''}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={detailPlaceholder ?? '詳細を入力'}
          className="mt-2 ml-[calc(5rem+0.75rem)] w-[calc(100%-5rem-0.75rem)] px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[40px]
                     focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      )}
    </div>
  )
}
```

Add `TimeInput` component:

```tsx
function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | undefined
  onChange: (v: string) => void
}) {
  const [hour, minute] = (value || '').split(':')
  const handleChange = (h: string, m: string) => {
    if (h || m) onChange(`${h || ''}:${m || ''}`)
    else onChange('')
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium w-20 shrink-0">{label}</span>
      <input
        type="number"
        min={0} max={23}
        value={hour ?? ''}
        onChange={(e) => handleChange(e.target.value, minute ?? '')}
        placeholder="--"
        className="w-16 px-2 py-2 rounded-lg border border-border bg-input text-center text-sm min-h-[40px]"
      />
      <span className="text-sm">時</span>
      <input
        type="number"
        min={0} max={59}
        value={minute ?? ''}
        onChange={(e) => handleChange(hour ?? '', e.target.value)}
        placeholder="--"
        className="w-16 px-2 py-2 rounded-lg border border-border bg-input text-center text-sm min-h-[40px]"
      />
      <span className="text-sm">分頃</span>
    </div>
  )
}
```

**Step 4: Replace the daycare form body**

Replace `{serviceType === 'daycare' && ( ... )}` with 4 sections:

1. **お迎え予定** — RadioRow + conditional text input
2. **健康状態** — RadioRow for energy/appetite/poop/pee + BooleanRow for vomiting/itching/medication
3. **最後の排泄・食事** — 3x TimeInput
4. **ご家庭からのコメント** — Textarea

**Step 5: Update state and data flow**

- `daycareData` state type: `DaycarePreVisitData`
- `handleSubmit`: send `daycare_data: daycareData` instead of flat fields
- `handleFillFromLastRecord`: read `lastRecord.daycare_data`
- Remove `addMealEntry`, `updateMealEntry`, `removeMealEntry` functions

**Step 6: Commit**

```bash
git add client/src/liff/pages/PreVisitInput.tsx
git commit -m "feat: rewrite LIFF daycare pre-visit form to match 連絡帳"
```

---

## Task 13: Final Verification

**Step 1: Run TypeScript check**

Run: `cd /Users/shota/Desktop/claude/pet-carte && npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run all tests**

Run: `cd /Users/shota/Desktop/claude/pet-carte && npx vitest run`
Expected: All tests pass

**Step 3: Build check**

Run: `cd /Users/shota/Desktop/claude/pet-carte && npm run build --prefix client`
Expected: Build succeeds

**Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve any remaining type/test issues from daycare_data migration"
```
