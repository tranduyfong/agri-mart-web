import { useCallback, useState } from 'react';
import { Alert, App, Button, Empty, Form, Input, Select } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import PermissionChecklist from '../../components/PermissionChecklist';
import LoadingCard from '../../components/LoadingCard';
import StatusTag from '../../components/StatusTag';
import useData from '../../hooks/useData';
import accountService from '../../services/accountService';
import adminService from '../../services/adminService';
import { getErrorMessage } from '../../utils/errorMessage';
import type { Account, Lookups } from '../../types/admin';
const PermissionEditor = ({
  account,
  lookups,
  onSaved,
}: {
  account: Account;
  lookups: Lookups;
  onSaved: () => void;
}) => {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const submit = async (values: { permissions: string[] }) => {
    setBusy(true);
    try {
      await accountService.savePermissions(account.id, { ...values, expected_updated_at: account.updated_at });
      void message.success('Đã lưu phân quyền. Quyền mới được kiểm tra ở mỗi API.');
      onSaved();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  if (account.role !== 'STAFF')
    return <Alert type="warning" showIcon title="Chỉ phân quyền cho tài khoản nhân viên." />;
  return (
    <Form
      layout="vertical"
      onFinish={submit}
      disabled={busy}
      initialValues={{
        permissions: account.permissions,
      }}
    >
      <div className="space-y-6">
        <Panel title="Thông tin nhân viên">
          <dl className="mb-6 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="mb-2 text-sm text-muted">Họ tên</dt>
              <dd className="font-medium">{account.full_name}</dd>
            </div>
            <div>
              <dt className="mb-2 text-sm text-muted">Email</dt>
              <dd className="break-all">{account.email}</dd>
            </div>
            <div>
              <dt className="mb-2 text-sm text-muted">Trạng thái</dt>
              <dd>
                <StatusTag status={account.status} />
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Quyền chức năng">
          <p className="mb-5 text-sm leading-7 text-muted">
            Chọn các nhóm chức năng nhân viên được sử dụng tại cửa hàng.
          </p>
          <Form.Item name="permissions" className="mb-0!">
            <PermissionChecklist permissions={lookups.permissions} />
          </Form.Item>
        </Panel>
        <div className="flex justify-end gap-3">
          <Link to="/accounts">
            <Button>Quay lại tài khoản</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={busy}>
            Lưu phân quyền
          </Button>
        </div>
      </div>
    </Form>
  );
};
const PermissionsSection = () => {
  const [params, setParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const load = useCallback(
    async () => ({
      users: await accountService.getAccounts({ role: 'STAFF', keyword, pageSize: 100 }),
      lookups: await adminService.getLookups(),
    }),
    [keyword],
  );
  const list = useData(load);
  const selectedId = params.get('id') || list.data?.users.data[0]?.id;
  const loadAccount = useCallback(
    () => (selectedId ? accountService.getAccount(selectedId) : Promise.resolve(null)),
    [selectedId],
  );
  const account = useData(loadAccount);
  const choices = list.data?.users.data || [];
  const selected = account.data;
  return (
    <>
      <PageHeader title="Phân quyền nhân viên" description="Cấp quyền theo công việc của nhân viên." />
      <div className="mb-6 flex flex-wrap gap-3">
        <Input.Search
          className="w-full! sm:w-72!"
          allowClear
          placeholder="Tìm nhân viên theo tên hoặc email"
          onSearch={setKeyword}
        />
        <Select
          className="w-full sm:w-96"
          aria-label="Chọn nhân viên phân quyền"
          placeholder="Chọn nhân viên"
          value={selectedId}
          onChange={(id) => setParams({ id })}
          options={[
            ...(selected && !choices.some((item) => item.id === selected.id)
              ? [{ value: selected.id, label: selected.full_name + ' · ' + selected.email }]
              : []),
            ...choices.map((item) => ({ value: item.id, label: item.full_name + ' · ' + item.email })),
          ]}
        />
      </div>
      {!list.data ? (
        <LoadingCard error={list.error} onRetry={list.reload} />
      ) : !selectedId ? (
        <Panel>
          <Empty description="Chưa có nhân viên. Hãy tạo tài khoản trước khi phân quyền." />
        </Panel>
      ) : !account.data ? (
        <LoadingCard error={account.error} onRetry={account.reload} />
      ) : (
        <PermissionEditor
          key={account.data.id + account.data.updated_at}
          account={account.data}
          lookups={list.data.lookups}
          onSaved={account.reload}
        />
      )}
    </>
  );
};
export default PermissionsSection;
