import type { UploadFile } from 'antd';

export interface ImageValue {
  url?: string;
  file?: UploadFile;
  remove?: boolean;
}

export const appendImage = (data: FormData, image?: ImageValue) => {
  if (!image) return;
  data.append('image_url', image.url || '');
  data.append('remove_image', String(!!image.remove));
  if (image.file?.originFileObj) data.append('images', image.file.originFileObj);
};
