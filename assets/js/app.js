/* ============================================================
   SIR Assist – one-question-per-screen wizard (index.html)
   Data: data/states.json, data/common.json, data/sources.json
   Text: locales/*.json via I18N (keys start with "w.")
   URL:  #s=DL&a=yes.missing.no.a2.none  (state + answer path)
   ============================================================ */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, attrs, html) => { const e = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); } if (html !== undefined) e.innerHTML = html; return e; };
  const esc = s => I18N.esc(s);
  const h = (k, v) => I18N.h(k, v);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const TODAY_ISO = today.toISOString().slice(0, 10);

  const D = { states: null, common: null, sources: null, linkStatus: {} };
  const S = { s: null, a: [] };

  /* ---------- url state ---------- */
  function readHash() {
    const p = new URLSearchParams(location.hash.replace(/^#/, ''));
    const s = p.get('s');
    S.s = s && D.states && D.states.states.some(x => x.code === s) ? s : null;
    S.a = S.s ? (p.get('a') || '').split('.').filter(Boolean) : [];
  }
  function writeHash() {
    const p = new URLSearchParams();
    if (S.s) p.set('s', S.s);
    if (S.a.length) p.set('a', S.a.join('.'));
    const hh = '#' + p.toString();
    if (location.hash !== hh) history.pushState(null, '', hh);
  }
  const state = () => D.states.states.find(x => x.code === S.s);
  const stateName = st => I18N.t('state.' + st.code);
  const fd = iso => I18N.formatDate(iso);
  const past = iso => iso && iso < TODAY_ISO;
  const daysLeft = iso => Math.round((new Date(iso + 'T00:00:00') - today) / 86400000);

  function effectiveStatus(st) {
    const sir = st.sir || {};
    if (!sir.phase) return sir.status || 'not_scheduled';
    if (sir.status === 'special_revision' || sir.status === 'not_scheduled') return sir.status;
    if (sir.final_roll_date && past(sir.final_roll_date) || sir.final_published) return 'final_published';
    if (sir.claims_end && past(sir.claims_end)) return 'claims_closed';
    if (sir.draft_published && sir.draft_published <= TODAY_ISO) return 'claims_open';
    if (sir.enumeration_start && sir.enumeration_start <= TODAY_ISO) return 'enumeration';
    if (sir.enumeration_start && sir.enumeration_start > TODAY_ISO) return 'scheduled';
    return sir.status || 'unknown';
  }
  const STATUS_PILL = { not_scheduled: 'info', special_revision: 'info', scheduled: 'info', enumeration: 'warn', claims_open: 'danger', claims_closed: 'warn', final_published: 'ok', unknown: 'info' };
  const inSIR = stt => ['claims_open', 'claims_closed', 'final_published'].includes(stt); /* draft exists: SIR rules (declaration, mapping, age-based documents) apply */
  const phaseClass = s => { const sir = s.sir || {}; if (sir.status === 'special_revision') return 'sr'; return 'p' + (sir.phase || 0); };

  /* ---------- "Source: link" line ---------- */
  function shortName(s) {
    const u = s.url || '', p = s.publisher || '';
    if (/pib\.gov\.in/.test(u)) return 'PIB';
    if (/newsonair/.test(u)) return 'Akashvani News';
    if (/sci\.gov\.in/.test(u)) return 'Supreme Court';
    if (/indiacode/.test(u)) return 'RP Act 1950';
    if (/s3waas/.test(u)) return 'Registration of Electors Rules 1960';
    if (/nalsa/.test(u)) return 'NALSA';
    if (/kerala\.gov\.in\/uploads\/sir/.test(u)) return 'ECI SIR order';
    if (/ceoandaman.*Enumeration/.test(u)) return 'ECI Enumeration Form';
    if (/^Chief Electoral Officer, /.test(p)) return 'CEO ' + p.replace('Chief Electoral Officer, ', '');
    if (/electoralsearch/.test(u)) return 'ECI electoral search';
    if (/voters\.eci/.test(u)) return "ECI Voters' Services Portal";
    if (/ecinet/.test(u)) return 'ECINET';
    if (/eci\.gov\.in/.test(u)) return 'ECI';
    return p || u;
  }
  function src(ids) {
    ids = (ids || []).filter((x, i, a) => a.indexOf(x) === i);
    if (!ids.length) return '';
    let latestCheck = null;
    const links = ids.map(id => {
      const s = D.sources[id]; if (!s) return esc(id);
      if (s.verified_on && (!latestCheck || s.verified_on > latestCheck)) latestCheck = s.verified_on;
      const ls = D.linkStatus[s.url];
      const tip = s.title + (ls && ls.last_modified ? ' · ' + I18N.t('src.lastModified', { d: ls.last_modified }) : '');
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' + esc(tip) + '">' + esc(shortName(s)) + (s.official_date ? ', ' + esc(fd(s.official_date)) : '') + '</a>';
    }).join(' · ');
    let chk = '';
    if (latestCheck) {
      const age = Math.round((today - new Date(latestCheck + 'T00:00:00')) / 86400000);
      chk = ' <span class="chk' + (age > 45 ? ' stale' : '') + '">(' + h('w.checked', { d: fd(latestCheck) }) + ')</span>';
    }
    return '<p class="src">' + h('w.source') + ' ' + links + chk + '</p>';
  }

  /* ---------- decision tree ----------
     Each node: { q: i18n key, hint?: key, links?: fn(ctx)->[{url,label,src}], one?: bool, opts: [[value, labelKey, subKey, next]] }
     next = node id, 'r:<result>' or fn(ctx)->id */
  const NODES = {
    epic: {
      q: 'w.q.epic', hint: 'w.q.epicHint',
      opts: [
        ['yes', 'w.o.yes', 'w.o.yesSub', 'check'],
        ['no', 'w.o.never', 'w.o.neverSub', ctx => inSIR(ctx.stt) ? 'map' : (ctx.stt === 'enumeration' ? 'r:newEnum' : 'r:form6normal')],
        ['u18', 'w.o.u18', 'w.o.u18Sub', 'r:under18'],
        ['nri', 'w.o.nri', 'w.o.nriSub', 'r:nri']
      ]
    },
    check: {
      q: 'w.q.check', hint: 'w.q.checkHint',
      links: ctx => checkLinks(ctx),
      opts: [
        ['ok', 'w.o.ok', 'w.o.okSub', 'r:ok'],
        ['wrong', 'w.o.wrong', 'w.o.wrongSub', 'wrong'],
        ['missing', 'w.o.missing', 'w.o.missingSub', ctx => ctx.stt === 'enumeration' ? 'ef' : (inSIR(ctx.stt) ? 'map' : 'r:form6normal')],
        ['dup', 'w.o.dup', 'w.o.dupSub', 'r:dup'],
        ['dead', 'w.o.dead', 'w.o.deadSub', 'r:dead'],
        ['cant', 'w.o.cant', 'w.o.cantSub', 'r:offline']
      ]
    },
    wrong: {
      q: 'w.q.wrong',
      opts: [
        ['details', 'w.o.details', 'w.o.detailsSub', 'r:form8'],
        ['movedIn', 'w.o.movedIn', 'w.o.movedInSub', 'r:form8shift'],
        ['movedOut', 'w.o.movedOut', 'w.o.movedOutSub', ctx => ctx.stt === 'enumeration' ? 'ef' : (inSIR(ctx.stt) ? 'map' : 'r:form6normal')],
        ['lost', 'w.o.lost', 'w.o.lostSub', 'r:form8epic'],
        ['pwd', 'w.o.pwd', 'w.o.pwdSub', 'r:form8pwd']
      ]
    },
    ef: {
      q: 'w.q.ef', hint: 'w.q.efHint',
      links: ctx => [{ url: D.common.links.enum_form_track.url, label: h('w.l.efTrack'), src: ['eci-voters-portal'] }],
      opts: [
        ['yes', 'w.o.efYes', 'w.o.efYesSub', 'r:efWait'],
        ['no', 'w.o.efNo', 'w.o.efNoSub', 'r:efNow'],
        ['unsure', 'w.o.efUnsure', 'w.o.efUnsureSub', 'r:efNow']
      ]
    },
    map: {
      q: 'w.q.map', hint: 'w.q.mapHint',
      links: ctx => [{ url: D.common.links.search_last_sir.url, label: h('w.l.lastSir', { year: ctx.year }), src: ['eci-voters-portal', 'eci-phase2-order'] }],
      opts: [
        ['self', 'w.o.mapSelf', 'w.o.mapSelfSub', 'r:form6sir'],
        ['rel', 'w.o.mapRel', 'w.o.mapRelSub', 'r:form6sir'],
        ['no', 'w.o.mapNo', 'w.o.mapNoSub', 'dob']
      ]
    },
    dob: {
      q: 'w.q.dob', hint: 'w.q.dobHint', one: true,
      opts: [
        ['a1', 'w.o.a1', 'w.o.a1Sub', 'situation'],
        ['a2', 'w.o.a2', 'w.o.a2Sub', 'situation'],
        ['a3', 'w.o.a3', 'w.o.a3Sub', 'situation']
      ]
    },
    situation: {
      q: 'w.q.sit', hint: 'w.q.sitHint',
      opts: [
        ['none', 'w.o.sitNone', 'w.o.sitNoneSub', 'r:form6sir'],
        ['orphan', 'w.o.orphan', 'w.o.orphanSub', 'r:form6sir'],
        ['homeless', 'w.o.homeless', 'w.o.homelessSub', 'r:form6sir'],
        ['married', 'w.o.married', 'w.o.marriedSub', 'r:form6sir'],
        ['abroadBorn', 'w.o.abroadBorn', 'w.o.abroadBornSub', 'r:form6sir'],
        ['nodocs', 'w.o.nodocs', 'w.o.nodocsSub', 'r:form6sir']
      ]
    }
  };
  const ORDER = ['epic', 'check', 'wrong', 'ef', 'map', 'dob', 'situation'];

  function ctxOf() {
    const st = state(); const stt = effectiveStatus(st); const sir = st.sir || {};
    return { st, stt, sir, year: sir.last_sir_year || '2002–2005', name: stateName(st) };
  }
  /* Walk the tree with the stored answers. Returns {node, answers:{nodeId:value}} or {result, answers} */
  function walk(ctx) {
    let id = 'epic'; const answers = {}; let i = 0;
    while (true) {
      if (id.startsWith('r:')) return { result: id.slice(2), answers };
      const node = NODES[id];
      if (i >= S.a.length) return { node: id, answers };
      const opt = node.opts.find(o => o[0] === S.a[i]);
      if (!opt) { S.a = S.a.slice(0, i); return { node: id, answers }; }
      answers[id] = opt[0]; i++;
      id = typeof opt[3] === 'function' ? opt[3](ctx) : opt[3];
    }
  }

  /* ---------- pieces ---------- */
  function checkLinks(ctx) {
    const C = D.common.links, st = ctx.st, L = [];
    L.push({ url: C.electoral_search.url, label: h('w.l.search'), src: ['eci-electoral-search'] });
    if (ctx.stt === 'claims_open' || ctx.stt === 'claims_closed') {
      if (st.eci_code) L.push({ url: C.sir_draft_roll_download.url.replace('{stateCode}', encodeURIComponent(st.eci_code)), label: h('w.l.draftSearch'), src: ['eci-voters-portal'] });
      L.push({ url: st.ceo_sir_url || st.ceo_url, label: h('w.l.ceoDraft', { state: ctx.name }), src: st.ceo_sources });
    } else if (ctx.stt === 'final_published') {
      L.push({ url: st.ceo_sir_url || st.ceo_url, label: h('w.l.ceoFinal', { state: ctx.name }), src: st.ceo_sources });
    } else if (ctx.stt === 'enumeration') {
      L.push({ url: C.enum_form_track.url, label: h('w.l.efTrack'), src: ['eci-voters-portal'] });
    } else {
      L.push({ url: st.ceo_sir_url || st.ceo_url, label: h('w.l.ceo', { state: ctx.name }), src: st.ceo_sources });
    }
    L.push({ url: C.ecinet.url, label: h('w.l.ecinet'), src: ['eci-ecinet'], cls: 'secondary' });
    return L;
  }
  function linkRow(L) {
    return '<div class="links">' + L.map(l => '<a class="btn ' + (l.cls || '') + '" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + l.label + '</a>').join('') + '</div>' + src(L.flatMap(l => l.src || []));
  }
  function formLinks(id) {
    const f = D.common.forms[id]; const L = [];
    if (f.online_url) L.push({ url: f.online_url, label: h('w.l.formOnline', { form: I18N.t('w.f.' + id) }) });
    L.push({ url: D.common.links.ecinet_forms.url, label: h('w.l.formEcinet'), cls: 'secondary' });
    if (f.pdf_url) L.push({ url: f.pdf_url, label: h('w.l.formPdf'), cls: 'secondary' });
    return '<div class="links">' + L.map(l => '<a class="btn ' + (l.cls || '') + '" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + l.label + '</a>').join('') + '</div>';
  }

  function strip(ctx) {
    const sir = ctx.sir, stt = ctx.stt;
    let d = '';
    const add = (k, v) => { if (v) d += '<span>' + h(k) + ' <b>' + esc(v) + '</b></span>'; };
    if (sir.enumeration_start) add('w.d.enum', fd(sir.enumeration_start) + ' – ' + fd(sir.enumeration_end));
    add('w.d.draft', sir.draft_published && fd(sir.draft_published));
    if (sir.claims_end) add('w.d.claims', fd(sir.claims_end) + (stt === 'claims_open' ? ' (' + I18N.t('w.d.daysLeft', { n: daysLeft(sir.claims_end) }) + ')' : ''));
    add('w.d.final', sir.final_roll_date && fd(sir.final_roll_date));
    if (sir.last_sir_year) add('w.d.lastSir', String(sir.last_sir_year));
    const e = el('div', { class: 'strip', role: 'status' });
    e.innerHTML = '<strong>' + esc(ctx.name) + '</strong> <span class="pill ' + STATUS_PILL[stt] + '">' + h('status.' + stt + '.short') + '</span>' + (d ? '<span class="dates">' + d + '</span>' : '') + '<a class="change" href="#">' + h('w.changeState') + '</a>';
    $('.change', e).addEventListener('click', ev => { ev.preventDefault(); S.s = null; S.a = []; writeHash(); render(); });
    return e;
  }
  function stateSources(ctx) {
    let extra = ctx.sir.note ? '<p class="help">' + esc(ctx.sir.note) + '</p>' : '';
    return extra + src(ctx.sir.sources || []);
  }

  /* ---------- screens ---------- */
  function render() {
    const w = $('#wizard'); w.innerHTML = '';
    if (!S.s) { w.appendChild(viewState()); }
    else {
      const ctx = ctxOf();
      w.appendChild(strip(ctx));
      const r = walk(ctx);
      if (r.node) w.appendChild(viewQuestion(ctx, r.node, r.answers));
      else w.appendChild(viewResult(ctx, r.result, r.answers));
    }
    I18N.apply(w);
    const hd = w.querySelector('h1'); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0 });
  }

  function viewState() {
    const c = el('section', { class: 'question' });
    c.innerHTML = '<p class="caption">' + h('w.step', { n: 1 }) + '</p><h1>' + h('w.q.state') + '</h1><p class="hint">' + h('w.q.stateHint') + '</p>';
    const inp = el('input', { class: 'search', type: 'search', placeholder: I18N.t('w.q.stateSearch'), 'aria-label': I18N.t('w.q.stateSearch') });
    const ul = el('ul', { class: 'states' });
    const items = D.states.states.map(s => ({ s, n: stateName(s) })).sort((a, b) => a.n.localeCompare(b.n, I18N.lang));
    const draw = q => {
      ul.innerHTML = '';
      items.filter(({ n }) => !q || n.toLowerCase().includes(q)).forEach(({ s, n }) => {
        const b = el('button', { class: 'opt ' + phaseClass(s), type: 'button' }, '<b>' + esc(n) + '</b><span>' + h('status.' + effectiveStatus(s) + '.short') + '</span>');
        b.addEventListener('click', () => { S.s = s.code; S.a = []; writeHash(); render(); });
        ul.appendChild(el('li', {}, '').appendChild(b).parentNode);
      });
    };
    draw('');
    inp.addEventListener('input', () => draw(inp.value.trim().toLowerCase()));
    c.append(inp, ul);
    return c;
  }

  function crumbs(ctx, answers) {
    const ul = el('ul', { class: 'crumbs', 'aria-label': I18N.t('w.answers') });
    const keys = Object.keys(answers);
    keys.forEach((k, i) => {
      const opt = NODES[k].opts.find(o => o[0] === answers[k]);
      const a = el('a', { href: '#', title: I18N.t('w.change') }, h(opt[1], ctx));
      a.addEventListener('click', ev => { ev.preventDefault(); S.a = S.a.slice(0, i); writeHash(); render(); });
      ul.appendChild(el('li', {}, '').appendChild(a).parentNode);
    });
    return ul;
  }
  function backLink() {
    const a = el('a', { class: 'back', href: '#' }, '‹ ' + h('w.back'));
    a.addEventListener('click', ev => { ev.preventDefault(); if (S.a.length) S.a.pop(); else S.s = null; writeHash(); render(); });
    return a;
  }

  function viewQuestion(ctx, id, answers) {
    const node = NODES[id];
    const c = el('section', { class: 'question' });
    c.appendChild(backLink());
    if (Object.keys(answers).length) c.appendChild(crumbs(ctx, answers));
    let hd = '<p class="caption">' + h('w.step', { n: Object.keys(answers).length + 2 }) + '</p><h1>' + h(node.q, ctx) + '</h1>';
    if (node.hint && I18N.t(node.hint)) hd += '<p class="hint">' + h(node.hint, ctx) + '</p>';
    if (node.links) hd += linkRow(node.links(ctx));
    if (id === 'epic') hd += stateSources(ctx);
    const head = el('div', {}, hd);
    c.appendChild(head);
    const ul = el('ul', { class: 'options' + (node.one ? ' one' : '') });
    node.opts.forEach(o => {
      const b = el('button', { class: 'opt', type: 'button' }, '<b>' + h(o[1], ctx) + '</b>' + (o[2] && I18N.t(o[2]) ? '<span>' + h(o[2], ctx) + '</span>' : ''));
      b.addEventListener('click', () => { S.a.push(o[0]); writeHash(); render(); });
      ul.appendChild(el('li', {}, '').appendChild(b).parentNode);
    });
    c.appendChild(ul);
    return c;
  }

  /* ---------- results ---------- */
  function deadlineBox(ctx) {
    const s = ctx.sir, stt = ctx.stt, state = ctx.name;
    if (stt === 'claims_open') return '<div class="deadline">' + h('w.dl.open', { state, d: fd(s.claims_end), n: daysLeft(s.claims_end) }) + '</div>';
    if (stt === 'claims_closed') return '<div class="deadline warn">' + h('w.dl.closed', { state, d: fd(s.claims_end), f: fd(s.final_roll_date) }) + '</div>';
    if (stt === 'final_published') return '<div class="deadline ok">' + h('w.dl.final', { state, f: fd(s.final_roll_date) }) + '</div>';
    if (stt === 'enumeration') return '<div class="deadline warn">' + h('w.dl.enum', { state, d: fd(s.enumeration_end), draft: fd(s.draft_published) }) + '</div>';
    if (stt === 'scheduled') return '<div class="deadline warn">' + h('w.dl.scheduled', { state, d: fd(s.enumeration_start) }) + '</div>';
    return '<div class="deadline ok">' + h('w.dl.none', { state: ctx.name }) + '</div>';
  }
  const step = (t, body, s) => '<li><h3>' + t + '</h3>' + body + (s ? src(s) : '') + '</li>';
  const P = t => '<p>' + t + '</p>';

  function docsBlock(ctx, age, situation) {
    const C = D.common;
    let b = '<div class="block docs"><h2>' + h('w.docs.title') + '</h2>';
    const rows = { a1: 'w.docs.a1', a2: 'w.docs.a2', a3: 'w.docs.a3' };
    if (age) b += '<div class="deadline warn">' + h(rows[age]) + '</div>';
    else b += '<div class="table-wrap"><table><tr><td>' + h('w.o.a1') + '</td><td>' + h('w.docs.a1') + '</td></tr><tr><td>' + h('w.o.a2') + '</td><td>' + h('w.docs.a2') + '</td></tr><tr><td>' + h('w.o.a3') + '</td><td>' + h('w.docs.a3') + '</td></tr></table></div>';
    b += P(h('w.docs.any'));
    b += '<ol class="doclist">' + C.documents.map(d => '<li>' + h('doc.' + d) + '</li>').join('') + '</ol>';
    b += P(h('w.docs.aadhaar'));
    if (situation === 'abroadBorn') b += '<div class="note">' + h('w.sit.abroadBorn') + '</div>';
    b += src(['ceo-andaman-enum-form', 'eci-phase2-order', 'sc-judgment-2026-05-27', 'newsonair-aadhaar-sc']) + '</div>';
    return b;
  }
  function normalDocsBlock() {
    return '<div class="block docs"><h2>' + h('w.docs.title') + '</h2>' + P(h('w.docs.normal')) + src(['eci-voters-portal', 'rer-1960']) + '</div>';
  }
  function afterBlock() {
    return '<div class="block"><h2>' + h('w.after.title') + '</h2><ol class="steps">' +
      step(h('w.after.1t'), P(h('w.after.1')), ['eci-voters-portal']) +
      step(h('w.after.2t'), P(h('w.after.2')), ['ceo-andaman-enum-form', 'pib-safeguards-2026-07-25']) +
      step(h('w.after.3t'), P(h('w.after.3')), ['rer-1960', 'pib-safeguards-2026-07-25']) +
      step(h('w.after.4t'), P(h('w.after.4')), ['sc-judgment-2026-05-27', 'nalsa-helpline']) +
      '</ol></div>';
  }
  function helpBlock(ctx) {
    const st = ctx.st;
    let b = '<div class="block aside"><h2>' + h('w.help.title') + '</h2><ul class="phones">';
    b += '<li><a href="tel:1950"><b>1950</b></a> – ' + h('w.help.1950') + '</li>';
    b += '<li><a href="tel:18001111950"><b>1800-11-1950</b></a> – ' + h('w.help.national') + '</li>';
    (st.helplines || []).forEach(x => { b += '<li><a href="tel:' + esc(x.number.replace(/[^\d+]/g, '')) + '"><b>' + esc(x.number) + '</b></a> – ' + h('w.help.state', { state: ctx.name }) + (x.note ? ' <span class="help">(' + esc(x.note) + ')</span>' : '') + '</li>'; });
    b += '<li><a href="tel:15100"><b>15100</b></a> – ' + h('w.help.legal') + '</li>';
    b += '</ul>';
    b += '<div class="links"><a class="btn secondary" href="' + esc(D.common.links.book_blo.url) + '" target="_blank" rel="noopener">' + h('w.l.bookBlo') + '</a><a class="btn secondary" href="' + esc(st.ceo_url) + '" target="_blank" rel="noopener">' + h('w.l.ceo', { state: ctx.name }) + '</a></div>';
    b += P('<a href="mailto:complaints@eci.gov.in">complaints@eci.gov.in</a>');
    b += src(['pib-helplines', 'pib-ecinet-launch', 'nalsa-helpline'].concat(st.ceo_sources || [], st.helpline_sources || []));
    b += '</div>';
    return b;
  }
  function otherFormsBlock() {
    const F = D.common.forms;
    let b = '<div class="block aside"><h2>' + h('w.forms.title') + '</h2><ul>';
    ['form6', 'form6a', 'form7', 'form8'].forEach(id => { b += '<li><a href="' + esc(F[id].online_url) + '" target="_blank" rel="noopener"><b>' + h('w.f.' + id) + '</b></a> – ' + h('w.f.' + id + 'Sub') + '</li>'; });
    b += '<li><a href="' + esc(D.common.links.forms_pdf.url) + '" target="_blank" rel="noopener">' + h('w.forms.pdfs') + '</a></li>';
    b += '</ul>' + src(['rer-1960', 'pib-forms-2022', 'eci-voters-portal']) + '</div>';
    return b;
  }

  function viewResult(ctx, id, answers) {
    const c = el('section');
    c.appendChild(backLink());
    c.appendChild(crumbs(ctx, answers));
    const v = { state: ctx.name, year: ctx.year, draft: fd(ctx.sir.draft_published), claimsEnd: fd(ctx.sir.claims_end), final: fd(ctx.sir.final_roll_date), enumEnd: fd(ctx.sir.enumeration_end), qual: fd(ctx.sir.qualifying_date) };
    const R = RESULTS[id](ctx, answers, v);
    const main = '<div><h1>' + R.title + '</h1>' + (R.lead ? '<p class="lead">' + R.lead + '</p>' : '') + (R.deadline === false ? '' : deadlineBox(ctx)) + R.main + '</div>';
    const aside = '<div>' + (R.aside || '') + helpBlock(ctx) + otherFormsBlock() + '</div>';
    const g = el('div', { class: 'result' }, main + aside);
    c.appendChild(g);
    const act = el('div', { class: 'actions no-print' });
    act.appendChild(el('button', { class: 'btn secondary noext', type: 'button', onclick: () => window.print() }, h('w.print')));
    const share = el('button', { class: 'btn secondary noext', type: 'button' }, h('w.copy'));
    share.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); share.textContent = I18N.t('w.copied'); } catch (e) { } });
    act.appendChild(share);
    act.appendChild(el('button', { class: 'btn ghost noext', type: 'button', onclick: () => { S.s = null; S.a = []; writeHash(); render(); } }, h('w.restart')));
    c.appendChild(act);
    return c;
  }

  const RESULTS = {
    ok(ctx, a, v) {
      const stt = ctx.stt; let main = '<ol class="steps">';
      if (stt === 'enumeration') main += step(h('w.r.ok.efT'), P(h('w.r.ok.ef', v)) + linkRow([{ url: D.common.links.enum_form_track.url, label: h('w.l.efTrack'), src: ['eci-voters-portal'] }]), ['pib-phase3-enum-start']);
      if (stt === 'claims_open' || stt === 'claims_closed') main += step(h('w.r.ok.againT'), P(h('w.r.ok.again', v)), ['pib-safeguards-2026-07-25']);
      main += step(h('w.r.ok.keepT'), P(h('w.r.ok.keep')), ['eci-voters-portal']);
      return { title: h('w.r.ok.title'), lead: h('w.r.ok.lead', v), main: main + '</ol>' };
    },
    form8(ctx, a, v) { return form8Result(ctx, v, 'details'); },
    form8shift(ctx, a, v) { return form8Result(ctx, v, 'shift'); },
    form8epic(ctx, a, v) { return form8Result(ctx, v, 'epic'); },
    form8pwd(ctx, a, v) { return form8Result(ctx, v, 'pwd'); },
    dup(ctx, a, v) {
      let main = '<ol class="steps">';
      main += step(h('w.r.dup.1t'), P(h('w.r.dup.1')), ['eci-phase2-order', 'ceo-andaman-enum-form']);
      main += step(h('w.r.dup.2t'), P(h('w.r.dup.2')) + formLinks('form7'), ['rer-1960']);
      main += step(h('w.r.dup.3t'), P(h('w.r.dup.3')), ['ceo-andaman-enum-form']);
      return { title: h('w.r.dup.title'), lead: h('w.r.dup.lead'), main: main + '</ol>' };
    },
    dead(ctx, a, v) {
      let main = '<ol class="steps">';
      main += step(h('w.r.dead.1t'), P(h('w.r.dead.1')) + formLinks('form7'), ['rer-1960', 'pib-safeguards-2026-07-25']);
      main += step(h('w.r.dead.2t'), P(h('w.r.dead.2')), ['pib-safeguards-2026-07-25']);
      return { title: h('w.r.dead.title'), lead: h('w.r.dead.lead'), main: main + '</ol>', deadline: false };
    },
    offline(ctx, a, v) {
      let main = '<ol class="steps">';
      main += step(h('w.r.off.1t'), P(h('w.r.off.1')), ['pib-helplines']);
      main += step(h('w.r.off.2t'), P(h('w.r.off.2')), ['pib-ecinet-launch']);
      main += step(h('w.r.off.3t'), P(h('w.r.off.3', v)), ['pib-bihar-draft', 'pib-phase3-enum-start']);
      return { title: h('w.r.off.title'), lead: h('w.r.off.lead'), main: main + '</ol>' };
    },
    efWait(ctx, a, v) {
      let main = '<ol class="steps">';
      main += step(h('w.r.efw.1t'), P(h('w.r.efw.1')) + linkRow([{ url: D.common.links.enum_form_track.url, label: h('w.l.efTrack'), src: ['eci-voters-portal'] }]));
      main += step(h('w.r.efw.2t'), P(h('w.r.efw.2', v)), ['pib-phase3-enum-start']);
      main += step(h('w.r.efw.3t'), P(h('w.r.efw.3', v)), ['pib-safeguards-2026-07-25']);
      return { title: h('w.r.efw.title'), lead: h('w.r.efw.lead', v), main: main + '</ol>' };
    },
    efNow(ctx, a, v) {
      let main = '<ol class="steps">';
      main += step(h('w.r.efn.1t'), P(h('w.r.efn.1', v)) + linkRow([{ url: D.common.links.voters_portal.url, label: h('w.l.efOnline'), src: ['eci-voters-portal'] }, { url: D.common.links.book_blo.url, label: h('w.l.bookBlo'), src: ['eci-voters-portal'], cls: 'secondary' }, { url: D.common.forms.ef.pdf_url, label: h('w.l.efPdf'), src: ['ceo-andaman-enum-form'], cls: 'secondary' }]), ['pib-phase3-enum-start']);
      main += step(h('w.r.efn.2t'), P(h('w.r.efn.2', v)), ['ceo-andaman-enum-form']);
      main += step(h('w.r.efn.3t'), P(h('w.r.efn.3', v)), ['eci-phase2-order', 'pib-safeguards-2026-07-25']);
      return { title: h('w.r.efn.title'), lead: h('w.r.efn.lead', v), main: main + '</ol>' };
    },
    newEnum(ctx, a, v) {
      let main = '<ol class="steps">';
      main += step(h('w.r.newEnum.1t'), P(h('w.r.newEnum.1', v)) + formLinks('form6'), ['eci-phase2-order', 'rer-1960']);
      main += step(h('w.r.newEnum.2t'), P(h('w.r.newEnum.2', v)), ['eci-phase2-order']);
      return { title: h('w.r.newEnum.title'), lead: h('w.r.newEnum.lead', v), main: main + '</ol>' + docsBlock(ctx, null) + afterBlock() };
    },
    form6normal(ctx, a, v) {
      let main = '<ol class="steps">';
      main += step(h('w.r.f6n.1t'), P(h('w.r.f6n.1')) + formLinks('form6'), ['rer-1960', 'eci-voters-portal']);
      main += step(h('w.r.f6n.2t'), P(h('w.r.f6n.2')), ['eci-voters-portal']);
      main += step(h('w.r.f6n.3t'), P(h('w.r.f6n.3')) + linkRow([{ url: D.common.links.track_status.url, label: h('w.l.track'), src: ['eci-voters-portal'] }]));
      const note = ctx.stt === 'not_scheduled' || ctx.stt === 'scheduled' ? '<div class="note">' + h('w.r.f6n.sirLater', v) + src(['pib-phase3-order']) + '</div>' : '';
      return { title: h('w.r.f6n.title'), lead: h('w.r.f6n.lead', v), main: main + '</ol>' + note + normalDocsBlock() + afterBlock() };
    },
    form6sir(ctx, a, v) {
      const map = a.map, age = a.dob, sit = a.situation;
      let main = '<ol class="steps">';
      main += step(h('w.r.f6s.1t'), P(h('w.r.f6s.1', v)) + formLinks('form6'), ['eci-phase2-order', 'rer-1960', 'pib-phase3-enum-start']);
      const decl = map === 'self' ? h('w.r.f6s.declSelf', v) : map === 'rel' ? h('w.r.f6s.declRel', v) : h('w.r.f6s.declNone', v);
      main += step(h('w.r.f6s.2t'), P(decl), ['ceo-andaman-enum-form', 'eci-phase2-order']);
      main += step(h('w.r.f6s.3t'), P(h('w.r.f6s.3')) + linkRow([{ url: D.common.links.track_status.url, label: h('w.l.track'), src: ['eci-voters-portal'] }]));
      main += '</ol>';
      if (sit && sit !== 'none' && sit !== 'abroadBorn') main += '<div class="note"><b>' + h('w.o.' + sit) + '</b><br>' + h('w.sit.' + sit, v) + src(SIT_SRC[sit]) + '</div>';
      if (map === 'no') main += docsBlock(ctx, age, sit);
      else main += '<div class="note">' + h('w.r.f6s.noDocs') + src(['eci-phase2-order']) + '</div>';
      main += afterBlock();
      return { title: h('w.r.f6s.title'), lead: h('w.r.f6s.lead', v), main };
    },
    under18(ctx, a, v) {
      let main = '<ol class="steps">';
      main += step(h('w.r.u18.1t'), P(h('w.r.u18.1', v)) + formLinks('form6'), ['pib-forms-2022', 'rer-1960']);
      main += step(h('w.r.u18.2t'), P(h('w.r.u18.2', v)), ['eci-phase2-order']);
      const docs = ctx.sir.phase ? docsBlock(ctx, 'a3') : normalDocsBlock();
      return { title: h('w.r.u18.title'), lead: h('w.r.u18.lead', v), main: main + '</ol>' + docs, deadline: false };
    },
    nri(ctx, a, v) {
      let main = '<ol class="steps">';
      main += step(h('w.r.nri.1t'), P(h('w.r.nri.1')) + formLinks('form6a') + linkRow([{ url: D.common.links.form6a_guide.url, label: h('w.l.form6aGuide'), src: ['eci-voters-portal'], cls: 'secondary' }]), ['rer-1960']);
      main += step(h('w.r.nri.2t'), P(h('w.r.nri.2', v)), ['ceo-andaman-enum-form', 'pib-phase3-enum-start']);
      main += step(h('w.r.nri.3t'), P(h('w.r.nri.3')), ['rer-1960']);
      return { title: h('w.r.nri.title'), lead: h('w.r.nri.lead'), main: main + '</ol>', deadline: false };
    }
  };
  const SIT_SRC = { orphan: ['ceo-andaman-enum-form', 'sc-judgment-2026-05-27', 'nalsa-helpline'], homeless: ['eci-voters-portal', 'rpa-1950'], married: ['ceo-andaman-enum-form', 'eci-phase2-order'], nodocs: ['ceo-andaman-enum-form', 'sc-judgment-2026-05-27'], abroadBorn: ['ceo-andaman-enum-form'] };

  function form8Result(ctx, v, kind) {
    let main = '<ol class="steps">';
    main += step(h('w.r.f8.1t'), P(h('w.r.f8.' + kind, v)) + formLinks('form8'), ['rer-1960', 'pib-forms-2022']);
    main += step(h('w.r.f8.2t'), P(h('w.r.f8.docs.' + kind)), ['eci-voters-portal']);
    main += step(h('w.r.f8.3t'), P(h('w.r.f8.3')) + linkRow([{ url: D.common.links.track_status.url, label: h('w.l.track'), src: ['eci-voters-portal'] }]));
    main += '</ol>';
    if (kind === 'shift' && ctx.sir.phase) main += '<div class="note">' + h('w.r.f8.shiftSir', v) + src(['eci-phase2-order']) + '</div>';
    return { title: h('w.r.f8.title'), lead: h('w.r.f8.lead.' + kind, v), main };
  }

  /* ---------- tools ---------- */
  function initTools() {
    const root = document.documentElement;
    let size = 18; try { size = parseInt(localStorage.getItem('fontSize')) || 18; } catch (e) { }
    const applySize = () => { root.style.setProperty('--base-size', size + 'px'); try { localStorage.setItem('fontSize', size); } catch (e) { } };
    applySize();
    $('#font-plus') && $('#font-plus').addEventListener('click', () => { size = Math.min(26, size + 2); applySize(); });
    $('#font-minus') && $('#font-minus').addEventListener('click', () => { size = Math.max(14, size - 2); applySize(); });
    const ct = $('#contrast-toggle');
    let hc = false; try { hc = localStorage.getItem('contrast') === 'high'; } catch (e) { }
    const applyC = () => { if (hc) root.setAttribute('data-contrast', 'high'); else root.removeAttribute('data-contrast'); ct && ct.setAttribute('aria-pressed', String(hc)); try { localStorage.setItem('contrast', hc ? 'high' : 'normal'); } catch (e) { } };
    applyC();
    ct && ct.addEventListener('click', () => { hc = !hc; applyC(); });
  }

  /* ---------- boot ---------- */
  async function boot() {
    initTools();
    const base = I18N.base();
    const [states, common, sources] = await Promise.all([I18N.fetchJSON(base + 'data/states.json'), I18N.fetchJSON(base + 'data/common.json'), I18N.fetchJSON(base + 'data/sources.json')]);
    D.states = states; D.common = common; D.sources = sources.sources;
    try { const ls = await I18N.fetchJSON(base + 'data/link-status.json'); D.linkStatus = ls.links || {}; } catch (e) { }
    await I18N.ready;
    const upd = () => { $('#site-updated') && ($('#site-updated').textContent = I18N.formatDate(states.generated)); const fr = $('#footer-repo'); if (fr && /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(common.repo_url || '')) fr.href = common.repo_url.replace(/\/$/, '') + '/issues'; };
    upd(); readHash(); render();
    window.addEventListener('popstate', () => { readHash(); render(); });
    document.addEventListener('i18n:changed', () => { render(); upd(); });
  }
  if (document.getElementById('wizard')) boot().catch(e => { console.error(e); const w = document.getElementById('wizard'); if (w) w.innerHTML = '<div class="banner danger"><p>Could not load data files. If you opened this file directly from disk, serve it over HTTP (for example <code>python3 -m http.server</code>) or use the GitHub Pages URL.</p></div>'; });
  window.SIRApp = { D, S, effectiveStatus, NODES };
})();
