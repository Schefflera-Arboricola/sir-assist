# SIR Assist

**A plain-language, source-linked guide to India's Special Intensive Revision (SIR) of voter lists.**

> AI-generated, one-person side project. The text, decision tree and state data were written by Claude
> (Anthropic) from the official documents cited on each page. No lawyer or election official has
> checked it. Open the "Source" link before relying on any date.

One question per screen. Pick your state, answer whether you have a voter card, check your
name on the Election Commission's site, and answer a few more questions about your case (moved house,
not in the old roll, born after 2004, orphan, homeless, married woman, NRI, 17 years old...). You get the
exact form with a direct link, the documents you need, your state's deadline, what happens after you
apply, and whom to call. Every fact ends with "Source:" and a link to the official page.

Live site: https://schefflera-arboricola.github.io/sir-assist/

## Principles

- **Official sources, in order of preference** – ECI orders and press notes (eci.gov.in / PIB), State
  Chief Electoral Officer websites, the text of the law and court judgments. When the ECI page cannot
  be reached from outside India, the government broadcaster's report of the same announcement
  (Akashvani News / DD News, Prasar Bharati) is used instead. Private newspapers are not used as
  sources; where a recent extension is known only from a CEO announcement reported in the press, the
  state note says "press note link still to be added".
- **Two dates on everything** – "official page dated" and "checked" (when the page was last fetched and read).
- **Inclusive by default** – large text, keyboard/screen-reader friendly, dark and high-contrast
  modes, printable checklists, no tracking, and a translation system that falls back to English.
- **Static and free to host** – plain HTML/CSS/JS, no build step, runs on GitHub Pages.

## Structure

```
index.html            the guided "check my name" wizard
process.html          visual explanation of the SIR stages and per-state timelines
about.html            methodology and the full source list
assets/js/i18n.js     translation loader (locales/*.json)
assets/js/app.js      decision tree + result pages (NODES / RESULTS)
assets/js/process.js  process/about page rendering
data/states.json      per-state data: CEO website, SIR phase, dates, helplines, source ids
data/common.json      forms (direct links), documents list, FAQ ids, official links
data/sources.json     every source: title, url, publisher, official_date, verified_on
data/link-status.json written by the weekly link-check workflow
locales/en.json       all text; copy to add a language (see locales/README.md)
scripts/validate.sh   data sanity checks (run in CI)
scripts/check_links.sh weekly link health check
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

## Updating a date

This is a solo project maintained with the help of an AI assistant (Claude Code). Data updates are
made by re-reading the official pages and editing the JSON files below.

Edit `data/states.json`, update `verified_on` on the relevant source in `data/sources.json`
(add a new source if the date came from a new press note), bump `generated`, run
`bash scripts/validate.sh`, and open a pull request.
