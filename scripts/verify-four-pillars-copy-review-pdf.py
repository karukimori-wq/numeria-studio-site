"""Verify source completeness and print bounds of the source-review artifact."""
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader
import pdfplumber

data_path, pdf_path, proof_path = sys.argv[1:]
data = json.loads(Path(data_path).read_text())
reader = PdfReader(pdf_path)
normalized = lambda text: re.sub(r'\s+', '', text)
texts = [normalized(page.extract_text() or '') for page in reader.pages]
assert len(reader.pages) == 35
assert all('未承認' in text for text in texts)
assert '/AcroForm' not in reader.trailer['/Root']
assert len(data['records']) == 128 and len(data['pageAssignments']) == 14
for index, record in enumerate(data['records']):
    page_text = texts[3 + index // 4]
    assert record['copyId'] in page_text, record['copyId']
    assert normalized(record['body']) in page_text, record['copyId']
    assert normalized(record['short']) in page_text, record['copyId']
    assert all(value is None for value in record['review'].values())
with pdfplumber.open(pdf_path) as pdf:
    for number, page in enumerate(pdf.pages, 1):
        for char in page.chars:
            assert 46 <= char['x0'] <= char['x1'] <= page.width - 46, (number, char['text'])
            assert 15 <= char['top'] <= char['bottom'] <= page.height - 14, (number, char['text'])
proof = dict(date=data['date'], pages=35, recordCount=128, pageAssignments=14,
             allBodiesAndShortsOnExpectedPage=True, allPagesMarkedUnapproved=True,
             allReviewFieldsBlank=True, textWithinBounds=True,
             applicationOfficialPDFAcceptance=False, datasetSHA256=data['datasetSHA256'])
Path(proof_path).write_text(json.dumps(proof, indent=2) + '\n')
print(json.dumps(proof))
