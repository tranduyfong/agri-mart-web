export const getSavedAccessToken = () => localStorage.getItem('staff.accessToken');
export const saveAccessToken = (token: string) => localStorage.setItem('staff.accessToken', token);
export const clearAuth = () => {
  localStorage.removeItem('staff.accessToken');
};
