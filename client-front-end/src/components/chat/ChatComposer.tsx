import { useRef, useState } from 'react';
import { App, Button, Input, Tooltip, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { CloseOutlined, PictureOutlined, SendOutlined } from '@ant-design/icons';
import { getErrorMessage } from '../../utils/errorMessage';

interface Props { disabled?: boolean; placeholder?: string; onSend: (body: FormData) => Promise<void> }
const ChatComposer = ({ disabled = false, placeholder = 'Nhập tin nhắn...', onSend }: Props) => {
  const { message } = App.useApp();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false), clientId = useRef<string | null>(null);
  const send = async () => {
    if (disabled || sending.current || (!content.trim() && !files.length)) return;
    sending.current = true; setBusy(true);
    clientId.current ||= crypto.randomUUID();
    try {
      const body = new FormData(); body.set('content', content.trim()); body.set('client_id', clientId.current);
      for (const file of files) if (file.originFileObj) body.append('images', file.originFileObj);
      await onSend(body);
      setContent(''); setFiles([]); clientId.current = null;
    } catch (error) { void message.error(getErrorMessage(error)); }
    finally { sending.current = false; setBusy(false); }
  };
  return <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-3 sm:px-4">
    {!!files.length && <div className="mb-3 flex flex-wrap gap-2">
      {files.map((file) => <span key={file.uid} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs">
        <PictureOutlined /><span className="max-w-40 truncate" title={file.name}>{file.name}</span>
        <button type="button" disabled={busy || disabled} aria-label={'Bỏ ảnh ' + file.name} className="cursor-pointer p-1" onClick={() => {
          setFiles((previous) => previous.filter((item) => item.uid !== file.uid)); clientId.current = null;
        }}><CloseOutlined /></button>
      </span>)}
    </div>}
    <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); void send(); }}>
      <Upload accept="image/jpeg,image/png,image/webp,image/gif" multiple maxCount={3} showUploadList={false}
        fileList={files} disabled={disabled || busy} beforeUpload={(file) => {
          if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            void message.error('Chọn ảnh JPG, PNG, WEBP hoặc GIF, tối đa 5 MB/ảnh.'); return Upload.LIST_IGNORE;
          }
          return false;
        }} onChange={({ fileList }) => { setFiles(fileList); clientId.current = null; }}>
        <Tooltip title="Gửi ảnh · Tối đa 3 ảnh, 5 MB/ảnh"><Button type="text" size="large" icon={<PictureOutlined />} aria-label="Đính kèm ảnh" disabled={disabled || busy} /></Tooltip>
      </Upload>
      <Input.TextArea value={content} disabled={disabled || busy} maxLength={5000} autoSize={{ minRows: 1, maxRows: 4 }}
        aria-label="Nội dung tin nhắn" placeholder={placeholder} className="rounded-2xl!" onChange={(event) => { setContent(event.target.value); clientId.current = null; }}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
      <Button type="primary" shape="circle" htmlType="submit" icon={<SendOutlined />} loading={busy}
        disabled={disabled || (!content.trim() && !files.length)} aria-label="Gửi tin nhắn" />
    </form>
    <p className="mt-2 px-1 text-[10px] text-gray-400">Enter để gửi · Shift + Enter để xuống dòng</p>
  </div>;
};
export default ChatComposer;
