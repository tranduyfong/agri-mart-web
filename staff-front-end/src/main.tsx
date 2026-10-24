import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import viVN from 'antd/locale/vi_VN';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './index.css';
import AOS from 'aos';
import 'aos/dist/aos.css';
import App from './App';
import theme from './app/theme';
import AuthProvider from './context/AuthProvider';
AOS.init({
  duration: 350,
  easing: 'ease-out-cubic',
  once: true,
  offset: 20,
  disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <ConfigProvider theme={theme} locale={viVN}>
        <AntdApp>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
);
