const base = process.env.API_URL ?? 'http://localhost:3000/api';

type User = { id: number; name: string; email: string; publisherId: number | null };
type Product = { id: number; name: string; price: number };
type Publisher = {
  id: number;
  user: { email: string; name: string };
  vouchers: { id: number; code: string; isActive: boolean }[];
};
type OrderView = {
  id: number;
  amountPaid: number;
  commissionAmount: number;
  expectedCommission: number;
  attributionOutcome: string;
  status: string;
  attributedPublisher: { id: number; name: string } | null;
  voucher: { code: string } | null;
};
type Checkout = {
  order: OrderView;
  refStatus: string;
  voucherStatus: string;
};
type PayResult = { order: OrderView; alreadyPaid: boolean };

let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    return;
  }
  console.log(`OK   ${name}`);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${response.status} ${path} ${text}`);
  }
  return body as T;
}

async function place(input: {
  productId: number;
  buyerUserId: number;
  refPublisherId?: number;
  voucherCode?: string;
}) {
  return api<Checkout>('/orders', { method: 'POST', body: JSON.stringify(input) });
}

async function pay(id: number) {
  return api<PayResult>(`/orders/${id}/pay`, { method: 'POST' });
}

async function scenario(name: string, input: Parameters<typeof place>[0], expect: {
  publisherId: number | null;
  amountPaid: number;
  commission: number;
  outcome: string;
  voucherStatus?: string;
}) {
  const before = await api<OrderView[]>('/orders');
  const created = await place(input);
  check(
    `${name}: chờ thanh toán thì hoa hồng đang lưu là 0`,
    created.order.status === 'pending' && created.order.commissionAmount === 0,
  );
  check(
    `${name}: dự kiến ${expect.commission}`,
    created.order.expectedCommission === expect.commission &&
      created.order.amountPaid === expect.amountPaid &&
      created.order.attributionOutcome === expect.outcome &&
      (created.order.attributedPublisher?.id ?? null) === expect.publisherId,
    JSON.stringify({
      expectedCommission: created.order.expectedCommission,
      amountPaid: created.order.amountPaid,
      outcome: created.order.attributionOutcome,
      publisher: created.order.attributedPublisher,
    }),
  );
  if (expect.voucherStatus) {
    check(`${name}: voucher ${expect.voucherStatus}`, created.voucherStatus === expect.voucherStatus);
  }

  const paid = await pay(created.order.id);
  check(
    `${name}: thanh toán ghi ${expect.commission}`,
    paid.alreadyPaid === false &&
      paid.order.status === 'paid' &&
      paid.order.commissionAmount === expect.commission,
  );

  const again = await pay(created.order.id);
  const after = await api<OrderView[]>('/orders');
  check(
    `${name}: thanh toán lần nữa không cộng thêm`,
    again.alreadyPaid === true &&
      again.order.commissionAmount === expect.commission &&
      after.length === before.length + 1,
  );
}

async function main() {
  const health = await api<{ ok: boolean }>('/health');
  check('API sẵn sàng', health.ok === true);

  const [users, products, publishers] = await Promise.all([
    api<User[]>('/users'),
    api<Product[]>('/products'),
    api<Publisher[]>('/publishers'),
  ]);

  const an = users.find((user) => user.email === 'an@shop.test');
  const binh = users.find((user) => user.email === 'binh@shop.test');
  const chi = users.find((user) => user.email === 'chi@shop.test');
  const product = products.find((item) => item.price === 1_000_000);
  const publisherA = publishers.find((item) => item.user.email === 'an@shop.test');
  const publisherB = publishers.find((item) => item.user.email === 'binh@shop.test');
  if (!an || !binh || !chi || !product || !publisherA || !publisherB) {
    throw new Error('Thiếu dữ liệu seed');
  }
  check('Chi là khách, không phải Publisher', chi.publisherId == null);

  await scenario('Link của A, khách Chi', {
    productId: product.id,
    buyerUserId: chi.id,
    refPublisherId: publisherA.id,
  }, {
    publisherId: publisherA.id,
    amountPaid: 1_000_000,
    commission: 100_000,
    outcome: 'standard',
  });

  await scenario('Voucher của B, không link', {
    productId: product.id,
    buyerUserId: chi.id,
    voucherCode: 'BINH100',
  }, {
    publisherId: publisherB.id,
    amountPaid: 900_000,
    commission: 90_000,
    outcome: 'standard',
    voucherStatus: 'applied',
  });

  await scenario('Link A và voucher B', {
    productId: product.id,
    buyerUserId: chi.id,
    refPublisherId: publisherA.id,
    voucherCode: 'binh100',
  }, {
    publisherId: publisherB.id,
    amountPaid: 900_000,
    commission: 90_000,
    outcome: 'standard',
  });

  await scenario('An mua qua link của chính mình', {
    productId: product.id,
    buyerUserId: an.id,
    refPublisherId: publisherA.id,
  }, {
    publisherId: publisherA.id,
    amountPaid: 1_000_000,
    commission: 0,
    outcome: 'self_referral',
  });

  await scenario('An mua bằng voucher của B', {
    productId: product.id,
    buyerUserId: an.id,
    refPublisherId: publisherA.id,
    voucherCode: 'BINH100',
  }, {
    publisherId: publisherB.id,
    amountPaid: 900_000,
    commission: 90_000,
    outcome: 'standard',
  });

  await scenario('Bình tự dùng voucher của mình', {
    productId: product.id,
    buyerUserId: binh.id,
    refPublisherId: publisherA.id,
    voucherCode: 'BINH100',
  }, {
    publisherId: publisherB.id,
    amountPaid: 900_000,
    commission: 0,
    outcome: 'self_referral',
  });

  await scenario('Không link, không voucher', {
    productId: product.id,
    buyerUserId: chi.id,
  }, {
    publisherId: null,
    amountPaid: 1_000_000,
    commission: 0,
    outcome: 'no_attribution',
  });

  const smallVoucher = publisherB.vouchers.find((voucher) => voucher.code === 'BINH20');
  if (!smallVoucher) {
    throw new Error('Thiếu voucher BINH20');
  }
  await api(`/vouchers/${smallVoucher.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: false }),
  });
  await scenario('Voucher đã ngưng không được áp', {
    productId: product.id,
    buyerUserId: chi.id,
    voucherCode: 'BINH20',
  }, {
    publisherId: null,
    amountPaid: 1_000_000,
    commission: 0,
    outcome: 'no_attribution',
    voucherStatus: 'inactive',
  });
  await api(`/vouchers/${smallVoucher.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: true }),
  });

  if (failed > 0) {
    console.error(`${failed} ca thất bại`);
    process.exit(1);
  }
  console.log('Tất cả ca ghi nhận đều đúng.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
