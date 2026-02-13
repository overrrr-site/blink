import { useCallback, useState } from 'react'
import { trainingProfilesApi } from '../../api/trainingProfiles'
import type { TrainingEntryKind } from '../../types/trainingProfile'

type UseTrainingEntryActionsParams = {
  mode: TrainingEntryKind
  dogId: string
  onMutate: () => void
  categoryId?: number
}

type StartEditingPayload = {
  id: number
  note: string
}

export type TrainingEntryActions = {
  isAdding: boolean
  newDate: string
  newNote: string
  saving: boolean
  editingId: number | null
  editNote: string
  menuOpenId: number | null
  openAddForm: () => void
  cancelAddForm: () => void
  changeNewDate: (value: string) => void
  changeNewNote: (value: string) => void
  submitAdd: () => Promise<void>
  startEditing: (payload: StartEditingPayload) => void
  cancelEditing: () => void
  changeEditNote: (value: string) => void
  submitUpdate: (entryId: number) => Promise<void>
  toggleMenu: (entryId: number) => void
  submitDelete: (entryId: number) => Promise<void>
}

function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0]
}

export function useTrainingEntryActions({
  mode,
  dogId,
  onMutate,
  categoryId,
}: UseTrainingEntryActionsParams): TrainingEntryActions {
  const [isAdding, setIsAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newDate, setNewDate] = useState<string>(getTodayISODate)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  const createEntry = useCallback(async (entryDate: string, note: string) => {
    if (mode === 'log') {
      if (categoryId === undefined) {
        return
      }

      await trainingProfilesApi.createLogEntry({
        dogId,
        categoryId,
        entryDate,
        note,
      })
      return
    }

    await trainingProfilesApi.createConcernEntry({
      dogId,
      entryDate,
      note,
    })
  }, [mode, dogId, categoryId])

  const updateEntry = useCallback(async (entryId: number, note: string) => {
    if (mode === 'log') {
      await trainingProfilesApi.updateLogEntry({
        dogId,
        entryId,
        note,
      })
      return
    }

    await trainingProfilesApi.updateConcernEntry({
      dogId,
      entryId,
      note,
    })
  }, [mode, dogId])

  const deleteEntry = useCallback(async (entryId: number) => {
    if (mode === 'log') {
      await trainingProfilesApi.deleteLogEntry({
        dogId,
        entryId,
      })
      return
    }

    await trainingProfilesApi.deleteConcernEntry({
      dogId,
      entryId,
    })
  }, [mode, dogId])

  const openAddForm = useCallback(() => {
    setIsAdding(true)
  }, [])

  const cancelAddForm = useCallback(() => {
    setIsAdding(false)
    setNewNote('')
  }, [])

  const changeNewDate = useCallback((value: string) => {
    setNewDate(value)
  }, [])

  const changeNewNote = useCallback((value: string) => {
    setNewNote(value)
  }, [])

  const submitAdd = useCallback(async () => {
    const normalizedNote = newNote.trim()

    if (!normalizedNote || saving) {
      return
    }

    setSaving(true)
    try {
      await createEntry(newDate, normalizedNote)
      setNewNote('')
      setIsAdding(false)
      onMutate()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }, [newNote, saving, createEntry, newDate, onMutate])

  const startEditing = useCallback(({ id, note }: StartEditingPayload) => {
    setEditingId(id)
    setEditNote(note)
    setMenuOpenId(null)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
  }, [])

  const changeEditNote = useCallback((value: string) => {
    setEditNote(value)
  }, [])

  const submitUpdate = useCallback(async (entryId: number) => {
    const normalizedNote = editNote.trim()

    if (!normalizedNote || saving) {
      return
    }

    setSaving(true)
    try {
      await updateEntry(entryId, normalizedNote)
      setEditingId(null)
      onMutate()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }, [editNote, saving, updateEntry, onMutate])

  const toggleMenu = useCallback((entryId: number) => {
    setMenuOpenId((prev) => (prev === entryId ? null : entryId))
  }, [])

  const submitDelete = useCallback(async (entryId: number) => {
    try {
      await deleteEntry(entryId)
      setMenuOpenId(null)
      onMutate()
    } catch {
      // ignore
    }
  }, [deleteEntry, onMutate])

  return {
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
  }
}
