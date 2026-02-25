# Daycare Pre-Visit Input Redesign

## Background

Redesign the daycare pre-visit input form to match the physical "ようちえん連絡帳" (daycare communication notebook). Migrate all daycare-specific fields from flat columns to a `daycare_data` JSONB column, unifying with the grooming/hotel pattern.

## Data Model

### New `daycare_data` JSONB structure

```typescript
interface DaycarePreVisitData {
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
```

### Migration

1. Add `daycare_data JSONB` column to `pre_visit_inputs`
2. Backfill existing daycare rows into `daycare_data`
3. Drop old columns: `morning_urination`, `morning_defecation`, `afternoon_urination`, `afternoon_defecation`, `breakfast_status`, `health_status`, `notes`, `meal_data`

## Frontend (LIFF Owner Form)

Form sections matching the physical notebook:

1. **Pickup time** - Radio: 17:00 / 17:30 / 18:00 / Other (with text input)
2. **Health status** - Inline radio per row:
   - Energy: good / poor (detail)
   - Appetite: good / poor (detail)
   - Poop: normal / soft / bloody
   - Pee: normal / dark / bloody
   - Vomiting: no / yes (detail)
   - Itching: no / yes (detail)
   - Medication: no / yes (detail)
3. **Last times** - Hour + minute inputs for poop, pee, meal
4. **Comments** - Textarea

## Admin Display

- Read from `daycare_data` JSONB
- Abnormal values (soft stool, bloody, vomiting, etc.) shown as red badges
- Normal values shown as green/neutral badges

## API Changes

- LIFF POST/GET: send/receive `daycare_data` instead of flat fields
- Admin GET/POST: same change
- "Fill from last record" reads `daycare_data`

## Affected Files

### DB
- `migrations/XXX_daycare_data_migration.sql` (new)

### Server
- `routes/liff/preVisitInputs.ts`
- `routes/preVisitInputs.ts`
- `routes/reservations.ts`
- `routes/dashboard.ts`
- `routes/dogs.ts`

### Client LIFF
- `liff/pages/PreVisitInput.tsx` (major rewrite)
- `liff/pages/Home.tsx`
- `liff/types/dashboard.ts`

### Client Admin
- `pages/ReservationDetail.tsx`
- `components/ReservationCard.tsx`
- `pages/dashboard/reservationDetailModel.ts`
- `components/dashboard/reservationCardModel.ts`
- `pages/dashboard/reservationDetailModel.test.ts`
- `components/dogs/HistoryTabs.tsx`
- `pages/JournalCreate.tsx`
- `components/journals/JournalDetailsStep.tsx`
- `components/journals/types.ts`
