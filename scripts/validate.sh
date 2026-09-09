#!/usr/bin/env bash
# Sanity-checks the data files: valid JSON, every source id referenced exists,
# every state has a CEO url, every locale key used in data exists in en.json.
set -e
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json,sys,re,glob
err=[]
S=json.load(open('data/sources.json'))['sources']
st=json.load(open('data/states.json'))
C=json.load(open('data/common.json'))
en=json.load(open('locales/en.json'))
codes=set()
for x in st['states']:
    codes.add(x['code'])
    if not x.get('ceo_url'): err.append(f"{x['code']}: missing ceo_url")
    if 'state.'+x['code'] not in en: err.append(f"{x['code']}: missing locale key state.{x['code']}")
    for sid in (x.get('sir',{}).get('sources') or [])+(x.get('ceo_sources') or [])+(x.get('helpline_sources') or []):
        if sid not in S: err.append(f"{x['code']}: unknown source id {sid}")
if len(codes)!=36: err.append(f"expected 36 states/UTs, found {len(codes)}")
for fid,f in C['forms'].items():
    for sid in f.get('sources',[]):
        if sid not in S: err.append(f"form {fid}: unknown source {sid}")
    if f'w.f.{fid}' not in en: err.append(f"missing locale w.f.{fid}")
for d in C['documents']:
    if 'doc.'+d not in en: err.append(f"missing locale doc.{d}")
# source ids referenced in JS
js=open('assets/js/app.js').read()+open('assets/js/process.js').read()
app=open('assets/js/app.js').read()
for k in set(re.findall(r"'(w\.[A-Za-z0-9_.]+)'", app)):
    if not k.endswith('.') and k not in en: err.append(f"app.js uses missing locale key {k}")
for sid in set(re.findall(r"'((?:pib|eci|ceo|sc|rer|rpa|newsonair|nalsa)-[a-z0-9\-]+)'", app)):
    if sid not in S: err.append(f"app.js uses unknown source id {sid}")
for sid,v in S.items():
    for k in ("title","url","publisher","verified_on"):
        if k not in v: err.append(f"source {sid}: missing {k}")
for loc in glob.glob('locales/*.json'):
    json.load(open(loc))
if err:
    print('\n'.join(err)); sys.exit(1)
print('data OK:',len(st['states']),'states,',len(S),'sources,',len(en),'en strings')
PY
