import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import axios from 'axios'
import { Icon } from '../../../components/Icon'
import { useToast } from '../../../components/Toast'
import { useConfirmDialog } from '../../../hooks/useConfirmDialog'
import ConfirmDialog from '../../../components/ConfirmDialog'
import api from '../../../api/client'
import { fetcher } from '../../../lib/swr'
import { getBusinessTypeColors, getBusinessTypeIcon, getBusinessTypeLabel } from '../../../utils/businessTypeColors'
import type { RecordType } from '../../../types/record'

interface StaffItem {
  id: number
  name: string
  email: string
  is_owner?: boolean | null
}

interface StaffSectionProps {
  storeBusinessTypes: RecordType[]
}

const ALL_BUSINESS_TYPES: RecordType[] = ['daycare', 'grooming', 'hotel']

export default function StaffSection({ storeBusinessTypes }: StaffSectionProps): JSX.Element {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()

  const [showStaffInviteModal, setShowStaffInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteIsOwner, setInviteIsOwner] = useState(false)
  const [inviteBusinessTypes, setInviteBusinessTypes] = useState<RecordType[]>([])
  const [inviting, setInviting] = useState(false)

  const {
    data: staffList,
    isLoading,
    mutate,
  } = useSWR<StaffItem[]>('/staff', fetcher)

  const resolvedStaffList = staffList ?? []

  async function handleDeleteStaff(id: number, e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    const ok = await confirm({
      title: '削除確認',
      message: 'このスタッフを削除しますか？',
      confirmLabel: '削除',
      cancelLabel: 'キャンセル',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      await api.delete(`/staff/${id}`)
      await mutate()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(message || 'スタッフの削除に失敗しました', 'error')
    }
  }

  async function handleInviteStaff(): Promise<void> {
    if (!inviteEmail || !inviteName) {
      showToast('メールアドレスと名前を入力してください', 'error')
      return
    }

    setInviting(true)
    try {
      const assignedBusinessTypes = inviteIsOwner
        ? null
        : (inviteBusinessTypes.length > 0 ? inviteBusinessTypes : null)
      await api.post('/auth/invite', {
        email: inviteEmail,
        name: inviteName,
        is_owner: inviteIsOwner,
        assigned_business_types: assignedBusinessTypes,
      })
      showToast(`${inviteEmail} に招待メールを送信しました`, 'success')
      setShowStaffInviteModal(false)
      setInviteEmail('')
      setInviteName('')
      setInviteIsOwner(false)
      setInviteBusinessTypes([])
      await mutate()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(message || 'スタッフの招待に失敗しました', 'error')
    } finally {
      setInviting(false)
    }
  }

  return (
    <>
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:user-id-bold" width="16" height="16" className="text-chart-3" />
            スタッフ管理
          </h2>
          <button
            onClick={() => setShowStaffInviteModal(true)}
            className="text-xs font-bold text-primary flex items-center gap-1 transition-all active:scale-[0.98]"
          >
            <Icon icon="solar:add-circle-bold" width="14" height="14" />
            追加
          </button>
        </div>
        {isLoading ? (
          <div className="text-center py-4">
            <span className="text-xs text-muted-foreground">読み込み中...</span>
          </div>
        ) : resolvedStaffList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon icon="solar:user-id-bold" width="48" height="48" className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">スタッフが登録されていません</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {resolvedStaffList.map((staff) => (
              <div
                key={staff.id}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors group"
              >
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20">
                  <span className="text-sm font-bold text-primary">
                    {staff.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div
                  className="flex-1 text-left cursor-pointer"
                  onClick={() => navigate(`/settings/staff/${staff.id}`)}
                >
                  <span className="text-sm font-medium block">{staff.name}</span>
                  <span className="text-[10px] text-muted-foreground">{staff.email}</span>
                </div>
                {staff.is_owner && (
                  <span className="text-[10px] bg-chart-2/10 text-chart-2 px-2.5 py-1 rounded-full font-bold border border-chart-2/20">
                    管理者
                  </span>
                )}
                <button
                  onClick={() => navigate(`/settings/staff/${staff.id}`)}
                  className="p-2 rounded-full hover:bg-muted transition-all active:scale-95"
                  aria-label={`${staff.name}の詳細`}
                >
                  <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => handleDeleteStaff(staff.id, e)}
                  className="p-2 text-destructive rounded-full hover:bg-destructive/10 transition-all active:scale-95"
                  aria-label={`${staff.name}を削除`}
                >
                  <Icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showStaffInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">スタッフを招待</h2>
              <button
                onClick={() => {
                  setShowStaffInviteModal(false)
                  setInviteEmail('')
                  setInviteName('')
                  setInviteIsOwner(false)
                  setInviteBusinessTypes([])
                }}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-all active:scale-95"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-bold" width="24" height="24" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-accent/30 rounded-xl p-3 flex items-start gap-2">
                <Icon icon="solar:info-circle-bold" width="16" height="16" className="text-accent-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  入力したメールアドレス宛に招待メールが送信されます。招待されたスタッフはメールのリンクからパスワードを設定してログインできます。
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">スタッフ名</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">権限</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteIsOwner(false)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] border ${
                      !inviteIsOwner
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    スタッフ
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteIsOwner(true)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] border ${
                      inviteIsOwner
                        ? 'bg-chart-2 text-white border-chart-2'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-chart-2/50'
                    }`}
                  >
                    管理者
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  管理者は設定、料金管理、スタッフ管理ができます
                </p>
              </div>
              {!inviteIsOwner && storeBusinessTypes.length > 1 && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">担当業種</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_BUSINESS_TYPES.filter((type) => storeBusinessTypes.includes(type)).map((type) => {
                      const colors = getBusinessTypeColors(type)
                      const isSelected = inviteBusinessTypes.includes(type)
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setInviteBusinessTypes((prev) =>
                              isSelected ? prev.filter((t) => t !== type) : [...prev, type]
                            )
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.98] border ${
                            isSelected
                              ? 'border-2'
                              : 'border-border hover:border-primary/30'
                          }`}
                          style={isSelected ? {
                            backgroundColor: colors.pale,
                            borderColor: colors.primary,
                            color: colors.primary,
                          } : undefined}
                        >
                          <Icon icon={getBusinessTypeIcon(type)} width="14" height="14" />
                          {getBusinessTypeLabel(type)}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {inviteBusinessTypes.length === 0
                      ? '未選択の場合は全業種にアクセスできます'
                      : `${inviteBusinessTypes.map((t) => getBusinessTypeLabel(t)).join('、')}のみアクセス可能`}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowStaffInviteModal(false)
                    setInviteEmail('')
                    setInviteName('')
                    setInviteIsOwner(false)
                    setInviteBusinessTypes([])
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-all active:scale-[0.98]"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleInviteStaff}
                  disabled={inviting || !inviteEmail || !inviteName}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {inviting ? '送信中...' : '招待メールを送信'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  )
}
