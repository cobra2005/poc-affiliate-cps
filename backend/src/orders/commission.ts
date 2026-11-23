export function resolveAttribution(input: {
  refPublisherId: number | null;
  voucherPublisherId: number | null;
}): number | null {
  if (input.voucherPublisherId != null) {
    return input.voucherPublisherId;
  }
  return input.refPublisherId;
}

export function calcAmounts(unitPrice: number, voucherDiscount: number | null) {
  const discountAmount = voucherDiscount ?? 0;
  return {
    discountAmount,
    amountPaid: Math.max(0, unitPrice - discountAmount),
  };
}

export function isSelfReferral(buyerPublisherId: number | null, attributedPublisherId: number | null) {
  return buyerPublisherId != null && buyerPublisherId === attributedPublisherId;
}

export function calcCommission(amountPaid: number, hasAttribution: boolean, selfReferral: boolean) {
  if (!hasAttribution || selfReferral) {
    return 0;
  }
  return Math.round(amountPaid / 10);
}
