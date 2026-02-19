import { useState, useRef, useEffect } from 'react'
import { Icon } from './Icon'

interface OverflowMenuItem {
  label: string
  icon: string
  onClick: () => void
}

interface OverflowMenuProps {
  items: OverflowMenuItem[]
  className?: string
}

export default function OverflowMenu({ items, className = '' }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Click outside to close (same pattern as BusinessTypeSwitcher)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-primary rounded-lg hover:bg-muted active:scale-95 transition-all"
        aria-label="メニュー"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Icon icon="solar:menu-dots-bold" className="size-5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50"
          role="menu"
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 active:scale-[0.98] transition-all"
              role="menuitem"
            >
              <Icon icon={item.icon} width="18" height="18" className="text-muted-foreground" />
              <span className="font-medium text-foreground">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
