"""Validate generated CI PDF fixtures; visual review remains separate. Requires PyMuPDF."""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
import fitz

class Paragraphs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.current = None
    def handle_starttag(self, tag, attrs):
        if tag == 'p': self.current = []
    def handle_data(self, data):
        if self.current is not None: self.current.append(data)
    def handle_endtag(self, tag):
        if tag == 'p' and self.current is not None:
            self.parts.append(''.join(self.current))
            self.current = None

def compact(value):
    return re.sub(r'\s+', '', value)

root = Path(sys.argv[1])
results = []
for name in ['standard-comments-off', 'standard-comments-on', 'magazine-comments-off', 'magazine-comments-on']:
    doc = fitz.open(root / (name + '.pdf'))
    assert len(doc) >= 14, name
    text = ''.join(page.get_text(clip=fitz.Rect(0, 50, page.rect.width, page.rect.height-40)) for page in doc)
    normalized = compact(text)
    for number in range(1, 15):
        assert f'KIG-{number:02}' in text, (name, 'missing chapter', number)
    for index, page in enumerate(doc):
        assert abs(page.rect.width - 595.28) < 2 and abs(page.rect.height - 841.89) < 2, (name, 'not A4')
        assert re.search(rf'{index+1}\s*/\s*{len(doc)}', page.get_text()), (name, 'folio', index+1)
        assert '未承認草案' in page.get_text(), (name, 'draft header', index+1)
        for word in page.get_text('words'):
            assert word[0] >= 15 and word[1] >= 10 and word[2] <= page.rect.width-15 and word[3] <= page.rect.height-10, (name, 'outside page', index+1)
    parser = Paragraphs()
    parser.feed((root / (name + '.html')).read_text())
    checked = 0
    for paragraph in parser.parts:
        value = compact(paragraph)
        if len(value) < 12: continue
        assert value in normalized, (name, 'paragraph missing', value[:50])
        checked += 1
    results.append({'fixture': name, 'pages': len(doc), 'paragraphs': checked, 'result': 'passed'})
print(json.dumps(results, ensure_ascii=False, indent=2))
