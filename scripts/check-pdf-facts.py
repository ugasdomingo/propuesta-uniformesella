from pathlib import Path
from collections import defaultdict
import json,re

products=json.loads(Path('data/catalog/products.json').read_text(encoding='utf8'))
report=json.loads(Path('tmp/catalog/reconciliation.json').read_text(encoding='utf8'))['report']
anchors={s:a for row in report for s,a in row['anchors'].items()}
facts=defaultdict(list)
for file in Path('tmp/catalog/details-ocr').glob('*.json'):
    data=json.loads(file.read_text(encoding='utf8'));aa=anchors.get(file.stem,{})
    for block in data.get('blocks') or []:
        for paragraph in block.get('paragraphs',[]):
            for line in paragraph.get('lines',[]):
                text=line['text'].strip();upper=text.upper()
                if 'TALLAJE:' not in upper and 'COLORES:' not in upper and 'GRAMAJE:' not in upper:continue
                x=line['bbox']['x0']/3;y=line['bbox']['y0']/3
                if not aa:continue
                # Nearby description anchor; horizontal distance matters only within a row.
                ref=min(aa,key=lambda r:abs(aa[r]['y']+100-y)+abs(aa[r]['x']-x)*.1)
                facts[ref].append({'sheet':file.stem,'text':text})
order=['XXS','XS','S','M','L','XL','XXL','3XL','4XL','5XL','6XL']
mismatches=[]
for p in products:
    for fact in facts[p['reference']]:
        text=fact['text'].upper().replace('AXL','4XL').replace('XXXL','3XL')
        if 'TALLAJE:' in text:
            found=re.findall(r'\b(?:[3-6]XL|XXL|XL|XXS|XS|S|M|L)\b',text)
            if len(found)==2 and 'HASTA' in text and found[0] in order and found[1] in order:
                expected=order[order.index(found[0]):order.index(found[1])+1]
                if set(expected)!=set(p['sizes']):mismatches.append({'ref':p['reference'],'actual':p['sizes'],'pdf':expected,'evidence':fact})
Path('tmp/catalog/pdf-facts.json').write_text(json.dumps({'facts':facts,'mismatches':mismatches},ensure_ascii=False,indent=2),encoding='utf8')
print('Facts',sum(len(v) for v in facts.values()),'covered refs',len(facts),'range differences',len(mismatches))
print(json.dumps(mismatches,ensure_ascii=False,indent=2))
