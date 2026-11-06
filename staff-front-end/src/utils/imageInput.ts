// Ghép URL/file/cờ xóa ảnh vào FormData theo tên trường mà middleware upload backend nhận.
import type { UploadFile } from 'antd';

export interface ImageValue {
  url?: string;
  file?: UploadFile;
  remove?: boolean;
}

// Thống nhất tên trường image_url/remove_image/images khi gửi ảnh đến backend.
export const appendImage = (data: FormData, image?: ImageValue) => {
  if (!image) return;
  data.append('image_url', image.url || '');
  data.append('remove_image', String(!!image.remove));
  if (image.file?.originFileObj) data.append('images', image.file.originFileObj);
};
