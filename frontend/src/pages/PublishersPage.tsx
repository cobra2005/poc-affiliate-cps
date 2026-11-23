import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatVnd } from '../api';
import type { Publisher, User } from '../types';

export function PublishersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'error' | 'success' } | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [creatingPublisher, setCreatingPublisher] = useState(false);

  async function reload() {
    const [nextUsers, nextPublishers] = await Promise.all([api.users(), api.publishers()]);
    setUsers(nextUsers);
    setPublishers(nextPublishers);
    return nextUsers;
  }

  useEffect(() => {
    let active = true;
    Promise.all([api.users(), api.publishers()])
      .then(([nextUsers, nextPublishers]) => {
        if (!active) return;
        setUsers(nextUsers);
        setPublishers(nextPublishers);
      })
      .catch((loadFailure: unknown) => {
        if (!active) return;
        setLoadError(loadFailure instanceof Error ? loadFailure.message : 'Không tải được Publisher');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message: string, tone: 'error' | 'success') {
    setToast({ id: Date.now(), message, tone });
  }

  const availableUsers = users.filter((user) => user.publisherId == null);
  const selectedUserId = userId ?? availableUsers[0]?.id ?? null;

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setCreatingUser(true);
    setError('');
    setNotice('');
    try {
      const user = await api.createUser({ name, email });
      setName('');
      setEmail('');
      await reload();
      setNotice(`Đã tạo tài khoản ${user.name}.`);
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không tạo được tài khoản');
    } finally {
      setCreatingUser(false);
    }
  }

  async function createPublisher(event: FormEvent) {
    event.preventDefault();
    if (selectedUserId == null) return;
    setCreatingPublisher(true);
    setError('');
    setNotice('');
    try {
      const publisher = await api.createPublisher(selectedUserId);
      await reload();
      setNotice(`Đã tạo Publisher #${publisher.id} cho ${publisher.user.name}. Link giới thiệu đã sẵn sàng.`);
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không tạo được Publisher');
    } finally {
      setCreatingPublisher(false);
    }
  }

  return (
    <section className="page">
      <div className="page-intro">
        <h1>Publisher</h1>
        <p>Mỗi Publisher có một link ?ref= và có thể có nhiều voucher. Mã nào được nhập lúc mua thì đơn ghi cho chủ mã đó.</p>
      </div>
      {loadError ? <p className="banner error" role="alert">{loadError}</p> : null}
      {error ? <p className="banner error" role="alert">{error}</p> : null}
      {notice ? <p className="banner" role="status">{notice}</p> : null}

      <div className="split">
        <form className="card stack" onSubmit={createUser}>
          <h2>Tài khoản mới</h2>
          <label>
            Tên
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <button type="submit" className="primary" disabled={creatingUser}>
            {creatingUser ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
        </form>

        <form className="card stack" onSubmit={createPublisher}>
          <h2>Tạo Publisher</h2>
          <label>
            Tài khoản
            <select
              value={selectedUserId ?? ''}
              onChange={(event) => setUserId(Number(event.target.value))}
              disabled={availableUsers.length === 0}
            >
              {availableUsers.length === 0 ? <option value="">Đã dùng hết tài khoản</option> : null}
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary" disabled={creatingPublisher || selectedUserId == null}>
            {creatingPublisher ? 'Đang tạo…' : 'Tạo và sinh link'}
          </button>
        </form>
      </div>

      <div className="publisher-list">
        {publishers.map((publisher) => (
          <PublisherCard
            key={publisher.id}
            publisher={publisher}
            onChange={async (message) => {
              setError('');
              setNotice(message);
              await reload();
            }}
            onError={(message) => {
              setNotice('');
              setError(message);
            }}
            onCopy={showToast}
          />
        ))}
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

function PublisherCard({
  publisher,
  onChange,
  onError,
  onCopy,
}: {
  publisher: Publisher;
  onChange: (message: string) => Promise<void>;
  onError: (message: string) => void;
  onCopy: (message: string, tone: 'error' | 'success') => void;
}) {
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('100000');
  const [busy, setBusy] = useState(false);
  const link = `${window.location.origin}/?ref=${publisher.id}`;

  async function addVoucher(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createVoucher(publisher.id, { code, discountAmount: Number(discount) });
      setCode('');
      await onChange(`Đã thêm voucher cho ${publisher.user.name}.`);
    } catch (failure: unknown) {
      onError(failure instanceof Error ? failure.message : 'Không tạo được voucher');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(voucherId: number, isActive: boolean) {
    try {
      await api.updateVoucher(voucherId, isActive);
      await onChange(isActive ? 'Đã bật lại voucher.' : 'Đã ngưng voucher.');
    } catch (failure: unknown) {
      onError(failure instanceof Error ? failure.message : 'Không cập nhật được voucher');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      onCopy('Sao chép thành công', 'success');
    } catch {
      onCopy('Sao chép thất bại', 'error');
    }
  }

  return (
    <article className="card stack">
      <header className="card-head">
        <div>
          <h2>{publisher.user.name}</h2>
          <p className="hint">Publisher #{publisher.id} · {publisher.user.email}</p>
        </div>
        <Link to={`/?ref=${publisher.id}`}>Mở trang mua</Link>
      </header>
      <label>
        Link giới thiệu
        <input readOnly value={link} />
      </label>
      <button type="button" onClick={copyLink}>Chép link</button>

      <ul className="voucher-list">
        {publisher.vouchers.length === 0 ? <li className="hint">Chưa có voucher.</li> : null}
        {publisher.vouchers.map((voucher) => (
          <li key={voucher.id}>
            <span>
              <strong>{voucher.code}</strong>
              <span className="hint"> giảm {formatVnd(voucher.discountAmount)}</span>
              {voucher.isActive ? null : <span className="tag">Đã ngưng</span>}
            </span>
            <button type="button" onClick={() => toggle(voucher.id, !voucher.isActive)}>
              {voucher.isActive ? 'Ngưng' : 'Bật lại'}
            </button>
          </li>
        ))}
      </ul>

      <form className="inline-form" onSubmit={addVoucher}>
        <label>
          Mã mới
          <input value={code} onChange={(event) => setCode(event.target.value)} required minLength={2} maxLength={40} />
        </label>
        <label>
          Số tiền giảm
          <input
            type="number"
            min={0}
            step={1000}
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            required
          />
        </label>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Đang thêm…' : 'Thêm voucher'}
        </button>
      </form>
    </article>
  );
}
