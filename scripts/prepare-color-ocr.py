"""Isolate PDF swatch labels; white-on-color small text needs a second OCR pass."""
from pathlib import Path
import json
import fitz
import numpy as np
from PIL import Image, ImageDraw

pdf=fitz.open(r'C:\Users\Usuario\Downloads\jhktshirt_catalogue_es.pdf')
out=Path('tmp/catalog/color-images');out.mkdir(parents=True,exist_ok=True)
all_circles={}
for i in range(5,108):
    page=pdf[i]
    circles=[]
    drawings=page.get_drawings()
    for img in page.get_image_info():
        r=fitz.Rect(img['bbox'])
        if 12<=r.width<=31 and abs(r.width-r.height)<.3:
            drawings.append({'rect':r,'items':[('c',)]*4,'fill':None})
    for draw in drawings:
        r=draw['rect']
        if 12 <= r.width <= 31 and abs(r.width-r.height)<.2 and len(draw['items'])==4 and all(item[0]=='c' for item in draw['items']):
            if any(abs(r.x0-c['bbox'][0])<.3 and abs(r.y0-c['bbox'][1])<.3 for c in circles):continue
            crop=fitz.Rect(r.x0+2,r.y0+r.height*.28,r.x1-2,r.y0+r.height*.72)
            pix=page.get_pixmap(matrix=fitz.Matrix(12,12),clip=crop)
            im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
            arr=np.array(im).astype(float)
            bg=np.median(arr.reshape(-1,3),axis=0)
            dist=np.max(abs(arr-bg),axis=2)
            binary=Image.fromarray(np.where(dist>20,0,255).astype('uint8')).convert('RGB')
            circles.append({'bbox':list(r),'fill':draw['fill'],'image':binary})
    circles.sort(key=lambda c:(round(c['bbox'][1]/5),c['bbox'][0]))
    for chunk in range(0,len(circles),80):
        subset=circles[chunk:chunk+80]
        sheet=Image.new('RGB',(1600, max(1,(len(subset)+9)//10)*150),'white')
        for j,c in enumerate(subset):
            im=c.pop('image');im.thumbnail((120,70))
            x=(j%10)*160+20;y=(j//10)*150+55
            sheet.paste(im,(x+(120-im.width)//2,y))
            ImageDraw.Draw(sheet).text((x,y-35),f'{chunk+j:03}',fill='black',font_size=22)
        sheet.save(out/f'{i+1:03}-{chunk//80:02}.png')
    all_circles[str(i+1)]=circles
    print(i+1,len(circles),flush=True)
Path('tmp/catalog/circles.json').write_text(json.dumps(all_circles,indent=2),encoding='utf8')
