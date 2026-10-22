"""Normalize the full PDF directory and cross-check official technical sheets.

Review exceptions live in data/catalog/review-overrides.json, never in hidden fallbacks.
"""
from collections import defaultdict,Counter
from pathlib import Path
from difflib import SequenceMatcher
from io import BytesIO
import json,re,unicodedata,hashlib,fitz
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
inventory=json.loads((ROOT/'data/catalog/inventory.json').read_text(encoding='utf8'))
supplier=json.loads((ROOT/'tmp/catalog/supplier.json').read_text(encoding='utf8'))
circles=json.loads((ROOT/'tmp/catalog/circles.json').read_text())
palette=json.loads((ROOT/'tmp/catalog/palette.json').read_text())['palette']
overrides_path=ROOT/'data/catalog/review-overrides.json'
overrides=json.loads(overrides_path.read_text(encoding='utf8')) if overrides_path.exists() else {}
ledger_path=ROOT/'data/catalog/review-ledger.json'
ledger=json.loads(ledger_path.read_text(encoding='utf8')).get('references',{}) if ledger_path.exists() else {}
pdf=fitz.open(r'C:\Users\Usuario\Downloads\jhktshirt_catalogue_es.pdf')
public=ROOT/'apps/web/public/catalog';public.mkdir(parents=True,exist_ok=True)
sources=public/'sources';sources.mkdir(exist_ok=True)

def norm(value):return ''.join(c for c in unicodedata.normalize('NFD',value) if unicodedata.category(c)!='Mn').lower().strip()
def clean_ref(value):return re.sub(r'[^A-Z0-9]','',value.upper().replace('I<','K').replace('l<','K'))
def canonical(value):return value.split('(')[0].replace('TSR1600RG','TSR160ORG')
def page_numbers(value):
    ends=[int(n) for n in value.split('-')]
    return list(range(ends[0],ends[-1]+1))
def sheet(printed):return f'{printed//2+1:03}-'+('L' if printed%2==0 else 'R')
grouped=defaultdict(list)
for entry in inventory:grouped[canonical(entry['reference'])].append(entry)
for ref,entries in grouped.items():
    if overrides.get(ref,{}).get('printedPages'):
        entries[0]['printedPages']=overrides[ref]['printedPages']
by_sheet=defaultdict(list)
for ref,entries in grouped.items():
    for s in {sheet(n) for e in entries for n in page_numbers(e['printedPages'])}:by_sheet[s].append(ref)
ocr={p.stem:json.loads(p.read_text(encoding='utf-8-sig')) for p in (ROOT/'tmp/catalog/ocr').glob('*.json')}
anchor_cache={}
def anchors(s):
    if s in anchor_cache:return anchor_cache[s]
    refs=by_sheet[s];lines=list(ocr[s]['lines']);pairs=[]
    detailed=ROOT/f'tmp/catalog/details-ocr/{s}.json'
    if detailed.exists():
        details=json.loads(detailed.read_text(encoding='utf8'))
        for block in details.get('blocks') or []:
            for paragraph in block.get('paragraphs',[]):
                for line in paragraph.get('lines',[]):
                    if 'REF' in line.get('text',''):
                        lines.append({'text':line['text'],'words':[{'x':line['bbox']['x0'],'y':line['bbox']['y0']}]})
    for line in lines:
        if 'REF' not in line['text'].upper() or not line['words']:continue
        text=clean_ref(re.split(r'REF\s*[:.]?',line['text'],flags=re.I)[-1])
        for ref in refs:
            ratio=SequenceMatcher(None,text,clean_ref(ref)).ratio()
            if ratio>.62:pairs.append((ratio,ref,line))
    used=set();result={}
    for score,ref,line in sorted(pairs,key=lambda p:-p[0]):
        uid=(line['words'][0]['x'],line['words'][0]['y'])
        if ref in result or uid in used:continue
        used.add(uid);result[ref]={'x':min(w['x'] for w in line['words'])/3,'y':min(w['y'] for w in line['words'])/3}
    for ref in refs:
        if s in overrides.get(ref,{}).get('anchors',{}):result[ref]=overrides[ref]['anchors'][s]
    anchor_cache[s]=result
    return result
