// The website's script: the developer's notices, the live site count, the site ticker, the panel
// view switcher, and the hero's working model. Every part is optional; the pages read fine without it.

const STATUS_SITE = 'https://status.n3uralcreativity.top';
const STATUS_URL = 'https://gist.githubusercontent.com/N3uralCreativity/d7df8d80e3e844114aa9b90c700e2b84/raw/status.json';
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  e.append(...children);
  return e;
}

/** The same notices the extension's panel shows. */
async function notices() {
  const slot = document.getElementById('notices');
  if (!slot) return;
  const file = await fetch(`${STATUS_SITE}/notices.json`, { cache: 'no-cache' }).then((r) => r.json());
  for (const n of Array.isArray(file?.notices) ? file.notices : []) {
    if (typeof n?.text !== 'string' || (n.until && !(Date.parse(n.until) > Date.now()))) continue;
    const p = el('p', { class: n.kind === 'warn' ? 'site-notice warn' : 'site-notice' }, n.text);
    if (typeof n.link === 'string' && n.link.startsWith('https://')) p.append(' ', el('a', { href: n.link }, 'More'));
    slot.append(p);
  }
}

/** "39 of 42 sites working right now", from the status page's own data. */
async function live() {
  const out = document.getElementById('live-count');
  if (!out) return;
  const status = await fetch(`${STATUS_URL}?t=${Date.now()}`).then((r) => r.json());
  const states = Object.values(status.sites ?? {}).map((s) => s.state);
  const working = states.filter((s) => s === 'up' || s === 'challenge').length;
  if (states.length) out.textContent = `${working} of ${states.length} sites answering right now`;
}

/** The supported sites' own logos, drifting past. A site without one gets its initial. */
function ticker() {
  const box = document.getElementById('ticker');
  const sites = [...document.querySelectorAll('.sites li')].map((li) => ({ name: li.querySelector('a').textContent, logo: li.dataset.logo }));
  if (!box || !sites.length) return;
  const row = el('div');
  // Twice over, so the loop has no seam.
  for (const s of [...sites, ...sites]) {
    const tile = el('span', { class: 'logo' });
    tile.append(s.logo ? el('img', { src: s.logo, alt: '', width: '40', height: '40', loading: 'lazy', decoding: 'async' }) : el('b', {}, s.name), el('span', {}, s.name));
    row.append(tile);
  }
  box.append(row);
  box.hidden = false;
  dock(box, [...row.children]);
}

/**
 * Dock magnification: each logo grows with how close the pointer is (up to 1.6 times, fading out
 * over 160px), and the closest one shows its name. The strip stops while the pointer is on it.
 */
function dock(box, tiles) {
  const REACH = 160;
  const MAX = 0.6;
  let x = null;
  let frame = 0;
  const paint = () => {
    frame = 0;
    let best = null;
    let bestD = Infinity;
    for (const t of tiles) {
      const r = t.getBoundingClientRect();
      if (r.right < -REACH || r.left > innerWidth + REACH) continue;
      const d = x === null ? Infinity : Math.abs(x - (r.left + r.width / 2));
      const grow = still || d >= REACH ? 0 : MAX * Math.cos((d / REACH) * (Math.PI / 2));
      t.style.setProperty('--s', String(1 + grow));
      if (d < bestD) (bestD = d), (best = t);
    }
    for (const t of tiles) t.classList.toggle('near', t === best && bestD < 60);
  };
  const ask = () => (frame ||= requestAnimationFrame(paint));
  box.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX;
    ask();
  });
  box.addEventListener('pointerleave', () => {
    x = null;
    ask();
  });
}

function views() {
  for (const box of document.querySelectorAll('[data-views]')) {
    const tabs = [...box.querySelectorAll('button')];
    const img = box.querySelector('img');
    for (const tab of tabs) {
      tab.addEventListener('click', () => {
        for (const t of tabs) t.setAttribute('aria-selected', String(t === tab));
        img.src = tab.dataset.src;
        img.alt = tab.dataset.alt;
      });
    }
  }
}

/**
 * The hero's model of the extension: tick chapters, press Download, and each chapter's pages pile
 * up and are bound into a volume on the shelf. Real chapters of Welcome to Demon School! Iruma-kun, as
 * MangaDex lists them in English (number, title, date, page count).
 */
