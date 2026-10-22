from pathlib import Path
from bs4 import BeautifulSoup
import json
import re

by_ref={}
for file in Path('tmp/catalog/source').glob('*.html'):
    soup=BeautifulSoup(file.read_text(encoding='utf8'),'html.parser')
    media=soup.select_one('.product-media')
    if not media: continue
    ref=media['data-ref'].upper()
    title=soup.select_one('.product-summary__title')
    colors=[{'code':c['data-color'].upper(),'label':c.get('data-selected-label',''), 'sizes':c.get('data-sizes','').split(),'swatch':c.select_one('img')['src']} for c in soup.select('.product-color')]
    intro=soup.select_one('.product-summary__intro')
    features=soup.select_one('.product-features')
    table=soup.select_one('table')
    rows=[[c.get_text(' ',strip=True) for c in r.select('th,td')] for r in table.select('tr')] if table else []
    photos=[i.get('src') for i in soup.select('.product-media img') if '/pictures/' in i.get('src','')]
    by_ref.setdefault(ref,[]).append({'file':file.stem,'name':title.get_text(' ',strip=True) if title else ref,'description':intro.get_text(' ',strip=True) if intro else '', 'features':features.get_text('\n',strip=True) if features else '', 'colors':colors,'measurements':rows,'photos':photos})
Path('tmp/catalog/supplier.json').write_text(json.dumps(by_ref,ensure_ascii=False,indent=2),encoding='utf8')
inventory=json.loads(Path('data/catalog/inventory.json').read_text(encoding='utf8'))
print('Unmatched:',[(e['reference'],e['printedPages']) for e in inventory if e['reference'] not in by_ref])
print('Repeated refs:',[(ref,[p['file'] for p in pages]) for ref,pages in by_ref.items() if len(pages)>1])
print('Different color counts:',[(e['reference'],e['expectedColors'],[(p['file'],len(p['colors'])) for p in by_ref[e['reference']]]) for e in inventory if e['reference'] in by_ref and e['expectedColors']!=len(by_ref[e['reference']][0]['colors'])])
