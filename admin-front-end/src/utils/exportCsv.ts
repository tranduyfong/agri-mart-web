// Chuyển các dòng báo cáo thành CSV và tạo tệp tải xuống trong trình duyệt.
import Papa from 'papaparse';
// Tạo CSV có tiêu đề cột và xử lý giá trị trước khi tải xuống.
export const downloadCsv = (name: string, rows: Record<string, string | number | null>[]) => {
  // BOM giúp Excel đọc tiếng Việt; escapeFormulae tránh coi nội dung ô bắt đầu bằng dấu đặc biệt là công thức.
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + Papa.unparse(rows, { escapeFormulae: true })], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name + '.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};
