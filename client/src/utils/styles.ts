/**
 * Shared CSS class constants used across form components.
 */
export const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary'

/**
 * Button hierarchy: 3 tiers of visual weight.
 * Primary: 1 per screen max. Secondary: alternative actions. Tertiary: minor actions.
 */
export const BTN_PRIMARY =
  'bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[48px]'

export const BTN_SECONDARY =
  'bg-card text-foreground border border-border rounded-xl font-medium text-sm hover:bg-muted active:scale-[0.98] transition-all disabled:opacity-50 min-h-[48px]'

export const BTN_TERTIARY =
  'text-muted-foreground hover:text-foreground rounded-xl font-medium text-sm active:scale-[0.98] transition-all min-h-[48px]'

/**
 * Touch target sizing: minimum 48x48px for mobile accessibility.
 */
export const TOUCH_TARGET = 'min-h-[48px] min-w-[48px]'

export const ICON_BUTTON =
  'min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full'