def owner(s,x,y):
    a=anchors(s)
    if len(by_sheet[s])==1:return by_sheet[s][0]
    if len(a)<len(by_sheet[s]):return None
    ys=sorted(v['y'] for v in a.values())
    # Description anchors are often opposite the swatches; divide into rows first.
    rows=[]
    for ref,v in sorted(a.items(),key=lambda r:r[1]['y']):
        if not rows or abs(rows[-1][0][1]['y']-v['y'])>150:rows.append([])
        rows[-1].append((ref,v))
    row=min(rows,key=lambda r:abs(y-(sum(v['y'] for _,v in r)/len(r)+50)))
    if len(row)==1:return row[0][0]
    return min(row,key=lambda r:abs(x-(r[1]['x']+100)))[0]

# Solid palette assignments seeded from a visually checked, complete JT150 grid.
jt_codes='GF BU PK PU SK AZ AQ MG LM BG FG SA WH AS GM BK SY OR RD CA FU TU RB NY KG'.split()
for c,code in zip(circles['6'][:25],jt_codes):
    if c['fill'] and c['fill']!=[1,1,1]:palette[','.join(f'{x:.5f}' for x in c['fill'])]=code
all_colors={c['code']:c for pages in supplier.values() for c in pages[0]['colors']}
code_hex={}
for key,code in palette.items():code_hex[code]='#'+''.join(f'{round(float(x)*255):02x}' for x in key.split(','))
code_hex.update({'WH':'#ffffff','BK':'#111318','AS':'#e4e5e3','GM':'#949791','DGM':'#555b5c','HCH':'#555856','CHC':'#484d50','CHCH':'#535558','BGH':'#62716a','BUH':'#75545e','DNH':'#667a8a','DNV':'#253847','WHSB':'#f8f8f8'})
color_occurrences=defaultdict(list)
unread=[]
for page,items in circles.items():
    readings=json.loads((ROOT/f'tmp/catalog/code-ocr/{int(page):03}.json').read_text())
    for index,(c,read) in enumerate(zip(items,readings)):
        x0,y0,x1,y1=c['bbox'];s=f'{int(page):03}-'+('L' if x0<575.435 else 'R');x=(x0+x1)/2-(575.435 if s.endswith('R') else 0);y=(y0+y1)/2
        if s not in by_sheet:continue
        ref=owner(s,x,y)
        if not ref:continue
        raw=read['code'];code=raw
        if c['fill'] and c['fill']!=[1,1,1]:code=palette.get(','.join(f'{n:.5f}' for n in c['fill']),raw)
        elif c['fill']==[1,1,1]:
            if re.search(r'(?:6M|GM|SMT|SNE|BNE)',raw):code='GM'
            elif raw.endswith('AS'):code='AS'
            elif raw.startswith('WH') and raw not in all_colors:code='WH'
        # Outline-only circles are technique symbols, not color variants.
        if c['fill'] is None:continue
        if code in all_colors:
            color_occurrences[ref].append({'code':code,'sheet':s,'x':x,'y':y,'index':index})
        else:unread.append({'ref':ref,'sheet':s,'index':index,'raw':raw,'fill':c['fill']})

size_order=['XXS','XS','S','M','L','XL','XXL','3XL','4XL','5XL','6XL']
def size_key(size):return re.sub(r'[^a-z0-9]','',size.lower()).replace('xxxxxl','5xl').replace('xxxxl','4xl').replace('xxxl','3xl').replace('2xl','xxl').replace('1xl','xl')
def size_sort(size):
    if size in size_order:return (0,size_order.index(size))
    numbers=re.findall(r'\d+',size)
    return (1,int(numbers[0]) if numbers else 999)
def heading_ranges(s):
    result=[]
    for line in ocr[s]['lines']:
        text=line['text'].upper().replace('XXI','XXL').replace('XXI.','XXL')
        match=re.fullmatch(r'\s*(XXS|XS|S|M|L|XL|XXL|[3-6]XL)\s*[/\-]\s*(XXS|XS|S|M|L|XL|XXL|[3-6]XL)\s*',text)
        single=re.fullmatch(r'\s*(XXS|XS|S|M|L|XL|XXL|[3-6]XL)\s*',text)
        if match or single:
            words=line['words'];result.append({'start':match.group(1) if match else single.group(1),'end':match.group(2) if match else single.group(1),'x':min(w['x'] for w in words)/3,'y':min(w['y'] for w in words)/3})
    return result

