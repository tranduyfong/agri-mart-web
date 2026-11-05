"""Tạo 50 dòng thử nhập: 10 dòng cũ, 30 sản phẩm mới và 10 dòng cố ý lỗi."""
import argparse
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import urlopen
from uuid import uuid4
from xml.etree import ElementTree
from zipfile import ZipFile
from tao_excel_50_san_pham import HEADERS, MAIN_NS, write_workbook


NEW_PRODUCTS = [
    ('Cải bẹ xanh', 'demo-rau-la', 'kg', 'Bán theo kg', 28000),
    ('Cải xoăn kale', 'demo-rau-la', 'kg', 'Bán theo kg', 65000),
    ('Xà lách mỡ', 'demo-rau-la', 'kg', 'Bán theo kg', 40000),
    ('Rau cần nước', 'demo-rau-la', 'bó', 'Bó 300g', 18000),
    ('Rau diếp cá', 'demo-rau-la', 'gói', 'Gói 100g', 12000),
    ('Su hào', 'demo-cu-qua', 'kg', 'Bán theo kg', 24000),
    ('Hành tây', 'demo-cu-qua', 'kg', 'Bán theo kg', 32000),
    ('Củ cải đỏ', 'demo-cu-qua', 'kg', 'Bán theo kg', 48000),
    ('Bí ngòi xanh', 'demo-cu-qua', 'kg', 'Bán theo kg', 38000),
    ('Dưa leo baby', 'demo-cu-qua', 'gói', 'Gói 500g', 35000),
    ('Táo xanh Granny Smith', 'demo-trai-cay', 'kg', 'Bán theo kg', 95000),
    ('Táo Fuji', 'demo-trai-cay', 'kg', 'Bán theo kg', 85000),
    ('Kiwi xanh', 'demo-trai-cay', 'hộp', 'Hộp 500g', 75000),
    ('Chôm chôm', 'demo-trai-cay', 'kg', 'Bán theo kg', 42000),
    ('Nhãn lồng', 'demo-trai-cay', 'kg', 'Bán theo kg', 55000),
    ('Mận đỏ', 'demo-trai-cay', 'kg', 'Bán theo kg', 45000),
    ('Thịt heo xay', 'demo-thit-tuoi', 'khay', 'Khay 500g', 65000),
    ('Cánh gà', 'demo-thit-tuoi', 'kg', 'Bán theo kg', 105000),
    ('Bắp bò', 'demo-thit-tuoi', 'kg', 'Bán theo kg', 260000),
    ('Cá thu cắt khúc', 'demo-thuy-hai-san', 'khay', 'Khay 500g', 95000),
    ('Cá trích', 'demo-thuy-hai-san', 'kg', 'Bán theo kg', 65000),
    ('Bạch tuộc', 'demo-thuy-hai-san', 'kg', 'Bán theo kg', 180000),
    ('Trứng gà ta hộp 6 quả', 'trung', 'hộp', 'Hộp 6 quả', 32000),
    ('Trứng vịt muối hộp 4 quả', 'trung', 'hộp', 'Hộp 4 quả', 38000),
    ('Sữa tươi ít béo', 'demo-sua', 'hộp', 'Hộp 1 lít', 42000),
    ('Sữa chua uống', 'demo-sua', 'lốc', 'Lốc 4 chai 180ml', 38000),
    ('Đậu đen', 'demo-ngu-coc', 'gói', 'Gói 500g', 35000),
    ('Hạt sen khô', 'demo-ngu-coc', 'gói', 'Gói 250g', 65000),
    ('Bánh mì nguyên hạt', 'demo-banh', 'gói', 'Gói 300g', 35000),
    ('Nấm đùi gà', 'demo-nam', 'gói', 'Gói 250g', 32000),
]


