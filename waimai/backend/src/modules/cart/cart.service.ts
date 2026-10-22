import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError.js";

export async function lockUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
}
export async function readCart(tx: Prisma.TransactionClient, userId: string) {
  return tx.cartItem.findMany({
    where: { userId },
    include: { shop: true, product: true },
    orderBy: { id: "asc" },
  });
}
export function summarizeCart(items: Awaited<ReturnType<typeof readCart>>) {
  const shop = items[0]?.shop || null;
  const goodsAmount = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const deliveryFee = shop?.deliveryFee || 0;
  const issues: string[] = [];
  if (!items.length) issues.push("购物车为空");
  if (items.some((item) => item.shopId !== shop?.id))
    issues.push("一个订单只能购买一家商家的商品");
  if (shop && shop.status !== "OPEN") issues.push("商家当前休息中");
  for (const item of items) {
    if (!item.product.isOnSale)
      issues.push(`${item.product.name}已下架，请移除`);
    else if (item.product.stock < item.quantity)
      issues.push(`${item.product.name}库存不足，请调整数量`);
  }
  if (shop && goodsAmount < shop.minOrderAmount)
    issues.push(
      `还差¥${((shop.minOrderAmount - goodsAmount) / 100).toFixed(2)}起送`,
    );
  const version = createHash("sha256")
    .update(
      JSON.stringify({
        items: items.map((item) => [
          item.id,
          item.productId,
          item.quantity,
          item.product.price,
          item.product.isOnSale,
          item.product.name,
        ]),
        shop: shop && [
          shop.id,
          shop.status,
          shop.deliveryFee,
          shop.minOrderAmount,
        ],
      }),
    )
    .digest("hex");
  return {
    items,
    shop,
    goodsAmount,
    deliveryFee,
    totalAmount: goodsAmount + deliveryFee,
    version,
    issues,
    canOrder: issues.length === 0,
  };
}
export function assertCartAvailable(summary: ReturnType<typeof summarizeCart>) {
  if (!summary.canOrder)
    throw new AppError(409, summary.issues[0], "CART_NOT_AVAILABLE");
}
