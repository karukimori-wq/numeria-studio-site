"""Crop the observed A4 rectangle from full CUA screenshots without retouching."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

manifest = Path(sys.argv[1])
root = manifest.parent.resolve()
data = json.loads(manifest.read_text())
for case in data['cases']:
    for page in case['pages']:
        source = (root / page['fullFrame']).resolve()
        target = (root / page['file']).resolve()
        assert source.is_relative_to(root) and target.is_relative_to(root)
        x, y = round(page['x']), round(page['y'])
        with Image.open(source) as image:
            assert x >= 0 and y >= 0 and x + 794 <= image.width and y + 1123 <= image.height
            image.crop((x, y, x + 794, y + 1123)).save(target, format='PNG')
        page['fullFrameSha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
        page['cropBox'] = [x, y, x + 794, y + 1123]
        page['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2))
count = sum(len(case['pages']) for case in data['cases'])
print(f'Cropped {count} observed A4 rectangles; no pixel retouching or scaling.')
