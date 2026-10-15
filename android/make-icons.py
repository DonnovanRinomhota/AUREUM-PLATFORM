"""Generates both apps' launcher icons, adaptive icons, splash screens and Play-Store icons from /icons/icon-maskable-512.png.
   python3 android/make-icons.py   (needs Pillow). Re-run after changing the master icon."""
import os, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = Image.open(os.path.join(HERE, '..', 'icons', 'icon-maskable-512.png')).convert('RGBA')
BG = (15, 42, 33, 255)
# the gold coin only (transparent around it)
coin = MASTER.crop((120, 120, 392, 392))
mask = Image.new('L', coin.size, 0); ImageDraw.Draw(mask).ellipse((8, 8, 264, 264), fill=255)
coin = coin.resize((256, 256)); m = mask.resize((256, 256)); coin.putalpha(m)
def font(sz):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
def badge(img, text, band_h):
    d = ImageDraw.Draw(img); w, h = img.size
    d.rectangle((0, h - band_h, w, h), fill=(201, 162, 75, 255))
    f = font(int(band_h * .62)); tw = d.textlength(text, font=f)
    d.text(((w - tw) / 2, h - band_h + band_h * .14), text, font=f, fill=(24, 18, 8, 255))
def full(size, label):       # square legacy / store icon
    img = MASTER.resize((size, size), Image.LANCZOS)
    if label == 'POS':       # POS keeps the same coin, with a gold POS band so the two launchers are told apart at a glance
        badge(img, 'POS', int(size * .22))
    return img
def fg(size, label):         # adaptive foreground, content kept inside the 66/108 safe zone
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    c = coin.resize((int(size * .56), int(size * .56)), Image.LANCZOS)
    y = int(size * .20) if label == 'POS' else (size - c.size[1]) // 2
    img.paste(c, ((size - c.size[0]) // 2, y), c)
    if label == 'POS':
        d = ImageDraw.Draw(img); f = font(int(size * .12)); t = 'POS'; tw = d.textlength(t, font=f)
        d.rounded_rectangle(((size - tw) / 2 - size * .04, size * .70, (size + tw) / 2 + size * .04, size * .70 + size * .15), radius=size * .03, fill=(201, 162, 75, 255))
        d.text(((size - tw) / 2, size * .70 + size * .015), t, font=f, fill=(24, 18, 8, 255))
    return img
def round_(img):
    s = img.size[0]; m = Image.new('L', (s, s), 0); ImageDraw.Draw(m).ellipse((0, 0, s - 1, s - 1), fill=255)
    out = Image.new('RGBA', (s, s), (0, 0, 0, 0)); out.paste(img, (0, 0), m); return out
for app, label in (('backoffice', 'BO'), ('pos', 'POS')):
    res = os.path.join(HERE, app, 'android', 'app', 'src', 'main', 'res')
    for dpi, px in (('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)):
        d = os.path.join(res, 'mipmap-' + dpi); sq = full(px, label)
        sq.save(os.path.join(d, 'ic_launcher.png')); round_(sq).save(os.path.join(d, 'ic_launcher_round.png'))
        fpx = int(px * 108 / 48); fg(fpx, label).save(os.path.join(d, 'ic_launcher_foreground.png'))
    open(os.path.join(res, 'values', 'ic_launcher_background.xml'), 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F2A21</color>\n</resources>\n')
    for p in glob.glob(os.path.join(res, 'drawable*', 'splash.png')):
        w, h = Image.open(p).size; img = Image.new('RGBA', (w, h), BG)
        s = int(min(w, h) * .34); c = coin.resize((s, s), Image.LANCZOS); img.paste(c, ((w - s) // 2, (h - s) // 2), c); img.convert('RGB').save(p)
    store = os.path.join(HERE, app, 'play-store'); os.makedirs(store, exist_ok=True)
    full(512, label).convert('RGB').save(os.path.join(store, 'icon-512.png'))
print('icons written')
