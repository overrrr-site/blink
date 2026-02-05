import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { RecordType } from '../types/record'

interface BusinessTypeState {
  selectedBusinessType: RecordType | null // null = 全業種表示
  setSelectedBusinessType: (type: RecordType | null) => void
  initializeFromUser: (primaryType?: RecordType) => void
}

export const useBusinessTypeStore = create<BusinessTypeState>()(
  persist(
    (set, get) => ({
      selectedBusinessType: null,

      setSelectedBusinessType: (type) => set({ selectedBusinessType: type }),

      initializeFromUser: (primaryType) => {
        // localStorageに値がなければprimaryBusinessTypeを初期値として設定
        if (get().selectedBusinessType === null && primaryType) {
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
