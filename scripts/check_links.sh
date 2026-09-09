#!/usr/bin/env bash
# Fetches every URL in data/sources.json and data/states.json, records HTTP
# status + Last-Modified header into data/link-status.json.
set -u
cd "$(dirname "$0")/.."
urls=$(python3 - <<'PY'
import json,re
u=set()
s=json.load(open('data/sources.json'))['sources']
for v in s.values(): u.add(v['url'])
st=json.load(open('data/states.json'))['states']
for x in st:
    for k in ('ceo_url','ceo_sir_url'):
        if x.get(k): u.add(x[k])
c=json.load(open('data/common.json'))
for v in c['links'].values(): u.add(v['url'].split('{')[0])
for v in c['forms'].values():
    for k in ('online_url','pdf_url'):
        if v.get(k): u.add(v[k])
print('\n'.join(sorted(u)))
PY
)
today=$(date -u +%Y-%m-%d)
tmp=$(mktemp)
echo '{"checked":"'"$today"'","links":{' > "$tmp"
first=1
while IFS= read -r url; do
  [ -z "$url" ] && continue
  hdr=$(curl -sIL -A "Mozilla/5.0 (compatible; SIR-Assist-link-check; +https://github.com)" --max-time 25 "$url" 2>/dev/null)
  code=$(printf '%s' "$hdr" | grep -i '^HTTP/' | tail -1 | awk '{print $2}')
  lm=$(printf '%s' "$hdr" | grep -i '^last-modified:' | tail -1 | cut -d' ' -f2- | tr -d '\r')
  [ -z "$code" ] && code="unreachable"
  esc_url=$(printf '%s' "$url" | sed 's/"/\\"/g')
  esc_lm=$(printf '%s' "$lm" | sed 's/"/\\"/g')
  [ $first -eq 0 ] && echo ',' >> "$tmp"
  printf '"%s":{"checked":"%s","status":"%s","last_modified":"%s"}' "$esc_url" "$today" "$code" "$esc_lm" >> "$tmp"
  first=0
done <<< "$urls"
echo '}}' >> "$tmp"
python3 -c "import json;d=json.load(open('$tmp'));json.dump(d,open('data/link-status.json','w'),indent=1,ensure_ascii=False)"
echo "Wrote data/link-status.json ($(grep -c '"checked"' data/link-status.json) entries)"
