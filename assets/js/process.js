/* ============================================================
   process.html + about.html rendering
   ============================================================ */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => I18N.esc(s);
  const today = new Date(); today.setHours(0, 0, 0, 0); const TODAY_ISO = today.toISOString().slice(0, 10);
  const past = iso => iso && iso < TODAY_ISO;
  const D = {};
  const fd = iso => I18N.formatDate(iso);

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
  function srcLinks(ids) {
    return (ids || []).map(id => { const s = D.sources[id]; return s ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' + esc(s.title) + '">' + esc(shortName(s)) + (s.official_date ? ', ' + esc(fd(s.official_date)) : '') + '</a>' : esc(id); }).join(' · ');
  }
  function sourceBlock(ids) {
    ids = (ids || []).filter((x, i, a) => a.indexOf(x) === i);
    if (!ids.length) return '';
    let latest = null; ids.forEach(id => { const s = D.sources[id]; if (s && s.verified_on && (!latest || s.verified_on > latest)) latest = s.verified_on; });
    let chk = '';
    if (latest) { const age = Math.round((today - new Date(latest + 'T00:00:00')) / 86400000); chk = ' <span class="chk' + (age > 45 ? ' stale' : '') + '">(' + I18N.h('w.checked', { d: fd(latest) }) + ')</span>'; }
    return '<p class="src">' + I18N.h('w.source') + ' ' + srcLinks(ids) + chk + '</p>';
  }
  function stName(st) { return I18N.t('state.' + st.code); }
  function phaseClass(s) { const sir = s.sir || {}; if (sir.status === 'special_revision') return 'sr'; return 'p' + (sir.phase || 0); }

  function renderProcess() {
    if (!$('#stages')) return;
    $('#proc-lead-src').innerHTML = sourceBlock(['pib-phase3-enum-start', 'pib-safeguards-2026-07-25']);
    const stages = [
      { k: 'order', dot: '1', src: ['pib-phase3-order'] },
      { k: 'freeze', dot: '2', src: ['eci-phase2-order', 'pib-phase3-order'] },
      { k: 'enum', dot: '3', src: ['pib-phase3-enum-start', 'ceo-andaman-enum-form'] },
      { k: 'draft', dot: '4', src: ['pib-phase3-enum-start', 'newsonair-delhi-draft'] },
      { k: 'claims', dot: '5', src: ['pib-safeguards-2026-07-25', 'pib-phase3-enum-start'] },
      { k: 'notice', dot: '6', src: ['ceo-andaman-enum-form', 'pib-safeguards-2026-07-25'] },
      { k: 'final', dot: '7', src: ['pib-phase3-order'] },
      { k: 'appeal', dot: '8', src: ['pib-safeguards-2026-07-25', 'rpa-1950'] },
      { k: 'after', dot: '9', src: ['rpa-1950'] }
    ];
    $('#stages').innerHTML = stages.map(s => '<li><span class="dot' + (s.k === 'final' ? ' alt' : (s.k === 'notice' || s.k === 'freeze' ? ' warn' : '')) + '" aria-hidden="true">' + s.dot + '</span><h3>' + I18N.h('stage.' + s.k + '.t') + '</h3><div class="when">' + I18N.h('stage.' + s.k + '.when') + '</div><p>' + I18N.h('stage.' + s.k + '.d') + '</p>' + sourceBlock(s.src) + '</li>').join('');

    /* flow */
    $('#flow').innerHTML =
      '<div class="node q">' + I18N.h('flow.q1') + '</div><div class="arrow" aria-hidden="true">↓</div>' +
      '<div class="branch"><div><div class="lbl">' + I18N.h('flow.yes') + '</div><div class="node">' + I18N.h('flow.q1yes') + '</div></div><div><div class="lbl">' + I18N.h('flow.no') + '</div><div class="node bad">' + I18N.h('flow.q1no') + '</div></div></div>' +
      '<div class="arrow" aria-hidden="true">↓</div><div class="node q">' + I18N.h('flow.q2') + '</div><div class="arrow" aria-hidden="true">↓</div>' +
      '<div class="branch"><div><div class="lbl">' + I18N.h('flow.yes') + '</div><div class="node end">' + I18N.h('flow.q2yes') + '</div></div><div><div class="lbl">' + I18N.h('flow.no') + '</div><div class="node">' + I18N.h('flow.q2no') + '</div></div></div>' +
      '<div class="arrow" aria-hidden="true">↓</div><div class="node q">' + I18N.h('flow.q3') + '</div><div class="arrow" aria-hidden="true">↓</div>' +
      '<div class="branch three"><div><div class="lbl">' + I18N.h('flow.q3a') + '</div><div class="node end">' + I18N.h('flow.q3aD') + '</div></div><div><div class="lbl">' + I18N.h('flow.q3b') + '</div><div class="node">' + I18N.h('flow.q3bD') + '</div></div><div><div class="lbl">' + I18N.h('flow.q3c') + '</div><div class="node bad">' + I18N.h('flow.q3cD') + '</div></div></div>' +
      '<div class="arrow" aria-hidden="true">↓</div><div class="node q">' + I18N.h('flow.q4') + '</div><div class="arrow" aria-hidden="true">↓</div>' +
      '<div class="branch"><div><div class="lbl">' + I18N.h('flow.q4a') + '</div><div class="node end">' + I18N.h('flow.q4aD') + '</div></div><div><div class="lbl">' + I18N.h('flow.q4b') + '</div><div class="node">' + I18N.h('flow.q4bD') + '</div></div></div>' +
      '<div class="arrow" aria-hidden="true">↓</div><div class="node end">' + I18N.h('flow.end') + '</div>';

    /* phase grid */
    const grid = $('#phase-grid'); grid.innerHTML = '';
    D.states.states.map(s => ({ s, n: stName(s) })).sort((a, b) => a.n.localeCompare(b.n, I18N.lang)).forEach(({ s, n }) => {
      const stt = effectiveStatus(s);
      grid.insertAdjacentHTML('beforeend', '<a class="state-tile ' + phaseClass(s) + '" href="./#s=' + s.code + '"><span class="nm">' + esc(n) + '</span><span class="st">' + I18N.h('status.' + stt + '.short') + '</span></a>');
    });

    /* phase 3 table */
    const tb = $('#phase-table tbody'); tb.innerHTML = '';
    D.states.states.filter(s => s.sir && s.sir.phase === 3).map(s => ({ s, n: stName(s) })).sort((a, b) => (a.s.sir.final_roll_date || '').localeCompare(b.s.sir.final_roll_date || '') || a.n.localeCompare(b.n)).forEach(({ s, n }) => {
      const x = s.sir; const stt = effectiveStatus(s);
      tb.insertAdjacentHTML('beforeend', '<tr' + (stt === 'claims_open' ? ' class="open-row"' : '') + '><td><a href="./#s=' + s.code + '">' + esc(n) + '</a></td><td>' + esc(fd(x.qualifying_date)) + '</td><td>' + esc(fd(x.enumeration_start)) + ' – ' + esc(fd(x.enumeration_end)) + '</td><td>' + esc(fd(x.draft_published)) + '</td><td>' + esc(fd(x.claims_start)) + ' – ' + esc(fd(x.claims_end)) + '</td><td>' + esc(fd(x.final_roll_date)) + (x.final_published ? ' ✔' : '') + '</td><td>' + I18N.h('status.' + stt + '.short') + '</td><td>' + srcLinks(x.sources) + '</td></tr>');
    });
    const db = $('#done-table tbody'); db.innerHTML = '';
    D.states.states.filter(s => s.sir && (s.sir.phase === 1 || s.sir.phase === 2 || s.sir.status === 'special_revision')).map(s => ({ s, n: stName(s) })).sort((a, b) => (a.s.sir.phase || 9) - (b.s.sir.phase || 9) || a.n.localeCompare(b.n)).forEach(({ s, n }) => {
      const x = s.sir;
      db.insertAdjacentHTML('beforeend', '<tr><td><a href="./#s=' + s.code + '">' + esc(n) + '</a></td><td>' + (x.status === 'special_revision' ? I18N.h('status.special_revision.short') : esc(String(x.phase))) + '</td><td>' + esc(fd(x.qualifying_date)) + '</td><td>' + esc(fd(x.final_roll_date)) + '</td><td>' + srcLinks(x.sources) + '</td></tr>');
    });

    /* FAQ */
    const faq = $('#faq'); faq.innerHTML = D.common.faq.map(f => '<details><summary>' + I18N.h('faq.' + f.id + '.q') + '</summary><div class="body">' + I18N.h('faq.' + f.id + '.a') + sourceBlock(f.sources) + '</div></details>').join('');
  }

  function renderAbout() {
    const list = $('#source-list'); if (!list) return;
    const byPub = {};
    Object.entries(D.sources).forEach(([id, s]) => { (byPub[s.publisher] = byPub[s.publisher] || []).push(s); });
    list.innerHTML = Object.keys(byPub).sort().map(pub => '<h3>' + esc(pub) + '</h3><ul>' + byPub[pub].sort((a, b) => (b.official_date || '').localeCompare(a.official_date || '')).map(s => '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a><span class="help"> — ' + (s.official_date ? I18N.h('src.officialDate', { d: fd(s.official_date) }) + '; ' : '') + (s.verified_on ? I18N.h('src.verifiedOn', { d: fd(s.verified_on) }) : '') + (s.note ? '; ' + esc(s.note) : '') + '</span></li>').join('') + '</ul>').join('');
    const pl = $('#pending-list');
    if (pl) {
      const rows = D.states.states.filter(s => s.sir && s.sir.pending_official_link).map(s => ({ s, n: stName(s) })).sort((a, b) => a.n.localeCompare(b.n, I18N.lang));
      pl.innerHTML = rows.length ? rows.map(({ s, n }) => '<li>' + I18N.h('about.pendingItem', { state: n, claimsEnd: fd(s.sir.claims_end), final: fd(s.sir.final_roll_date) }) + ' <a href="' + esc(s.ceo_sir_url || s.ceo_url) + '" target="_blank" rel="noopener">' + I18N.h('about.pendingCeo', { state: n }) + '</a>' + (s.sir.note ? '<br><span class="help">' + esc(s.sir.note) + '</span>' : '') + '</li>').join('') : '<li>' + I18N.h('about.pendingNone') + '</li>';
    }
    const repo = $('#repo-link'); if (repo) { const u = D.common.repo_url || ''; if (/^https:\/\/github\.com\/[^/]+\/[^/]+/.test(u)) { repo.href = u; repo.hidden = false; } else repo.hidden = true; }
  }

  function initTools() {
    const root = document.documentElement;
    let size = 18; try { size = parseInt(localStorage.getItem('fontSize')) || 18; } catch (e) { }
    const applySize = () => { root.style.setProperty('--base-size', size + 'px'); try { localStorage.setItem('fontSize', size); } catch (e) { } };
    applySize();
    $('#font-plus') && $('#font-plus').addEventListener('click', () => { size = Math.min(26, size + 2); applySize(); });
    $('#font-minus') && $('#font-minus').addEventListener('click', () => { size = Math.max(14, size - 2); applySize(); });
    const ct = $('#contrast-toggle'); let hc = false; try { hc = localStorage.getItem('contrast') === 'high'; } catch (e) { }
    const applyC = () => { if (hc) root.setAttribute('data-contrast', 'high'); else root.removeAttribute('data-contrast'); ct && ct.setAttribute('aria-pressed', String(hc)); try { localStorage.setItem('contrast', hc ? 'high' : 'normal'); } catch (e) { } };
    applyC(); ct && ct.addEventListener('click', () => { hc = !hc; applyC(); });
  }

  async function boot() {
    initTools();
    const base = I18N.base();
    const [states, common, sources] = await Promise.all([I18N.fetchJSON(base + 'data/states.json'), I18N.fetchJSON(base + 'data/common.json'), I18N.fetchJSON(base + 'data/sources.json')]);
    D.states = states; D.common = common; D.sources = sources.sources;
    await I18N.ready;
    const all = () => { renderProcess(); renderAbout(); $('#site-updated') && ($('#site-updated').textContent = fd(states.generated)); const fr = $('#footer-repo'); if (fr && /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(common.repo_url || '')) fr.href = common.repo_url.replace(/\/$/, '') + '/issues'; };
    all();
    document.addEventListener('i18n:changed', all);
  }
  boot().catch(e => console.error(e));
})();
