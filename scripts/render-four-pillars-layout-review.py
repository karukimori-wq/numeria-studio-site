"""Build a local, unapproved image-based A4 proof from CUA screen captures."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

manifest_path, output_path, font_path = map(Path, sys.argv[1:])
data = json.loads(manifest_path.read_text())
assert data['publicationAllowed'] is False and data['syntheticInput'] is True
cases = data['cases']
expected = {(f'BAZ-{i:02}', layout) for layout in ['standard', 'magazine'] for i in range(1, 15)}
assert len(cases) == 28 and {(c['id'], c['layout']) for c in cases} == expected
root = manifest_path.parent.resolve()
frames = []
for case in cases:
    assert case['pages']
    for index, page in enumerate(case['pages'], 1):
        path = (root / page['file']).resolve()
        assert path.is_relative_to(root) and path.is_file()
        assert hashlib.sha256(path.read_bytes()).hexdigest() == page['sha256']
        with Image.open(path) as img:
            assert img.width >= 794 and img.height >= 1123
            assert abs(img.width / img.height - 794 / 1123) < .002
        assert page['width'] == 794 and page['height'] == 1123
        assert page['contentHeight'] <= page['bodyHeight'] + .5
        assert '計算確認用・未承認' in page['text']
        assert f'A4検査 {index} / {len(case["pages"])}' in page['text']
        frames.append((case, page, path))

pdfmetrics.registerFont(TTFont('ReviewJP', str(font_path)))
output_path.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(output_path), pagesize=A4, pageCompression=1)
c.setTitle('四柱推命 A4組版確認用 - 未承認')
c.setAuthor('Numeria Studio development review')
c.setSubject('Synthetic draft screen proof. Not an application-issued report or an approved PDF.')
W, H = A4
ink, brown = colors.HexColor('#292330'), colors.HexColor('#835f32')
total = len(frames) + 2

def text(x, y, value, size=11, color=ink):
    c.setFillColor(color)
    c.setFont('ReviewJP', size)
    c.drawString(x, y, value)

def footer(number):
    text(36, 17, '組版確認用・未承認 / 正式発行不可', 8, brown)
    c.setFont('Helvetica', 8)
    c.drawRightString(W - 36, 17, f'{number} / {total}')

c.setFillColor(colors.HexColor('#f6f3ec'))
c.rect(0, 0, W, H, fill=1, stroke=0)
text(48, H - 82, 'NUMERIA STUDIO / LAYOUT REVIEW', 11, brown)
text(48, H - 160, '四柱推命', 32)
text(48, H - 205, 'A4組版確認用', 28)
c.setStrokeColor(brown)
c.line(48, H - 235, W - 48, H - 235)
for line, y in zip([
    '未承認・正式発行不可',
    f'作成日 {data["date"]} / 架空の検証入力',
    f'14ページ定義 × 2レイアウト / 収録紙面 {len(frames)}枚',
    '認証済み管理者の検証画面を、A4枠ごとに画像収録しました。',
    'スタンダードとマガジンの改ページ・表・図・原文を比較できます。',
    '本文は画像です。アプリの正式PDF出力ではありません。',
    '専門確認、独立した計算正解、原文・素材の承認は未完了です。',
    '元の印刷停止・保存API・承認状態は変更していません。',
], [H-285, H-325, H-350, H-405, H-430, H-480, H-505, H-530]):
    text(48, y, line, 11 if '未承認' not in line else 14, brown if '未承認' in line else ink)
text(48, 115, '画面・コードの対応', 12, brown)
text(48, 91, f'build {data["sha"][:12]} / source captures verified by SHA-256', 9)
footer(1)
c.showPage()

text(40, H - 55, 'ページ対応表', 20)
text(40, H - 80, '以下はこのPDFの通しページです。各画面のA4番号とは区別します。', 9)
lookup, next_page = {}, 3
for case in cases:
    lookup[(case['id'], case['layout'])] = f'{next_page}-{next_page+len(case["pages"])-1}'
    next_page += len(case['pages'])
text(40, H - 119, 'ページ定義', 10, brown)
text(350, H - 119, 'スタンダード', 10, brown)
text(460, H - 119, 'マガジン', 10, brown)
for i in range(1, 15):
    case = next(item for item in cases if item['id'] == f'BAZ-{i:02}')
    y = H - 151 - (i - 1) * 33
    text(40, y, case['title'], 10)
    text(370, y, lookup[(case['id'], 'standard')], 10)
    text(478, y, lookup[(case['id'], 'magazine')], 10)
text(40, 150, '確認メモ：文字や図の欠け／重なり／不自然な空白／改ページ位置', 10, brown)
for y in [126, 100, 74]:
    c.setStrokeColor(colors.HexColor('#d1c5b1'))
    c.line(40, y, W - 40, y)
footer(2)
c.showPage()
for number, (case, page, path) in enumerate(frames, 3):
    c.drawImage(str(path), 0, 0, width=W, height=H)
    footer(number)
    c.showPage()
c.save()
print(json.dumps({'pages': total, 'capturedPages': len(frames), 'cases': len(cases), 'publicationAllowed': False}))
