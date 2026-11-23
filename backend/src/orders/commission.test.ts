import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calcAmounts, calcCommission, isSelfReferral, resolveAttribution } from './commission';

describe('resolveAttribution', () => {
  it('ưu tiên voucher hơn link', () => {
    assert.equal(resolveAttribution({ refPublisherId: 1, voucherPublisherId: 2 }), 2);
  });

  it('dùng link khi không có voucher', () => {
    assert.equal(resolveAttribution({ refPublisherId: 1, voucherPublisherId: null }), 1);
  });

  it('không ghi nhận khi không có kênh nào', () => {
    assert.equal(resolveAttribution({ refPublisherId: null, voucherPublisherId: null }), null);
  });
});

describe('calcAmounts', () => {
  it('trừ voucher khỏi giá', () => {
    assert.deepEqual(calcAmounts(1_000_000, 100_000), {
      discountAmount: 100_000,
      amountPaid: 900_000,
    });
  });

  it('không âm khi voucher lớn hơn giá', () => {
    assert.deepEqual(calcAmounts(50_000, 100_000), {
      discountAmount: 100_000,
      amountPaid: 0,
    });
  });

  it('giữ nguyên giá khi không có voucher', () => {
    assert.deepEqual(calcAmounts(1_000_000, null), {
      discountAmount: 0,
      amountPaid: 1_000_000,
    });
  });
});

describe('calcCommission', () => {
  it('tính 10% số tiền thực trả', () => {
    assert.equal(calcCommission(1_000_000, true, false), 100_000);
    assert.equal(calcCommission(900_000, true, false), 90_000);
  });

  it('bằng 0 khi người mua là Publisher được ghi nhận', () => {
    assert.equal(isSelfReferral(5, 5), true);
    assert.equal(calcCommission(1_000_000, true, true), 0);
  });

  it('vẫn tính khi người mua là khách, không phải Publisher', () => {
    assert.equal(isSelfReferral(null, 5), false);
    assert.equal(calcCommission(1_000_000, true, false), 100_000);
  });

  it('vẫn tính khi người mua là Publisher khác', () => {
    assert.equal(isSelfReferral(8, 5), false);
    assert.equal(calcCommission(900_000, true, false), 90_000);
  });

  it('bằng 0 khi không có Publisher', () => {
    assert.equal(calcCommission(1_000_000, false, false), 0);
  });
});
