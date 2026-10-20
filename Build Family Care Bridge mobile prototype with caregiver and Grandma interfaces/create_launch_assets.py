from PIL import Image, ImageDraw
from pathlib import Path
src = Image.open('/home/ubuntu/webdev-static-assets/iqcare-logo.png').convert('RGB')
public = Path('/home/ubuntu/family-care-bridge/client/public')
public.mkdir(parents=True, exist_ok=True)
# Small favicon: preserve the centered logo mark in a black circular tile.
size = min(src.size)
left = (src.width-size)//2; top = (src.height-size)//2
mark = src.crop((left, top, left+size, top+size)).resize((64,64), Image.Resampling.LANCZOS)
mark.save(public/'favicon.png', optimize=True)
# Social preview: white field with a dark card and recognizable logo mark.
preview = Image.new('RGB', (1200, 630), '#ffffff')
draw = ImageDraw.Draw(preview)
draw.rounded_rectangle((38,38,1162,592), radius=28, fill='#0b0d12')
logo = src.crop((left, top, left+size, top+size)).resize((250,250), Image.Resampling.LANCZOS)
preview.paste(logo, (90,190))
draw.text((390,205), 'iQcare', fill='#ffffff')
draw.text((390,290), 'Signal to Care', fill='#ffd400')
draw.text((390,350), 'Smart for the caregiver. Simple for Grandma.', fill='#dce5ff')
preview.save(public/'social-preview.jpg', quality=86, optimize=True, progressive=True)
(public/'manifest.json').write_text('''{\n  "name": "iQcare — Signal to Care",\n  "short_name": "iQcare",\n  "start_url": "/",\n  "display": "standalone",\n  "background_color": "#0b0d12",\n  "theme_color": "#ffd400",\n  "description": "A device-adaptive family care bridge.",\n  "icons": [{"src":"/favicon.png","sizes":"64x64","type":"image/png"}]\n}\n''')
(public/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://iqcare.example.com/sitemap.xml\n')
(public/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://iqcare.example.com/</loc></url><url><loc>https://iqcare.example.com/privacy</loc></url><url><loc>https://iqcare.example.com/terms</loc></url></urlset>\n')
print('created launch assets')
