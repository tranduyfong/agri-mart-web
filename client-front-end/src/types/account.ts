import type { AuthUser } from './auth';

export interface UserAddress {
  id: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  province_code: number | null;
  province_name: string | null;
  ward_code: number | null;
  ward_name: string | null;
  street_address: string | null;
  hamlet: string;
  is_default: number;
}

export interface AddressFormValues {
  recipient_name: string;
  phone: string;
  province_code: number;
  ward_code: number;
  street_address: string;
  hamlet: string;
  is_default: boolean;
}

export interface ProfileFormValues {
  full_name: string;
  phone: string | null;
}

export interface ChangePasswordFormValues {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AccountData {
  user: AuthUser;
  addresses: UserAddress[];
}

export interface AccountContextValue extends AccountData {
  onUserUpdated: (user: AuthUser) => void;
  onAddressesUpdated: (addresses: UserAddress[]) => void;
  handleError: (error: unknown) => void;
}
