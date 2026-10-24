import { useRef } from 'react';
import { Button, Space } from 'antd';
const ContentEditor = ({ value = '', onChange }: { value?: string; onChange?: (value: string) => void }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (before: string, after: string, placeholder: string) => {
    const start = ref.current?.selectionStart ?? value.length;
    const end = ref.current?.selectionEnd ?? start;
    onChange?.(value.slice(0, start) + before + (value.slice(start, end) || placeholder) + after + value.slice(end));
    ref.current?.focus();
  };
  return (
    <div>
      <Space wrap className="mb-3">
        <Button onClick={() => insert('**', '**', 'In đậm')}>
          <strong>B</strong>
        </Button>
        <Button onClick={() => insert('*', '*', 'In nghiêng')}>
          <em>I</em>
        </Button>
        <Button onClick={() => insert('[', '](https://agrimart.vn)', 'Tên liên kết')}>Liên kết</Button>
        <Button onClick={() => insert('![', '](https://...)', 'Mô tả ảnh')}>Chèn ảnh</Button>
      </Space>
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        maxLength={30000}
        rows={12}
        className="w-full rounded-lg border border-line bg-white p-4 outline-none focus:border-primary"
        placeholder="Xin chào bạn,..."
      />
    </div>
  );
};
export default ContentEditor;
