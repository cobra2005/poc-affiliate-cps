export type User = {
  id: number;
  name: string;
  email: string;
  publisherId: number | null;
};

export type Product = {
  id: number;
  name: string;
  price: number;
};

export type Voucher = {
  id: number;
  code: string;
  discountAmount: number;
  isActive: boolean;
};

export type Publisher = {
  id: number;
  user: { id: number; name: string; email: string };
  vouchers: Voucher[];
};

export type AttributionOutcome = 'no_attribution' | 'self_referral' | 'standard';

export type OrderView = {
  id: number;
  status: 'pending' | 'paid';
  unitPrice: number;
  discountAmount: number;
  amountPaid: number;
  commissionAmount: number;
  expectedCommission: number;
  attributionOutcome: AttributionOutcome;
  paidAt: string | null;
  createdAt: string;
  product: { id: number; name: string };
  buyer: { id: number; name: string; email: string };
  refPublisher: { id: number; name: string } | null;
  voucher: { id: number; code: string; discountAmount: number } | null;
  attributedPublisher: { id: number; name: string } | null;
};

export type ChannelStatus = 'none' | 'applied' | 'missing' | 'inactive';

export type CheckoutResult = {
  order: OrderView;
  refStatus: ChannelStatus;
  voucherStatus: ChannelStatus;
};

export type PayResult = {
  order: OrderView;
  alreadyPaid: boolean;
};
