"""Tạo dữ liệu thử .xlsx bằng thư viện có sẵn của Python, không ghi vào database."""
import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import urlopen
from uuid import uuid4
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED


# Tên danh mục, slug ưu tiên và thông tin sản phẩm: tên, đơn vị, quy cách, giá bán.
GROUPS = [
    ('Rau lá', 'demo-rau-la', [
        ('Rau muống', 'bó', 'Bó 500g', 15000), ('Rau mồng tơi', 'bó', 'Bó 300g', 12000),
        ('Cải thìa', 'kg', 'Bán theo kg', 32000), ('Cải bó xôi', 'kg', 'Bán theo kg', 48000),
        ('Xà lách romaine', 'kg', 'Bán theo kg', 45000), ('Rau dền', 'bó', 'Bó 300g', 12000),
        ('Rau ngót', 'bó', 'Bó 300g', 15000), ('Rau tần ô', 'bó', 'Bó 300g', 14000),
    ], 30),
    ('Củ và quả', 'demo-cu-qua', [
        ('Củ dền', 'kg', 'Bán theo kg', 38000), ('Bí đỏ', 'kg', 'Bán theo kg', 25000),
        ('Bí xanh', 'kg', 'Bán theo kg', 22000), ('Khoai lang mật', 'kg', 'Bán theo kg', 40000),
        ('Củ cải trắng', 'kg', 'Bán theo kg', 20000), ('Bầu xanh', 'kg', 'Bán theo kg', 22000),
        ('Mướp hương', 'kg', 'Bán theo kg', 28000), ('Bắp cải tím', 'kg', 'Bán theo kg', 35000),
    ], 60),
    ('Trái cây', 'demo-trai-cay', [
        ('Lê Hàn Quốc', 'kg', 'Bán theo kg', 85000), ('Lê xanh', 'kg', 'Bán theo kg', 55000),
        ('Ổi ruột hồng', 'kg', 'Bán theo kg', 35000), ('Cam sành', 'kg', 'Bán theo kg', 42000),
        ('Quýt ngọt', 'kg', 'Bán theo kg', 55000), ('Dưa hấu', 'kg', 'Bán theo kg', 22000),
        ('Dưa lưới', 'kg', 'Bán theo kg', 65000), ('Đu đủ chín', 'kg', 'Bán theo kg', 28000),
        ('Bơ sáp', 'kg', 'Bán theo kg', 75000), ('Thanh long ruột đỏ', 'kg', 'Bán theo kg', 40000),
    ], 60),
    ('Thịt tươi', 'demo-thit-tuoi', [
        ('Ức gà phi lê', 'kg', 'Bán theo kg', 95000), ('Ba rọi heo', 'kg', 'Bán theo kg', 145000),
        ('Nạc vai heo', 'kg', 'Bán theo kg', 130000), ('Thịt bò thăn', 'kg', 'Bán theo kg', 280000),
        ('Sườn non heo', 'kg', 'Bán theo kg', 170000),
    ], 90),
    ('Thủy hải sản', 'demo-thuy-hai-san', [
        ('Cá hồi phi lê', 'kg', 'Bán theo kg', 420000), ('Cá basa phi lê', 'kg', 'Bán theo kg', 95000),
        ('Cá diêu hồng', 'kg', 'Bán theo kg', 65000), ('Mực ống', 'kg', 'Bán theo kg', 220000),
        ('Nghêu trắng', 'kg', 'Bán theo kg', 55000),
    ], 90),
    ('Trứng', 'trung', [
        ('Trứng vịt hộp 10 quả', 'hộp', 'Hộp 10 quả', 42000),
        ('Trứng cút hộp 30 quả', 'hộp', 'Hộp 30 quả', 30000),
    ], 60),
    ('Sữa', 'demo-sua', [
        ('Sữa chua không đường', 'lốc', 'Lốc 4 hộp 100g', 32000),
        ('Sữa hạt hạnh nhân', 'hộp', 'Hộp 1 lít', 65000),
        ('Sữa đậu nành ít đường', 'hộp', 'Hộp 1 lít', 35000),
    ], 180),
    ('Gạo và ngũ cốc', 'demo-ngu-coc', [
        ('Gạo lứt đỏ', 'túi', 'Túi 2kg', 85000), ('Yến mạch cán dẹt', 'gói', 'Gói 500g', 55000),
        ('Đậu xanh cà vỏ', 'gói', 'Gói 500g', 38000),
    ], 365),
    ('Bánh', 'demo-banh', [
        ('Bánh mì sandwich', 'gói', 'Gói 500g', 32000), ('Bánh bao chay', 'gói', 'Gói 4 cái', 35000),
    ], 45),
    ('Nấm', 'demo-nam', [
        ('Nấm kim châm', 'gói', 'Gói 200g', 18000), ('Nấm mỡ trắng', 'gói', 'Gói 200g', 30000),
    ], 30),
    ('Gia vị', 'demo-gia-vi', [('Tỏi khô', 'gói', 'Gói 250g', 22000)], 180),
    ('Đồ uống', 'demo-do-uong', [('Nước dừa đóng hộp', 'hộp', 'Hộp 1 lít', 42000)], 365),
]

