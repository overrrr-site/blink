import { useState, useCallback } from 'react'
import { Icon } from '../Icon'
import api from '../../api/client'
import type { TrainingProfileCategory, LogEntry } from '../../types/trainingProfile'

interface TrainingLogViewProps {
  category: TrainingProfileCategory
  entries: LogEntry[]
  dogId: string
  onMutate: () => void
}

function TrainingLogView({ category, entries, dogId, onMutate }: TrainingLogViewProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  const handleAdd = useCallback(async () => {
    if (!newNote.trim() || saving) return
    setSaving(true)
    try {
      await api.post(`/training-profiles/dogs/${dogId}/logs`, {
        category_id: category.id,
        entry_date: newDate,
        note: newNote.trim(),
      })
      setNewNote('')
      setIsAdding(false)
      onMutate()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }, [newNote, newDate, saving, dogId, category.id, onMutate])

  const handleUpdate = useCallback(async (entryId: number) => {
    if (!editNote.trim() || saving) return
    setSaving(true)
    try {
      await api.put(`/training-profiles/dogs/${dogId}/logs/${entryId}`, {
        note: editNote.trim(),
      })
      setEditingId(null)
      onMutate()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }, [editNote, saving, dogId, onMutate])

  const handleDelete = useCallback(async (entryId: number) => {
    try {
      await api.delete(`/training-profiles/dogs/${dogId}/logs/${entryId}`)
      setMenuOpenId(null)
      onMutate()
    } catch {
      // ignore
    }
  }, [dogId, onMutate])

  const categoryEntries = entries.filter((e) => e.category_id === category.id)

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-bold">{category.name}</h3>
        {category.goal && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{category.goal}</p>
        )}
      </div>

      {/* Entries */}
      <div className="divide-y divide-border">
        {categoryEntries.length === 0 && !isAdding && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground">まだ記録がありません</p>
          </div>
        )}

        {categoryEntries.map((entry) => (
          <div key={entry.id} className="px-4 py-3 relative">
            {editingId === entry.id ? (
              <div className="space-y-2">
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-lg border border-border active:scale-[0.97] transition-all"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => handleUpdate(entry.id)}
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
                  <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                    {formatDateShort(entry.entry_date)}
                  </span>
                  {entry.staff_name && (
                    <span className="block text-[10px] text-muted-foreground/70">{entry.staff_name}</span>
                  )}
                </div>
                <p className="flex-1 text-sm leading-relaxed">{entry.note}</p>
                <button
                  onClick={() => setMenuOpenId(menuOpenId === entry.id ? null : entry.id)}
                  className="shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition-all"
                >
                  <Icon icon="solar:menu-dots-bold" width="16" height="16" />
                </button>
                {menuOpenId === entry.id && (
                  <div className="absolute right-4 top-10 z-10 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[120px]">
                    <button
                      onClick={() => {
                        setEditingId(entry.id)
                        setEditNote(entry.note)
                        setMenuOpenId(null)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted active:bg-muted transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
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

      {/* Add form */}
      {isAdding ? (
        <div className="px-4 py-3 border-t border-border space-y-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="記録を入力..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setIsAdding(false); setNewNote('') }}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground rounded-lg border border-border active:scale-[0.97] transition-all"
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newNote.trim()}
              className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-lg disabled:opacity-50 active:scale-[0.97] transition-all"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full px-4 py-3 border-t border-border text-sm font-medium text-primary flex items-center justify-center gap-1.5 hover:bg-primary/5 active:bg-primary/10 transition-colors"
        >
          <Icon icon="solar:add-circle-linear" width="16" height="16" />
          エントリーを追加
        </button>
      )}
    </div>
  )
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default TrainingLogView
