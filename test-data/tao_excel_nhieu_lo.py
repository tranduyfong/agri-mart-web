"""Tạo file thử một SKU nhiều lô khác giá/hạn, không ghi vào database."""
import argparse
import json
from datetime import date, timedelta
from pathlib import Path
from urllib.request import urlopen
from uuid import uuid4
from tao_excel_50_san_pham import HEADERS, write_workbook


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--api-url', default='http://127.0.0.1:8000/api')
    parser.add_argument('--ngay', default=date.today().isoformat())
    options = parser.parse_args()
    today = date.fromisoformat(options.ngay)
    try:
        with urlopen(options.api_url + '/category?pageSize=100', timeout=5) as response:
            categories = json.load(response)['data']
    except OSError:
        categories = [{'slug': 'demo-trai-cay', 'name': 'Trái cây'}]
    if not categories:
        raise ValueError('Cần tạo ít nhất một danh mục trước khi dùng file thử.')
    category = next((item for item in categories if 'trai' in item['slug']), categories[0])
    prefix = 'TEST-LO-' + today.strftime('%y%m%d') + '-' + uuid4().hex[:4].upper()
    names = ['Lê thử theo lô', 'Táo thử theo lô', 'Ổi thử theo lô', 'Cam thử theo lô', 'Nho thử theo lô', 'Xoài thử theo lô']
    rows = []
    for index, name in enumerate(names, 1):
        code = f'{prefix}-{index:02}'
        for lot, days, price, quantity in [('A', 25, 50000, 2), ('B', 28, 60000, 5)]:
            rows.append([code + '-500G', code, name, category['slug'], 'Túi 500g', 'túi', 1, price,
                         quantity, 30000 if lot == 'A' else 35000, code + '-' + lot,
                         today.isoformat(), (today + timedelta(days=days)).isoformat(), ''])
    guide = [
        ['Mục', 'Hướng dẫn / kết quả mong đợi'],
        ['Dữ liệu', '12 dòng, 6 sản phẩm, 6 SKU; mỗi SKU có 2 lô. Tất cả dòng hợp lệ.'],
        ['Danh mục', category['slug'] + ' — nếu không có danh mục này trên máy của bạn, thay bằng slug danh mục đã tạo.'],
        ['Cách nhập', 'Nhân viên > Nhập hàng > chọn file > Kiểm tra dữ liệu > chọn nhà cung cấp > Gửi admin duyệt.'],
        ['Sau duyệt', 'Sản phẩm ở bản nháp. Bổ sung ảnh và đăng bán để thử giao diện khách hàng.'],
        ['Mua 1 túi', 'Lấy lô A gần hết hạn, tiền hàng 50.000đ.'],
        ['Mua 3 túi', 'Vẫn một SKU: 2 túi lô A × 50.000đ + 1 túi lô B × 60.000đ = 160.000đ, chưa phí/ưu đãi.'],
        ['Hết lô A', 'Giá hiển thị chuyển sang 60.000đ của lô B.'],
        ['Hủy đơn', 'Trả đúng lượng về lô A và lô B; không mất giá/hạn riêng.'],
        ['Nhà cung cấp', 'Cả file: 42 túi, tổng giá trị nhập 1.410.000đ; chỉ thống kê sau khi admin duyệt.'],
        ['Ảnh', 'Cột image_url tùy chọn; file để trống để bạn tự chọn ảnh thử.'],
        ['Chạy lại', 'Không gửi lại cùng file để tránh nhập thêm tồn. Tạo file mới bằng python test-data/tao_excel_nhieu_lo.py.'],
    ]
    destination = Path(__file__).parent / 'thu-nghiem-mot-sku-nhieu-lo.xlsx'
    write_workbook(destination, [('San pham', [HEADERS + ['image_url']] + rows,
        [28, 25, 27, 24, 20, 12, 12, 16, 13, 16, 28, 18, 18, 30], True), ('Huong dan', guide, [24, 115], False)])
    print(json.dumps({'file': str(destination), 'rows': len(rows), 'products': 6, 'category': category['slug']}, ensure_ascii=True))


if __name__ == '__main__':
    main()
