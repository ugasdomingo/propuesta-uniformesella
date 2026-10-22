from pathlib import Path
from collections import Counter,defaultdict
import json

circles=json.loads(Path('tmp/catalog/circles.json').read_text())
supplier=json.loads(Path('tmp/catalog/supplier.json').read_text(encoding='utf8'))
codes={c['code'] for ps in supplier.values() for c in ps[0]['colors']}
votes=defaultdict(Counter)
for page,items in circles.items():
    readings=json.loads(Path(f'tmp/catalog/code-ocr/{int(page):03}.json').read_text())
    for circle,reading in zip(items,readings):
        if circle['fill'] is None:continue
        key=','.join(f'{x:.5f}' for x in circle['fill'])
        if reading['code'] in codes: votes[key][reading['code']]+=1
palette={k:v.most_common(1)[0][0] for k,v in votes.items()}
Path('tmp/catalog/palette.json').write_text(json.dumps({'palette':palette,'votes':votes},indent=2))
print('palette',len(palette),'ambiguous:',[(k,v.most_common()) for k,v in votes.items() if len(v)>1])
print('unrecognized fills',[(k,len(v)) for k,v in votes.items() if not v])
