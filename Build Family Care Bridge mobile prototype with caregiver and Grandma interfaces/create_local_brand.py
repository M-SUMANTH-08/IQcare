from PIL import Image
from pathlib import Path
src = Image.open('/home/ubuntu/webdev-static-assets/iqcare-logo.png').convert('RGB')
out = Path('/home/ubuntu/family-care-bridge/client/public/brand')
out.mkdir(parents=True, exist_ok=True)
src.save(out/'iqcare-logo.webp', 'WEBP', quality=82, method=6)
print(out/'iqcare-logo.webp')
