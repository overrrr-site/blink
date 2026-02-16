import type { DaycareData } from '@/types/record'

export type DaycareMealPeriod = 'morning' | 'afternoon'
export type DaycareToiletType = 'urination' | 'defecation'
type ToiletSlotValue = { urination: boolean; defecation: boolean }

export const getTrainingItems = (data: DaycareData): Record<string, string> =>
  data.training?.items || {}

export const hasTrainingMasterCategories = (
  trainingMasters?: Record<string, unknown[]> | null
): boolean => Boolean(trainingMasters && Object.keys(trainingMasters).length > 0)

export const toggleTrainingItem = (
  data: DaycareData,
  itemKey: string,
  value: string
): DaycareData => {
  const trainingItems = getTrainingItems(data)
  const currentValue = trainingItems[itemKey]
  const nextValue = currentValue === value ? '' : value

  return {
    ...data,
    training: {
      ...data.training,
      items: { ...trainingItems, [itemKey]: nextValue },
    },
  }
}

export const updateTrainingNote = (data: DaycareData, note: string): DaycareData => {
  const trainingItems = getTrainingItems(data)
  return {
    ...data,
    training: {
      ...data.training,
      items: trainingItems,
      note,
    },
  }
}

export const updateMealByPeriod = (
  data: DaycareData,
  period: DaycareMealPeriod,
  value: string
): DaycareData => ({
  ...data,
  meal: {
    ...data.meal,
    [period]: value,
  },
})

export const migrateLegacyToiletSlots = (
  toilet: DaycareData['toilet']
): DaycareData['toilet'] => {
  if (!toilet) return toilet

  const result: Record<string, ToiletSlotValue> = {}
  Object.entries(toilet).forEach(([key, val]) => {
    if (key === 'morning') {
      result['10:00'] = val
      return
    }
    if (key === 'afternoon') {
      result['14:00'] = val
      return
    }
    result[key] = val
  })
  return result
}

export const getToiletSlotState = (
  migratedToilet: DaycareData['toilet'],
  slot: string
): ToiletSlotValue => migratedToilet?.[slot] || { urination: false, defecation: false }

export const toggleToiletBySlot = (
  data: DaycareData,
  migratedToilet: DaycareData['toilet'],
  slot: string,
  type: DaycareToiletType
): DaycareData => {
  const currentData = getToiletSlotState(migratedToilet, slot)
  return {
    ...data,
    toilet: {
      ...migratedToilet,
      [slot]: {
        ...currentData,
        [type]: !currentData[type],
      },
    },
  }
}

export const updateTrainingItemNote = (
  data: DaycareData,
  itemKey: string,
  note: string
): DaycareData => ({
  ...data,
  training: {
    ...data.training,
    items: data.training?.items || {},
    item_notes: {
      ...data.training?.item_notes,
      [itemKey]: note,
    },
  },
})
