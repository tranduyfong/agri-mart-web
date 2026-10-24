import Papa from 'papaparse';
export const downloadCsv = (name: string, rows: Record<string, string | number | null>[]) => {
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + Papa.unparse(rows, { escapeFormulae: true })], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name + '.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};
