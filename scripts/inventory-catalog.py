"""Build the directory inventory from Windows OCR. No inferred product variants."""
import json
import re
from pathlib import Path

out = Path('data/catalog')
out.mkdir(parents=True, exist_ok=True)
entries = []
for file in sorted(Path('tmp/catalog/ocr').glob('*.json')):
    if not 110 <= int(file.stem[:3]) <= 113:
        continue
    text = json.loads(file.read_text(encoding='utf-8-sig'))['text'].upper()
    for segment in re.split(r'REF\s*:', text)[1:]:
        match = re.match(r'(.+?)\s+L[ÍI]NEA\s*:\s*(.+?)(?=\s+GRAMAJE|\s+COLORES|\s+P[ÁA]GINA)', segment)
        if not match:
            raise ValueError((file, segment[:100]))
        raw, collection = match.groups()
        reference = re.sub(r'\s+', '', raw).upper().replace('SWFUZLP', 'SWFUZIP').replace('SWRKFUZLP', 'SWRKFUZIP').replace('PKLD', 'PKID')
        reference = reference.replace('TSR160', 'TSR160')
        page = re.search(r'P[ÁA]GINA[\s:.]+(\d+(?:-\d+)?)', segment)
        colors = re.search(r'COLORES\s*:\s*(\d+|I)\b', segment)
        weight = re.search(r'GRAMAJE\s*:\s*([\d-]+)', segment)
        entries.append({'reference':reference, 'collection':collection.strip(), 'printedPages':page.group(1) if page else None, 'directorySheet':file.stem, 'expectedColors':int(colors.group(1).replace('I','1')) if colors else None, 'weight':weight.group(1) if weight else None})
fixes = {'FLRA340':'160-161', 'SWPANTS240':'143', 'SWPANTSCFF':'128', 'WKDUBAI':'102-103', 'WKARIZONA':'100-101'}
for entry in entries:
    if not entry['printedPages']:
        entry['printedPages'] = fixes.get(entry['reference'])
    if not entry['printedPages']:
        raise ValueError(entry)
(out / 'inventory.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf8')
print('Directory entries:',len(entries), 'distinct:',len({e['reference'] for e in entries}))