HEADERS = ['SKU', 'Mã sản phẩm', 'Tên sản phẩm', 'Danh mục', 'Quy cách', 'Đơn vị',
           'Bước bán', 'Giá bán', 'Số lượng', 'Giá nhập', 'Mã lô', 'Ngày sản xuất', 'Hạn sử dụng']
MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'


def column_name(number):
    result = ''
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def worksheet(rows, widths, filtered=False):
    row_xml = []
    for row_number, row in enumerate(rows, 1):
        cells = []
        for index, value in enumerate(row, 1):
            reference = f'{column_name(index)}{row_number}'
            style = 1 if row_number == 1 else 3 if isinstance(value, (int, float)) else 2
            if isinstance(value, (int, float)):
                cells.append(f'<c r="{reference}" s="{style}"><v>{value}</v></c>')
            else:
                cells.append(f'<c r="{reference}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{escape(str(value))}</t></is></c>')
        row_xml.append(f'<row r="{row_number}" ht="{30 if row_number == 1 else 24}" customHeight="1">{"".join(cells)}</row>')
    cols = ''.join(f'<col min="{index}" max="{index}" width="{width}" customWidth="1"/>' for index, width in enumerate(widths, 1))
    last = f'{column_name(max(map(len, rows)))}{len(rows)}'
    auto_filter = f'<autoFilter ref="A1:{last}"/>' if filtered else ''
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="{MAIN_NS}"><dimension ref="A1:{last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="24"/><cols>{cols}</cols><sheetData>{''.join(row_xml)}</sheetData>{auto_filter}</worksheet>'''


