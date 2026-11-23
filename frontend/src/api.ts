import type { AttributionOutcome, CheckoutResult, PayResult, Product, Publisher, User, Voucher } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = 'Yêu cầu thất bại';
    try {
      const body = await response.json();
      if (Array.isArray(body.message)) {
        message = body.message.join('. ');
      } else if (typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      message = 'Yêu cầu thất bại';
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  users: () => request<User[]>('/api/users'),
  createUser: (input: { name: string; email: string }) =>
    request<User>('/api/users', { method: 'POST', body: JSON.stringify(input) }),
  products: () => request<Product[]>('/api/products'),
  publishers: () => request<Publisher[]>('/api/publishers'),
  createPublisher: (userId: number) =>
    request<Publisher>('/api/publishers', { method: 'POST', body: JSON.stringify({ userId }) }),
  createVoucher: (publisherId: number, input: { code: string; discountAmount: number }) =>
    request<Voucher>(`/api/publishers/${publisherId}/vouchers`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateVoucher: (voucherId: number, isActive: boolean) =>
    request<Voucher>(`/api/vouchers/${voucherId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  orders: () => request<import('./types').OrderView[]>('/api/orders'),
  order: (orderId: number) => request<import('./types').OrderView>(`/api/orders/${orderId}`),
  createOrder: (input: {
    productId: number;
    buyerUserId: number;
    refPublisherId?: number;
    voucherCode?: string;
  }) => request<CheckoutResult>('/api/orders', { method: 'POST', body: JSON.stringify(input) }),
  payOrder: (orderId: number) => request<PayResult>(`/api/orders/${orderId}/pay`, { method: 'POST' }),
};

export function formatVnd(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
}

export function outcomeLabel(outcome: AttributionOutcome) {
  switch (outcome) {
    case 'no_attribution':
      return 'Không có người giới thiệu';
    case 'self_referral':
      return 'Tự giới thiệu, hoa hồng bằng 0';
    case 'standard':
      return 'Hoa hồng 10% số tiền thực trả';
  }
}
