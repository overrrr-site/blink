#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// iconify-iconを使用しているファイルを取得
const files = execSync('grep -r "iconify-icon" --include="*.tsx" --include="*.jsx" -l', {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
}).trim().split('\n').filter(Boolean)

console.log(`Found ${files.length} files with iconify-icon`)

let totalReplacements = 0

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file)
  let content = fs.readFileSync(filePath, 'utf8')
  const originalContent = content
  let fileReplacements = 0

  // Iconコンポーネントのimportを追加（まだない場合）
  const hasIconImport = content.includes("import { Icon }") || content.includes("import Icon")

  // iconify-iconタグのパターンを置換
  // パターン1: <iconify-icon icon="..." width="..." height="..." className="..."></iconify-icon>
  // パターン2: <iconify-icon icon="..." class="..."></iconify-icon>
  // パターン3: <iconify-icon icon="..."></iconify-icon>

  // class属性をclassNameに変換
  content = content.replace(/<iconify-icon([^>]*)\sclass="([^"]*)"([^>]*)>/g, '<iconify-icon$1 className="$2"$3>')
  content = content.replace(/<iconify-icon([^>]*)\sclass='([^']*)'([^>]*)>/g, '<iconify-icon$1 className="$2"$3>')

  // iconify-icon タグを Icon コンポーネントに変換
  // 自己閉じタグの場合
  content = content.replace(/<iconify-icon\s+([^>]*?)\/>/g, (match, attrs) => {
    fileReplacements++
    return `<Icon ${attrs.trim()} />`
  })

  // 開始/終了タグの場合
  content = content.replace(/<iconify-icon\s+([^>]*?)><\/iconify-icon>/g, (match, attrs) => {
    fileReplacements++
    return `<Icon ${attrs.trim()} />`
  })

  // インポートを追加
  if (fileReplacements > 0 && !hasIconImport) {
    // 既存のimport文の後にIconのimportを追加
    if (content.includes("from 'react'")) {
      content = content.replace(
        /(import\s+.*?from\s+['"]react['"];?\n)/,
        `$1import { Icon } from '../components/Icon'\n`
      )
    } else if (content.includes("from '../components/")) {
      // 他のコンポーネントimportの近くに追加
      content = content.replace(
        /(import\s+.*?from\s+['"]\.\.\/components\/[^'"]+['"];?\n)/,
        `$1import { Icon } from '../components/Icon'\n`
      )
    } else {
      // ファイルの先頭に追加
      content = `import { Icon } from '../components/Icon'\n${content}`
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content)
    console.log(`Updated: ${file} (${fileReplacements} replacements)`)
    totalReplacements += fileReplacements
  }
})

console.log(`\nTotal replacements: ${totalReplacements}`)
