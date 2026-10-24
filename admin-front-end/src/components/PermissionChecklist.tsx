import { Checkbox } from 'antd';
import type { Permission } from '../types/admin';
const PermissionChecklist = ({
  value = [],
  onChange,
  permissions,
  id,
}: {
  value?: string[];
  onChange?: (value: string[]) => void;
  permissions: Permission[];
  id?: string;
}) => (
  <div id={id} className="space-y-3">
    {permissions.map((permission) => (
      <div key={permission.code} className="rounded-lg border border-line p-4">
        <Checkbox
          className="w-full items-start!"
          checked={value.includes(permission.code)}
          onChange={(event) =>
            onChange?.(
              event.target.checked ? [...value, permission.code] : value.filter((code) => code !== permission.code),
            )
          }
        >
          <span className="font-medium">{permission.name}</span>
          <span className="mt-1 block text-xs leading-6 text-muted">{permission.description}</span>
        </Checkbox>
      </div>
    ))}
  </div>
);
export default PermissionChecklist;
