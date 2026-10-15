import { Link } from 'react-router-dom';

interface FooterLink {
  label: string;
  path: string;
}

interface FooterLinkGroupProps {
  title: string;
  links: FooterLink[];
}

// Một cột link ở chân trang: tiêu đề + danh sách link
const FooterLinkGroup = ({ title, links }: FooterLinkGroupProps) => {
  return (
    <div className="text-center sm:text-left lg:text-center">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.path} className="text-sm text-gray-600 hover:text-primary">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FooterLinkGroup;
