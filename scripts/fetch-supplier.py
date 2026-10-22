"""Cache official public technical sheets to cross-check OCR, with bounded requests."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import time
import urllib.request
import xml.etree.ElementTree as ET

root = Path('tmp/catalog/source')
root.mkdir(parents=True, exist_ok=True)
def fetch(url):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'UniformesEllasCatalogReview/1.0'})
            return urllib.request.urlopen(req, timeout=30).read()
        except Exception:
            if attempt == 2: raise
            time.sleep(2 + attempt)

sitemap = root/'sitemap-es.xml'
if not sitemap.exists(): sitemap.write_bytes(fetch('https://www.jhktshirt.com/sitemap-es.xml'))
tree = ET.fromstring(sitemap.read_bytes())
urls = sorted({node.text for node in tree.iter() if node.tag.endswith('loc') and node.text and '/es/catalogo/prenda/' in node.text})
def work(url):
    slug=url.rstrip('/').split('/')[-1]
    path=root/f'{slug}.html'
    if not path.exists(): path.write_bytes(fetch(url))
    return slug
errors=[]
with ThreadPoolExecutor(max_workers=5) as executor:
    futures={executor.submit(work,url):url for url in urls}
    for f in as_completed(futures):
        try: print(f.result(), flush=True)
        except Exception as e: errors.append({'url':futures[f], 'error':str(e)})
(root/'fetch-report.json').write_text(json.dumps({'urls':urls,'errors':errors},indent=2),encoding='utf8')
print('Fetched',len(urls),'errors',len(errors))
