import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

// A classic inline script also works when the downloaded HTML is opened via file://.
// No web server, module fetch, external stylesheet, or font download is needed.
const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  write: false,
  outfile: 'kotonoha.js',
  format: 'iife',
  minify: true,
  charset: 'utf8',
});
const js = result.outputFiles.find(f => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
const css = result.outputFiles.find(f => f.path.endsWith('.css')).text
  .replace(/@import\s*(?:url\([^)]*\)|"[^"]*"|'[^']*')\s*;/g, '');
const template = await readFile('index.html', 'utf8');
const html = template
  .replace(/\s*<link rel="icon"[^>]*>/, '')
  .replace('</head>', `<style>${css}</style>\n</head>`)
  .replace('<script type="module" src="/src/main.js"></script>', () => `<script>${js}</script>`);
await writeFile('dist/kotonoha.html', html);
console.log('Standalone app: dist/kotonoha.html');
