import { ActorType, ErrandOrderStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { requireActor } from "../auth/auth.middleware.js";
import { lockUser } from "../cart/cart.service.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { randomUUID } from "node:crypto";

const include = {
  rider: { select: { id: true, name: true, phone: true } },
  statusLogs: { orderBy: { createdAt: "asc" as const } },
};
const phone = z
  .string()
  .trim()
  .regex(/^1[3-9]\d{9}$/, "请输入正确的手机号");
const address = z.object({
  name: z.string().trim().min(1).max(30),
  phone,
  region: z.string().trim().min(1).max(80),
  detail: z.string().trim().min(1).max(160),
});
const createSchema = z
  .object({
    serviceType: z.enum(["DELIVERY", "BUY"]),
    deliveryMode: z.enum(["SEND", "PICK"]),
    pickupAddress: address.extend({ phone: z.union([phone, z.literal("")]) }),
    deliveryAddress: address,
    itemNote: z.string().trim().min(2, "请填写物品或购买清单").max(200),
    remark: z.string().trim().max(300).default(""),
    goodsBudget: z.number().int().min(1).max(1000000).optional(),
    requestId: z.string().min(16).max(80),
  })
  .superRefine((value, ctx) => {
    if (value.serviceType === "BUY" && !value.goodsBudget)
      ctx.addIssue({
        code: "custom",
        path: ["goodsBudget"],
        message: "请填写商品预算",
      });
    if (value.serviceType !== "BUY" && !value.pickupAddress.phone)
      ctx.addIssue({
        code: "custom",
        path: ["pickupAddress", "phone"],
        message: "请填写取件人手机号",
      });
    if (value.serviceType === "BUY" && value.deliveryMode !== "SEND")
      ctx.addIssue({
        code: "custom",
        path: ["deliveryMode"],
        message: "帮买无需选择取送方式",
      });
    const a = value.pickupAddress,
      b = value.deliveryAddress;
    if (a.region === b.region && a.detail === b.detail)
      ctx.addIssue({
        code: "custom",
        path: ["deliveryAddress"],
        message: "取送地点不能相同",
      });
  });
function missing() {
  return new AppError(404, "跑腿订单不存在", "ERRAND_ORDER_NOT_FOUND");
}
function conflict(message = "订单状态已变化，请刷新后重试") {
  return new AppError(409, message, "ERRAND_STATUS_CHANGED");
}
function log(
  orderId: string,
  toStatus: ErrandOrderStatus,
  actorType: ActorType,
  actorId: string,
  note: string,
) {
  return { orderId, toStatus, actorType, actorId, note };
}
export async function expireErrands(userId?: string) {
  const rows = await prisma.errandOrder.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      expiresAt: { lte: new Date() },
    },
    select: { id: true },
    take: 100,
    orderBy: { expiresAt: "asc" },
  });
  for (const row of rows)
    await prisma.$transaction(async (tx) => {
      const changed = await tx.errandOrder.updateMany({
        where: {
          id: row.id,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          expiresAt: { lte: new Date() },
        },
        data: {
          status: "CANCELLED",
          paymentStatus: "CLOSED",
          cancelledAt: new Date(),
        },
      });
      if (changed.count)
        await tx.errandStatusLog.create({
          data: log(
            row.id,
            "CANCELLED",
            "ADMIN",
            "system-expiry",
            "报价确认超时，订单已关闭",
          ),
        });
    });
}
export const errandRouter = Router();
errandRouter.use(requireActor(ActorType.USER));
errandRouter.use(
  asyncHandler(async (req, _res, next) => {
    await expireErrands(req.actor!.id);
    next();
  }),
);
errandRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({
      data: await prisma.errandOrder.findMany({
        where: { userId: req.actor!.id },
        include,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }),
);
errandRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body),
      userId = req.actor!.id;
    const order = await prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const existing = await tx.errandOrder.findUnique({
        where: { userId_requestId: { userId, requestId: input.requestId } },
        include,
      });
      if (existing) return existing;
      return tx.errandOrder.create({
        data: {
          orderNo: `PT${Date.now()}${randomUUID().replaceAll("-", "").slice(0, 10)}`,
          userId,
          requestId: input.requestId,
          serviceType: input.serviceType,
          deliveryMode: input.deliveryMode,
          vehicleType: "BIKE",
          pickupAddressSnapshot: input.pickupAddress,
          deliveryAddressSnapshot: input.deliveryAddress,
          itemNote: input.itemNote,
          remark: input.remark,
          goodsBudget: input.serviceType === "BUY" ? input.goodsBudget : null,
          baseFee: 0,
          totalAmount: 0,
          status: "PENDING_QUOTE",
          paymentStatus: "PENDING",
          statusLogs: {
            create: {
              toStatus: "PENDING_QUOTE",
              actorType: "USER",
              actorId: userId,
              note: "需求已提交，等待平台报价",
            },
          },
        },
        include,
      });
    });
    res.status(201).json({ data: order });
  }),
);
errandRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.errandOrder.findFirst({
      where: { id: req.params.id, userId: req.actor!.id },
      include,
    });
    if (!order) throw missing();
    res.json({ data: order });
  }),
);
errandRouter.post(
  "/:id/pay/mock",
  asyncHandler(async (req, res) => {
    if (!env.mockPaymentEnabled)
      throw new AppError(403, "测试支付未开启", "MOCK_PAYMENT_DISABLED");
    const input = z
      .object({ quotedAmount: z.number().int().positive() })
      .parse(req.body);
    const order = await prisma.$transaction(async (tx) => {
      await lockUser(tx, req.actor!.id);
      const current = await tx.errandOrder.findFirst({
        where: { id: req.params.id, userId: req.actor!.id },
      });
      if (!current) throw missing();
      if (current.totalAmount !== input.quotedAmount)
        throw conflict("费用已变化，请重新确认报价");
      if (current.paymentStatus === "PAID" && current.paymentMethod === "MOCK")
        return tx.errandOrder.findUniqueOrThrow({
          where: { id: current.id },
          include,
        });
      const updated = await tx.errandOrder.updateMany({
        where: {
          id: current.id,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          expiresAt: { gt: new Date() },
        },
        data: {
          status: "PENDING_ASSIGN",
          paymentStatus: "PAID",
          paymentMethod: "MOCK",
          paidAt: new Date(),
        },
      });
      if (!updated.count) throw conflict("当前订单不能支付，请刷新状态");
      await tx.errandStatusLog.create({
        data: log(
          current.id,
          "PENDING_ASSIGN",
          "USER",
          req.actor!.id,
          "报价已确认，测试支付成功（未扣款），等待骑手接单",
        ),
      });
      return tx.errandOrder.findUniqueOrThrow({
        where: { id: current.id },
        include,
      });
    });
    res.json({ data: order });
  }),
);
errandRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const order = await prisma.$transaction(async (tx) => {
      await lockUser(tx, req.actor!.id);
      const current = await tx.errandOrder.findFirst({
        where: { id: req.params.id, userId: req.actor!.id },
      });
      if (!current) throw missing();
      if (current.status === "CANCELLED")
        return tx.errandOrder.findUniqueOrThrow({
          where: { id: current.id },
          include,
        });
      const paid = current.paymentStatus === "PAID";
      const changed = await tx.errandOrder.updateMany({
        where: {
          id: current.id,
          riderId: null,
          OR: [
            {
              status: { in: ["PENDING_QUOTE", "PENDING_PAYMENT"] },
              paymentStatus: "PENDING",
            },
            {
              status: "PENDING_ASSIGN",
              paymentStatus: "PAID",
              paymentMethod: "MOCK",
            },
          ],
        },
        data: {
          status: "CANCELLED",
          paymentStatus: paid ? "REFUNDED" : "CLOSED",
          cancelledAt: new Date(),
        },
      });
      if (!changed.count) {
        const latest = await tx.errandOrder.findUniqueOrThrow({
          where: { id: current.id },
          include,
        });
        if (latest.status === "CANCELLED") return latest;
        throw conflict("骑手接单后请联系骑手协商，当前订单不能直接取消");
      }
      await tx.errandStatusLog.create({
        data: log(
          current.id,
          "CANCELLED",
          "USER",
          req.actor!.id,
          paid ? "用户取消订单，测试支付已撤销（未扣款）" : "用户取消跑腿需求",
        ),
      });
      return tx.errandOrder.findUniqueOrThrow({
        where: { id: current.id },
        include,
      });
    });
    res.json({ data: order });
  }),
);

