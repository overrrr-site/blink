import { Icon as IconifyIcon, addCollection } from '@iconify/react'

// 使用アイコンのみ抽出済みJSON（scripts/extract-icons.cjsで生成）
import solarIcons from '../icons/solar-icons.json'
import mdiIcons from '../icons/mdi-icons.json'

// アイコンコレクションを登録
addCollection(solarIcons as any)
addCollection(mdiIcons as any)

// Solar Iconsに存在しないアイコンの代替マッピング
const ICON_ALIASES: Record<string, string> = {
  // spinner系 → mdi:loading
  'solar:spinner-bold': 'mdi:loading',
  'solar:spinner-line-duotone': 'mdi:loading',
  // paw-print → paw
  'solar:paw-print-bold': 'solar:paw-bold',
  'solar:paw-print-linear': 'solar:paw-linear',
  // close → close-circle
  'solar:close-bold': 'solar:close-circle-bold',
  // unlink → mdi:link-off
  'solar:unlink-bold': 'mdi:link-off',
  // paper-plane → mdi:send
  'solar:paper-plane-bold': 'mdi:send',
  // megaphone → mdi:bullhorn
  'solar:megaphone-linear': 'mdi:bullhorn-outline',
  'solar:megaphone-bold': 'mdi:bullhorn',
  // check → check-circle
  'solar:check-bold': 'solar:check-circle-bold',
  'solar:check-linear': 'solar:check-circle-linear',
  // calendar-check/cross → mdi
  'solar:calendar-check-bold': 'mdi:calendar-check',
  'solar:calendar-cross-bold': 'mdi:calendar-remove',
  // toilet-paper → mdi:paper-roll
  'solar:toilet-paper-bold': 'mdi:paper-roll',
  // bowl → mdi:bowl
  'solar:bowl-bold': 'mdi:bowl',
}

interface IconProps {
  icon: string
  width?: number | string
  height?: number | string
  className?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}

export function Icon({ icon, width, height, className, ...rest }: IconProps) {
  // エイリアスがあれば置換
  const resolvedIcon = ICON_ALIASES[icon] || icon

  return (
    <IconifyIcon
      icon={resolvedIcon}
      width={width}
      height={height}
      className={className}
      {...rest}
    />
  )
}

export default Icon
