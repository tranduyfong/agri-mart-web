import { Button, Input, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { getFileUrl } from '../utils/fileUrl';

import type { ImageValue } from '../utils/imageInput';

const ImageInput = ({
  value = {},
  onChange,
  id,
}: {
  value?: ImageValue;
  onChange?: (image: ImageValue) => void;
  id?: string;
}) => (
  <div id={id} className="space-y-3">
    {value.url && !value.file && (
      <img src={getFileUrl(value.url)} alt="Ảnh đã chọn" className="max-h-48 max-w-full rounded-lg object-contain" />
    )}
    <Upload
      accept="image/png,image/jpeg,image/webp,image/gif"
      beforeUpload={() => false}
      maxCount={1}
      listType="picture"
      fileList={value.file ? [value.file] : []}
      onChange={({ fileList }) => onChange?.({ ...value, file: fileList[0], remove: false })}
    >
      <Button icon={<UploadOutlined />}>Chọn ảnh từ máy</Button>
    </Upload>
    <Input
      aria-label="Link ảnh"
      placeholder="Hoặc dán link https://…"
      value={value.url || ''}
      onChange={(event) => onChange?.({ url: event.target.value, remove: false })}
    />
    {(value.url || value.file) && (
      <Button danger type="text" onClick={() => onChange?.({ remove: true })}>
        Bỏ ảnh
      </Button>
    )}
  </div>
);
export default ImageInput;
