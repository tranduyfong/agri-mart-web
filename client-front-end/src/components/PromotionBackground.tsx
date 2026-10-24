import { getFileUrl } from '../utils/fileUrl';

const PromotionBackground = ({ imageUrl }: { imageUrl?: string | null }) => (
  <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
    {imageUrl && <img src={getFileUrl(imageUrl) || undefined} alt="" className="h-full w-full object-cover" />}
    <div
      className={`absolute inset-0 ${imageUrl ? 'bg-linear-to-t from-black/90 via-black/50 to-black/25' : 'bg-linear-to-br from-primary to-primary-dark'}`}
    />
  </div>
);

export default PromotionBackground;
