import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { RecordType } from '../types/record'

interface BusinessTypeState {
  selectedBusinessType: RecordType | null // null = 全業種表示
  setSelectedBusinessType: (type: RecordType | null) => void
  syncFromUser: (params: { primaryType?: RecordType; availableTypes: RecordType[] }) => void
}

export const useBusinessTypeStore = create<BusinessTypeState>()(
  persist(
    (set, get) => ({
      selectedBusinessType: null,

      setSelectedBusinessType: (type) => set({ selectedBusinessType: type }),

      syncFromUser: ({ primaryType, availableTypes }) => {
        const { selectedBusinessType } = get()

        if (availableTypes.length === 0) {
          if (selectedBusinessType !== null) {
            set({ selectedBusinessType: null })
          }
          return
        }

        if (selectedBusinessType && !availableTypes.includes(selectedBusinessType)) {
          set({ selectedBusinessType: availableTypes[0] })
          return
        }

        // localStorageに値がなければprimaryBusinessTypeを初期値として設定
        if (selectedBusinessType === null && primaryType && availableTypes.includes(primaryType)) {
          set({ selectedBusinessType: primaryType })
        }
      },
    }),
    {
      name: 'business-type-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
