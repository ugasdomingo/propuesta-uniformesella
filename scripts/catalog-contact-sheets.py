from pathlib import Path
from PIL import Image,ImageDraw,ImageOps
import json

products=json.loads(Path('data/catalog/products.json').read_text(encoding='utf8'))
out=Path('tmp/catalog/contact-sheets');out.mkdir(exist_ok=True)
for start in range(0,len(products),20):
    canvas=Image.new('RGB',(1040,1600),'#f3f3ed');draw=ImageDraw.Draw(canvas)
    for i,p in enumerate(products[start:start+20]):
        x=(i%4)*260;y=(i//4)*320
        with Image.open('apps/web/public'+p['image']) as im:
            im=ImageOps.contain(im,(240,265));canvas.paste(im,(x+(260-im.width)//2,y+6))
        draw.text((x+12,y+275),p['reference'],fill='black',font_size=15)
        draw.text((x+12,y+297),f"p. {p['source']['printedPages']} | {len(p['colors'])} colors | {len(p['sizes'])} sizes",fill='#63675c',font_size=11)
    canvas.save(out/f'{start//20+1:02}.jpg',quality=92)
print('Contact sheets',len(list(out.glob('*.jpg'))))
