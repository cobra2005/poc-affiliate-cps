import { Prisma } from '@prisma/client';
import { calcCommission, isSelfReferral } from './commission';

export const orderInclude = {
  product: { select: { id: true, name: true } },
  buyer: {
    select: {
      id: true,
      name: true,
      email: true,
      publisher: { select: { id: true } },
    },
  },
  refPublisher: { include: { user: { select: { id: true, name: true } } } },
  voucher: { select: { id: true, code: true, discountAmount: true } },
  attributedPublisher: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export type AttributionOutcome = 'no_attribution' | 'self_referral' | 'standard';

export function toOrderView(order: OrderWithRelations) {
  const selfReferral = isSelfReferral(order.buyer.publisher?.id ?? null, order.attributedPublisherId);
  const hasAttribution = order.attributedPublisherId != null;
  const attributionOutcome: AttributionOutcome = !hasAttribution
    ? 'no_attribution'
    : selfReferral
      ? 'self_referral'
      : 'standard';

  return {
    id: order.id,
    status: order.status,
    unitPrice: order.unitPrice,
    discountAmount: order.discountAmount,
    amountPaid: order.amountPaid,
    commissionAmount: order.commissionAmount,
    expectedCommission: calcCommission(order.amountPaid, hasAttribution, selfReferral),
    attributionOutcome,
    paidAt: order.paidAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    product: order.product,
    buyer: {
      id: order.buyer.id,
      name: order.buyer.name,
      email: order.buyer.email,
    },
    refPublisher: order.refPublisher
      ? { id: order.refPublisher.id, name: order.refPublisher.user.name }
      : null,
    voucher: order.voucher,
    attributedPublisher: order.attributedPublisher
      ? { id: order.attributedPublisher.id, name: order.attributedPublisher.user.name }
      : null,
  };
}
