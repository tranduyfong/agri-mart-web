import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import ChatWidget from './containers/chat/ChatWidget';

const App = () => {
  return <><RouterProvider router={router} /><ChatWidget /></>;
};

export default App;
