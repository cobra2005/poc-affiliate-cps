import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatVnd, outcomeLabel } from '../api';
import type { OrderView } from '../types';

export function PaymentPage() {
  const { orderId } = useParams();
  const id = Number(orderId);
  const validId = Number.isInteger(id) && id > 0;

  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!validId) {
      setError('Không tìm thấy đơn hàng');
      setLoaded(true);
      return;
    }

    let active = true;
    api.order(id)
      .then((next) => {
        if (active) setOrder(next);
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
  }, [id, validId]);

  async function pay() {
    if (!validId) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await api.payOrder(id);
      setOrder(result.order);
      setNotice(
        result.alreadyPaid
          ? 'Đơn này đã được thanh toán. Hoa hồng giữ nguyên.'
          : 'Đã thanh toán. Hoa hồng được ghi một lần.',
      );
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không thanh toán được');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <div className="page-intro">
        <h1>Thanh toán{validId ? ` đơn #${id}` : ''}</h1>
        <p>Bấm thanh toán là đơn thành công. Hoa hồng được ghi một lần, bằng 10% số tiền thực trả.</p>
      </div>

      {error ? <p className="banner error" role="alert">{error}</p> : null}
      {loaded && !error && order == null ? <p className="hint">Không tìm thấy đơn hàng.</p> : null}
      {!loaded ? <p className="hint">Đang tải đơn…</p> : null}

      {order ? (
        <div className="card stack pay-panel">
          <dl className="facts">
            <div>
              <dt>Mã đơn</dt>
              <dd>#{order.id}</dd>
            </div>
            <div>
              <dt>Sản phẩm</dt>
              <dd>{order.product.name}</dd>
            </div>
            <div>
              <dt>Người mua</dt>
              <dd>{order.buyer.name}</dd>
            </div>
            <div>
              <dt>Link</dt>
              <dd>{order.refPublisher?.name ?? 'Không có'}</dd>
            </div>
            <div>
              <dt>Voucher</dt>
              <dd>
                {order.voucher
                  ? `${order.voucher.code} · giảm ${formatVnd(order.discountAmount)}`
                  : 'Không dùng'}
              </dd>
            </div>
            <div>
              <dt>Ghi nhận cho</dt>
              <dd>{order.attributedPublisher?.name ?? 'Không có'}</dd>
            </div>
            <div>
              <dt>Thực trả</dt>
              <dd>{formatVnd(order.amountPaid)}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>{order.status === 'paid' ? 'Thành công' : 'Chờ thanh toán'}</dd>
            </div>
            <div>
              <dt>{order.status === 'paid' ? 'Hoa hồng đã ghi' : 'Hoa hồng dự kiến'}</dt>
              <dd>{formatVnd(order.status === 'paid' ? order.commissionAmount : order.expectedCommission)}</dd>
            </div>
          </dl>
          <p className="hint">{outcomeLabel(order.attributionOutcome)}</p>
          {notice ? <p className="banner">{notice}</p> : null}
          <button type="button" className="primary" onClick={pay} disabled={busy}>
            {busy ? 'Đang thanh toán…' : order.status === 'paid' ? 'Thanh toán lại' : 'Thanh toán'}
          </button>
          <Link to="/orders">Quay lại danh sách đơn</Link>
        </div>
      ) : null}
    </section>
  );
}
