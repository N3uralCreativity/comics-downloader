// The Plus page's working model of Copy reading lists. It builds the same markup as the extension's
// page (src/ui/views/lists.tsx) and uses its styles (lists-demo.css, generated from the panel's), so
// it looks and reads exactly like it. Only the copy itself is acted out: a sample list, found the
// ways real copies find series, and nothing leaves the page.

(() => {
  const root = document.getElementById('copy-demo');
  if (!root) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The extension's sites for list copies, as its listSites() answers (2026-11-22): id, name, the
  // statuses the site keeps, seconds per series to read and to add, and e(xact ids), b(atch adds).
  const SITES = [
    ['atsumaru', 'Atsumaru', 'reading rereading planned completed onhold dropped', 0.5, 1, 'eb'],
    ['mangadex', 'MangaDex', 'reading rereading planned completed onhold dropped', 0.02, 2.7, 'e'],
    ['mangaball', 'Mangaball', 'reading rereading planned completed onhold dropped', 0.03, 2.7, 'e'],
    ['toonkotsu', 'Toonkotsu', 'reading planned completed onhold dropped', 0.5, 2.7, 'e'],
    ['chikari', 'chikari.moe', 'reading rereading planned completed onhold dropped', 0.5, 2.7, 'e'],
    ['manhuaplus', 'ManhuaPlus', '', 0.02, 2.7, ''],
    ['manhwanex', 'Manhwanex', '', 0.02, 2.7, ''],
    ['mangaread', 'MangaRead', '', 0.02, 2.7, ''],
    ['manhuahot', 'Manhua Hot', '', 0.02, 2.7, ''],
    ['aquamanga', 'Aqua Manga', '', 0.02, 2.7, ''],
    ['mangamikan', 'MangaMikan', '', 0.01, 2.7, ''],
    ['mangacherri', 'MangaCherri', '', 0.01, 2.7, ''],
    ['mangaberri', 'MangaBerri', 'reading planned completed dropped', 0.02, 3.2, ''],
    ['manhwa18', 'Manhwa18', '', 0.02, 2.7, ''],
    ['mangadna', 'MangaDNA', '', 0.02, 2.7, ''],
    ['mangatown', 'MangaTown', 'reading completed onhold planned', 0.05, 3, ''],
    ['mangak', 'MangaK', 'reading planned completed dropped', 0.03, 2.2, 'e'],
    ['manganato', 'MangaNato', '', 0.02, 3.2, ''],
    ['mangahub', 'MangaHub', '', 0.01, 2.2, ''],
    ['qiscans', 'Qi Scans', 'reading planned completed onhold dropped', 0.01, 2.2, ''],
    ['weebcentral', 'Weeb Central', 'reading planned completed onhold dropped', 0.05, 2.7, ''],
    ['omegascans', 'Omega Scans', 'reading planned completed dropped', 0.01, 2.2, ''],
    ['rawkuma', 'Rawkuma', 'reading planned completed dropped', 0.1, 3.2, ''],
    ['nihonkuni', 'NihonKuni', '', 0.02, 2.7, ''],
    ['rawdevart', 'Rawdevart', '', 0.02, 2.7, ''],
    ['manhuabuddy', 'ManhuaBuddy', '', 0.01, 2.7, ''],
  ].map(([id, name, statuses, read, add, flags]) => ({ id, name, statuses: statuses ? statuses.split(' ') : [], cost: { read, add }, exact: flags.includes('e'), batch: flags.includes('b') }));
  const SVG_ICONS = new Set(['chikari', 'mangadex', 'mangahub']);
  const LIGHT_ICONS = new Set(['mangatown']);

  // A sample list: status, and how the target site finds each series (by tracker id, by title only,
  // not at all, or already there). Title-only matches carry the target's own title.
  const LIST = [
    ['Solo Leveling', 'completed', 'found'],
    ['Kagurabachi', 'reading', 'found'],
    ['Dandadan', 'reading', 'found'],
    ['One Piece', 'reading', 'exists'],
    ['Sousou no Frieren', 'reading', 'confirm', 'Frieren: Beyond Journey’s End'],
    ['Blue Lock', 'planned', 'found'],
    ['Omniscient Reader', 'planned', 'confirm', 'Omniscient Reader’s Viewpoint'],
    ['The Infinite Mage', 'planned', 'missing', ['The Infinite Mage (Official)']],
    ['Chainsaw Man', 'onhold', 'found'],
    ['Kaiju No. 8', 'completed', 'found'],
    ['Tokyo Ghoul', 'dropped', 'found'],
    ['Berserk', 'onhold', 'found'],
    ['Vinland Saga', 'reading', 'found'],
    ['A Returner’s Magic Should Be Special', 'planned', 'missing', []],
  ].map(([title, status, state, extra]) => ({ title, status, state, found: typeof extra === 'string' ? extra : undefined, options: Array.isArray(extra) ? extra : [] }));

  const STATUSES = ['reading', 'rereading', 'planned', 'onhold', 'completed', 'dropped'];
  const STATUS = { reading: 'Reading', rereading: 'Re-reading', planned: 'Plan to read', onhold: 'On hold', completed: 'Completed', dropped: 'Dropped' };
  const SPEEDS = ['Very slow', 'Slow', 'Mildly slow', 'Normal', 'Relatively quick', 'Quick', 'Fast'];
  const speedLevel = (seconds) => {
    const i = [3.2, 2.4, 1.8, 1.2, 0.6, 0.15].findIndex((floor) => seconds >= floor);
    return i < 0 ? 6 : i;
  };
  const duration = (seconds) => {
    if (seconds < 60) return 'under a minute';
    const m = Math.round(seconds / 60);
    return m < 90 ? (m === 1 ? 'about a minute' : `about ${m} minutes`) : `about ${Math.round(m / 60)} hours`;
  };
  const size = (b) => (b < 1024 ? `${Math.round(b)} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);
  const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const n1 = (n, one, other) => (n === 1 ? one : other.replace('#', n));

  const SVG = 'http://www.w3.org/2000/svg';
  function h(tag, attrs, ...kids) {
    const svg = ['svg', 'path', 'line', 'polyline'].includes(tag);
    const e = svg ? document.createElementNS(SVG, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs ?? {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'checked' || k === 'value' || k === 'disabled' || k === 'open') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    e.append(...kids.flat().filter((k) => k != null && k !== false));
    return e;
  }
  // The extension's icons: one 16px grid, 1.5px stroke.
  const icon = (d) => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, h('path', { d }));
  const CHECK = 'M3 8.5l3.2 3L13 4.5';
  const CHEVRON = 'M6 3.5L10.5 8 6 12.5';

  const siteIcon = (s) =>
    h('img', { class: `site-icon${LIGHT_ICONS.has(s.id) ? ' on-dark' : ''}`, src: `assets/lists/${s.id}.${SVG_ICONS.has(s.id) ? 'svg' : 'webp'}`, alt: '', width: 28, height: 28 });
  const meter = (seconds) => {
    const level = speedLevel(seconds);
    return h('span', { class: 'meter', title: 'Estimated speed, from the requests this site needs per series' },
      h('span', { class: 'ticks', 'aria-hidden': 'true' }, ...Array.from({ length: 7 }, (_, i) => h('i', { 'data-on': i <= level }))),
      h('span', { class: 'speed' }, SPEEDS[level]));
  };
  const tags = (s, role) => [s.statuses.length ? n1(s.statuses.length, '1 status', '# statuses') : 'One list', ...(s.exact ? ['Exact matches'] : []), ...(role === 'to' && s.batch ? ['Adds all at once'] : [])].join(' · ');

  // The model's state: the extension's phases, and what each step picked.
  const s = { phase: 'idle', from: '', to: '', open: { from: false, to: false }, filter: { from: '', to: '' }, picked: new Set(), seriesFilter: '', keep: {}, folds: {}, done: 0, total: 0, current: '', timer: 0 };
  const site = (id) => SITES.find((x) => x.id === id);
  const page = root.querySelector('.view');
  const routeLine = () => h('p', { class: 'route-line' }, h('b', {}, site(s.from).name), h('span', { class: 'arrow', 'aria-hidden': 'true' }), h('b', {}, site(s.to).name));
  const tiles = (list) => h('div', { class: 'tiles' }, ...list.map(([n, label, tone]) => h('div', { class: 'tile', 'data-tone': tone }, h('span', { class: 'num' }, String(n)), h('span', {}, label))));
  // Folds keep whether the reader opened them, across redraws.
  const fold = (key, summary, open, ...kids) =>
    h('details', { class: 'fold', open: s.folds[key] ?? open, ontoggle: (e) => (s.folds[key] = e.currentTarget.open) }, h('summary', {}, icon(CHEVRON), summary), ...kids);
  const chosen = () => LIST.filter((_, i) => s.picked.has(i));

  function card(c, role, checked, onclick) {
    return h('button', { type: 'button', role: 'radio', class: 'site-card', 'aria-checked': String(checked), onclick },
      siteIcon(c), h('span', { class: 'name' }, c.name), checked && h('span', { class: 'picked', 'aria-hidden': 'true' }, icon(CHECK)),
      meter(role === 'from' ? c.cost.read : c.cost.add), h('span', { class: 'tags' }, tags(c, role)));
  }

  function picker(role) {
    const label = role === 'from' ? 'Copy from' : 'Copy to';
    const value = s[role];
    const cards = SITES.filter((x) => role === 'from' || x.id !== s.from).sort((a, b) => a.name.localeCompare(b.name));
    const picked = cards.find((c) => c.id === value);
    const set = (id) => {
      s[role] = id;
      s.open[role] = false;
      s.filter[role] = '';
      if (role === 'from' && id === s.to) s.to = '';
      render();
    };
    if (picked && !s.open[role])
      return h('fieldset', { class: 'picker' }, h('legend', {}, label),
        h('div', { class: 'picked-row', role: 'radiogroup', 'aria-label': label },
          card(picked, role, true, () => ((s.open[role] = true), render())),
          h('button', { type: 'button', class: 'btn quiet', onclick: () => ((s.open[role] = true), render()) }, 'Change')));
    const q = s.filter[role].trim().toLowerCase();
    const shown = cards.filter((c) => c.name.toLowerCase().includes(q));
    const search = h('input', { type: 'search', placeholder: 'Find a site', 'aria-label': `${label}: Find a site`, value: s.filter[role] });
    search.addEventListener('input', () => {
      s.filter[role] = search.value;
      render();
      const again = root.querySelector(`input[aria-label="${label}: Find a site"]`);
      again?.focus();
      again?.setSelectionRange(again.value.length, again.value.length);
    });
    return h('fieldset', { class: 'picker' }, h('legend', {}, label), search,
      h('div', { class: 'cards', role: 'radiogroup', 'aria-label': label }, ...shown.map((c) => card(c, role, c.id === value, () => set(c.id))), !shown.length && h('p', { class: 'help' }, 'No site by that name.')));
  }

  function pick() {
    const from = site(s.from);
    const to = site(s.to);
    return [
      h('div', { class: 'pickers' }, picker('from'), picker('to')),
      from && to && h('section', { class: 'route', 'aria-label': 'The copy' },
        h('div', { class: 'ends' }, h('span', { class: 'end' }, siteIcon(from), h('b', {}, from.name)), h('span', { class: 'line', 'aria-hidden': 'true' }), h('span', { class: 'end' }, siteIcon(to), h('b', {}, to.name))),
        h('dl', { class: 'facts' },
          h('div', {}, h('dt', {}, 'Reading the list'), h('dd', {}, meter(from.cost.read))),
          h('div', {}, h('dt', {}, 'Adding each series'), h('dd', {}, meter(to.cost.add))),
          h('div', {}, h('dt', {}, 'Statuses kept'), h('dd', {}, to.statuses.length ? to.statuses.map((x) => STATUS[x]).join(', ') : 'One list: every series goes into it'))),
        (from.id === 'mangadex' || to.id === 'mangadex') && h('p', { class: 'help' }, 'For MangaDex, the extension reads your sign-in from your open MangaDex tab, keeps it in memory for this copy and sends it only to MangaDex.'),
        h('p', { class: 'help' }, 'Sign in on both sites in this browser first. The copy runs through your own tabs of them, opened in the background when none is open.'),
        h('p', { class: 'help' }, 'A copy only adds series. Nothing already on the target site is changed or removed.'),
        h('div', { class: 'act' }, h('button', { class: 'btn primary', type: 'button', onclick: () => run('reading') }, 'Read the list'))),
    ];
  }

  function choose() {
    const to = site(s.to);
    const set = (indexes, on) => {
      for (const i of indexes) on ? s.picked.add(i) : s.picked.delete(i);
      render();
    };
    const q = s.seriesFilter.trim().toLowerCase();
    const visible = LIST.flatMap((e, i) => (!q || e.title.toLowerCase().includes(q) ? [i] : []));
    const search = h('input', { type: 'search', placeholder: 'Find a series', 'aria-label': 'Find a series', value: s.seriesFilter });
    search.addEventListener('input', () => {
      s.seriesFilter = search.value;
      render();
      const again = root.querySelector('input[aria-label="Find a series"]');
      again?.focus();
      again?.setSelectionRange(again.value.length, again.value.length);
    });
    return h('section', { class: 'lists-step choose-step' },
      routeLine(),
      h('p', { class: 'help' }, `${LIST.length} series on ${site(s.from).name}. Pick what to copy:`),
      !to.statuses.length && h('p', { class: 'note' }, `${to.name} keeps one list, so every series you pick goes into it.`),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Pick by status' },
        ...STATUSES.filter((st) => LIST.some((e) => e.status === st)).map((st) => {
          const group = LIST.flatMap((e, i) => (e.status === st ? [i] : []));
          const on = group.filter((i) => s.picked.has(i)).length;
          return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(on === group.length), 'data-some': on > 0 && on < group.length, onclick: () => set(group, on !== group.length) },
            h('span', {}, STATUS[st]), h('span', { class: 'num' }, `${on}/${group.length}`));
        })),
      h('div', { class: 'series-tools' }, search,
        h('button', { type: 'button', class: 'btn quiet', onclick: () => set(visible, true) }, 'Select all'),
        h('button', { type: 'button', class: 'btn quiet', onclick: () => set(visible, false) }, 'Select none'),
        h('span', { class: 'num', role: 'status' }, `${s.picked.size} of ${LIST.length} picked`)),
      h('div', { class: 'series-grid' },
        ...visible.map((i) => {
          const e = LIST[i];
          const on = s.picked.has(i);
          return h('label', { class: 'series-card', 'data-on': on },
            h('input', { type: 'checkbox', checked: on, onchange: (ev) => set([i], ev.currentTarget.checked) }),
            h('span', { class: 'cover letter', 'aria-hidden': 'true' }, e.title.slice(0, 1).toUpperCase()),
            h('span', { class: 'title' }, e.title), h('span', { class: 'status' }, STATUS[e.status]));
        }),
        !visible.length && h('p', { class: 'help' }, 'No series by that name.')),
      h('div', { class: 'choose-foot' },
        s.picked.size > 0 && h('p', { class: 'help' }, `${s.picked.size} series: ${duration(s.picked.size * to.cost.add)}`),
        h('div', { class: 'act' },
          h('button', { class: 'btn primary', type: 'button', disabled: !s.picked.size, onclick: () => run('planning') }, `Find them on ${to.name}`),
          h('button', { class: 'btn quiet', type: 'button', onclick: cancel }, 'Cancel'))));
  }

  function review() {
    const to = site(s.to);
    const items = chosen();
    const at = (state) => items.filter((e) => e.state === state);
    const adding = at('found').length + Object.values(s.keep).filter(Boolean).length;
    return h('section', { class: 'lists-step' },
      routeLine(),
      tiles([[at('found').length, 'Matched by tracker id', 'accent'], [at('confirm').length, 'Matched by title: check them'], [at('missing').length, 'Not found'], [at('exists').length, 'Already on your list']]),
      at('confirm').length > 0 && fold('confirm', n1(at('confirm').length, '1 matched by title only: check it', '# matched by title only: check them'), true,
        ...at('confirm').map((e) => {
          const id = `cd-c${LIST.indexOf(e)}`;
          return h('div', { class: 'check' },
            h('input', { id, type: 'checkbox', checked: !!s.keep[e.title], onchange: (ev) => ((s.keep[e.title] = ev.currentTarget.checked ? e.found : null), render()) }),
            h('label', { for: id }, e.title, h('span', { class: 'help' }, ` as ${e.found}`)));
        })),
      at('missing').length > 0 && fold('missing', `${n1(at('missing').length, '1 not found', '# not found')} on ${to.name}`, false,
        ...at('missing').map((e) => {
          const id = `cd-m${LIST.indexOf(e)}`;
          const select = h('select', { id, onchange: (ev) => ((s.keep[e.title] = ev.currentTarget.value || null), render()) },
            h('option', { value: '' }, e.options.length ? 'Leave out' : 'No results, left out'), ...e.options.map((o) => h('option', { value: o }, o)));
          select.value = s.keep[e.title] ?? '';
          return h('div', { class: 'field' }, h('label', { for: id }, e.title), select);
        })),
      adding > 0 && h('p', { class: 'help' }, `${adding} series: ${duration(adding * to.cost.add)}`),
      h('div', { class: 'act' },
        h('button', { class: 'btn primary', type: 'button', disabled: !adding, onclick: () => run('writing') }, `Add ${adding} series to ${to.name}`),
        h('button', { class: 'btn quiet', type: 'button', onclick: cancel }, 'Cancel')));
  }

  /** The step's traffic, drawn like the extension's graph: moving forward, grid scrolling with it. */
  function graph(label) {
    const H = 128;
    const PX = 6;
    const GRID = 32;
    const w = Math.max(120, Math.round(page.clientWidth - 26));
    const samples = s.samples;
    const end = samples.at(-1)?.t ?? 0;
    const x = (t) => w - (end - t) * PX;
    const shown = samples.filter((p) => x(p.t) >= -PX);
    const top = Math.max(1, ...shown.map((p) => p.v)) * 1.25;
    const y = (v) => H - (v / top) * (H - 4);
    const points = shown.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`);
    const step = GRID / PX;
    const lines = [];
    for (let t = Math.ceil((end - w / PX) / step) * step; t <= end; t += step) lines.push(h('line', { class: 'grid', x1: x(t), x2: x(t), y1: 0, y2: H }));
    for (let i = 1; i <= Math.floor(H / GRID); i++) lines.push(h('line', { class: 'grid', x1: 0, x2: w, y1: H - i * GRID, y2: H - i * GRID }));
    const now = samples.at(-1)?.v;
    return h('figure', { class: 'graph' },
      h('svg', { width: w, height: H, viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': now === undefined ? label : `Speed: ${size(now)}/s` },
        ...lines,
        shown.length > 1 && h('path', { class: 'area', d: `M${x(shown[0].t).toFixed(1)},${H} L${points.join(' L')} L${x(end).toFixed(1)},${H} Z` }),
        points.length > 1 && h('polyline', { class: 'line', points: points.join(' ') }),
        now !== undefined && h('line', { class: 'now', x1: 0, x2: w, y1: y(now), y2: y(now) })),
      now !== undefined && h('figcaption', { class: 'speed' }, `Speed: ${size(now)}/s`),
      !samples.length && h('span', { class: 'waiting' }, label));
  }

  function progress() {
    const to = site(s.to);
    const label = s.phase === 'reading' ? `Reading your list from ${site(s.from).name}` : s.phase === 'planning' ? `Looking for each series on ${to.name}` : `Adding to ${to.name}`;
    const left = Math.max(0, s.total - s.done);
    const per = s.phase === 'writing' ? to.cost.add : s.phase === 'reading' ? site(s.from).cost.read : 1;
    return h('section', { class: 'lists-step progress-step' },
      routeLine(),
      h('p', { class: 'phase', role: 'status' }, label, s.total > 0 && h('span', { class: 'num' }, ` · ${Math.floor((s.done / s.total) * 100)}% complete`)),
      graph(label),
      h('dl', { class: 'facts' },
        h('div', {}, h('dt', {}, 'Name'), h('dd', { class: 'current' }, s.current)),
        h('div', {}, h('dt', {}, 'Time remaining'), h('dd', {}, duration(left * per))),
        h('div', {}, h('dt', {}, 'Series remaining'), h('dd', { class: 'num' }, `${left} of ${s.total}`)),
        h('div', {}, h('dt', {}, 'Transferred'), h('dd', { class: 'num' }, size(s.bytes)))),
      h('div', { class: 'act' }, h('button', { class: 'btn', type: 'button', onclick: cancel }, 'Cancel')));
  }

  function report() {
    const to = site(s.to);
    const items = chosen();
    const added = items.filter((e) => e.state === 'found' || s.keep[e.title]);
    const there = items.filter((e) => e.state === 'exists');
    const left = items.filter((e) => !added.includes(e) && !there.includes(e));
    return h('section', { class: 'lists-step' },
      routeLine(),
      h('p', { class: 'help' }, n1(added.length, `Added 1 series to ${to.name}.`, `Added # series to ${to.name}.`)),
      tiles([[added.length, 'Added', 'accent'], [there.length, 'Already on your list'], [left.length, 'Not copied']]),
      left.length > 0 && fold('left', n1(left.length, '1 not copied', '# not copied'), false, ...left.map((e) => h('p', { class: 'help' }, e.title))),
      h('div', { class: 'act' }, h('button', { class: 'btn', type: 'button', onclick: again }, 'Copy another list')));
  }

  /** Reading, looking up and adding: one series at a time, with the bytes each one moves on the graph. */
  function run(phase) {
    clearInterval(s.timer);
    const items = phase === 'reading' ? LIST : phase === 'planning' ? chosen() : chosen().filter((e) => e.state === 'found' || s.keep[e.title]);
    Object.assign(s, { phase, done: 0, total: items.length, current: '', bytes: 0, samples: [] });
    const per = phase === 'reading' ? 2 : phase === 'planning' ? 3 : 4; // ticks per series, a tick being 250 ms
    let tick = 0;
    const recent = [];
    const step = () => {
      tick++;
      // Requests land in bursts: a search or an add is a few kilobytes, then a pause.
      s.bytes += tick % per === 1 ? 2400 + ((tick * 7919) % 5) * 900 : 150;
      recent.push({ at: tick * 250, bytes: s.bytes });
      while (recent.length > 2 && tick * 250 - recent[0].at > 2000) recent.shift();
      const first = recent[0];
      s.samples.push({ t: tick / 4, v: tick * 250 > first.at ? ((s.bytes - first.bytes) / (tick * 250 - first.at)) * 1000 : 0 });
      if (tick % per === 0) {
        s.done++;
        s.current = items[s.done - 1]?.title ?? '';
      }
      if (s.done >= s.total || still) return finish(phase);
      render();
    };
    render();
    if (still) return finish(phase);
    s.timer = setInterval(step, 250);
  }

  function finish(phase) {
    clearInterval(s.timer);
    if (phase === 'reading') {
      s.phase = 'choose';
      s.picked = new Set(LIST.map((_, i) => i));
    } else if (phase === 'planning') {
      s.phase = 'review';
      s.keep = Object.fromEntries(chosen().filter((e) => e.state === 'confirm').map((e) => [e.title, e.found]));
      s.folds = {};
    } else s.phase = 'done';
    render();
  }

  function cancel() {
    clearInterval(s.timer);
    s.phase = 'idle';
    render();
  }

  function again() {
    Object.assign(s, { phase: 'idle', from: '', to: '', picked: new Set(), seriesFilter: '', keep: {} });
    render();
  }

  function render() {
    const busy = ['reading', 'planning', 'writing'].includes(s.phase);
    const step = s.phase === 'idle' ? 0 : s.phase === 'reading' || s.phase === 'choose' ? 1 : s.phase === 'planning' || s.phase === 'review' ? 2 : s.phase === 'done' ? 4 : 3;
    const scroll = page.querySelector('.scroll')?.scrollTop ?? 0;
    // The same step drawn again: no fade-in, and the reader stays where they were.
    const key = s.phase + (s.from && s.to ? ' route' : '');
    const same = key === s.lastKey;
    const body = step === 0 ? pick() : busy ? progress() : s.phase === 'choose' ? choose() : s.phase === 'review' ? review() : report();
    page.replaceChildren(
      h('div', { class: 'scroll' },
        h('div', { class: 'lists-page', 'data-fill': step === 0 || s.phase === 'choose', 'data-still': same },
          h('header', { class: 'lists-head' }, h('div', {}, h('h1', {}, 'Copy reading lists'), h('p', {}, 'Copy your list from one site to another, every status or only the ones you pick. Nothing goes through the Plus server, and nothing is kept afterwards.'))),
          h('ol', { class: 'lists-steps', 'aria-label': 'Steps' },
            ...['Sites', 'What to copy', 'Check', 'Copy'].map((name, i) => h('li', { 'data-state': i < step ? 'done' : i === step ? 'now' : null, 'aria-current': i === step ? 'step' : null }, name))),
          body)));
    if (same) page.querySelector('.scroll').scrollTop = scroll;
    s.lastKey = key;
  }

  render();
})();
