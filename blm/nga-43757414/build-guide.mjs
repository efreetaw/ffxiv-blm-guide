import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Run: node build-guide.mjs. Set BLM_MARKED_PATH if marked is installed elsewhere.
const folder = path.dirname(fileURLToPath(import.meta.url));
let marked;
try {
  ({ marked } = await import('marked'));
} catch (error) {
  const modulePath = process.env.BLM_MARKED_PATH || path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/marked/lib/marked.esm.js');
  if (!fs.existsSync(modulePath)) throw new Error('需要 marked：请设置 BLM_MARKED_PATH 为 marked.esm.js 的绝对路径。', { cause: error });
  ({ marked } = await import(pathToFileURL(modulePath).href));
}
const source = path.join(folder, '7.2黑魔进阶攻略-原文注释版.md');
const output = path.join(folder, '7.2黑魔进阶攻略-原文注释版.html');
const markdown = fs.readFileSync(source, 'utf8');
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headings = [];
let headingIndex = 0;
marked.use({ renderer: {
  heading(token) {
    const id = `section-${++headingIndex}`;
    const label = token.text.replace(/\*\*|`/g, '');
    headings.push({ id, depth: token.depth, label });
    return `<h${token.depth} id="${id}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
  }
}});
let body = marked.parse(markdown, { gfm: true, breaks: true });

// Preserve source text, formulae and issue notices; only organize their presentation.
const annotationLabels = new Map([
  ['对照账本', 'ledger'], ['GCD 变化', 'delta'],
  ['p 值计算', 'calculation'], ['特殊说明', 'details'],
]);
let annotationCount = 0;
body = body.replace(/<blockquote>\n([\s\S]*?)<\/blockquote>/g, (original, inside) => {
  const paragraphs = [...inside.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match => match[1]);
  const heading = paragraphs[0]?.match(/^<strong>注释 (\d+)｜([\s\S]+)<\/strong>$/);
  if (!heading) return original;
  const id = `annotation-${heading[1]}`;
  const sections = [], warnings = [];
  for (const paragraph of paragraphs.slice(1)) {
    const field = paragraph.match(/^<strong>(对照账本|GCD 变化|p 值计算|特殊说明)<\/strong>：([\s\S]*)$/);
    if (field) {
      sections.push(`<div class="annotation-row annotation-${annotationLabels.get(field[1])}"><dt>${field[1]}</dt><dd>${field[2]}</dd></div>`);
    } else if (paragraph.includes('class="review-issue"')) {
      warnings.push(`<div class="annotation-warning">${paragraph}</div>`);
    } else {
      throw new Error(`Unexpected annotation paragraph in ${id}`);
    }
  }
  if (sections.length !== 4) throw new Error(`Expected four sections in ${id}`);
  annotationCount++;
  return `<aside class="annotation-card" aria-labelledby="${id}">
<header class="annotation-header"><span class="annotation-number">注释 ${heading[1].padStart(2, '0')}</span><div class="annotation-title" id="${id}">${heading[2]}</div></header>
<dl class="annotation-fields">${sections.join('\n')}</dl>${warnings.join('\n')}
</aside>`;
});
const sourceAnnotationCount = [...markdown.matchAll(/^> \*\*注释 \d+｜/gm)].length;
if (annotationCount !== sourceAnnotationCount) throw new Error(`Expected ${sourceAnnotationCount} annotations, got ${annotationCount}`);

const images = [];
body = body.replace(/<img\b([^>]*?)src="([^"]+)"([^>]*?)>/g, (full, before, href, after) => {
  const decoded = decodeURIComponent(href);
  const subtree = decoded.startsWith('images/') ? 'images' : decoded.startsWith('xivintheshell-icons/Skills/') ? 'xivintheshell-icons/Skills' : null;
  if (!subtree) throw new Error(`Unexpected image URL: ${href}`);
  const resolved = path.resolve(folder, decoded);
  if (!resolved.startsWith(path.resolve(folder, subtree) + path.sep)) throw new Error('Image escaped allowed directory');
  const bytes = fs.readFileSync(resolved);
  const mime = /\.png$/i.test(resolved) ? 'image/png' : 'image/jpeg';
  const encoded = `data:${mime};base64,${bytes.toString('base64')}`;
  const alt = href.match(/extra-(\d+)/) ? `附件 ${href.match(/extra-(\d+)/)[1]}：循环序列图` : `图 ${Number(path.basename(href).split('-')[0])}：循环序列图`;
  images.push({ href, hash: crypto.createHash('sha256').update(bytes).digest('hex') });
  let attributes = `${before}src="${encoded}"${after}`;
  if (!/alt="[^"]+"/.test(attributes)) attributes = attributes.replace(/\s*alt=""/g, '') + ` alt="${escape(alt)}"`;
  return `<img${attributes}>`;
});
body = body.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, '</table></div>');
const toc = headings.filter(h => h.depth > 1).map(h => `<li class="depth-${h.depth}"><a href="#${h.id}">${escape(h.label)}</a></li>`).join('\n');
const hash = crypto.createHash('sha256').update(markdown).digest('hex');
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="NGA 7.2黑魔进阶攻略原文注释版，含机制复审、循环配图与计算注释。">
<meta name="color-scheme" content="light">
<title>7.2黑魔进阶攻略 · 原文注释版</title>
<!-- Generated from 7.2黑魔进阶攻略-原文注释版.md; source SHA-256: ${hash}. Images embedded as data URLs. -->
<style>
:root{font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif;color:#243040;background:#f5f7fa;font-synthesis:none}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;font-size:16px;line-height:1.85}
.layout{display:grid;grid-template-columns:250px minmax(0,1fr);gap:28px;max-width:1450px;margin:0 auto;padding:32px 24px 64px}
nav{position:sticky;top:24px;align-self:start;max-height:calc(100vh - 48px);overflow:auto;padding:16px 18px;border:1px solid #dbe2eb;border-radius:10px;background:#fff;font-size:13px;line-height:1.55}
nav summary{font-size:15px;font-weight:650;cursor:pointer}nav ol{list-style:none;margin:12px 0 0;padding:0}nav li{margin:8px 0}nav .depth-2{font-weight:650;margin-top:18px}nav .depth-3{padding-left:9px}nav .depth-4{padding-left:18px}nav .depth-5,nav .depth-6{padding-left:25px}nav a{color:#425369;text-decoration:none}nav a:hover{color:#1759ae;text-decoration:underline}
main{min-width:0;background:#fff;border:1px solid #dbe2eb;border-radius:12px;padding:34px 40px;box-shadow:0 3px 18px #22304a06}
h1,h2,h3,h4,h5,h6{line-height:1.45;color:#17283c;scroll-margin-top:24px}h1{font-size:32px;margin:0 0 24px;letter-spacing:.01em}h2{font-size:25px;margin:48px 0 20px;padding-bottom:10px;border-bottom:2px solid #dce5f0}h3{font-size:20px;margin:30px 0 14px}h4{font-size:18px;margin:32px 0 14px}h5,h6{font-size:17px;margin:32px 0 12px;padding-left:11px;border-left:4px solid #4276ba}
p{margin:13px 0}a{color:#1759ae;text-underline-offset:3px;overflow-wrap:anywhere}strong{font-weight:650}code{font-family:ui-monospace,"Cascadia Code",Consolas,monospace;font-size:.88em;background:#eef2f7;border-radius:4px;padding:2px 5px;overflow-wrap:anywhere}pre{overflow:auto;background:#f1f4f8;padding:16px;border-radius:7px}pre code{padding:0;background:none}blockquote{margin:20px 0;padding:12px 18px;border-left:4px solid #497ab8;border-radius:0 7px 7px 0;background:#f1f6fc;color:#29425f;font-size:15px}blockquote p:first-child{margin-top:0}blockquote p:last-child{margin-bottom:0}
.table-scroll{overflow-x:auto;margin:20px 0;border:1px solid #dce3eb;border-radius:7px}table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.7}th,td{padding:10px 12px;border-right:1px solid #e1e7ee;border-bottom:1px solid #e1e7ee;text-align:left;vertical-align:top}th{background:#eaf0f7;font-weight:650}th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}tbody tr:nth-child(even){background:#f8fafc}
img{display:block;width:auto;max-width:100%;height:auto;margin:20px auto 8px;border:1px solid #dce3eb;border-radius:6px}img.skill-icon{display:inline-block;width:32px;height:32px;max-width:none;vertical-align:middle;margin:0 8px 0 0;border:0;border-radius:4px}table:has(.skill-icon) td:first-child{min-width:185px}p:has(>em:only-child){font-size:13px;color:#65748a;margin:6px 0 22px}ul,ol{padding-left:26px}hr{border:0;border-top:1px solid #dce3eb;margin:30px 0}.document-note{font-size:13px;color:#69788c;margin-top:40px;padding-top:18px;border-top:1px solid #e1e7ee}
@media(max-width:1050px){.layout{grid-template-columns:1fr;padding:18px 16px 40px;gap:18px}nav{position:static;max-height:280px}main{padding:28px 24px}}
@media(max-width:600px){body{font-size:15px}.layout{padding:12px 8px 28px}main{padding:22px 16px}h1{font-size:26px}h2{font-size:22px}blockquote{padding:12px;font-size:14px}th,td{padding:8px 10px}table{min-width:620px}}
@media print{:root{background:#fff}body{font-size:11pt}.layout{display:block;padding:0;max-width:none}nav,.document-note{display:none}main{border:0;box-shadow:none;padding:0;border-radius:0}h2,h3,h4,h5{break-after:avoid}img,tr{break-inside:avoid}blockquote{background:#f7f9fb}.table-scroll{overflow:visible}table{min-width:0!important;font-size:9pt}a{color:inherit}html{scroll-behavior:auto}}

.annotation-card{margin:24px 0 30px;border:1px solid #dbe5ec;border-radius:12px;background:#fff;box-shadow:0 4px 16px #203b5507;overflow:hidden;color:#33485c;font-size:14px;line-height:1.85}
.annotation-header{display:flex;align-items:flex-start;gap:12px;padding:16px 20px;background:linear-gradient(110deg,#edf4fb,#f9fbfd);border-bottom:1px solid #dfe8f1}
.annotation-number{flex:none;display:inline-flex;align-items:center;padding:3px 9px;background:#254b75;color:#fff;border-radius:6px;font-size:12px;font-weight:650;line-height:1.8;white-space:nowrap}
.annotation-title{min-width:0;padding-top:1px;font-size:16px;font-weight:650;line-height:1.65;color:#1a3552}
.annotation-fields{margin:0}.annotation-row{display:grid;grid-template-columns:86px minmax(0,1fr);gap:16px;padding:16px 20px;border-bottom:1px solid #edf1f5}.annotation-row:last-child{border-bottom:0}
.annotation-row dt{align-self:start;justify-self:start;padding:3px 8px;border-radius:5px;font-size:12px;font-weight:650;line-height:1.8;white-space:nowrap;background:#eef3f9;color:#355d85}
.annotation-row dd{min-width:0;margin:0;overflow-wrap:anywhere}.annotation-row code{font-size:.95em;line-height:1.8;padding:2px 5px;background:#f2f5f8;color:#29485f;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.annotation-delta{background:#fcfbff}.annotation-delta dt{color:#655298;background:#f0ebfa}.annotation-delta code{background:#eee8f8;color:#563d85;font-weight:650;padding:4px 7px}
.annotation-calculation{background:#f6fbf9}.annotation-calculation dt{color:#256551;background:#e5f2ec}.annotation-calculation code{background:#eaf4ef;color:#1d5642}
.annotation-details{color:#58697c;font-size:13px}.annotation-details dt{background:#f0f2f5;color:#626f7e}
.annotation-warning{padding:0 20px 18px}.annotation-warning .review-issue{margin:0!important;font-size:13px;line-height:1.85}
@media(max-width:600px){.annotation-card{margin:20px 0 24px;border-radius:9px}.annotation-header{padding:14px;gap:9px}.annotation-title{font-size:15px}.annotation-number{font-size:11px;padding:3px 7px}.annotation-row{grid-template-columns:1fr;gap:9px;padding:14px;font-size:14px}.annotation-row dt{font-size:11px}.annotation-details{font-size:13px}.annotation-warning{padding:0 14px 14px}.annotation-row code{font-size:.92em}}
@media print{.annotation-card{box-shadow:none;font-size:9.5pt;border-color:#ccd5df}.annotation-header{background:#f1f4f7;padding:10px 12px;break-after:avoid}.annotation-number{background:#e2e8ee;color:#263e57}.annotation-row{padding:10px 12px;break-inside:avoid;grid-template-columns:76px minmax(0,1fr);gap:10px}.annotation-warning{padding:0 12px 12px;break-inside:avoid}}

</style>
</head>
<body>
<div class="layout">
<nav aria-label="文章目录"><details open><summary>阅读目录</summary><ol>${toc}</ol></details></nav>
<main>${body}<footer class="document-note">由原文注释版Markdown生成。正文图片已内嵌，可单独保存本HTML阅读；来源与补充文件链接沿用原文。</footer></main>
</div>
</body>
</html>`;
fs.writeFileSync(output, html, 'utf8');

console.log(JSON.stringify({ output, bytes: Buffer.byteLength(html), annotationCards: annotationCount, images: images.length, sourceHash: hash }));
