import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatVnd, outcomeLabel } from '../api';
import type { CheckoutResult, PayResult, Product, Publisher, User } from '../types';

export function ShopPage() {
  const [params] = useSearchParams();
  const refParam = params.get('ref');
  const refPublisherId = refParam && /^\d+$/.test(refParam) ? Number(refParam) : null;

  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [buyerId, setBuyerId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [busy, setBusy] = useState<'order' | 'pay' | null>(null);
  const [formError, setFormError] = useState('');
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [payment, setPayment] = useState<PayResult | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'error' | 'success' } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.users(), api.products(), api.publishers()])
      .then(([nextUsers, nextProducts, nextPublishers]) => {
        if (!active) return;
        setUsers(nextUsers);
        setProducts(nextProducts);
        setPublishers(nextPublishers);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Không tải được dữ liệu');
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCheckout(null);
    setPayment(null);
    setFormError('');
  }, [refPublisherId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const customers = users.filter((user) => user.publisherId == null);
  const publisherAccounts = users.filter((user) => user.publisherId != null);
  const activeBuyerId = buyerId ?? customers[0]?.id ?? users[0]?.id ?? null;
  const selectedBuyer = users.find((user) => user.id === activeBuyerId) ?? null;
  const activeProductId = productId ?? products.find((product) => product.price === 1_000_000)?.id ?? products[0]?.id ?? null;
  const refPublisher = refPublisherId == null ? null : publishers.find((publisher) => publisher.id === refPublisherId) ?? null;
  const refUnknown = loaded && refPublisherId != null && refPublisher == null;
  const refInvalid = loaded && refParam != null && refPublisherId == null;
  const currentOrder = payment?.order ?? checkout?.order ?? null;
  const knownVoucherCodes = new Set(
    publishers.flatMap((publisher) => publisher.vouchers.map((voucher) => voucher.code.toUpperCase())),
  );

  function showToast(message: string, tone: 'error' | 'success') {
    setToast({ id: Date.now(), message, tone });
  }

  function voucherIsKnown(code: string) {
    return knownVoucherCodes.has(code.trim().toUpperCase());
  }

  function checkVoucher(code: string) {
    const normalized = code.trim();
    if (!loaded || normalized.length === 0) return;
    if (!voucherIsKnown(normalized)) showToast('Voucher không hợp lệ', 'error');
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    if (activeBuyerId == null || activeProductId == null) return;
    const code = voucherCode.trim();
    if (code && !voucherIsKnown(code)) {
      showToast('Voucher không hợp lệ', 'error');
      return;
    }
    setBusy('order');
    setFormError('');
    setPayment(null);
    try {
      const result = await api.createOrder({
        productId: activeProductId,
        buyerUserId: activeBuyerId,
        ...(refPublisherId != null ? { refPublisherId } : {}),
        ...(code ? { voucherCode: code } : {}),
      });
      setCheckout(result);
      showToast('Đặt hàng thành công', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không tạo được đơn';
      if (message === 'Voucher không hợp lệ') {
        showToast(message, 'error');
      } else {
        setFormError(message);
      }
    } finally {
      setBusy(null);
    }
  }

  async function pay() {
    if (!checkout) return;
    setBusy('pay');
    setFormError('');
    try {
      const result = await api.payOrder(checkout.order.id);
      setPayment(result);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Không thanh toán được');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="page">
      <div className="page-intro">
        <h1>Mua hàng</h1>
        <p>Bấm thanh toán là đơn thành công. Hoa hồng được ghi một lần, bằng 10% số tiền thực trả.</p>
      </div>

      {loadError ? <p className="banner error" role="alert">{loadError}</p> : null}
      {refPublisher ? <p className="banner">Đang mua qua link của {refPublisher.user.name}.</p> : null}
      {refUnknown || refInvalid ? (
        <p className="banner warn">Link giới thiệu không hợp lệ. Đơn vẫn mua được và không ghi nhận theo link.</p>
      ) : null}

      <div className="split">
        <form className="card stack" onSubmit={placeOrder}>
          <label>
            Tài khoản đang mua
            <select
              value={activeBuyerId ?? ''}
              onChange={(event) => setBuyerId(Number(event.target.value))}
              disabled={users.length === 0}
            >
              {customers.length > 0 ? (
                <optgroup label="Khách">
                  {customers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {publisherAccounts.length > 0 ? (
                <optgroup label="Publisher">
                  {publisherAccounts.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
          <p className="hint">
            {selectedBuyer == null
              ? 'Tài khoản mua có thể là khách, không cần là Publisher.'
              : selectedBuyer.publisherId == null
                ? 'Tài khoản này là khách, không phải Publisher. Đơn vẫn ghi hoa hồng cho người giới thiệu.'
                : 'Tài khoản này là Publisher. Hoa hồng bằng 0 chỉ khi chính người này được ghi nhận.'}
          </p>

          <fieldset>
            <legend>Sản phẩm</legend>
            <div className="choices">
              {products.map((product) => (
                <label key={product.id} className={product.id === activeProductId ? 'choice selected' : 'choice'}>
                  <input
                    type="radio"
                    name="product"
                    checked={product.id === activeProductId}
                    onChange={() => setProductId(product.id)}
                  />
                  <span>{product.name}</span>
                  <strong>{formatVnd(product.price)}</strong>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            Voucher
            <input
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value)}
              onBlur={(event) => checkVoucher(event.target.value)}
              placeholder="Ví dụ BINH100"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>

          {formError ? <p className="banner error" role="alert">{formError}</p> : null}

          <button type="submit" className="primary" disabled={busy != null || activeProductId == null || activeBuyerId == null}>
            {busy === 'order' ? 'Đang tạo đơn…' : 'Đặt hàng'}
          </button>
        </form>

        <aside className="card stack" aria-live="polite">
          <h2>Đơn hiện tại</h2>
          {currentOrder == null ? (
            <p className="hint">Chưa có đơn. Đặt hàng để xem người được ghi nhận và số hoa hồng dự kiến.</p>
          ) : (
            <>
              <dl className="facts">
                <div>
                  <dt>Mã đơn</dt>
                  <dd>#{currentOrder.id}</dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>{currentOrder.status === 'paid' ? 'Thành công' : 'Chờ thanh toán'}</dd>
                </div>
                <div>
                  <dt>Người mua</dt>
                  <dd>{currentOrder.buyer.name}</dd>
                </div>
                <div>
                  <dt>Link</dt>
                  <dd>{channelText(checkout?.refStatus ?? 'none', currentOrder.refPublisher?.name ?? null)}</dd>
                </div>
                <div>
                  <dt>Voucher</dt>
                  <dd>
                    {checkout?.voucherStatus === 'applied' && currentOrder.voucher
                      ? `${currentOrder.voucher.code} · giảm ${formatVnd(currentOrder.discountAmount)}`
                      : voucherMessage(checkout?.voucherStatus ?? 'none')}
                  </dd>
                </div>
                <div>
                  <dt>Ghi nhận cho</dt>
                  <dd>{currentOrder.attributedPublisher?.name ?? 'Không có'}</dd>
                </div>
                <div>
                  <dt>Thực trả</dt>
                  <dd>{formatVnd(currentOrder.amountPaid)}</dd>
                </div>
                <div>
                  <dt>{currentOrder.status === 'paid' ? 'Hoa hồng đã ghi' : 'Hoa hồng dự kiến'}</dt>
                  <dd>{formatVnd(currentOrder.status === 'paid' ? currentOrder.commissionAmount : currentOrder.expectedCommission)}</dd>
                </div>
              </dl>
              <p className="hint">{outcomeLabel(currentOrder.attributionOutcome)}</p>
              {payment?.alreadyPaid ? <p className="banner">Đơn này đã được thanh toán. Hoa hồng giữ nguyên.</p> : null}
              <button type="button" className="primary" onClick={pay} disabled={busy != null}>
                {busy === 'pay' ? 'Đang thanh toán…' : currentOrder.status === 'paid' ? 'Thanh toán lại' : 'Thanh toán'}
              </button>
              <Link to="/orders">Xem danh sách đơn</Link>
            </>
          )}
        </aside>
      </div>
      {toast ? (
        <div className="toast-region">
          <p className={toast.tone === 'success' ? 'toast success' : 'toast'} role={toast.tone === 'success' ? 'status' : 'alert'} key={toast.id}>
            {toast.message}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function channelText(status: string, name: string | null) {
  if (status === 'applied' && name) return name;
  if (status === 'missing') return 'Link không gắn với Publisher nào';
  return 'Không có';
}

function voucherMessage(status: string) {
  if (status === 'missing') return 'Mã không tồn tại, đơn không được giảm';
  if (status === 'inactive') return 'Mã đã ngưng, đơn không được giảm';
  return 'Không dùng';
}