def read_original(file):
    namespace = {'s': MAIN_NS}
    with ZipFile(file) as archive:
        sheet = ElementTree.fromstring(archive.read('xl/worksheets/sheet1.xml'))
    rows = []
    for row in sheet.findall('s:sheetData/s:row', namespace):
        values = [''] * len(HEADERS)
        for cell in row:
            index = 0
            for letter in ''.join(character for character in cell.get('r') if character.isalpha()):
                index = index * 26 + ord(letter) - 64
            if cell.get('t') == 'inlineStr':
                value = ''.join(cell.find('s:is', namespace).itertext())
            else:
                raw = cell.find('s:v', namespace)
                value = float(raw.text) if raw is not None else ''
                if isinstance(value, float) and value.is_integer():
                    value = int(value)
            values[index - 1] = value
        rows.append(values)
    if rows[0] != HEADERS or len(rows) != 51:
        raise ValueError('File gốc phải có đúng tiêu đề và 50 sản phẩm đã tạo trước đó.')
    return rows[1:]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path(__file__).parent / 'nhap-hang-50-san-pham.xlsx')
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'nhap-hang-50-dong-hon-hop.xlsx')
    parser.add_argument('--ngay', default=datetime.now(timezone(timedelta(hours=7))).date().isoformat())
    parser.add_argument('--api-url', default='http://127.0.0.1:8000/api')
    options = parser.parse_args()
    today = datetime.strptime(options.ngay, '%Y-%m-%d').date()
    original = read_original(options.source)
    old_rows = [row.copy() for row in original[:10]]
    if any(row[12] < today.isoformat() for row in old_rows):
        raise ValueError('Lô trong file gốc đã hết hạn. Cần tạo lại và nhập file gốc trước khi thử bộ dữ liệu hỗn hợp.')
    with urlopen(options.api_url.rstrip('/') + '/category?pageNumber=0&pageSize=100', timeout=10) as response:
        categories = json.load(response)['data']
    slugs = {category['slug'] for category in categories}
    if any(product[1] not in slugs for product in NEW_PRODUCTS):
        raise ValueError('Danh mục hiện tại không đủ cho dữ liệu mới.')
    run_code = 'M50-' + today.strftime('%y%m%d') + '-' + uuid4().hex[:4].upper()
    new_rows = []
    for index, (name, category, unit, variant, price) in enumerate(NEW_PRODUCTS, 1):
        code = f'{run_code}-N{index:02}'
        new_rows.append([code + '-SKU', code, name, category, variant, unit, 0.5 if unit == 'kg' else 1,
                         price, 15.5 if unit == 'kg' else 20, int(price * .65 / 1000) * 1000,
                         f'LO-{run_code}-N{index:02}', today.isoformat(),
                         (today + timedelta(days=90 + index)).isoformat()])
    assert len(new_rows) == 30
    assert not {row[0] for row in new_rows} & {row[0] for row in original}
    assert not {row[2] for row in new_rows} & {row[2] for row in original}

    error_specs = [
        ('Thiếu SKU', 'Thiếu SKU hoặc SKU quá dài', {0: ''}),
        ('Số lượng bằng 0', 'Số lượng phải dương, tối đa 3 chữ số thập phân', {8: 0}),
        ('Số lượng âm', 'Số lượng phải dương, tối đa 3 chữ số thập phân', {8: -5}),
        ('Giá nhập âm', 'Giá nhập phải là số nguyên không âm', {9: -1000}),
        ('Giá nhập có phần thập phân', 'Giá nhập phải là số nguyên không âm', {9: 12000.5}),
        ('Thiếu mã lô', 'Thiếu mã lô hoặc mã lô quá dài', {10: ''}),
        ('Hạn sử dụng đã hết', 'Hạn sử dụng không hợp lệ hoặc đã hết hạn', {11: '2019-12-01', 12: '2020-01-01'}),
        ('Ngày hết hạn không tồn tại', 'Hạn sử dụng không hợp lệ hoặc đã hết hạn', {11: '', 12: f'{today.year + 1}-02-30'}),
        ('Ngày sản xuất ở tương lai', 'Ngày sản xuất không hợp lệ', {11: (today + timedelta(days=2)).isoformat()}),
        ('Danh mục không tồn tại', 'SKU mới cần mã, tên sản phẩm, quy cách và danh mục hợp lệ', {3: 'test-danh-muc-khong-ton-tai'}),
    ]
    error_rows = []
    expected_errors = []
    for index, (label, message, replacements) in enumerate(error_specs, 1):
        code = f'{run_code}-E{index:02}'
        row = new_rows[0].copy()
        row[0], row[1], row[2], row[10] = code + '-SKU', code, f'[LOI {index:02}] {label}', f'LO-{code}'
        for column, value in replacements.items():
            row[column] = value
        error_rows.append(row)
        expected_errors.append({'row_number': 41 + index, 'label': label, 'message': message})

    rows = old_rows + new_rows + error_rows
    assert len(rows) == 50
    comparison = [['Dòng Excel', 'Nhóm', 'SKU', 'Tên sản phẩm', 'Kết quả dự kiến']]
    for index, row in enumerate(rows):
        if index < 10:
            group, description = 'Cũ từ file trước', 'Hợp lệ; cùng SKU và mã lô, nhập lại sẽ cộng thêm tồn nếu file trước đã được duyệt.'
        elif index < 40:
            group, description = 'Sản phẩm mới', 'Hợp lệ; tạo sản phẩm/SKU mới ở trạng thái nháp sau khi quản trị viên duyệt.'
        else:
            group, description = 'Cố ý lỗi', expected_errors[index - 40]['message']
        comparison.append([index + 2, group, row[0], row[2], description])
    guide = [
        ['Mục', 'Nội dung'],
        ['Tổng số', '50 dòng = 10 dòng cũ nguyên bản + 30 sản phẩm mới hợp lệ + 10 dòng cố ý lỗi.'],
        ['File trước', options.source.name],
        ['Điều kiện', 'Nhập và được quản trị viên duyệt file trước để 10 SKU cũ đã có trong hệ thống.'],
        ['Dòng 2–11', 'Sao chép nguyên 10 dòng đầu của file trước, gồm SKU, mã sản phẩm, mã lô, giá và ngày tháng.'],
        ['Nhập trùng lô', 'Nhập lại cùng SKU và mã lô là nghiệp vụ cộng thêm tồn, không phải lỗi trùng sản phẩm.'],
        ['Dòng 12–41', '30 sản phẩm mới hợp lệ, có tên và SKU khác file trước.'],
        ['Dòng 42–51', '10 dòng lỗi có chủ ý; xem sheet Doi chieu để biết lỗi của từng dòng.'],
        ['Kết quả', 'Dự kiến 40 dòng hợp lệ, 10 dòng lỗi. Chưa thể gửi duyệt khi còn lỗi; sửa hoặc xóa 10 dòng lỗi rồi kiểm tra lại.'],
        ['SKU mới trên giao diện', 'Chỉ số SKU mới hiện đếm cả SKU ở dòng lỗi; không phải số sản phẩm mới hợp lệ.'],
        ['Giữ cấu trúc', 'Giữ San pham là sheet đầu tiên và không đổi tiêu đề cột.'],
        ['Ngày mẫu', today.isoformat() + '; ngày tháng, giá và số lượng là dữ liệu thử.'],
        ['Phạm vi', 'Tạo file để kiểm tra; không tự gửi yêu cầu duyệt hoặc nhập kho.'],
    ]
    write_workbook(options.output, [
        ('San pham', [HEADERS] + rows, [29, 27, 38, 26, 24, 12, 12, 17, 13, 17, 32, 18, 18], True),
        ('Doi chieu', comparison, [14, 23, 29, 38, 105], True),
        ('Huong dan', guide, [27, 120], False),
        ('Danh muc', [['Tên danh mục', 'Slug']] + [[category['name'], category['slug']] for category in categories], [28, 32], True),
    ])
    expected = {
        'file': options.output.name, 'source_file': options.source.name,
        'source_sha256': hashlib.sha256(options.source.read_bytes()).hexdigest(),
        'date': today.isoformat(), 'total_rows': 50, 'old_rows': 10, 'valid_new_rows': 30,
        'valid_rows': 40, 'error_rows': 10, 'errors': expected_errors,
    }
    manifest = options.output.with_suffix('.expected.json')
    manifest.write_text(json.dumps(expected, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'file': str(options.output), 'oldRows': 10, 'validNewRows': 30, 'errorRows': 10, 'total': len(rows)}))


if __name__ == '__main__':
    main()