function demo() {
  const root = document.getElementById('demo');
  if (!root) return;
  const CHAPTERS = [
    [466, 'Unyielding Conviction', 'Nov 12', 19],
    [465, 'To You, Still Out of Sight', 'Nov 5', 18],
    [464, 'You, Beyond Reach', 'Oct 29', 19],
    [463, 'Delivery', 'Oct 21', 20],
    [462, 'Message', 'Oct 15', 19],
  ];
  const list = root.querySelector('.demo-list');
  const button = root.querySelector('.demo-foot .button');
  const format = root.querySelector('select');
  const shelf = root.querySelector('.shelf');
  const status = root.querySelector('.demo-status');
  const saved = new Set();
  let busy = false;

  list.replaceChildren(
    ...CHAPTERS.map(([n, title, date]) => {
      const box = el('input', { type: 'checkbox', 'aria-label': `Chapter ${n}: ${title}` });
      box.addEventListener('change', refresh);
      return el('li', {}, el('label', { class: 'demo-row', 'data-n': n }, box, el('span', { class: 'n' }, String(n)), el('span', {}, title), el('span', { class: 'm' }, date)));
    }),
  );
  const rows = [...list.querySelectorAll('.demo-row')];
  const picked = () => rows.filter((r) => r.firstChild.checked && !saved.has(r.dataset.n));

  function refresh() {
    for (const r of rows) r.classList.toggle('on', r.firstChild.checked && !saved.has(r.dataset.n));
    const n = picked().length;
    const done = saved.size === rows.length;
    button.disabled = busy || (!n && !done);
    button.textContent = busy ? 'Downloading' : done ? 'Start again' : n ? `Download ${n} chapter${n > 1 ? 's' : ''}` : 'Tick chapters to download';
  }

  function bind(n) {
    const ext = format.value;
    const spine = el('div', { class: 'spine', style: `--h:${128 + (n % 3) * 9}px`, title: `Ch${String(n).padStart(4, '0')}.${ext}` }, el('i'), el('b', {}, String(n)), el('small', {}, ext.toUpperCase()));
    return spine;
  }

  async function download(row) {
    const [n, , , pages] = CHAPTERS.find((c) => String(c[0]) === row.dataset.n);
    const stack = el('div', { class: 'stack' });
    shelf.append(stack);
    for (let p = 1; p <= pages; p++) {
      row.style.setProperty('--p', String(p / pages));
      status.textContent = `Chapter ${n}: page ${p} of ${pages}`;
      if (p % 3 === 0) stack.append(el('i', { class: `sheet${p % 2 ? ' b' : ''}`, style: `--i:${p / 3 - 1};--r:${((p * 7) % 9) - 4}deg` }));
      if (!still) await wait(1500 / pages);
    }
    stack.replaceWith(bind(n));
    saved.add(row.dataset.n);
    row.style.removeProperty('--p');
    row.classList.add('saved');
    row.firstChild.disabled = true;
    row.lastChild.textContent = 'Saved';
    status.textContent = `Saved Ch${String(n).padStart(4, '0')}.${format.value}`;
    refresh();
    if (!still) await wait(350);
  }

  async function run() {
    if (busy) return;
    if (saved.size === rows.length) {
      saved.clear();
      shelf.replaceChildren();
      rows.forEach((r, i) => {
        r.classList.remove('saved');
        r.firstChild.disabled = false;
        r.firstChild.checked = false;
        r.lastChild.textContent = CHAPTERS[i][2];
      });
      status.textContent = '';
      return refresh();
    }
    busy = true;
    refresh();
    // Oldest first, like the extension.
    for (const row of picked().reverse()) await download(row);
    busy = false;
    refresh();
    if (saved.size < rows.length) status.textContent += '. Your turn: tick more chapters.';
  }
  button.addEventListener('click', run);

  // One run on arrival shows what the page is about.
  rows[1].firstChild.checked = rows[2].firstChild.checked = true;
  refresh();
  if (still) run();
  else setTimeout(() => document.visibilityState === 'visible' && !saved.size && run(), 900);
}

/**
 * The Plus page's model of Copy reading lists: the extension's four steps with its own wording, on a
 * sample list. Each series ends the way real ones do: found by tracker id, matched by title only
 * (checked by hand), not found, or already on the target list. Nothing leaves the page.
 */
