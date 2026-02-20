import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import type { TrainingEntryRecord } from '../../types/trainingProfile'
import type { TrainingEntryActions } from './useTrainingEntryActions'
import { formatEntryDateShort } from '../../utils/trainingDate'

type TrainingEntryListProps = {
  header: ReactNode
  entries: TrainingEntryRecord[]
  addPlaceholder: string
  addButtonLabel: string
  containerClassName?: string
  headerClassName?: string
  addButtonClassName?: string
  actions: TrainingEntryActions
}

function TrainingEntryList({
  header,
  entries,
  addPlaceholder,
  addButtonLabel,
  containerClassName,
  headerClassName,
  addButtonClassName,
  actions,
}: TrainingEntryListProps) {
  const {
    isAdding,
    newDate,
    newNote,
    saving,
    editingId,
    editNote,
    menuOpenId,
    openAddForm,
    cancelAddForm,
    changeNewDate,
    changeNewNote,
    submitAdd,
    startEditing,
    cancelEditing,
    changeEditNote,
    submitUpdate,
    toggleMenu,
    submitDelete,
  } = actions

  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${containerClassName ?? ''}`}>
      <div className={`px-4 py-3 border-b border-border ${headerClassName ?? ''}`}>
        {header}
      </div>

      <div className="divide-y divide-border">
        {entries.length === 0 && !isAdding && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground">まだ記録がありません</p>
          </div>
        )}

        {entries.map((entry) => (
          <div key={entry.id} className="px-4 py-3 relative">
            {editingId === entry.id ? (
              <div className="space-y-2">
                <textarea
                  value={editNote}
                  onChange={(e) => changeEditNote(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-lg border border-border active:scale-[0.97] transition-all"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => void submitUpdate(entry.id)}
                    disabled={saving || !editNote.trim()}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-lg disabled:opacity-50 active:scale-[0.97] transition-all"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="shrink-0 pt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                    <Icon icon="solar:calendar-linear" width="12" height="12" className="opacity-70" />
                    {formatEntryDateShort(entry.entry_date)}
                  </span>
                  {entry.staff_name && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                      <Icon icon="solar:user-bold" width="11" height="11" className="opacity-70" />
                      {entry.staff_name}
                    </span>
                  )}
                </div>
                <p className="flex-1 text-sm leading-relaxed">{entry.note}</p>
                <button
                  onClick={() => toggleMenu(entry.id)}
                  className="shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition-all"
                >
                  <Icon icon="solar:menu-dots-bold" width="16" height="16" />
                </button>
                {menuOpenId === entry.id && (
                  <div className="absolute right-4 top-10 z-10 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[120px]">
                    <button
                      onClick={() => startEditing({ id: entry.id, note: entry.note })}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted active:bg-muted transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => void submitDelete(entry.id)}
                      className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 active:bg-destructive/10 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="px-4 py-3 border-t border-border space-y-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => changeNewDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            value={newNote}
            onChange={(e) => changeNewNote(e.target.value)}
            placeholder={addPlaceholder}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelAddForm}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-lg border border-border active:scale-[0.97] transition-all"
            >
              キャンセル
            </button>
            <button
              onClick={() => void submitAdd()}
              disabled={saving || !newNote.trim()}
              className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-lg disabled:opacity-50 active:scale-[0.97] transition-all"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openAddForm}
          className={`w-full px-4 py-3 border-t border-border text-sm font-medium text-primary flex items-center justify-center gap-1.5 hover:bg-primary/5 active:bg-primary/10 transition-colors ${addButtonClassName ?? ''}`}
        >
          <Icon icon="solar:add-circle-linear" width="16" height="16" />
          {addButtonLabel}
        </button>
      )}
    </div>
  )
}

export default TrainingEntryList
