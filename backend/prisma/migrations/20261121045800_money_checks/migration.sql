ALTER TABLE "vouchers"
ADD CONSTRAINT "vouchers_discount_amount_check" CHECK ("discount_amount" >= 0);

ALTER TABLE "products"
ADD CONSTRAINT "products_price_check" CHECK ("price" >= 0);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_money_check" CHECK (
  "unit_price" >= 0
  AND "discount_amount" >= 0
  AND "amount_paid" >= 0
  AND "commission_amount" >= 0
  AND "amount_paid" = GREATEST("unit_price" - "discount_amount", 0)
);
