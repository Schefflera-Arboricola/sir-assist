# Adding a language

1. Copy `en.json` to `<code>.json` where `<code>` is the BCP-47 language code
   (`hi` Hindi, `ta` Tamil, `mr` Marathi, `bn` Bengali, `te` Telugu, `kn` Kannada,
   `ml` Malayalam, `gu` Gujarati, `pa` Punjabi, `or` Odia, `as` Assamese, `ur` Urdu …).
2. Translate the **values** only. Never change the keys.
3. Keep the mini-markup exactly as in English:
   - `**bold**`
   - `[link text](https://…)` — keep the URL identical
   - `{placeholders}` such as `{state}`, `{claimsEnd}` — keep them as they are
   - `\n` for a line break
4. You may leave keys out. Anything missing falls back to English and is marked
   with `data-untranslated="true"` in the page so it is easy to find.
5. Add the language to `index.json`:
   `{ "code": "hi", "name": "Hindi", "native": "हिन्दी", "complete": false }`
   Set `"rtl": true` for right-to-left scripts (Urdu).
6. Open a pull request. `scripts/validate.sh` checks that the JSON is valid.

State names live in the same file under `state.<CODE>` so they get translated too.
