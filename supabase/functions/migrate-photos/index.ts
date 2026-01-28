// Supabase Edge Function: Base64画像をStorageに移行
// デプロイ: supabase functions deploy migrate-photos
// 実行: curl -X POST https://<project-ref>.supabase.co/functions/v1/migrate-photos -H "Authorization: Bearer <service_role_key>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Base64画像を含む日誌を取得
    const { data: journals, error: fetchError } = await supabase
      .from('journals')
      .select('id, photos')
      .not('photos', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    const results = {
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      updatedJournals: 0,
    }

    for (const journal of journals || []) {
      if (!journal.photos || !Array.isArray(journal.photos)) continue

      const newPhotos: string[] = []
      let hasBase64 = false

      for (const photo of journal.photos) {
        results.total++

        // 既にURLの場合はスキップ
        if (photo.startsWith('http')) {
          newPhotos.push(photo)
          results.skipped++
          continue
        }

        // Base64データの場合は移行
        if (photo.startsWith('data:image/')) {
          hasBase64 = true

          // Base64からMIMEタイプとデータを抽出
          const matches = photo.match(/^data:([^;]+);base64,(.+)$/)
          if (!matches) {
            newPhotos.push(photo)
            results.failed++
            continue
          }

          const mimeType = matches[1]
          const base64Content = matches[2]

          // 拡張子を決定
          const extMap: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
          }
          const ext = extMap[mimeType] || 'jpg'

          // Base64をバイナリに変換
          const binaryString = atob(base64Content)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }

          // ユニークなファイル名を生成
          const filename = `journals/${crypto.randomUUID()}.${ext}`

          // Storageにアップロード
          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filename, bytes, {
              contentType: mimeType,
              upsert: false,
            })

          if (uploadError) {
            console.error(`Upload error for journal ${journal.id}:`, uploadError)
            newPhotos.push(photo) // 失敗時は元のデータを保持
            results.failed++
            continue
          }

          // 公開URLを取得
          const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filename)

          newPhotos.push(urlData.publicUrl)
          results.migrated++
        } else {
          newPhotos.push(photo)
          results.skipped++
        }
      }

      // Base64があった場合のみDBを更新
      if (hasBase64) {
        const { error: updateError } = await supabase
          .from('journals')
          .update({ photos: newPhotos, updated_at: new Date().toISOString() })
          .eq('id', journal.id)

        if (updateError) {
          console.error(`Update error for journal ${journal.id}:`, updateError)
        } else {
          results.updatedJournals++
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '移行が完了しました',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
