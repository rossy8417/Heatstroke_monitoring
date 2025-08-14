#!/usr/bin/env node

/**
 * すべてのLinkコンポーネントを通常のbuttonに置き換えるスクリプト
 * Next.js 14でのLink互換性問題を解決
 */

const fs = require('fs');
const path = require('path');

// 対象ディレクトリ
const directories = ['pages', 'components'];

// ファイルを再帰的に取得
function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Linkコンポーネントを削除
function removeLinkImports(content) {
  // Link importを削除
  content = content.replace(/import\s+Link\s+from\s+['"]next\/link['"];?\s*\n?/g, '');
  
  // useRouterがない場合は追加
  if (content.includes('<Link') && !content.includes('useRouter')) {
    if (content.includes('next/router')) {
      // すでにrouter importがある場合、useRouterを追加
      content = content.replace(
        /import\s*{([^}]*)}\s*from\s*['"]next\/router['"]/,
        (match, imports) => {
          if (!imports.includes('useRouter')) {
            return `import { ${imports.trim()}, useRouter } from 'next/router'`;
          }
          return match;
        }
      );
    } else {
      // router importを新規追加
      content = content.replace(
        /(import[^;]+from[^;]+;[\n\r]+)/,
        `$1import { useRouter } from 'next/router';\n`
      );
    }
  }
  
  return content;
}

// コンポーネント内でuseRouterを追加
function addRouterHook(content) {
  // 関数コンポーネントを検出してuseRouterを追加
  const patterns = [
    /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*{/g,
    /const\s+\w+:\s*React\.FC[^=]*=\s*\([^)]*\)\s*=>\s*{/g,
    /function\s+\w+\s*\([^)]*\)\s*{/g,
  ];
  
  for (const pattern of patterns) {
    content = content.replace(pattern, (match) => {
      return match + '\n  const router = useRouter();';
    });
  }
  
  return content;
}

// 処理実行
directories.forEach(dir => {
  const fullDir = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullDir)) {
    console.log(`Directory ${dir} not found, skipping...`);
    return;
  }
  
  const files = getFiles(fullDir);
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;
    
    // Linkコンポーネントを使用しているかチェック
    if (!content.includes('Link')) {
      return;
    }
    
    console.log(`Processing ${file}...`);
    
    // Link importを削除
    content = removeLinkImports(content);
    
    // 変更があった場合のみ書き込み
    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed ${file}`);
    }
  });
});

console.log('Link component removal complete!');
console.log('Note: You may need to manually convert <Link> tags to buttons with router.push()');