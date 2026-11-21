// The changelog's commit history: every commit to the public repository, read from GitHub's API in the
// visitor's browser, kept for 15 minutes in that browser, filtered by kind and by search.

const REPO = 'N3uralCreativity/comics-downloader';
const API = `https://api.github.com/repos/${REPO}/commits`;
const CACHE_KEY = 'cdl-changelog-v2';
const CACHE_MS = 15 * 60_000;
const MAX_PAGES = 10;

// Kinds, in the order the filters show them. A conventional prefix wins; otherwise the first keyword that fits.
const KINDS = [
  ['fix', 'Fix', /\b(fix(ed|es|ing)?|patch(ed|es)?|resolv(e|ed|es)|repair(ed|s)?|correct(ed|s)?|prevent(ed|s)?|restor(e|ed|es)|regression|bug|harden(ed|s)?)\b/i],
  ['add', 'Added', /\b(add(ed|s|ing)?|implement(ed|s)?|introduc(e|ed|es)|creat(e|ed|es)|support(ed|s)?|enable[ds]?|new|feature)\b/i],
  ['remove', 'Removed', /\b(remove[ds]?|removing|delete[ds]?|drop(ped|s)?|deprecat(e|ed|es)|retir(e|ed|es)|disable[ds]?)\b/i],
  ['docs', 'Docs', /\b(docs?|documentation|readme|privacy|policy|website)\b/i],
  ['test', 'Tests', /\b(tests?|testing|specs?|lint(ed|s)?)\b/i],
  ['release', 'Release', /\b(release[ds]?|version(ed|s)?)\b/i],
  ['refactor', 'Refactor', /\b(refactor(ed|s)?|cleanup|clean up|simplif(y|ied|ies)|optimi[sz](e|ed|es)|performance)\b/i],
  ['ci', 'CI', /\b(ci|workflows?|github actions|pipeline)\b/i],
  ['chore', 'Chore', /\b(chore|bump(ed|s)?|sync(ed|s)?|merge[ds]?|update[ds]?|build)\b/i],
];
const PREFIX = { fix: 'fix', hotfix: 'fix', bugfix: 'fix', feat: 'add', feature: 'add', add: 'add', remove: 'remove', delete: 'remove', drop: 'remove', docs: 'docs', doc: 'docs', test: 'test', tests: 'test', release: 'release', refactor: 'refactor', perf: 'refactor', ci: 'ci', chore: 'chore', build: 'chore', style: 'chore' };
// Order matters for keywords: removal and fix words are more telling than "add" or "update".
const KEYWORD_ORDER = ['remove', 'fix', 'add', 'docs', 'test', 'release', 'refactor', 'ci', 'chore'];
const LABEL = Object.fromEntries([...KINDS.map(([k, l]) => [k, l]), ['change', 'Change']]);

function kindOf(message) {
  const text = String(message || '').trim();
  const p = text.match(/^(?:revert\s+)?([a-z]+)(?:\([^)]*\))?!?:/i);
  if (p && PREFIX[p[1].toLowerCase()]) return PREFIX[p[1].toLowerCase()];
  const title = text.split('\n')[0];
  for (const k of KEYWORD_ORDER) if (KINDS.find(([id]) => id === k)[2].test(title)) return k;
  return 'change';
}

function shape(item) {
  const message = String(item.commit?.message || '').replace(/\r\n/g, '\n').trim();
  const [title, ...rest] = message.split('\n');
  // Trailers like Co-Authored-By say nothing about the change.
  const body = rest.join('\n').replace(/^(Co-Authored-By|Signed-off-by):.*$/gim, '').trim();
  return {
    sha: item.sha,
    title: title || 'Untitled commit',
    body,
    date: item.commit?.author?.date || item.commit?.committer?.date || '',
    author: item.author?.login || item.commit?.author?.name || 'Unknown',
    kind: kindOf(message),
  };
}

async function load(force) {
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && Date.now() - c.at < CACHE_MS) return c;
    } catch {}
  }
  const commits = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${API}?sha=master&per_page=100&page=${page}`, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (!res.ok) {
      const reset = Number(res.headers.get('x-ratelimit-reset'));
      throw new Error(
        res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0' && reset
          ? `GitHub’s limit for visitors was reached. It resets at ${new Date(reset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
          : `GitHub answered ${res.status}.`,
      );
    }
    const data = await res.json();
    commits.push(...data.map(shape));
    if (data.length < 100) break;
  }
  const c = { at: Date.now(), commits };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
  return c;
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  e.append(...children);
  return e;
}

function init() {
  const list = document.getElementById('commit-list');
  if (!list) return;
  const status = document.getElementById('commit-status');
  const chips = document.getElementById('commit-types');
  const search = document.getElementById('commit-search');
  let all = [];
  let kind = 'all';
  const month = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
  const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

  function render() {
    const q = search.value.trim().toLowerCase();
    const shown = all.filter((c) => (kind === 'all' || c.kind === kind) && (!q || `${c.title}\n${c.body}\n${c.sha}\n${c.author}`.toLowerCase().includes(q)));
    status.textContent = `${shown.length} of ${all.length} commits`;
    const groups = new Map();
    for (const c of shown) {
      const key = c.date ? month.format(new Date(c.date)) : 'Undated';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    list.replaceChildren(
      ...[...groups].map(([name, items]) =>
        el(
          'section',
          { class: 'month' },
          el('h3', {}, name, el('span', {}, `${items.length} commit${items.length > 1 ? 's' : ''}`)),
          ...items.map((c) => {
            const meta = el(
              'p',
              { class: 'meta' },
              el('a', { href: `https://github.com/${REPO}/commit/${c.sha}`, class: 'sha' }, c.sha.slice(0, 7)),
              ` ${c.author}`,
            );
            const head = el('div', { class: 'commit-head' }, el('span', { class: `kind k-${c.kind}` }, LABEL[c.kind]), el('time', { datetime: c.date }, c.date ? day.format(new Date(c.date)) : ''));
            const main = c.body
              ? el('details', {}, el('summary', {}, c.title), el('p', { class: 'body' }, c.body))
              : el('p', { class: 'title' }, c.title);
            return el('article', { class: 'commit' }, head, el('div', {}, main, meta));
          }),
        ),
      ),
    );
  }

  function filters() {
    const counts = { all: all.length };
    for (const c of all) counts[c.kind] = (counts[c.kind] || 0) + 1;
    const ids = ['all', ...KINDS.map(([k]) => k), 'change'].filter((k) => counts[k]);
    chips.replaceChildren(
      ...ids.map((k) => {
        const b = el('button', { type: 'button', 'aria-pressed': String(k === kind) }, k === 'all' ? 'All' : LABEL[k], el('span', {}, String(counts[k])));
        b.addEventListener('click', () => {
          kind = k;
          for (const other of chips.children) other.setAttribute('aria-pressed', String(other === b));
          render();
        });
        return b;
      }),
    );
  }

  async function run(force) {
    status.textContent = 'Loading the history from GitHub…';
    try {
      all = (await load(force)).commits;
      filters();
      render();
    } catch (e) {
      status.textContent = `${e.message} The history is also on GitHub.`;
    }
  }
  search.addEventListener('input', render);
  document.getElementById('commit-refresh').addEventListener('click', () => run(true));
  run(false);
}

init();