def save_photo(ref,s,anchor):
    manual=overrides.get(ref,{}).get('photo')
    if manual:
        page=pdf[int(manual['sheet'][:3])-1];offset=0 if manual['sheet'].endswith('L') else page.rect.width/2
        r=fitz.Rect(manual['rect']);r.x0+=offset;r.x1+=offset
        pix=page.get_pixmap(matrix=fitz.Matrix(2.5,2.5),clip=r)
        im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);im.thumbnail((1000,1300));width,height=im.size
        im.save(public/f'{ref.lower()}.webp',quality=85,method=4)
        im.thumbnail((420,560));im.save(public/f'{ref.lower()}-small.webp',quality=82,method=4)
        return width,height
    existing=public/f'{ref.lower()}.webp'
    preferred=overrides.get(ref,{}).get('imageSheet')
    if preferred:s=preferred
    if existing.exists() and not preferred:
        with Image.open(existing) as im:return im.size
    page=pdf[int(s[:3])-1];offset=0 if s.endswith('L') else page.rect.width/2
    candidates=[]
    for img in page.get_image_info(xrefs=True):
        r=fitz.Rect(img['bbox'])
        if r.width<65 or r.height<65 or not offset<=r.x0+r.width/2<offset+page.rect.width/2:continue
        if not preferred and owner(s,r.x0+r.width/2-offset,r.y0+r.height/2)!=ref:continue
        candidates.append((r.width*r.height,img))
    if not candidates:return None
    _,img=max(candidates,key=lambda t:t[0]);r=fitz.Rect(img['bbox']);xref=img['xref']
    if xref:
        pix=fitz.Pixmap(pdf,xref)
        if pix.colorspace and pix.colorspace.n!=3:pix=fitz.Pixmap(fitz.csRGB,pix)
        im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples) if not pix.alpha else Image.frombytes('RGBA',[pix.width,pix.height],pix.samples).convert('RGB')
    else:
        pix=page.get_pixmap(matrix=fitz.Matrix(2,2),clip=r);im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
    im.thumbnail((1000,1300));width,height=im.size
    im.save(public/f'{ref.lower()}.webp',quality=85,method=6)
    im.thumbnail((420,560));im.save(public/f'{ref.lower()}-small.webp',quality=82,method=6)
    return width,height

