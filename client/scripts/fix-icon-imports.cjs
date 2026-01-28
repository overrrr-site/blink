#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

// 修正が必要なファイルのパターン
const fixes = [
  // src/App.tsx -> @/components/Icon
  { pattern: /^\.\/src\/App\.tsx$/, from: "../components/Icon", to: "@/components/Icon" },
  // src/components/*.tsx -> ./Icon
  { pattern: /^\.\/src\/components\/[^/]+\.tsx$/, from: "../components/Icon", to: "./Icon" },
  // src/components/dogs/*.tsx -> ../Icon
  { pattern: /^\.\/src\/components\/dogs\/[^/]+\.tsx$/, from: "../components/Icon", to: "../Icon" },
  // src/components/reservations/*.tsx -> ../Icon
  { pattern: /^\.\/src\/components\/reservations\/[^/]+\.tsx$/, from: "../components/Icon", to: "../Icon" },
  // src/pages/*.tsx -> ../components/Icon
  { pattern: /^\.\/src\/pages\/[^/]+\.tsx$/, from: "../components/Icon", to: "../components/Icon" },
  // src/pages/settings/*.tsx -> ../../components/Icon
  { pattern: /^\.\/src\/pages\/settings\/[^/]+\.tsx$/, from: "../components/Icon", to: "../../components/Icon" },
  // src/liff/App.tsx -> ../components/Icon
  { pattern: /^\.\/src\/liff\/App\.tsx$/, from: "../components/Icon", to: "../components/Icon" },
  // src/liff/components/*.tsx -> ../../components/Icon
  { pattern: /^\.\/src\/liff\/components\/[^/]+\.tsx$/, from: "../components/Icon", to: "../../components/Icon" },
  // src/liff/pages/*.tsx -> ../../components/Icon
  { pattern: /^\.\/src\/liff\/pages\/[^/]+\.tsx$/, from: "../components/Icon", to: "../../components/Icon" },
]

// 全ファイルを取得
const getAllFiles = (dir, files = []) => {
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, files)
    } else if (item.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }
  return files
}

const srcDir = path.join(__dirname, '..', 'src')
const files = getAllFiles(srcDir).map(f => './' + path.relative(path.join(__dirname, '..'), f))

let totalFixed = 0

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file)
  let content = fs.readFileSync(filePath, 'utf8')
  const originalContent = content

  for (const fix of fixes) {
    if (fix.pattern.test(file)) {
      const importRegex = new RegExp(`from ['"]${fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g')
      content = content.replace(importRegex, `from '${fix.to}'`)
      break
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content)
    console.log(`Fixed import in: ${file}`)
    totalFixed++
  }
})

console.log(`\nTotal files fixed: ${totalFixed}`)
