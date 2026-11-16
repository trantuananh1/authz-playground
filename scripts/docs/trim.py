# Trims empty space at the bottom of panel screenshots.
import sys
from PIL import Image, ImageChops
for path in sys.argv[1:]:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    bg = im.getpixel((w - 4, h - 4))
    diff = ImageChops.difference(im, Image.new("RGB", im.size, bg)).convert("L").point(lambda v: 255 if v > 18 else 0)
    box = diff.getbbox()
    if box:
        bottom = min(h, box[3] + 48)
        if bottom < h - 40:
            im.crop((0, 0, w, bottom)).save(path)
            print("trimmed", path, h, "->", bottom)
