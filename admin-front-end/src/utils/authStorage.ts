export const getSavedAccessToken = () => localStorage.getItem('admin.accessToken');
export const saveAccessToken = (token: string) => localStorage.setItem('admin.accessToken', token);
export const clearAuth = () => {
  localStorage.removeItem('admin.accessToken');
};
