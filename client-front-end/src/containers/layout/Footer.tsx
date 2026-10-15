import type { SubmitEvent } from 'react';
import { SendOutlined } from '@ant-design/icons';
import Logo from '../../components/Logo';
import FooterLinkGroup from '../../components/FooterLinkGroup';
import { FOOTER_LINK_GROUPS, STORE_INFO } from '../../utils/constants';

// Chân trang: giới thiệu, các cột link, đăng ký nhận tin, bản quyền
const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Đăng ký nhận tin (tạm thời chưa có API)
  const handleSubscribe = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Giới thiệu */}
          <div className="lg:col-span-3">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-600">
              Nông sản tươi sạch, giao hàng nhanh, giá tốt mỗi ngày. {STORE_INFO.name} - khu chợ đáng tin cậy của gia
              đình bạn.
            </p>
          </div>

          {/* Các cột link */}
          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <FooterLinkGroup title={group.title} links={group.links} />
            </div>
          ))}

          {/* Đăng ký nhận tin */}
          <div className="lg:col-span-3">
            <h3 className="text-xl leading-snug font-semibold text-gray-900">
              Nhận thông tin sản phẩm mới từ {STORE_INFO.name}
            </h3>
            <form onSubmit={handleSubscribe} className="mt-6 flex items-center gap-2 rounded-lg bg-gray-100 p-2">
              <input
                type="email"
                placeholder="Địa chỉ email của bạn"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              />
              <button
                type="submit"
                aria-label="Đăng ký nhận tin"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-primary text-white hover:bg-primary-dark"
              >
                <SendOutlined />
              </button>
            </form>
          </div>
        </div>

        {/* Dòng bản quyền */}
        <div className="mt-12 border-t border-gray-200 pt-6 text-center">
          <p className="text-sm text-gray-700">
            © {currentYear} {STORE_INFO.name}. Bảo lưu mọi quyền.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
