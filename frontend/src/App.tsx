import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentPage } from './pages/PaymentPage';
import { PublishersPage } from './pages/PublishersPage';
import { ShopPage } from './pages/ShopPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ShopPage />} />
        <Route path="publishers" element={<PublishersPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId/pay" element={<PaymentPage />} />
      </Route>
    </Routes>
  );
}
