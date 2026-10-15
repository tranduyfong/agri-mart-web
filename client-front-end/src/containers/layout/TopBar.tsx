import { ClockCircleOutlined, EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';
import InfoItem from '../../components/InfoItem';
import { STORE_INFO } from '../../utils/constants';

// Thanh màu xanh trên cùng: địa chỉ, giờ mở cửa, số điện thoại
const TopBar = () => {
  return (
    <div className="hidden bg-primary text-sm text-white md:block">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-end gap-10 px-4">
        <InfoItem icon={<EnvironmentOutlined />} text={STORE_INFO.address} />
        <InfoItem icon={<ClockCircleOutlined />} text={STORE_INFO.openingHours} />
        <InfoItem icon={<PhoneOutlined />} text={STORE_INFO.phone} />
      </div>
    </div>
  );
};

export default TopBar;