products=[];report=[]
translations={'WHITE':'Blanco','BLACK':'Negro','RED':'Rojo','NAVY':'Marino','ROYAL BLUE':'Azul royal','GREY MELANGE':'Gris melange','ASH MELANGE':'Gris ceniza','GRAPHITE':'Grafito','KELLY GREEN':'Verde kelly','BOTTLE GREEN':'Verde botella','FOREST GREEN':'Verde bosque','BURGUNDY':'Burdeos','CARDINAL':'Cardinal','SKY BLUE':'Azul cielo','TURQUOISE':'Turquesa','PINK':'Rosa','PURPLE':'Morado','LIME':'Lima','ORANGE':'Naranja','GOLD':'Amarillo oro','SAND':'Arena','AQUA':'Aqua','AZZURE':'Azul azzurre','MINT GREEN':'Verde menta','FUCSIA':'Fucsia'}
for ref,entries in grouped.items():
    supplier_ref='JTSOFTJAC' if ref=='JTSOFTJACK' else ref
    if supplier_ref not in supplier:raise ValueError('Supplier missing '+ref)
    source=supplier[supplier_ref][0];fix=overrides.get(ref,{})
    pages=sorted({n for e in entries for n in page_numbers(e['printedPages'])});ss=sorted({sheet(n) for n in pages})
    expected=sum(e['expectedColors'] or 0 for e in entries) or None
    reference_colors=source['colors'];current_codes={c['code'] for c in reference_colors}
    found={c['code'] for c in color_occurrences[ref]}
    # Start with exact intersections. Every difference remains a visible audit item.
    selected=fix.get('colors',[c['code'] for c in reference_colors])
    table=source['measurements'];raw_headers=table[0][1:] if table else []
    def canonical_size(value):
        value=value.upper().strip()
        value=fix.get('sizeAliases',{}).get(value,value)
        if re.fullmatch(r'X{3,5}L',value):return str(len(value)-1)+'XL'
        return {'1XL':'XL','2XL':'XXL'}.get(value,value)
    headers=list(dict.fromkeys(canonical_size(s) for s in raw_headers))
    if not headers:headers=sorted({s.upper() for c in reference_colors for s in c['sizes'] if s not in ['1xl','2xl','xxxl','xxxxl','xxxxxl']},key=size_sort)
    sizes=sorted(headers,key=size_sort)
    colors=[]
    for code in selected:
        original=next((c for c in reference_colors if c['code']==code),all_colors.get(code))
        if not original:raise ValueError((ref,code))
        valid=list(dict.fromkeys(size for size in sizes if size_key(size) in {size_key(canonical_size(s)) for s in original['sizes']}))
        if code not in current_codes:valid=list(sizes)
        occurrence=[c for c in color_occurrences[ref] if c['code']==code]
        restricted=set()
        for o in occurrence:
            hs=[h for h in heading_ranges(o['sheet']) if h['y']<o['y'] and abs(h['x']-o['x'])<150 and o['y']-h['y']<320]
            if hs:
                h=min(hs,key=lambda h:(o['y']-h['y'])+abs(h['x']-o['x'])*.2)
                if h['start'] in size_order and h['end'] in size_order:restricted.update(size_order[size_order.index(h['start']):size_order.index(h['end'])+1])
        if restricted and all(size in size_order for size in sizes):valid=[size for size in valid if size in restricted]
        valid=fix.get('sizesByColor',{}).get(code,fix.get('allSizes',valid))
        if not valid:valid=fix.get('defaultSizes',sizes)
        label=re.sub(r'^.*?\((.*?)\)$',r'\1',original['label']).upper()
        name=translations.get(label,label.title())
        swatch_path=public/'swatches'/f'{code.lower()}.webp'
        if swatch_path.exists():
            with Image.open(swatch_path) as sample:
                pixel=sample.convert('RGB').resize((1,1)).getpixel((0,0));hex_value='#'+''.join(f'{n:02x}' for n in pixel)
        else:hex_value=code_hex.get(code,'#93978d')
        if ref.endswith('WLT'):name='Blanco WLT · especial para tintar'
        colors.append({'code':code,'name':name,'hex':hex_value,'swatch':f'/catalog/swatches/{code.lower()}.webp','sizes':valid})
    sizes=sorted({s for c in colors for s in c['sizes']},key=size_sort)
    measurements=[{'size':size,'values':{r[0]:r[next(i for i,h in enumerate(raw_headers) if canonical_size(h)==size)+1] for r in table[1:] if len(r)>next(i for i,h in enumerate(raw_headers) if canonical_size(h)==size)+1 and r[0] not in ['EU','TALLAS/Size']}} for size in sizes if size in headers]
    if fix.get('sizeAliases'):
        for row in measurements:row['values']={'Equivalencia numérica':next(raw for raw,label in fix['sizeAliases'].items() if label==row['size']),**row['values']}
    name=re.sub(r'\s+'+re.escape(supplier_ref)+r'$','',source['name']).title().replace('T-Shirt','T-Shirt').replace('Jt ','JT ')
    feature_lines=source['features'].splitlines()
    composition=next((l for l in feature_lines if '%' in l and not re.match(r'^[A-Z]{1,5}:|Flúor:|Heather:',l)),'')
    notes=[l for l in feature_lines if '%' in l and l!=composition]
    sheets_with_photos=sorted(ss,key=lambda s:(0 if anchors(s).get(ref) else 1,s))
    photo=None
    for s in sheets_with_photos:
        photo=save_photo(ref,s,anchors(s).get(ref))
        if photo:break
    source_images=[]
    for s in ss:
        output=sources/f'{s.lower()}.webp'
        if not output.exists():
            page=pdf[int(s[:3])-1];offset=0 if s.endswith('L') else page.rect.width/2
            pix=page.get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(offset,0,offset+page.rect.width/2,page.rect.height))
            Image.frombytes('RGB',[pix.width,pix.height],pix.samples).save(output,quality=88,method=6)
        source_images.append('/catalog/sources/'+output.name)
    collection=entries[0]['collection'].split('/')[0]
    category='Camisetas' if ref.startswith(('TS','JT150','JTSPORT','CURVS','SBTS')) else 'Polos' if ref.startswith(('PO','PK','JTPOLO','SPHEAVY','SPORTPQ','SPORTPIQ')) else 'Sudaderas' if ref.startswith(('SW','JTSW')) and not ref.startswith(('SWPANT','SWSHORT')) else 'Pantalones' if ref.startswith(('SWPANT','SWSHORT','WKLIS','WKDUB','WKARIZ','WKTOK','WKCHE','WKLAR','SPLEGG')) else 'Camisas' if ref.startswith('SH') else 'Jerséis' if ref.startswith('WKBOSTON') else 'Batas' if ref.startswith('WKROME') else 'Delantales' if ref.startswith(('WKPAR','WKVIE','WKVEN')) else 'Ropa interior' if ref.startswith('UN') else 'Polos' if 'POLO' in source['name'] else 'Camisetas' if 'T-SHIRT' in source['name'] or 'SCRUB' in source['name'] else 'Abrigo y chalecos'
    audience='Bebé' if 'BABY' in source['name'] else 'Infantil' if 'KID' in source['name'] or ref in ['TSLKTNG','TSLKTVL','PKID210SCH','PKID210LS','PKID210'] else 'Mujer' if any(term in source['name'] for term in ['LADY','LADIES','CURVES']) else 'Adulto'
    issues=[]
    if expected and len(colors)!=expected:issues.append(f'Colores: PDF {expected}; conciliados {len(colors)}; proveedor {len(reference_colors)}')
    if not photo:issues.append('Sin foto asignada')
    if all(len(anchors(s))<len(by_sheet[s]) and len(by_sheet[s])>1 for s in ss) and not fix.get('photo'):issues.append('Revisar segmentación de ficha')
    reviewed=bool(fix.get('reviewed',False))
    printed=', '.join(e['printedPages'] for e in entries)
    product={'reference':ref,'slug':ref.lower(),'name':fix.get('name',name),'description':fix.get('description',source['description']),'category':fix.get('category',category),'collection':collection,'audience':fix.get('audience',audience),'composition':fix.get('composition',composition),'compositionNotes':fix.get('compositionNotes',notes),'weight':fix.get('weight',entries[0]['weight']),'colors':colors,'sizes':sizes,'measurements':measurements,'image':f'/catalog/{ref.lower()}.webp','imageSmall':f'/catalog/{ref.lower()}-small.webp','imageWidth':photo[0] if photo else 900,'imageHeight':photo[1] if photo else 1157,'sourceImages':source_images,'source':{'pdf':'jhktshirt_catalogue_es.pdf','digitalPages':sorted({int(s[:3]) for s in ss}),'printedPages':printed,'directorySheets':sorted({e['directorySheet'] for e in entries}),'supplierUrl':f"https://www.jhktshirt.com/es/catalogo/prenda/{source['file']}",'reviewed':reviewed,'reviewNotes':fix.get('notes',[])},'search':norm(' '.join([ref,name,source['description'],category,collection,audience,composition]))}
    fingerprint_fields={key:product[key] for key in ['reference','colors','sizes','composition','compositionNotes','weight','measurements','image','imageSmall','sourceImages']}
    fingerprint=hashlib.sha256(json.dumps(fingerprint_fields,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    product['source']['reviewed']=ledger.get(ref,{}).get('fingerprint')==fingerprint
    products.append(product);report.append({'reference':ref,'expectedColors':expected,'actualColors':len(colors),'supplierColors':len(reference_colors),'pdfCodes':sorted(found),'selected':selected,'sizes':{c['code']:c['sizes'] for c in colors},'anchors':{s:anchors(s) for s in ss},'issues':issues,'reviewed':product['source']['reviewed']})
    if len(products)%20==0:print('Normalized',len(products),'of',len(grouped),flush=True)
(ROOT/'data/catalog/products.json').write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'tmp/catalog/reconciliation.json').write_text(json.dumps({'products':len(products),'entries':len(inventory),'report':report,'unread':unread},ensure_ascii=False,indent=2),encoding='utf8')
# A separately extracted hero retains the catalogue's original photo.
hero=fitz.Pixmap(pdf,pdf[6].get_images()[0][0]);hero=fitz.Pixmap(fitz.csRGB,hero) if hero.colorspace.n!=3 else hero
im=Image.frombytes('RGB',[hero.width,hero.height],hero.samples);im.save(public/'hero.webp',quality=87,method=6)
print('Products',len(products),'issues',[(r['reference'],r['issues']) for r in report if r['issues']],flush=True)
