const StatCard = ({ label, value, hint }: { label: string; value: number; hint: string }) => (
  <div className="rounded-2xl border border-line bg-white p-6">
    <p className="text-sm text-muted">{label}</p>
    <p className="my-4 text-4xl font-semibold tabular-nums">{value.toLocaleString('vi-VN')}</p>
    <p className="text-sm text-primary">{hint}</p>
  </div>
);
export default StatCard;
