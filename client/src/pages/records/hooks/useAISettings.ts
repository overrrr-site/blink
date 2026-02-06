import { useMemo, useState, useCallback } from 'react'
import useSWR from 'swr'
import api from '../../../api/client'
import { fetcher } from '../../../lib/swr'
import type { AISettings } from '../types/aiSettings'

interface StoreSettings {
  ai_assistant_enabled?: boolean
  ai_store_data_contribution?: boolean
  ai_service_improvement?: boolean
}

export const useAISettings = () => {
  const [showAISettings, setShowAISettings] = useState(false)
  const { data: storeSettings, mutate: mutateStoreSettings } = useSWR<StoreSettings>(
    '/store-settings',
    fetcher,
    { revalidateOnFocus: false }
  )

  const aiSettings = useMemo<AISettings>(() => ({
    aiAssistantEnabled: storeSettings?.ai_assistant_enabled ?? true,
    storeDataContribution: storeSettings?.ai_store_data_contribution ?? true,
    serviceImprovement: storeSettings?.ai_service_improvement ?? false,
  }), [
    storeSettings?.ai_assistant_enabled,
    storeSettings?.ai_service_improvement,
    storeSettings?.ai_store_data_contribution,
  ])

  const saveAISettings = useCallback(async (settings: AISettings) => {
    try {
      await api.put('/store-settings', {
        ai_assistant_enabled: settings.aiAssistantEnabled,
        ai_store_data_contribution: settings.storeDataContribution,
        ai_service_improvement: settings.serviceImprovement,
      })
      mutateStoreSettings()
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }, [mutateStoreSettings])

  return {
    aiSettings,
    showAISettings,
    openAISettings: () => setShowAISettings(true),
    closeAISettings: () => setShowAISettings(false),
    saveAISettings,
  }
}
