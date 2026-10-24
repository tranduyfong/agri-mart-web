import type { ThemeConfig } from 'antd';
const theme: ThemeConfig = {
  token: {
    colorPrimary: '#287a32',
    colorLink: '#287a32',
    colorText: '#253124',
    colorTextSecondary: '#788375',
    colorBorder: '#dfe7dc',
    borderRadius: 9,
    controlHeight: 44,
    fontSize: 16,
    fontSizeSM: 14,
    fontSizeLG: 18,
    fontFamily: "'Be Vietnam Pro', sans-serif",
  },
  components: {
    Table: { headerBg: '#f6f8f4', headerColor: '#788375', cellPaddingBlock: 21 },
    Button: { primaryShadow: 'none', defaultShadow: 'none', fontWeight: 500 },
    Form: { itemMarginBottom: 22 },
    Menu: { itemHeight: 46 },
    Input: { activeShadow: '0 0 0 2px #287a3210' },
  },
};
export default theme;
