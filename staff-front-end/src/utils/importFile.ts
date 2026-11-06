// Đọc Excel/CSV, đổi tên cột/ngày thành dữ liệu API cần và tạo file mẫu nhập hàng.
import Papa from 'papaparse';
import type { ImportRow } from '../types/staff';

const aliases: Record<string, string> = {
  sku: 'sku',
  'ma san pham': 'code',
  'ten hang': 'name',
  'ten san pham': 'name',
  'danh muc': 'category_slug',
  'ma danh muc': 'category_slug',
  'quy cach': 'variant_name',
  'don vi': 'unit',
  'buoc ban': 'step_quantity',
  'gia ban': 'list_price',
  'gia ban lo': 'list_price',
  'gia niem yet': 'list_price',
  'so luong': 'quantity',
  'gia nhap': 'unit_cost',
  'ma lo': 'batch_code',
  'ngay san xuat': 'manufactured_date',
  'han su dung': 'expiry_date',
  anh: 'image_url',
  'hinh anh': 'image_url',
  'anh san pham': 'image_url',
  'link anh': 'image_url',
  'link anh san pham': 'image_url',
  'url anh': 'image_url',
  'image url': 'image_url',
  image: 'image_url',
};
// Chuẩn hóa tên cột file để map được các cách viết trong Excel/CSV.
const headerName = (value: unknown) => {
  const text = String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
  return aliases[text] || text;
};
// Đổi giá trị ngày đọc từ file về chuỗi ngày mà API nhập kho nhận.
const dateValue = (value: unknown) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value || '').trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : text;
};

// Đọc bảng dữ liệu và chuyển từng dòng sang các trường SKU, lô, lượng, giá, hạn dùng.
export const readImportFile = async (file: File): Promise<ImportRow[]> => {
  if (file.size > 5 * 1024 * 1024) throw new Error('File tối đa 5MB');
  let rows: unknown[][];
  if (/\.xlsx$/i.test(file.name)) {
    const { default: readXlsxFile } = await import('read-excel-file');
    rows = await readXlsxFile(file);
  } else if (/\.csv$/i.test(file.name)) {
    const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: 'greedy' });
    if (parsed.errors.length)
      throw new Error('CSV không đúng định dạng. Vui lòng kiểm tra dấu phân cách và dấu ngoặc kép.');
    rows = parsed.data;
  } else throw new Error('Chỉ nhận file .xlsx hoặc .csv');
  rows = rows.filter((row) => row.some((value) => value !== null && value !== ''));
  if (rows.length < 2 || rows.length > 1001) throw new Error('File cần có tiêu đề và từ 1 đến 1.000 dòng dữ liệu');
  const headers = rows[0].map(headerName);
  if (['sku', 'quantity', 'unit_cost', 'batch_code', 'expiry_date'].some((field) => !headers.includes(field)))
    throw new Error('File thiếu cột bắt buộc. Hãy tải file mẫu để kiểm tra.');
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length)
    throw new Error('File có cột tiêu đề bị trùng');
  return rows.slice(1).map((row) =>
    Object.fromEntries(
      headers.filter(Boolean).map((field) => {
        const value = row[headers.indexOf(field)];
        return [
          field,
          field.endsWith('_date') ? dateValue(value) : typeof value === 'number' ? value : String(value ?? '').trim(),
        ];
      }),
    ),
  );
};

// Tạo và tải file mẫu với các cột được luồng nhập hàng hỗ trợ.
export const downloadImportTemplate = (categorySlug: string) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const expiry = new Date(new Date(today + 'T00:00:00Z').getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const sample = [
    {
      sku: 'SP-MAU-KG',
      code: 'SP-MAU',
      name: 'Sản phẩm mẫu',
      category_slug: categorySlug,
      variant_name: 'Bán theo kg',
      unit: 'kg',
      step_quantity: 0.5,
      quantity: 10,
      unit_cost: 20000,
      list_price: 30000,
      batch_code: 'LO-' + today.replace(/-/g, ''),
      manufactured_date: today,
      expiry_date: expiry,
      image_url: '', // Cột tùy chọn: điền một link ảnh trực tiếp hoặc để trống.
    },
  ];
  // Cùng một SKU, hai lô khác giá/hạn để minh họa cách nhập mới.
  sample.push({ ...sample[0], list_price: 35000, batch_code: sample[0].batch_code + '-02',
    expiry_date: new Date(new Date(today + 'T00:00:00Z').getTime() + 45 * 86400000).toISOString().slice(0, 10) });
  const url = URL.createObjectURL(new Blob(['\uFEFF' + Papa.unparse(sample)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mau-nhap-hang.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};
