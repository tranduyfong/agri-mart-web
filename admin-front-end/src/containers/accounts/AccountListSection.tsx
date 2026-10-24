import { useCallback, useState } from 'react';
import { Alert, App, Button, Input, Modal, Select, Table } from 'antd';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import LoadingCard from '../../components/LoadingCard';
import StatusTag from '../../components/StatusTag';
import AccountForm from './AccountForm';
import useData from '../../hooks/useData';
import accountService from '../../services/accountService';
import { tablePagination } from '../../utils/tablePagination';
import { getErrorMessage } from '../../utils/errorMessage';
import { ROLE_LABELS } from '../../utils/constants';
import type { Account } from '../../types/admin';
const AccountListSection = () => {
  const [query, setQuery] = useState({ keyword: '', role: '', status: '', pageNumber: 0, pageSize: 10 });
  const [formTarget, setFormTarget] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const { modal, message } = App.useApp();
  const load = useCallback(() => accountService.getAccounts(query), [query]);
  const { data, error, reload } = useData(load);
  const setLock = (account: Account) =>
    modal.confirm({
      title: account.status === 'LOCKED' ? 'Mở khóa tài khoản?' : 'Khóa tài khoản này?',
      content:
        account.status === 'LOCKED'
          ? 'Khách chưa xác minh email sẽ trở lại trạng thái chờ xác minh.'
          : 'Tài khoản sẽ không thể truy cập. Các phiên đăng nhập cũ bị thu hồi.',
      okText: 'Xác nhận',
      cancelText: 'Quay lại',
      onOk: async () => {
        try {
          await accountService.setLock(account, account.status === 'LOCKED' ? 'UNLOCK' : 'LOCK');
          void message.success('Đã cập nhật trạng thái.');
          reload();
        } catch (error) {
          void message.error(getErrorMessage(error));
          throw error;
        }
      },
    });
  return (
    <>
      <PageHeader
        title="Quản lý tài khoản"
        description="Tra cứu khách hàng, quản trị viên và nhân viên trong hệ thống."
        actions={
          <Button
            type="primary"
            onClick={() => {
              setFormTarget(null);
              setOpen(true);
            }}
          >
            + Thêm nhân viên
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Input.Search
          className="w-full! sm:w-80!"
          placeholder="Tìm tên, email hoặc số điện thoại..."
          allowClear
          onSearch={(keyword) => setQuery({ ...query, keyword, pageNumber: 0 })}
        />
        <Select
          className="w-48"
          allowClear
          placeholder="Tất cả vai trò"
          options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(role) => setQuery({ ...query, role: role || '', pageNumber: 0 })}
        />
        <Select
          className="w-52"
          allowClear
          placeholder="Tất cả trạng thái"
          options={[
            { value: 'ACTIVE', label: 'Hoạt động' },
            { value: 'PENDING', label: 'Chưa xác minh' },
            { value: 'LOCKED', label: 'Đã khóa' },
          ]}
          onChange={(status) => setQuery({ ...query, status: status || '', pageNumber: 0 })}
        />
      </div>
      {!data ? (
        <LoadingCard error={error} onRetry={reload} />
      ) : (
        <Panel title="Tài khoản">
          <Table
            rowKey="id"
            dataSource={data.data}
            scroll={{ x: 1100 }}
            pagination={tablePagination(query.pageNumber, data.totalElements, (pageNumber) =>
              setQuery({ ...query, pageNumber }),
            )}
            columns={[
              { title: 'Họ tên', dataIndex: 'full_name' },
              { title: 'Email', dataIndex: 'email' },
              { title: 'Vai trò', dataIndex: 'role', render: (role: Account['role']) => ROLE_LABELS[role] },
              { title: 'Trạng thái', render: (_, row) => <StatusTag status={row.status} /> },
              {
                title: 'Thao tác',
                render: (_, row) => (
                  <div className="flex flex-col items-start gap-2">
                    <Button
                      type="link"
                      className="px-0!"
                      onClick={() => {
                        setFormTarget(row);
                        setOpen(true);
                      }}
                    >
                      Chỉnh sửa
                    </Button>
                    {row.role === 'STAFF' && <Link to={'/permissions?id=' + row.id}>Phân quyền</Link>}
                    {row.role !== 'ADMIN' && (
                      <Button
                        type="text"
                        danger={row.status !== 'LOCKED'}
                        className="px-0!"
                        onClick={() => setLock(row)}
                      >
                        {row.status === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản'}
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Panel>
      )}
      <Alert
        className="mt-6"
        type="success"
        showIcon
        title="Nhân viên chỉ truy cập các chức năng đã được cấp quyền."
        description="Tài khoản quản trị viên được bảo vệ, không khóa hoặc đổi vai trò tại màn hình này."
      />
      <Modal
        open={open}
        title={formTarget ? 'Chỉnh sửa tài khoản' : 'Thêm nhân viên'}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <AccountForm
          key={formTarget?.id || 'new'}
          account={formTarget}
          onSaved={() => {
            setOpen(false);
            reload();
          }}
        />
      </Modal>
    </>
  );
};
export default AccountListSection;