def write_workbook(destination, sheets):
    styles = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="{MAIN_NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.###"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF287A32"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFE3E9E0"/></left><right style="thin"><color rgb="FFE3E9E0"/></right><top style="thin"><color rgb="FFE3E9E0"/></top><bottom style="thin"><color rgb="FFE3E9E0"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'''
    content_types = ''.join(f'<Override PartName="/xl/worksheets/sheet{index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for index in range(1, len(sheets) + 1))
    workbook_sheets = ''.join(f'<sheet name="{name}" sheetId="{index}" r:id="rId{index}"/>' for index, (name, *_) in enumerate(sheets, 1))
    relationships = ''.join(f'<Relationship Id="rId{index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{index}.xml"/>' for index in range(1, len(sheets) + 1))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', f'''<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>{content_types}</Types>''')
        archive.writestr('_rels/.rels', '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>''')
        archive.writestr('xl/workbook.xml', f'''<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="{MAIN_NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>{workbook_sheets}</sheets></workbook>''')
        archive.writestr('xl/_rels/workbook.xml.rels', f'''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{relationships}<Relationship Id="rId{len(sheets) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>''')
        archive.writestr('xl/styles.xml', styles)
        for index, (_, rows, widths, filtered) in enumerate(sheets, 1):
            archive.writestr(f'xl/worksheets/sheet{index}.xml', worksheet(rows, widths, filtered))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--api-url', default='http://127.0.0.1:8000/api')
    parser.add_argument('--ngay', default=datetime.now(timezone(timedelta(hours=7))).date().isoformat())
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'nhap-hang-50-san-pham.xlsx')
    options = parser.parse_args()
    today = datetime.strptime(options.ngay, '%Y-%m-%d').date()
    with urlopen(options.api_url.rstrip('/') + '/category?pageNumber=0&pageSize=100', timeout=10) as response:
        categories = json.load(response)['data']
    run_code = 'T50-' + today.strftime('%y%m%d') + '-' + uuid4().hex[:4].upper()
    rows = []
    for category_name, preferred_slug, products, expiry_days in GROUPS:
        category = next((entry for entry in categories if entry['slug'] == preferred_slug), None)
        if not category:
            category = next((entry for entry in categories if entry['name'].casefold() == category_name.casefold()), None)
        if not category:
            raise ValueError('Không tìm thấy danh mục: ' + category_name)
        for name, unit, variant_name, price in products:
            index = len(rows) + 1
            code = f'{run_code}-{index:03}'
            quantity = [10, 15.5, 20, 25.5][index % 4] if unit == 'kg' else 20 + index % 5 * 5
            rows.append([code + ('-KG' if unit == 'kg' else '-GOI'), code, name, category['slug'],
                         variant_name, unit, 0.5 if unit == 'kg' else 1, price, quantity,
                         int(price * 0.65 / 1000) * 1000, f'LO-{today:%y%m%d}-{index:03}',
                         today.isoformat(), (today + timedelta(days=expiry_days)).isoformat()])
    assert len(rows) == 50 and len({row[0] for row in rows}) == 50 and len({row[1] for row in rows}) == 50
    guide = [
        ['Mục', 'Nội dung'],
        ['Dữ liệu', '50 sản phẩm mới, mỗi sản phẩm có 1 SKU và 1 lô; mã được tạo riêng cho lần xuất file.'],
        ['Ngày tạo', today.isoformat()],
        ['Cách dùng', 'Nhân viên → Nhập hàng → Chọn file Excel → Kiểm tra dữ liệu → Gửi quản trị viên duyệt.'],
        ['Sheet nhập', 'Giữ sheet San pham ở vị trí đầu tiên; không sửa tên các cột ở dòng 1.'],
        ['Danh mục', 'Cột Danh mục dùng slug đã đọc từ website hiện tại, không dùng tên hiển thị.'],
        ['Đơn giá', 'Giá bán và giá nhập là đồng Việt Nam trên mỗi đơn vị bán; là số nguyên không âm.'],
        ['Số lượng', 'Có sản phẩm bán theo kg với bước 0.5 và sản phẩm đóng gói với bước 1.'],
        ['Ngày tháng', 'Ngày sản xuất và hạn sử dụng là dữ liệu thử, lưu dạng YYYY-MM-DD; cập nhật theo lô thực tế.'],
        ['Sau khi duyệt', 'Sản phẩm mới được tạo nháp. Bổ sung ảnh và hoàn thiện thông tin trước khi đăng bán.'],
        ['Nhập lô khác', 'Giữ nguyên SKU sản phẩm cũ, dùng mã lô mới và hạn sử dụng tương ứng.'],
        ['Tạo lại file', 'Chạy python test-data/tao_excel_50_san_pham.py khi backend đang mở.'],
    ]
    category_rows = [['Tên danh mục', 'Slug dùng trong file']] + [[entry['name'], entry['slug']] for entry in categories]
    write_workbook(options.output, [
        ('San pham', [HEADERS] + rows, [27, 24, 32, 24, 24, 12, 12, 17, 13, 17, 23, 18, 18], True),
        ('Huong dan', guide, [23, 115], False),
        ('Danh muc', category_rows, [27, 32], True),
    ])
    print(json.dumps({'file': str(options.output), 'products': len(rows), 'categories': len({row[3] for row in rows}), 'date': today.isoformat()}, ensure_ascii=False))


if __name__ == '__main__':
    main()
