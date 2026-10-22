import { ActorType, Prisma } from "@prisma/client";
import { expireErrands } from "../errands/errand.routes.js";
import { prisma } from "../../config/db.js";

export async function closeUnpaidOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  userId: string,
  note: string,
  expired = false,
) {
  const result = await tx.order.updateMany({
    where: {
      id: orderId,
      userId,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      ...(expired ? { expiresAt: { lte: new Date() } } : {}),
    },
    data: {
      status: "CANCELLED",
      paymentStatus: "CLOSED",
      cancelledAt: new Date(),
    },
  });
  if (!result.count) return false;
  const items = await tx.orderItem.findMany({
    where: { orderId },
    orderBy: { productId: "asc" },
  });
  for (const item of items)
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  await tx.orderStatusLog.create({
    data: {
      orderId,
      fromStatus: "PENDING_PAYMENT",
      toStatus: "CANCELLED",
      actorType: expired ? ActorType.ADMIN : ActorType.USER,
      actorId: expired ? "system-expiry" : userId,
      note,
    },
  });
  return true;
}
let expiryRun: Promise<void> | undefined;
export async function expireOrders(userId?: string) {
  const expired = await prisma.order.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      expiresAt: { lte: new Date() },
    },
    select: { id: true, userId: true },
    take: 100,
    orderBy: { expiresAt: "asc" },
  });
  for (const order of expired)
    await prisma.$transaction((tx) =>
      closeUnpaidOrder(
        tx,
        order.id,
        order.userId,
        "支付超时，订单自动关闭并恢复库存",
        true,
      ),
    );
}
export function startExpiryWorker() {
  const run = () => {
    if (expiryRun) return;
    expiryRun = Promise.all([expireOrders(), expireErrands()])
      .then(() => {})
      .catch((error) => console.error("订单超时处理失败", error))
      .finally(() => {
        expiryRun = undefined;
      });
  };
  run();
  const timer = setInterval(run, 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
