# Contributing

Three kinds of help are most useful:

1. **Date corrections.** The Election Commission changes SIR schedules often. If your state's
   dates are wrong, open an issue with a link to the official page (PIB press note, Akashvani News,
   or your State CEO website) and the date printed on it.
2. **Translations.** See `locales/README.md`.
3. **Ground-truth from your state.** If a State CEO site has a better SIR page, a state helpline
   number, or a 2002/2003 roll search page, open an issue with the URL.


Every fact needs an official source: an ECI order or press note (eci.gov.in / PIB), a State CEO
website, the law text or a court order. If the ECI page is unreachable, a report of the same
announcement by the government broadcaster (Akashvani News / DD News, newsonair.gov.in) is
acceptable. A private newspaper report can help find the official source, but cannot be the source
itself; if you must record a date before the official page is available, say so in the state's note
("press note link still to be added").

Add the source to `data/sources.json` with `official_date` (the date on the page) and
  `verified_on` (today), then reference its id.

Run `bash scripts/validate.sh` before opening a pull request.

Keep language simple. Assume the reader is worried, in a hurry, and on a small phone.
