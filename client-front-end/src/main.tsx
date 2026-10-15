import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App as AntdApp, ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import viVN from 'antd/locale/vi_VN';
import './index.css';
import App from './App.tsx';
import { store } from './store';
import antdTheme from './app/theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Redux: cung cấp store cho toàn bộ ứng dụng */}
    <Provider store={store}>
      {/* layer: đưa CSS của Ant Design vào @layer antd để class Tailwind ghi đè được */}
      <StyleProvider layer>
        {/* Cấu hình chung cho Ant Design: màu sắc, font, ngôn ngữ tiếng Việt */}
        <ConfigProvider theme={antdTheme} locale={viVN}>
          {/* AntdApp: cho phép dùng thông báo message ở mọi nơi qua App.useApp() */}
          <AntdApp>
            <App />
          </AntdApp>
        </ConfigProvider>
      </StyleProvider>
    </Provider>
  </StrictMode>,
);
