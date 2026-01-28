#!/usr/bin/env node
/**
 * 使用されているアイコンのみを抽出してJSONファイルを生成
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Icon.tsx で定義されているエイリアス（元のアイコン名 → 実際のアイコン名）
const ICON_ALIASES = {
  'solar:spinner-bold': 'mdi:loading',
  'solar:spinner-line-duotone': 'mdi:loading',
  'solar:paw-print-bold': 'solar:paw-bold',
  'solar:paw-print-linear': 'solar:paw-linear',
  'solar:close-bold': 'solar:close-circle-bold',
  'solar:unlink-bold': 'mdi:link-off',
  'solar:paper-plane-bold': 'mdi:send',
  'solar:megaphone-linear': 'mdi:bullhorn-outline',
  'solar:megaphone-bold': 'mdi:bullhorn',
  'solar:check-bold': 'solar:check-circle-bold',
  'solar:check-linear': 'solar:check-circle-linear',
  'solar:calendar-check-bold': 'mdi:calendar-check',
  'solar:calendar-cross-bold': 'mdi:calendar-remove',
  'solar:toilet-paper-bold': 'mdi:paper-roll',
  'solar:bowl-bold': 'mdi:bowl',
}

// プロジェクト内で使用されているアイコンを検索
const clientDir = path.join(__dirname, '..')
const result = execSync(`grep -roh 'icon="[^"]*"' --include="*.tsx" src/`, {
  cwd: clientDir,
  encoding: 'utf8'
})

// アイコン名を抽出（重複排除）
const iconMatches = result.match(/icon="([^"]+)"/g) || []
const rawIconNames = [...new Set(iconMatches.map(m => m.match(/icon="([^"]+)"/)[1]))]

// エイリアスを解決して、実際に必要なアイコン名のセットを作成
const resolvedIconNames = new Set()
rawIconNames.forEach(name => {
  const resolved = ICON_ALIASES[name] || name
  resolvedIconNames.add(resolved)
})

const iconNames = Array.from(resolvedIconNames)

console.log(`Found ${rawIconNames.length} unique icon references`)
console.log(`Resolved to ${iconNames.length} actual icons`)

// Solar と MDI に分類
const solarIcons = iconNames.filter(i => i.startsWith('solar:'))
const mdiIcons = iconNames.filter(i => i.startsWith('mdi:'))

console.log(`Solar: ${solarIcons.length}, MDI: ${mdiIcons.length}`)

// アイコンデータを読み込み
const solarData = JSON.parse(fs.readFileSync(
  path.join(clientDir, 'node_modules/@iconify-json/solar/icons.json'),
  'utf8'
))
const mdiData = JSON.parse(fs.readFileSync(
  path.join(clientDir, 'node_modules/@iconify-json/mdi/icons.json'),
  'utf8'
))

// 必要なアイコンのみを抽出
const extractedSolar = {
  prefix: 'solar',
  icons: {},
  width: solarData.width || 24,
  height: solarData.height || 24
}

const extractedMdi = {
  prefix: 'mdi',
  icons: {},
  width: mdiData.width || 24,
  height: mdiData.height || 24
}

let missingIcons = []

solarIcons.forEach(name => {
  const iconName = name.replace('solar:', '')
  if (solarData.icons[iconName]) {
    extractedSolar.icons[iconName] = solarData.icons[iconName]
  } else {
    missingIcons.push(name)
  }
})

mdiIcons.forEach(name => {
  const iconName = name.replace('mdi:', '')
  if (mdiData.icons[iconName]) {
    extractedMdi.icons[iconName] = mdiData.icons[iconName]
  } else {
    missingIcons.push(name)
  }
})

if (missingIcons.length > 0) {
  console.log('\nMissing icons:')
  missingIcons.forEach(i => console.log('  -', i))
}

// 出力ディレクトリを作成
const outputDir = path.join(clientDir, 'src/icons')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// 抽出したアイコンを保存
fs.writeFileSync(
  path.join(outputDir, 'solar-icons.json'),
  JSON.stringify(extractedSolar, null, 2)
)
fs.writeFileSync(
  path.join(outputDir, 'mdi-icons.json'),
  JSON.stringify(extractedMdi, null, 2)
)

// サイズを計算
const solarSize = JSON.stringify(extractedSolar).length
const mdiSize = JSON.stringify(extractedMdi).length
const fullSolarSize = JSON.stringify(solarData).length
const fullMdiSize = JSON.stringify(mdiData).length

console.log(`\nSize comparison:`)
console.log(`  Solar: ${(solarSize / 1024).toFixed(2)} KB (full: ${(fullSolarSize / 1024).toFixed(2)} KB)`)
console.log(`  MDI: ${(mdiSize / 1024).toFixed(2)} KB (full: ${(fullMdiSize / 1024).toFixed(2)} KB)`)
console.log(`  Total extracted: ${((solarSize + mdiSize) / 1024).toFixed(2)} KB`)
console.log(`  Total saved: ${((fullSolarSize + fullMdiSize - solarSize - mdiSize) / 1024).toFixed(2)} KB`)

console.log(`\nExtracted icons saved to src/icons/`)
console.log(`\nSolar icons: ${Object.keys(extractedSolar.icons).length}`)
console.log(`MDI icons: ${Object.keys(extractedMdi.icons).length}`)
