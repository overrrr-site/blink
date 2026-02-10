import { useState, useRef, useEffect } from 'react'
import { Icon } from './Icon'
import { useAuthStore } from '../store/authStore'
import { useBusinessTypeStore } from '../store/businessTypeStore'
import { getBusinessTypeColors, getBusinessTypeLabel, getBusinessTypeIcon } from '../utils/businessTypeColors'
import { getAvailableBusinessTypes } from '../utils/businessTypeAccess'
import type { RecordType } from '../types/record'

const ALL_BUSINESS_TYPES: RecordType[] = ['daycare', 'grooming', 'hotel']

export default function BusinessTypeSwitcher(): JSX.Element {
  const { user } = useAuthStore()
  const { selectedBusinessType, setSelectedBusinessType } = useBusinessTypeStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const storeBusinessTypes = user?.businessTypes || []
  const availableTypes = getAvailableBusinessTypes({
    storeBusinessTypes,
    assignedBusinessTypes: user?.assignedBusinessTypes,
    isOwner: user?.isOwner,
  })
  const hasMultipleTypes = availableTypes.length > 1

  // 選択中の業種の表示情報
  const currentColors = selectedBusinessType ? getBusinessTypeColors(selectedBusinessType) : null
  const currentIcon = selectedBusinessType ? getBusinessTypeIcon(selectedBusinessType) : 'solar:widget-4-bold'

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function handleSelect(type: RecordType | null) {
    setSelectedBusinessType(type)
    setIsOpen(false)
  }

  // 選択中の業種ラベル
  const currentLabel = selectedBusinessType ? getBusinessTypeLabel(selectedBusinessType) : null

  // 1業種のみの場合は表示のみ（クリック不可）
  if (!hasMultipleTypes && availableTypes.length === 1) {
    const singleType = availableTypes[0]
    const colors = getBusinessTypeColors(singleType)
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="size-10 rounded-full p-0.5 flex items-center justify-center"
          style={{ backgroundColor: colors.pale, border: `2px solid ${colors.light}` }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.pale, color: colors.primary }}
          >
            <Icon icon={getBusinessTypeIcon(singleType)} width="20" height="20" />
          </div>
        </div>
        <span className="text-[9px] font-bold leading-none whitespace-nowrap" style={{ color: colors.primary }}>
          {getBusinessTypeLabel(singleType)}
        </span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* トリガーボタン */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="size-10 rounded-full p-0.5 flex items-center justify-center transition-all active:scale-95"
          style={{
            backgroundColor: currentColors?.pale || '#F3F4F6',
            border: `2px solid ${currentColors?.light || '#D1D5DB'}`,
          }}
          aria-label="業種を切り替え"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ backgroundColor: currentColors?.pale || '#F3F4F6', color: currentColors?.primary || '#6B7280' }}
          >
            <Icon
              icon={currentIcon}
              width="20"
              height="20"
            />
          </div>
        </button>
        <span className="text-[9px] font-bold leading-none whitespace-nowrap" style={{ color: currentColors?.primary || '#6B7280' }}>
          {currentLabel || 'すべて'}
        </span>
      </div>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50"
          role="listbox"
          aria-label="業種選択"
        >
          {/* すべての業種 */}
          <button
            onClick={() => handleSelect(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              selectedBusinessType === null ? 'bg-muted' : 'hover:bg-muted/50'
            }`}
            role="option"
            aria-selected={selectedBusinessType === null}
          >
            <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Icon icon="solar:widget-4-bold" width="18" height="18" className="text-gray-500" />
            </div>
            <span className="font-medium text-foreground">すべての業種</span>
            {selectedBusinessType === null && (
              <Icon icon="solar:check-circle-bold" width="20" height="20" className="ml-auto text-primary" />
            )}
          </button>

          <div className="border-t border-border" />

          {/* 各業種 */}
          {ALL_BUSINESS_TYPES.filter(type => availableTypes.includes(type)).map((type) => {
            const colors = getBusinessTypeColors(type)
            const isSelected = selectedBusinessType === type
            return (
              <button
                key={type}
                onClick={() => handleSelect(type)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div
                  className="size-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.pale, color: colors.primary }}
                >
                  <Icon
                    icon={getBusinessTypeIcon(type)}
                    width="18"
                    height="18"
                  />
                </div>
                <span className="font-medium text-foreground">{getBusinessTypeLabel(type)}</span>
                {isSelected && (
                  <span style={{ color: colors.primary }} className="ml-auto">
                    <Icon icon="solar:check-circle-bold" width="20" height="20" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
