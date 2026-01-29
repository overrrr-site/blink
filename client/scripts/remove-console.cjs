/**
 * Remove console.error/log/warn statements from all .tsx files under client/src/
 *
 * Rules:
 * 1. Remove the entire line containing console.error/log/warn (handle multi-line)
 * 2. If a console statement is the ONLY statement in an if block, remove the entire if block
 * 3. If a console statement is the ONLY statement in a catch block, make the catch empty: catch {}
 *    (also remove the error parameter since it becomes unused)
 * 4. If console is accompanied by other meaningful statements (alert, setError, throw, etc.),
 *    only remove the console line
 * 5. For .catch((error) => { console.error(...) }) inline callbacks where console is the sole
 *    body statement, make it .catch(() => {})
 * 6. Only process .tsx files
 * 7. After removal, clean up unused catch parameters
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');

function findTsxFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function isConsoleStatement(line) {
  return /^\s*console\.(error|log|warn)\(/.test(line);
}

function parensBalanced(str) {
  let depth = 0;
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
  }
  return depth <= 0;
}

function removeConsoleStatements(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const result = [];
  let modified = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for inline .catch((params) => { ... }) where body is only console
    const catchInlineMatch = trimmed.match(/^(.+)\.catch\s*\(\s*\([^)]*\)\s*=>\s*\{\s*$/);
    if (catchInlineMatch) {
      const bodyStart = i + 1;
      if (bodyStart < lines.length && isConsoleStatement(lines[bodyStart])) {
        let consoleEnd = bodyStart;
        let combined = lines[bodyStart];
        while (!parensBalanced(combined) && consoleEnd + 1 < lines.length) {
          consoleEnd++;
          combined += '\n' + lines[consoleEnd];
        }
        const afterConsole = consoleEnd + 1;
        if (afterConsole < lines.length && /^\s*\}\s*\)\s*;?\s*$/.test(lines[afterConsole])) {
          if (consoleEnd + 1 === afterConsole) {
            const indent = line.match(/^(\s*)/)[1];
            const prefix = catchInlineMatch[1];
            const closingLine = lines[afterConsole];
            const closingSemicolon = closingLine.trim().endsWith(';') ? ';' : '';
            result.push(`${indent}${prefix}.catch(() => {})${closingSemicolon}`);
            modified = true;
            i = afterConsole + 1;
            continue;
          }
        }
      }
    }

    // Check for .catch(function(params) { ... }) where body is only console
    const catchFuncMatch = trimmed.match(/^(.+)\.catch\s*\(\s*function\s*\([^)]*\)\s*\{\s*$/);
    if (catchFuncMatch) {
      const bodyStart = i + 1;
      if (bodyStart < lines.length && isConsoleStatement(lines[bodyStart])) {
        let consoleEnd = bodyStart;
        let combined = lines[bodyStart];
        while (!parensBalanced(combined) && consoleEnd + 1 < lines.length) {
          consoleEnd++;
          combined += '\n' + lines[consoleEnd];
        }
        const afterConsole = consoleEnd + 1;
        if (afterConsole < lines.length && /^\s*\}\s*\)\s*;?\s*$/.test(lines[afterConsole])) {
          if (consoleEnd + 1 === afterConsole) {
            const indent = line.match(/^(\s*)/)[1];
            const prefix = catchFuncMatch[1];
            const closingLine = lines[afterConsole];
            const closingSemicolon = closingLine.trim().endsWith(';') ? ';' : '';
            result.push(`${indent}${prefix}.catch(function() {})${closingSemicolon}`);
            modified = true;
            i = afterConsole + 1;
            continue;
          }
        }
      }
    }

    // Check for if block with only a console statement
    const ifMatch = trimmed.match(/^if\s*\(.*\)\s*\{\s*$/);
    if (ifMatch && !trimmed.includes('else')) {
      let j = i + 1;
      const bodyLines = [];
      let foundClose = false;
      while (j < lines.length) {
        const s = lines[j].trim();
        if (s === '}') {
          foundClose = true;
          break;
        }
        bodyLines.push({ index: j, text: s, raw: lines[j] });
        j++;
      }

      if (foundClose) {
        const meaningful = bodyLines.filter(l => l.text !== '' && !l.text.startsWith('//'));
        if (meaningful.length >= 1 && /^console\.(error|log|warn)\(/.test(meaningful[0].text)) {
          let testStr = meaningful.map(l => l.text).join('\n');
          // Check it's a single console statement spanning all meaningful lines
          let partialStr = '';
          let endIdx = -1;
          for (let k = 0; k < meaningful.length; k++) {
            partialStr += (k > 0 ? '\n' : '') + meaningful[k].text;
            if (parensBalanced(partialStr)) {
              endIdx = k;
              break;
            }
          }
          if (endIdx >= 0 && endIdx === meaningful.length - 1) {
            modified = true;
            i = j + 1;
            continue;
          }
        }
      }
    }

    // Check for catch block with only a console statement
    const catchMatch = trimmed.match(/^(?:\}\s*)?catch\s*\([^)]*\)\s*\{\s*$/);
    if (catchMatch) {
      let j = i + 1;
      const bodyLines = [];
      let foundClose = false;
      let closingLineIndex = -1;
      while (j < lines.length) {
        const s = lines[j].trim();
        if (s === '}') { foundClose = true; closingLineIndex = j; break; }
        if (/^\}\s*finally\s*\{/.test(s)) { foundClose = true; closingLineIndex = j; break; }
        bodyLines.push({ index: j, text: s, raw: lines[j] });
        j++;
      }

      if (foundClose) {
        const meaningful = bodyLines.filter(l => l.text !== '' && !l.text.startsWith('//'));
        if (meaningful.length === 1 && /^console\.(error|log|warn)\(/.test(meaningful[0].text)) {
          const indent = line.match(/^(\s*)/)[1];
          const hasClosingBrace = trimmed.startsWith('}');
          const prefix = hasClosingBrace ? '} ' : '';
          result.push(`${indent}${prefix}catch {`);
          const comments = bodyLines.filter(l => l.text.startsWith('//'));
          for (const c of comments) { result.push(c.raw); }
          modified = true;
          i = closingLineIndex;
          continue;
        }
      }
    }

    // Simple case: standalone console statement line
    if (isConsoleStatement(line)) {
      let combined = line;
      let endLine = i;
      while (!parensBalanced(combined) && endLine + 1 < lines.length) {
        endLine++;
        combined += '\n' + lines[endLine];
      }
      modified = true;
      i = endLine + 1;
      continue;
    }

    result.push(line);
    i++;
  }

  if (modified) {
    // Clean up consecutive blank lines
    const cleaned = [];
    let prevBlank = false;
    for (const line of result) {
      const isBlank = line.trim() === '';
      if (isBlank && prevBlank) continue;
      cleaned.push(line);
      prevBlank = isBlank;
    }
    fs.writeFileSync(filePath, cleaned.join('\n'), 'utf-8');
  }
  return modified;
}

function cleanupUnusedCatchParams(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  const result = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    
    // Match catch (paramName) { or catch (paramName: type) {
    const catchBlockMatch = line.match(/^(\s*(?:\}\s*)?)catch\s*\((\w+)(?::\s*\w+)?\)\s*\{/);
    if (catchBlockMatch) {
      const paramName = catchBlockMatch[2];
      let j = idx + 1;
      let bodyText = '';
      while (j < lines.length) {
        const s = lines[j].trim();
        if (s === '}' || /^\}\s*finally\s*\{/.test(s)) break;
        bodyText += lines[j];
        j++;
      }
      if (!bodyText.includes(paramName)) {
        const newLine = line.replace(/catch\s*\(\w+(?::\s*\w+)?\)/, 'catch');
        if (newLine !== line) {
          result.push(newLine);
          modified = true;
          continue;
        }
      }
    }

    // Match .catch((paramName) => { or .catch(function(paramName) {
    const catchCallbackMatch = line.match(/\.catch\s*\(\s*(?:function)?\s*\((\w+)(?::\s*\w+)?\)\s*(?:=>)?\s*\{/);
    if (catchCallbackMatch) {
      const paramName = catchCallbackMatch[1];
      let j = idx + 1;
      let bodyText = '';
      while (j < lines.length) {
        const s = lines[j].trim();
        if (/^\}\s*\)\s*;?\s*$/.test(s)) break;
        bodyText += lines[j];
        j++;
      }
      if (!bodyText.includes(paramName)) {
        const newLine = line.replace(
          new RegExp('\\(' + paramName + '(?::\\s*\\w+)?\\)'),
          '()'
        );
        if (newLine !== line) {
          result.push(newLine);
          modified = true;
          continue;
        }
      }
    }

    result.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf-8');
  }
  return modified;
}

// Main
const files = findTsxFiles(SRC_DIR);
let modifiedCount = 0;
const modifiedFiles = [];

for (const file of files) {
  const consoleRemoved = removeConsoleStatements(file);
  const paramsCleanedUp = cleanupUnusedCatchParams(file);
  if (consoleRemoved || paramsCleanedUp) {
    modifiedCount++;
    modifiedFiles.push(path.relative(SRC_DIR, file));
  }
}

console.log(`\nProcessed ${files.length} .tsx files`);
console.log(`Modified ${modifiedCount} files:\n`);
modifiedFiles.forEach(f => console.log(`  - ${f}`));
console.log('');
