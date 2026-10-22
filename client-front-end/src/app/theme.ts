import type { ThemeConfig } from 'antd';

// Cấu hình giao diện cho các component của Ant Design (màu chủ đạo, bo góc, font...)
// Màu ở đây phải giống với màu khai báo trong src/index.css
const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#12b80a',
    colorLink: '#12b80a',
    borderRadius: 8,
    fontFamily: "'Be Vietnam Pro', sans-serif",
    fontSize: 16,
    fontSizeSM: 14,
    fontSizeLG: 18,
    controlHeight: 40,
  },
  components: {
    Form: {
      itemMarginBottom: 16,
      verticalLabelPadding: '0 0 6px',
    },
    Input: {
      activeShadow: 'none',
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
  },
};

export default antdTheme;
