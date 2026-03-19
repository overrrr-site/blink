/**
 * 既存スタッフをSupabase Authに移行するスクリプト
 *
 * 使用方法:
 * 1. 環境変数を設定
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 *    - DATABASE_URL または各DB環境変数
 *
 * 2. スクリプトを実行
 *    npx tsx src/db/migrate-staff-to-supabase.ts
 *
 * 注意:
 * - このスクリプトは各スタッフに対して招待メールを送信します
 * - 招待を受け入れると、スタッフは新しいパスワードを設定できます
 */

import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import pool from './connection.js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface Staff {
  id: number
  email: string
  name: string
  auth_user_id: string | null
}

async function migrateStaffToSupabase() {
  console.log('🚀 スタッフのSupabase Auth移行を開始します...\n')

  try {
    // auth_user_idがNULLのスタッフを取得
    const result = await pool.query<Staff>(
      'SELECT id, email, name, auth_user_id FROM staff WHERE auth_user_id IS NULL'
    )

    const staffToMigrate = result.rows

    if (staffToMigrate.length === 0) {
      console.log('✅ 移行が必要なスタッフはいません')
      return
    }

    console.log(`📋 ${staffToMigrate.length}人のスタッフを移行します:\n`)

    for (const staff of staffToMigrate) {
      console.log(`  処理中: ${staff.name} (${staff.email})`)

      try {
        // Supabaseに既存ユーザーがいるかチェック
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const users = Array.isArray((existingUsers as { users?: User[] } | null)?.users)
          ? (existingUsers as { users: User[] }).users
          : Array.isArray(existingUsers)
            ? existingUsers
            : []
        const existingUser = users.find(user => user.email === staff.email)

        let authUserId: string

        if (existingUser) {
          console.log(`    → 既存のSupabaseユーザーが見つかりました`)
          authUserId = existingUser.id
        } else {
          // 招待メールを送信
          const { data, error } = await supabase.auth.admin.inviteUserByEmail(staff.email, {
            redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`,
          })

          if (error) {
            console.error(`    ❌ エラー: ${error.message}`)
            continue
          }

          console.log(`    → 招待メールを送信しました`)
          authUserId = data.user.id
        }

        // staffテーブルのauth_user_idを更新
        await pool.query(
          'UPDATE staff SET auth_user_id = $1 WHERE id = $2',
          [authUserId, staff.id]
        )

        console.log(`    ✅ 完了\n`)
      } catch (error: unknown) {
        console.error(`    ❌ エラー: ${error instanceof Error ? error.message : String(error)}\n`)
      }
    }

    console.log('\n🎉 移行が完了しました！')
    console.log('   各スタッフに招待メールが送信されました。')
    console.log('   メール内のリンクからパスワードを設定してログインできます。')
  } catch (error) {
    console.error('❌ 移行中にエラーが発生しました:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// 実行確認
async function main() {
  console.log('='.repeat(60))
  console.log('Supabase Auth 移行スクリプト')
  console.log('='.repeat(60))
  console.log('')
  console.log('このスクリプトは以下を行います:')
  console.log('1. auth_user_idがNULLの既存スタッフを検索')
  console.log('2. 各スタッフをSupabase Authに登録（招待メール送信）')
  console.log('3. staffテーブルのauth_user_idを更新')
  console.log('')
  console.log('⚠️  注意: 招待メールがスタッフに送信されます')
  console.log('')

  // コマンドライン引数で --yes を指定した場合は確認をスキップ
  if (process.argv.includes('--yes')) {
    await migrateStaffToSupabase()
  } else {
    const readline = await import('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question('続行しますか？ (y/N): ', async (answer) => {
      rl.close()
      if (answer.toLowerCase() === 'y') {
        await migrateStaffToSupabase()
      } else {
        console.log('キャンセルしました')
      }
      process.exit(0)
    })
  }
}

main()
