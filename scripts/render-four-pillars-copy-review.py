"""Render the pinned source-review material, separate from application report PDFs."""
import json
import sys
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether

data_path, pdf_path, font_path = sys.argv[1:]
data = json.loads(Path(data_path).read_text())
assert len(data['records']) == 128 and len(data['pageAssignments']) == 14
assert data['publicationAllowed'] is False
assert all(r['reviewStatus'] == 'draft' and r['releaseEnabled'] is False and all(v is None for v in r['review'].values()) for r in data['records'])
pdfmetrics.registerFont(TTFont('ReviewJP', font_path))
ink = colors.HexColor('#292330')
brown = colors.HexColor('#765437')
styles = {
    'title': ParagraphStyle('title', fontName='ReviewJP', fontSize=24, leading=34, textColor=ink, spaceAfter=20, wordWrap='CJK'),
    'h': ParagraphStyle('h', fontName='ReviewJP', fontSize=14, leading=20, textColor=brown, spaceAfter=10, wordWrap='CJK'),
    'body': ParagraphStyle('body', fontName='ReviewJP', fontSize=10.5, leading=16, textColor=ink, wordWrap='CJK', spaceAfter=6),
    'small': ParagraphStyle('small', fontName='ReviewJP', fontSize=8, leading=12, textColor=colors.HexColor('#655d68'), wordWrap='CJK', spaceAfter=5),
    'label': ParagraphStyle('label', fontName='ReviewJP', fontSize=8.5, leading=12, textColor=brown, wordWrap='CJK', spaceAfter=2),
    'id': ParagraphStyle('id', fontName='ReviewJP', fontSize=10.5, leading=15, textColor=brown, wordWrap='CJK', spaceAfter=4),
}
def p(text, style='body'):
    return Paragraph(escape(str(text)), styles[style])

page_width, page_height = A4
left, right = 48, 48
def chrome(canvas, doc):
    canvas.saveState()
    canvas.setTitle('四柱推命 登録原文128部品 内容確認用・未承認')
    canvas.setAuthor('Numeria Studio')
    canvas.setFont('ReviewJP', 8)
    canvas.setFillColor(brown)
    canvas.drawString(left, page_height-29, '原文確認用 / 未承認 / 正式鑑定書ではありません')
    canvas.setStrokeColor(colors.HexColor('#d7c8b5'))
    canvas.line(left, page_height-36, page_width-right, page_height-36)
    canvas.line(left, 34, page_width-right, 34)
    canvas.setFillColor(colors.HexColor('#655d68'))
    canvas.drawString(left, 21, f"{data['date']}  |  draft / releaseEnabled=false")
    canvas.drawRightString(page_width-right, 21, f'{doc.page}')
    canvas.restoreState()

story = [Spacer(1, 32), p('四柱推命\n登録原文レビュー'.replace('\n', ' '), 'title'), p('128部品の全文・短文と14ページへの割当', 'h'), p('この資料は、登録原文の内容・語調・参照先を確認するための検査資料です。鑑定書ではなく、アプリの正式PDF出力を検証した証拠にもなりません。')]
for text in ['本文の専門的な内容と語調、短文が元の意味を保持しているかを確認します。', 'ページごとの割当と必要条件、柱・対象者・期間の参照が妥当かを確認します。', '修正提案はcopyIdと原文版を添えて記録します。各欄はすべて未記入です。', 'この資料への記入は、アプリやNotionの承認状態へ自動反映されません。']:
    story += [p('・'+text)]
story += [Spacer(1, 20), p('原文版', 'label'), p(data['copyVersion']), p('正本', 'label'), p(data['source']['pageUrl'], 'small'), p('正本の最終編集: '+data['source']['pageLastEditedAt'], 'small'), p('登録データ SHA256', 'label'), p(data['datasetSHA256'], 'small'), Spacer(1, 12), p('収録範囲', 'h'), p('日干20 / 通変星40 / 十二運12 / 日支12 / 五行5 / 比較11 / 各柱4 / ページ・期間等22 / 財星2。合計128件。'), p('短文は正本で指定された「本文の最初の一文」です。本文・短文ともに未承認で、全件公開無効を維持しています。'), PageBreak()]
for begin in range(0, 14, 7):
    story += [p(f'14ページへの割当 ({begin+1}-{min(begin+7,14)})', 'h')]
    for row in data['pageAssignments'][begin:begin+7]:
        story += [KeepTogether([p(row['pageId']+' / 解説枠数 '+row['frameCount'], 'id'), p(row['allocation']), p('必要条件: '+row['requirements'], 'small'), Spacer(1, 10)])]
    story += [PageBreak()]

for begin in range(0,128,4):
    story += [p(f'原文 {begin+1:03d}-{min(begin+4,128):03d} / 128', 'h')]
    for r in data['records'][begin:begin+4]:
        block = [p(f"{r['index']:03d}  {r['copyId']}", 'id'), p('本文', 'label'), p(r['body']), p('短文 / 最初の一文', 'label'), p(r['short']), p('状態: draft / 公開無効  |  版: '+r['copyVersion'], 'small'), p('確認結果: □ 要修正   □ 内容確認済   □ 保留', 'small'), p('確認者・日付・修正メモ: __________________________________________________', 'small'), Spacer(1,12)]
        story += [KeepTogether(block)]
    if begin+4 < 128:
        story += [PageBreak()]

doc = SimpleDocTemplate(pdf_path, pagesize=A4, leftMargin=left, rightMargin=right, topMargin=52, bottomMargin=47, title='四柱推命 登録原文レビュー', author='Numeria Studio')
doc.build(story, onFirstPage=chrome, onLaterPages=chrome)
print(pdf_path)
