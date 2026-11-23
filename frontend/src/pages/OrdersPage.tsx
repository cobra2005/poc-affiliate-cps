import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatVnd, outcomeLabel } from '../api';
import type { OrderView } from '../types';

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    api.orders()
      .then((next) => {
        if (active) setOrders(next);
      })
      .catch((failure: unknown) => {
        if (!active) return;
        setError(failure instanceof Error ? failure.message : 'Không tải được đơn hàng');
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalCommission = orders.reduce((sum, order) => sum + order.commissionAmount, 0);

  return (
    <section className="page">
      <div className="page-intro">
        <h1>Đơn hàng</h1>
        <p>Mỗi đơn một khoản hoa hồng. Số trong bảng là hoa hồng đã ghi; đơn chờ thanh toán vẫn hiện 0 cho đến khi bấm thanh toán.</p>
      </div>
      <p className="total">Tổng hoa hồng đã ghi nhận: <strong>{formatVnd(totalCommission)}</strong></p>
      {error ? <p className="banner error" role="alert">{error}</p> : null}
      {loaded && orders.length === 0 ? <p className="hint">Chưa có đơn hàng.</p> : null}

      {orders.length > 0 ? (
        <div className="table-wrap">
          <table>
            <caption>Danh sách đơn và hoa hồng tương ứng</caption>
            <thead>
              <tr>
                <th>Đơn</th>
                <th>Sản phẩm</th>
                <th>Người mua</th>
                <th>Link</th>
                <th>Voucher</th>
                <th>Ghi nhận</th>
                <th>Thực trả</th>
                <th>Hoa hồng</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/orders/${order.id}/pay`}>#{order.id}</Link>
                  </td>
                  <td>{order.product.name}</td>
                  <td>{order.buyer.name}</td>
                  <td>{order.refPublisher?.name ?? '—'}</td>
                  <td>{order.voucher ? order.voucher.code : '—'}</td>
                  <td>{order.attributedPublisher?.name ?? '—'}</td>
                  <td>{formatVnd(order.amountPaid)}</td>
                  <td>
                    <strong>{formatVnd(order.commissionAmount)}</strong>
                    <span className="hint block">{outcomeLabel(order.attributionOutcome)}</span>
                  </td>
                  <td>{order.status === 'paid' ? 'Thành công' : 'Chờ thanh toán'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
