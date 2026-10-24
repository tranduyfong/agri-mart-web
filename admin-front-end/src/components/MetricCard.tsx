import type { ReactNode } from 'react';
const MetricCard = ({ label, value, hint }: { label: string; value: ReactNode; hint: string }) => (
  <div className="min-w-0 rounded-2xl border border-line bg-white p-6">
    <p className="text-sm text-muted">{label}</p>
    <p className="my-5 break-words text-3xl font-semibold tabular-nums">{value}</p>
    <p className="text-sm leading-6 text-primary">{hint}</p>
  </div>
);
export default MetricCard;
