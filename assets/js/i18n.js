/* ============================================================
   Tiny i18n layer.
   - locales/index.json lists available languages.
   - locales/<code>.json holds flat "key": "string" pairs.
   - English (en) is always loaded as the fallback.
   - Strings may use a safe mini-markup:
       **bold**            -> <strong>
       [text](https://..)  -> <a target=_blank rel=noopener>
       {name}              -> variable substitution
       newline "\n"        -> <br>
     Everything else is HTML-escaped, so locale files are safe.
   - Missing keys fall back to English and get data-untranslated="true"
     so translators can find them.
   ============================================================ */
(function () {
  const I18N = {
    lang: 'en',
    fallback: {},
    strings: {},
    index: [],
    ready: null,
    esc(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    fmt(raw, vars) {
      let s = this.esc(raw);
      if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(this.esc(vars[k]));
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[^\s)]*|[a-z0-9_\-./]+\.html[^\s)]*)\)/g,
        (m, t, u) => '<a href="' + u + '"' + (u.startsWith('http') ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>');
      s = s.replace(/\n/g, '<br>');
      return s;
    },
    has(key) { return key in this.strings || key in this.fallback; },
    raw(key) {
      if (key in this.strings) return this.strings[key];
      if (key in this.fallback) return this.fallback[key];
      return null;
    },
    /* plain text (escaped in HTML contexts by caller) */
    t(key, vars) {
      let s = this.raw(key);
      if (s === null) { console.warn('[i18n] missing key', key); return key; }
      if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(vars[k]);
      return s;
    },
    /* HTML with safe mini-markup */
    h(key, vars) {
      const s = this.raw(key);
      if (s === null) { console.warn('[i18n] missing key', key); return this.esc(key); }
      return this.fmt(s, vars);
    },
    isTranslated(key) { return this.lang === 'en' || key in this.strings; },
    async fetchJSON(path) {
      const r = await fetch(path, { cache: 'no-cache' });
      if (!r.ok) throw new Error('Failed to load ' + path);
      return r.json();
    },
    detect() {
      const q = new URLSearchParams(location.search).get('lang');
      if (q) return q;
      try { const s = localStorage.getItem('lang'); if (s) return s; } catch (e) { }
      return 'en';
    },
    async load(code) {
      const base = this.base();
      if (!this.index.length) {
        try { this.index = await this.fetchJSON(base + 'locales/index.json'); } catch (e) { this.index = [{ code: 'en', name: 'English', native: 'English', complete: true }]; }
      }
      if (!Object.keys(this.fallback).length) this.fallback = await this.fetchJSON(base + 'locales/en.json');
      const known = this.index.some(l => l.code === code);
      code = known ? code : 'en';
      this.strings = code === 'en' ? this.fallback : await this.fetchJSON(base + 'locales/' + code + '.json').catch(() => ({}));
      this.lang = code;
      try { localStorage.setItem('lang', code); } catch (e) { }
      const meta = this.index.find(l => l.code === code) || {};
      document.documentElement.lang = code;
      document.documentElement.dir = meta.rtl ? 'rtl' : 'ltr';
      this.apply(document);
      this.renderPicker();
      document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: code } }));
    },
    base() {
      /* Works both at user.github.io/repo/ and at a custom root. */
      const b = document.querySelector('base[href]');
      if (b) return b.getAttribute('href');
      const p = location.pathname;
      return p.endsWith('/') ? p : p.substring(0, p.lastIndexOf('/') + 1);
    },
    apply(root) {
      root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (this.has(key)) { el.innerHTML = this.h(key); if (!this.isTranslated(key)) el.setAttribute('data-untranslated', 'true'); else el.removeAttribute('data-untranslated'); }
      });
      root.querySelectorAll('[data-i18n-attr]').forEach(el => {
        el.getAttribute('data-i18n-attr').split(';').forEach(pair => {
          const [attr, key] = pair.split(':').map(x => x.trim());
          if (attr && key && this.has(key)) el.setAttribute(attr, this.t(key));
        });
      });
      const title = document.querySelector('title[data-i18n-title]');
      if (title && this.has(title.getAttribute('data-i18n-title'))) title.textContent = this.t(title.getAttribute('data-i18n-title'));
    },
    renderPicker() {
      const sel = document.getElementById('lang-picker');
      if (!sel) return;
      sel.innerHTML = '';
      this.index.forEach(l => {
        const o = document.createElement('option');
        o.value = l.code;
        o.textContent = l.native + (l.complete ? '' : ' (' + this.t('ui.partial') + ')');
        if (l.code === this.lang) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = () => { const u = new URL(location.href); u.searchParams.set('lang', sel.value); history.replaceState(null, '', u); this.load(sel.value); };
    },
    formatDate(iso) {
      if (!iso) return '';
      const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
      if (isNaN(d)) return iso;
      try { return new Intl.DateTimeFormat(this.lang === 'en' ? 'en-IN' : this.lang + '-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d); }
      catch (e) { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d); }
    }
  };
  window.I18N = I18N;
  I18N.ready = new Promise(res => document.addEventListener('DOMContentLoaded', () => I18N.load(I18N.detect()).then(res)));
})();