function copyDemo() {
  const root = document.getElementById('copy-demo');
  if (!root) return;
  const STATUSES = { reading: 'Reading', planned: 'Plan to read', onhold: 'On hold', completed: 'Completed', dropped: 'Dropped' };
  // Title, status, outcome on the target site, and the title found there when matched by title only.
  const LIST = [
    ['Solo Leveling', 'completed', 'id'],
    ['Kagurabachi', 'reading', 'id'],
    ['Dandadan', 'reading', 'id'],
    ['One Piece', 'reading', 'there'],
    ['Sousou no Frieren', 'reading', 'title', 'Frieren: Beyond Journey’s End'],
    ['Blue Lock', 'planned', 'id'],
    ['Omniscient Reader', 'planned', 'title', 'Omniscient Reader’s Viewpoint'],
    ['The Infinite Mage', 'planned', 'missing'],
    ['Chainsaw Man', 'onhold', 'id'],
    ['Kaiju No. 8', 'completed', 'id'],
    ['Tokyo Ghoul', 'dropped', 'id'],
  ];
  const FROM = ['MangaDex', 'Weeb Central', 'Atsumaru', 'MangaHub'];
  const TO = ['Weeb Central', 'MangaDex', 'MangaHub', 'chikari.moe'];
  const body = root.querySelector('.copy-body');
  const next = root.querySelector('[data-next]');
  const back = root.querySelector('[data-back]');
  const steps = [...root.querySelectorAll('.move-steps li')];
  const status = root.querySelector('.demo-status');
  const s = { step: 0, from: FROM[0], to: TO[0], statuses: new Set(Object.keys(STATUSES)), keep: new Set(), busy: false };

  const pick = (label, checked, onChange, extra) => {
    const box = el('input', { type: 'checkbox' });
    box.checked = checked;
    box.addEventListener('change', () => onChange(box.checked));
    return el('label', { class: 'copy-pick' }, box, el('span', {}, label), ...(extra ? [el('span', { class: 'm' }, extra)] : []));
  };
  const bar = (p) => el('div', { class: 'copy-bar' }, el('i', { style: `--p:${p}` }));
  const chosen = () => LIST.filter(([, st]) => s.statuses.has(st));
  const toAdd = () => chosen().filter(([t, , how]) => how === 'id' || (how === 'title' && s.keep.has(t)));

  function show(step) {
    s.step = step;
    steps.forEach((li, i) => (i === step ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current')));
    back.hidden = step === 0 || step === 3;
    render();
  }

  function render() {
    if (s.step === 0) {
      const select = (label, options, key) => {
        const box = el('select', {}, ...options.map((o) => el('option', {}, o)));
        box.value = s[key];
        box.addEventListener('change', () => ((s[key] = box.value), render()));
        return el('label', { class: 'field' }, label, box);
      };
      const same = s.from === s.to;
      body.replaceChildren(
        select('Copy from', FROM, 'from'),
        select('Copy to', TO, 'to'),
        el('p', { class: 'copy-note' }, same ? 'Pick two different sites.' : 'Sign in on both sites in this browser first. The copy runs through your own tabs of them.'),
        el('p', { class: 'copy-note' }, 'A copy only adds series. Nothing already on the target site is changed or removed.'),
      );
      next.disabled = same;
      next.textContent = 'Read the list';
    } else if (s.step === 1) {
      const counts = {};
      for (const [, st] of LIST) counts[st] = (counts[st] ?? 0) + 1;
      body.replaceChildren(
        el('p', { class: 'copy-group' }, `${LIST.length} series on ${s.from}. Pick what to copy:`),
        ...Object.entries(STATUSES).map(([k, label]) => pick(label, s.statuses.has(k), (on) => (on ? s.statuses.add(k) : s.statuses.delete(k), render()), String(counts[k] ?? 0))),
      );
      next.disabled = !chosen().length;
      next.textContent = `Find them on ${s.to}`;
    } else if (s.step === 2) {
      const list = chosen();
      const of = (how) => list.filter((r) => r[2] === how);
      const titled = of('title');
      const missing = of('missing');
      body.replaceChildren(
        el('div', { class: 'copy-tiles' },
          el('div', {}, el('b', {}, String(of('id').length)), 'Matched by tracker id'),
          el('div', {}, el('b', {}, String(of('there').length)), 'Already on your list'),
          el('div', {}, el('b', {}, String(missing.length)), 'Not found'),
        ),
        ...(titled.length ? [el('p', { class: 'copy-group' }, `${titled.length} matched by title only: check ${titled.length === 1 ? 'it' : 'them'}`)] : []),
        ...titled.map(([t, , , found]) => pick(t, s.keep.has(t), (on) => (on ? s.keep.add(t) : s.keep.delete(t), render()), `as ${found}`)),
        ...(missing.length ? [el('p', { class: 'copy-group' }, `${missing.length} not found on ${s.to}`)] : []),
        ...missing.map(([t]) => el('p', { class: 'copy-pick' }, el('span', {}, t), el('span', { class: 'm' }, 'No results, left out'))),
      );
      const n = toAdd().length;
      next.disabled = !n;
      next.textContent = `Add ${n} series to ${s.to}`;
    }
  }

  /** A step's work: the list read, each series looked up, or each one added, one at a time. */
  async function work(label, items, each) {
    s.busy = true;
    next.disabled = back.disabled = true;
    for (const [i, item] of items.entries()) {
      body.replaceChildren(el('p', { class: 'copy-group' }, `${label} · ${i + 1} of ${items.length}`), bar((i + 1) / items.length), el('p', { class: 'copy-note' }, item[0]));
      each?.(item);
      if (!still) await wait(each ? 260 : 90);
    }
    s.busy = false;
    back.disabled = false;
  }

  next.addEventListener('click', async () => {
    if (s.busy) return;
    if (s.step === 0) {
      await work(`Reading your list from ${s.from}`, LIST);
      show(1);
    } else if (s.step === 1) {
      await work(`Looking for each series on ${s.to}`, chosen());
      s.keep = new Set(chosen().filter((r) => r[2] === 'title').map((r) => r[0]));
      show(2);
      status.textContent = 'Untick a match that looks wrong, and it is left out.';
    } else if (s.step === 2) {
      const adding = toAdd();
      const there = chosen().filter((r) => r[2] === 'there').length;
      const left = chosen().length - adding.length - there;
      show(3);
      await work(`Adding to ${s.to}`, adding, ([t, st]) => (status.textContent = `${t}: added as ${STATUSES[st]}`));
      body.replaceChildren(
        el('p', { class: 'copy-group' }, `Added ${adding.length} series to ${s.to}.`),
        el('div', { class: 'copy-tiles' },
          el('div', {}, el('b', {}, String(adding.length)), 'Added'),
          el('div', {}, el('b', {}, String(there)), 'Already on your list'),
          el('div', {}, el('b', {}, String(left)), 'Not copied'),
        ),
        el('p', { class: 'copy-note' }, 'Every series keeps its status. Nothing already on the list was changed.'),
      );
      status.textContent = '';
      next.disabled = false;
      next.textContent = 'Copy another list';
    } else {
      s.statuses = new Set(Object.keys(STATUSES));
      show(0);
    }
  });
  back.addEventListener('click', () => !s.busy && show(s.step - 1));
  show(0);
}

/** The film plays while it is on screen, from the start the first time; never with reduced motion. */
function motion() {
  const v = document.getElementById('motion');
  if (!v || still || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.5 }).observe(v);
}

/** The help page's Linux picker: browser and distribution give the install command. */
function linux() {
  const box = document.getElementById('linux-picker');
  if (!box) return;
  const CMDS = {
    firefox: {
      debian: 'sudo apt update && sudo apt install firefox',
      fedora: 'sudo dnf install firefox',
      arch: 'sudo pacman -S firefox',
      suse: 'sudo zypper install MozillaFirefox',
      flatpak: 'flatpak install flathub org.mozilla.firefox',
      gentoo: 'sudo emerge --ask www-client/firefox',
      void: 'sudo xbps-install -Sy firefox',
      alpine: 'sudo apk add firefox',
      nixos: 'nix-env -iA nixpkgs.firefox   # or add pkgs.firefox to configuration.nix',
    },
    chrome: {
      debian: 'wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && sudo apt install ./google-chrome-stable_current_amd64.deb',
      fedora: 'sudo dnf install https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm',
      arch: 'yay -S google-chrome   # from the AUR (needs an AUR helper)',
      suse: 'sudo zypper install https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm',
      flatpak: 'flatpak install flathub com.google.Chrome',
      gentoo: 'sudo emerge --ask www-client/google-chrome',
      void: "flatpak install flathub com.google.Chrome   # not in Void's repos, so through Flatpak",
      alpine: 'sudo apk add chromium   # Google Chrome needs glibc; Alpine uses musl, so Chromium instead',
      nixos: 'nix-env -iA nixpkgs.google-chrome   # unfree package: needs allowUnfree',
    },
  };
  const out = document.getElementById('linux-cmd');
  const copy = document.getElementById('linux-copy');
  const pick = (attr) => box.querySelector(`[${attr}][aria-checked="true"]`).getAttribute(attr);
  const show = () => (out.textContent = CMDS[pick('data-browser')][pick('data-distro')]);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[role="radio"]');
    if (!b) return;
    for (const other of b.parentElement.querySelectorAll('[role="radio"]')) other.setAttribute('aria-checked', String(other === b));
    show();
  });
  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(out.textContent).catch(() => {});
    copy.textContent = 'Copied';
    setTimeout(() => (copy.textContent = 'Copy'), 1500);
  });
}

demo();
copyDemo();
linux();
motion();
ticker();
views();
notices().catch(() => {});
live().catch(() => {});
