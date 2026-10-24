import type { ReactNode } from 'react';
const Panel = ({ title, children, extra }: { title?: string; children: ReactNode; extra?: ReactNode }) => (
  <section className="min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-7">
    <div className={title || extra ? 'mb-5 flex flex-wrap items-center justify-between gap-3' : ''}>
      {title && <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>}
      {extra}
    </div>
    {children}
  </section>
);
export default Panel;
