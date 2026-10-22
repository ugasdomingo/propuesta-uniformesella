"""Render source sheets for local OCR; source PDF stays outside the repository."""
from pathlib import Path
import argparse
import fitz

parser = argparse.ArgumentParser()
parser.add_argument('pdf')
parser.add_argument('--start', type=int, default=2)
parser.add_argument('--end', type=int, default=114)
args = parser.parse_args()
document = fitz.open(args.pdf)
target = Path('tmp/catalog/ocr-images')
target.mkdir(parents=True, exist_ok=True)
for number in range(args.start, args.end + 1):
    page = document[number - 1]
    for side, x in [('L', 0), ('R', page.rect.width / 2)]:
        output = target / f'{number:03}-{side}.png'
        if not output.exists():
            clip = fitz.Rect(x, 0, x + page.rect.width / 2, page.rect.height)
            page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=clip).save(str(output))
    print(number, flush=True)
