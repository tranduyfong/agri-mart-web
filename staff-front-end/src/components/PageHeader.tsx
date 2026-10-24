import type { ReactNode } from 'react';
const PageHeader = ({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) => (
  <div data-aos="fade-up" className="mb-7 flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0 max-w-full">
      <h1 className="wrap-anywhere text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {description && <p className="mt-3 max-w-4xl leading-7 text-muted">{description}</p>}
    </div>
    {actions}
  </div>
);
export default PageHeader;