export const adminErrandRouter = Router();
adminErrandRouter.use(requireActor(ActorType.ADMIN));
adminErrandRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    await expireErrands();
    res.json({
      data: await prisma.errandOrder.findMany({
        include: {
          ...include,
          user: { select: { id: true, account: true, nickname: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    });
  }),
);
adminErrandRouter.post(
  "/:id/quote",
  asyncHandler(async (req, res) => {
    const { serviceFee } = z
      .object({ serviceFee: z.number().int().min(1).max(100000) })
      .parse(req.body);
    const order = await prisma.$transaction(async (tx) => {
      const changed = await tx.errandOrder.updateMany({
        where: {
          id: req.params.id,
          status: "PENDING_QUOTE",
          paymentStatus: "PENDING",
          riderId: null,
        },
        data: {
          baseFee: serviceFee,
          totalAmount: serviceFee,
          status: "PENDING_PAYMENT",
          quotedAt: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60_000),
        },
      });
      if (!changed.count) {
        const current = await tx.errandOrder.findUnique({
          where: { id: req.params.id },
          include,
        });
        if (!current) throw missing();
        if (
          current.status === "PENDING_PAYMENT" &&
          current.totalAmount === serviceFee
        )
          return current;
        throw conflict("只有待报价订单可以报价");
      }
      await tx.errandStatusLog.create({
        data: log(
          req.params.id,
          "PENDING_PAYMENT",
          "ADMIN",
          req.actor!.id,
          `平台报价：跑腿服务费 ¥${(serviceFee / 100).toFixed(2)}，请在15分钟内确认；不包含商品款`,
        ),
      });
      return tx.errandOrder.findUniqueOrThrow({
        where: { id: req.params.id },
        include,
      });
    });
    res.json({ data: order });
  }),
);

adminErrandRouter.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const { reason } = z
      .object({ reason: z.string().trim().min(2).max(200) })
      .parse(req.body);
    const order = await prisma.$transaction(async (tx) => {
      const changed = await tx.errandOrder.updateMany({
        where: {
          id: req.params.id,
          status: "PENDING_QUOTE",
          paymentStatus: "PENDING",
        },
        data: {
          status: "CANCELLED",
          paymentStatus: "CLOSED",
          cancelledAt: new Date(),
        },
      });
      if (!changed.count)
        throw conflict("只有待报价需求可以拒绝，请刷新后重试");
      await tx.errandStatusLog.create({
        data: log(
          req.params.id,
          "CANCELLED",
          "ADMIN",
          req.actor!.id,
          `平台暂无法承接：${reason}`,
        ),
      });
      return tx.errandOrder.findUniqueOrThrow({
        where: { id: req.params.id },
        include,
      });
    });
    res.json({ data: order });
  }),
);

