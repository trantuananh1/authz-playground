# Drops the empty middle of the header shot so the five groups read at a useful size.
import sys
from PIL import Image

src = Image.open(sys.argv[1]).convert("RGB")
w, h = src.size
left = src.crop((0, 0, int(w * 0.535), h))
right = src.crop((int(w * 0.81), 0, w, h))
gap = 56
out = Image.new("RGB", (left.width + gap + right.width, h), src.getpixel((w // 2, h - 4)))
out.paste(left, (0, 0))
out.paste(right, (left.width + gap, 0))
out.save(sys.argv[2])
