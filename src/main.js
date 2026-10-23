import grammar from './grammar.json';
import './style.css';

const icons = {
  book: '<path d="M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-2-10 1Zm0 0v16"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  leaf: '<path d="M19 4C6 2 2 9 6 15s15 3 13-11Z"/><path d="m4 21 11-12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escape = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved;
try {
  const stored = JSON.parse(localStorage.getItem('kotonoha-saved') || '[]');
  saved = new Set(Array.isArray(stored) ? stored.filter(id => grammar.some(g => g.id === id)) : []);
} catch { saved = new Set(); }
let query = '';
let activeGroup = 'all';
let savedOnly = false;
const openIds = new Set();
const collator = new Intl.Collator('ja');
const sorted = [...grammar].sort((a,b) => collator.compare(a.reading,b.reading) || a.id.localeCompare(b.id));
const groups = ['あ','か','さ','た','な','は','ま','や','ら','わ'];

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="brand" href="./" aria-label="ことのは ホーム"><span class="brand-mark">${icon('book')}</span><span>ことのは<span class="brand-sub">日本語の、小さな積み重ね。</span></span></a>
    <nav aria-label="メインメニュー"><button class="nav-link active" id="all-nav" aria-current="page">文法ノート</button><button class="nav-link" id="saved-nav">${icon('bookmark')}<span>保存した文法</span><span class="nav-count">${saved.size}</span></button></nav>
    <span class="header-label">あなたのペースで、日本語を。</span>
  </header>
  <main class="page">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><div class="eyebrow"><span class="level-pill">JLPT N4</span><span>GRAMMAR NOTEBOOK</span></div><h1 id="hero-title">ひとつずつ、<br>わかる日本語に<span class="title-dot">。</span></h1><p>N4の文法を、ことばの意味から。<br>繁体字の説明と例文で、自分のペースで学びましょう。</p><div class="hero-meta"><span>${icon('book')} <strong>93</strong> の文法</span><i></i><span>日本語 <span class="meta-arrow">↔</span> 繁體中文</span></div></div>
      <div class="hero-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><span class="art-spark spark-one">✳</span><span class="art-spark spark-two">＋</span><span class="floating-kana kana-one">あ</span><span class="floating-kana kana-two">の</span><div class="notebook"><div class="notebook-spine"></div><div class="notebook-topline">わたしの日本語ノート</div><div class="notebook-title">ことばの<br>芽を育てる。</div><div class="notebook-leaf">${icon('leaf')}</div><div class="notebook-bottom">N4 <span>文法と、日々。</span></div></div><span class="art-caption">a little learning, every day.</span></div>
    </section>
    <section class="workspace" aria-label="文法一覧">
      <aside class="sidebar"><div class="sidebar-heading"><span>五十音で探す</span><span class="tiny-label">INDEX</span></div><div id="kana-index" class="kana-index"></div><div class="sidebar-note">${icon('leaf')}<p>ちょっとずつで、大丈夫。<br>今日のひとつを見つけよう。</p></div></aside>
      <div class="content"><div class="content-heading"><div><h2 id="list-title">文法一覧</h2><p>文法をクリックして、例文を見てみましょう。</p></div><span class="sort-label">あ → ん <span>五十音順</span></span></div>
        <div class="search-wrap">${icon('search')}<input id="search" type="search" placeholder="文法・意味・例文を検索" aria-label="文法・中国語の意味・例文を検索" autocomplete="off"><kbd>/</kbd></div>
        <div class="results-bar"><p id="result-count" role="status" aria-live="polite"></p><button id="reset" class="reset-button" hidden>絞り込みをクリア ${icon('close')}</button><span id="results-hint">気になる文法は ${icon('bookmark')} で保存</span></div>
        <div id="grammar-list"></div>
      </div>
    </section>
    <footer><a class="footer-brand" href="./">${icon('leaf')} ことのは</a><span>毎日の「わかった」を、少しずつ。</span><small>収録データ：TRY! N4 · 繁體中文</small></footer>
  </main><div id="toast" role="status" class="toast"></div>`;

const list = document.querySelector('#grammar-list');
const toast = document.querySelector('#toast');
let toastTimer;
function notify(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2300);
}

function render() {
  const normalized = query.trim().normalize('NFKC').toLocaleLowerCase('ja');
  const items = sorted.filter(g => (!savedOnly || saved.has(g.id)) && (activeGroup === 'all' || g.group === activeGroup) && (!normalized || [g.pattern,g.reading,g.meaning,g.explanation,g.connection,g.usage,...g.examples].join(' ').normalize('NFKC').toLocaleLowerCase('ja').includes(normalized)));
  document.querySelector('#list-title').textContent = savedOnly ? '保存した文法' : '文法一覧';
  document.querySelector('#result-count').innerHTML = `<strong>${items.length}</strong> 件${savedOnly ? ` / 保存した ${saved.size} 件` : ' / 全93件'}${activeGroup !== 'all' ? ` <span class="filter-chip">${activeGroup}行</span>` : ''}`;
  document.querySelector('#reset').hidden = !(query || activeGroup !== 'all');
  document.querySelector('#results-hint').hidden = Boolean(query || activeGroup !== 'all');
  document.querySelector('.nav-count').textContent = saved.size;
  for (const [selector, active] of [['#all-nav',!savedOnly],['#saved-nav',savedOnly]]) {
    const element = document.querySelector(selector);
    element.classList.toggle('active',active);
    if (active) element.setAttribute('aria-current','page'); else element.removeAttribute('aria-current');
  }
  document.querySelector('#kana-index').innerHTML = [{label:'すべての文法',key:'all'},...groups.map(g=>({label:`${g}行`,key:g}))].map(({label,key})=>{
    const count = grammar.filter(g => (key === 'all' || g.group === key) && (!savedOnly || saved.has(g.id))).length;
    return `<button class="kana-button ${activeGroup === key ? 'selected' : ''}" data-group="${key}" aria-pressed="${activeGroup === key}"><span>${key === 'all' ? icon('book') : `<span class="kana-letter">${key}</span>`}${label}</span><span class="kana-count">${count}</span></button>`;
  }).join('');
  if (!items.length) {
    list.innerHTML = `<div class="empty-state">${icon(savedOnly ? 'bookmark' : 'search')}<h3>${savedOnly && !query && activeGroup === 'all' ? '自分だけの文法ノートを。' : '文法が見つかりませんでした'}</h3><p>${savedOnly && !query && activeGroup === 'all' ? '文法カードの保存ボタンを押すと、ここでまとめて復習できます。' : '検索することばや、五十音の絞り込みを変えてみてください。'}</p><button id="empty-reset" class="primary-button">すべての文法を見る ${icon('arrow')}</button></div>`;
    return;
  }
  list.innerHTML = groups.map(group => {
    const entries = items.filter(g => g.group === group);
    if (!entries.length) return '';
    return `<section class="grammar-group" aria-label="${group}行"><div class="group-heading"><h3>${group}<span>行</span></h3><span>${entries.length} の文法</span><div></div></div><div class="card-grid">${entries.map(card).join('')}</div></section>`;
  }).join('');
}

function card(g) {
  const bookmarked = saved.has(g.id);
  return `<article class="grammar-card ${openIds.has(g.id) ? 'is-open' : ''}" data-id="${g.id}"><button class="bookmark ${bookmarked ? 'is-saved' : ''}" data-save="${g.id}" aria-label="${escape(g.pattern)}を${bookmarked ? '保存から削除' : '保存'}" aria-pressed="${bookmarked}">${icon('bookmark')}</button><details ${openIds.has(g.id) ? 'open' : ''}><summary><div class="card-label"><span>N4</span>${g.usage ? `<span class="usage-label">${escape(g.usage)}</span>` : ''}</div><h4>${escape(g.pattern)}</h4><p class="card-reading">${escape(g.reading)}</p><p class="card-meaning" lang="zh-Hant">${escape(g.meaning)}</p><div class="card-bottom"><span>${icon('book')}<span class="expand-label">${openIds.has(g.id) ? '例文を閉じる' : '例文を見る'}</span><span class="example-count">${g.examples.length}</span></span>${icon('arrow','expand-arrow')}</div></summary><div class="card-detail"><div class="full-meaning" lang="zh-Hant"><span class="detail-label">意味 · 中文解釋</span><p>${escape(g.meaning)}</p></div>${g.connection ? `<div class="connection"><span class="detail-label">接続</span><p>${escape(g.connection)}</p></div>` : ''}<div class="examples"><span class="detail-label">例文</span>${g.examples.map((ex,i)=>`<div class="example"><span class="example-number">${String(i+1).padStart(2,'0')}</span><p>${escape(ex)}</p></div>`).join('')}</div>${g.detail ? `<details class="additional"><summary>もう少し詳しく <span>＋</span></summary><p>${escape(g.detail)}</p></details>` : ''}<p class="source">出典：${escape(g.source)} · ${g.id}</p></div></details></article>`;
}

document.querySelector('#search').addEventListener('input', e => { query = e.target.value; render(); });
document.querySelector('#kana-index').addEventListener('click', e => {
  const button = e.target.closest('[data-group]');
  if (button) { activeGroup = button.dataset.group; render(); }
});
list.addEventListener('toggle', e => {
  if (!e.target.matches('.grammar-card > details')) return;
  const article = e.target.closest('.grammar-card');
  if (e.target.open) openIds.add(article.dataset.id); else openIds.delete(article.dataset.id);
  article.classList.toggle('is-open', e.target.open);
  article.querySelector('.expand-label').textContent = e.target.open ? '例文を閉じる' : '例文を見る';
}, true);
list.addEventListener('click', e => {
  const button = e.target.closest('[data-save]');
  if (button) {
    const id = button.dataset.save;
    const wasSaved = saved.has(id);
    if (wasSaved) saved.delete(id); else saved.add(id);
    let persisted = true;
    try { localStorage.setItem('kotonoha-saved', JSON.stringify([...saved])); } catch { persisted = false; }
    render();
    notify(persisted ? (wasSaved ? '保存した文法から削除しました' : '文法を保存しました') : 'このブラウザでは保存できません。現在の画面でのみ保持します。');
    list.querySelector(`[data-save="${id}"]`)?.focus({preventScroll:true});
  }
  if (e.target.closest('#empty-reset')) { savedOnly = false; reset(); }
});
function reset() { query = ''; activeGroup = 'all'; document.querySelector('#search').value = ''; render(); }
document.querySelector('#reset').addEventListener('click',reset);
document.querySelector('#all-nav').addEventListener('click',()=>{ savedOnly = false; reset(); });
document.querySelector('#saved-nav').addEventListener('click',()=>{ savedOnly = true; reset(); });
document.addEventListener('keydown',e=>{
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); document.querySelector('#search').focus(); }
});
render();
