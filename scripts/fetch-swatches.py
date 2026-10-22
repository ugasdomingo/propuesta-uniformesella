from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from io import BytesIO
import json,urllib.request
from PIL import Image

supplier=json.loads(Path('tmp/catalog/supplier.json').read_text(encoding='utf8'))
colors={c['code']:c for ps in supplier.values() for c in ps[0]['colors']}
out=Path('apps/web/public/catalog/swatches');out.mkdir(parents=True,exist_ok=True)
def work(item):
    code,color=item;target=out/f'{code.lower()}.webp'
    if not target.exists():
        url=color['swatch'];url='https:'+url if url.startswith('//') else url
        with urllib.request.urlopen(url,timeout=30) as response:data=response.read()
        im=Image.open(BytesIO(data)).convert('RGB');im.thumbnail((80,80));im.save(target,quality=85)
    return code
with ThreadPoolExecutor(5) as pool:
    for f in as_completed([pool.submit(work,item) for item in colors.items()]):print(f.result(),flush=True)
