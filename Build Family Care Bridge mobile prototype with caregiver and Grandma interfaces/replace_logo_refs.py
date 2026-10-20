from pathlib import Path
for name in ['Home.tsx', 'Legal.tsx']:
    path = Path('/home/ubuntu/family-care-bridge/client/src/pages') / name
    s = path.read_text().replace('/manus-storage/iqcare-logo_6813f83f.png', '/brand/iqcare-logo.webp')
    path.write_text(s)
print('local logo refs updated')
