import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import PromotionListSection from './PromotionListSection';
import PromotionFormSection from './PromotionFormSection';
const ShippingCouponsSection = () => {
  const [editingId, setEditingId] = useState<string>(),
    [revision, setRevision] = useState(0);
  const finished = () => {
    setEditingId(undefined);
    setRevision((value) => value + 1);
  };
  return (
    <>
      <PageHeader
        title="Mã giảm phí giao hàng"
        description="Thiết lập mức giảm, giá trị đơn tối thiểu và thời gian áp dụng."
      />
      <div className="space-y-7">
        <PromotionListSection
          scope="SHIPPING"
          revision={revision}
          onEdit={(id) => {
            setEditingId(id);
            document.getElementById('shipping-form')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <div id="shipping-form">
          <PromotionFormSection key={editingId || revision} editingId={editingId} scope="SHIPPING" onSaved={finished} />
        </div>
      </div>
    </>
  );
};
export default ShippingCouponsSection;
