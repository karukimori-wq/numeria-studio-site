"""Check every page and original embedded screenshot in the local review PDF."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image
from pypdf import PdfReader

manifest_path, pdf_path, proof_path = map(Path, sys.argv[1:])
data = json.loads(manifest_path.read_text())
reader = PdfReader(pdf_path)
frames = [page for case in data['cases'] for page in case['pages']]
assert len(data['cases']) == 28 and len(reader.pages) == len(frames) + 2
assert '未承認' in reader.pages[0].extract_text()
assert '本文は画像' in reader.pages[0].extract_text()
assert 'ページ対応表' in reader.pages[1].extract_text()
for i, page in enumerate(reader.pages):
    assert abs(float(page.mediabox.width) - 595.2756) < .1
    assert abs(float(page.mediabox.height) - 841.8898) < .1
    assert '組版確認用・未承認' in page.extract_text()
    if i < 2:
        continue
    frame = frames[i - 2]
    path = manifest_path.parent / frame['file']
    source = path.read_bytes()
    assert hashlib.sha256(source).hexdigest() == frame['sha256']
    with Image.open(path) as image:
        assert image.format == 'PNG' and image.size == (794, 1123)
        pixels = image.convert('RGB').tobytes()
    full_path = manifest_path.parent / frame['fullFrame']
    assert hashlib.sha256(full_path.read_bytes()).hexdigest() == frame['fullFrameSha256']
    with Image.open(full_path) as full_image:
        assert full_image.crop(frame['cropBox']).convert('RGB').tobytes() == pixels
    objects = [item.get_object() for item in page['/Resources']['/XObject'].values()]
    images = [item for item in objects if item.get('/Subtype') == '/Image']
    assert len(images) == 1
    # PNG is embedded losslessly as RGB pixels.
    assert images[0]['/ColorSpace'] == '/DeviceRGB'
    assert images[0].get_data() == pixels, f'Embedded source differs on PDF page {i+1}'
proof = {'date': data['date'], 'pdfPages': len(reader.pages), 'capturedPages': len(frames),
         'cases': 28, 'embeddedSourcePixelEquality': len(frames), 'fullScreenshotCropPixelEquality': len(frames), 'allPagesA4': True,
         'bodyImageBased': True, 'publicationAllowed': False,
         'pdfSha256': hashlib.sha256(pdf_path.read_bytes()).hexdigest()}
proof_path.write_text(json.dumps(proof, indent=2))
print(json.dumps(proof))