export const riderErrandRouter = Router();
riderErrandRouter.use(requireActor(ActorType.RIDER));
riderErrandRouter.use(
  asyncHandler(async (req, _res, next) => {
    if (
      !(await prisma.rider.findUnique({
        where: { id: req.actor!.id },
        select: { id: true },
      }))
    )
      throw new AppError(401, "骑手账户不存在", "RIDER_NOT_FOUND");
    next();
  }),
);
function publicTask(order: {
  id: string;
  orderNo: string;
  serviceType: string;
  deliveryMode: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  pickupAddressSnapshot: Prisma.JsonValue;
  deliveryAddressSnapshot: Prisma.JsonValue;
  itemNote: string | null;
  goodsBudget: number | null;
}) {
  const region = (value: Prisma.JsonValue) =>
    (value as { region?: string })?.region || "";
  return {
    id: order.id,
    orderNo: order.orderNo,
    serviceType: order.serviceType,
    deliveryMode: order.deliveryMode,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    itemNote: order.itemNote,
    goodsBudget: order.goodsBudget,
    pickupAddressSnapshot: { region: region(order.pickupAddressSnapshot) },
    deliveryAddressSnapshot: { region: region(order.deliveryAddressSnapshot) },
  };
}
riderErrandRouter.get(
  "/available",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.errandOrder.findMany({
      where: { status: "PENDING_ASSIGN", paymentStatus: "PAID", riderId: null },
      orderBy: { paidAt: "asc" },
      take: 100,
    });
    res.json({ data: rows.map(publicTask) });
  }),
);
riderErrandRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({
      data: await prisma.errandOrder.findMany({
        where: { riderId: req.actor!.id },
        include,
        orderBy: { acceptedAt: "desc" },
        take: 100,
      }),
    });
  }),
);
riderErrandRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const row = await prisma.errandOrder.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { riderId: req.actor!.id },
          { riderId: null, status: "PENDING_ASSIGN", paymentStatus: "PAID" },
        ],
      },
      include,
    });
    if (!row) throw missing();
    res.json({ data: row.riderId ? row : publicTask(row) });
  }),
);
for (const action of ["accept", "pickup", "deliver"] as const) {
  riderErrandRouter.post(
    `/:id/${action}`,
    asyncHandler(async (req, res) => {
      const riderId = req.actor!.id;
      const from: ErrandOrderStatus =
        action === "accept"
          ? "PENDING_ASSIGN"
          : action === "pickup"
            ? "RIDER_ACCEPTED"
            : "PICKED_UP";
      const to: ErrandOrderStatus =
        action === "accept"
          ? "RIDER_ACCEPTED"
          : action === "pickup"
            ? "PICKED_UP"
            : "COMPLETED";
      const now = new Date();
      const order = await prisma.$transaction(async (tx) => {
        const changed = await tx.errandOrder.updateMany({
          where: {
            id: req.params.id,
            status: from,
            paymentStatus: "PAID",
            riderId: action === "accept" ? null : riderId,
          },
          data: {
            status: to,
            ...(action === "accept"
              ? { riderId, acceptedAt: now }
              : action === "pickup"
                ? { pickedUpAt: now }
                : { deliveredAt: now, completedAt: now }),
          },
        });
        if (!changed.count) {
          const current = await tx.errandOrder.findFirst({
            where: { id: req.params.id, riderId },
            include,
          });
          if (
            current &&
            (current.status === to ||
              (action === "accept" &&
                ["PICKED_UP", "COMPLETED"].includes(current.status)))
          )
            return current;
          if (action !== "accept" && !current) throw missing();
          throw conflict(
            action === "accept"
              ? "订单已被接走或已取消"
              : "操作顺序不正确，请刷新后重试",
          );
        }
        await tx.errandStatusLog.create({
          data: log(
            req.params.id,
            to,
            "RIDER",
            riderId,
            action === "accept"
              ? "骑手已接单"
              : action === "pickup"
                ? "骑手已取到物品，正在送往收货地点"
                : "骑手确认送达，跑腿订单完成",
          ),
        });
        return tx.errandOrder.findUniqueOrThrow({
          where: { id: req.params.id },
          include,
        });
      });
      res.json({ data: order });
    }),
  );
}
