import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">CPS</span>
          <div>
            <strong>Cửa hàng mẫu</strong>
            <p>Ghi nhận hoa hồng theo link hoặc voucher</p>
          </div>
        </div>
        <nav aria-label="Chính">
          <NavLink to="/" end>
            Mua hàng
          </NavLink>
          <NavLink to="/publishers">Publisher</NavLink>
          <NavLink to="/orders">Đơn hàng</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
