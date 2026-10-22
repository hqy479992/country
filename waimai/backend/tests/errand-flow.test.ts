import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
const url = new URL(process.env.TEST_DATABASE_URL || "http://not-configured");
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "55439" ||
  url.pathname !== "/country_user_flow"
)
  throw new Error("仅允许专用本地测试库");
process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = "test";
process.env.MOCK_PAYMENT_ENABLED = "true";
process.env.ADMIN_ACCESS_KEY = "local-errand-admin";
const { prisma } = await import("../src/config/db.js");
const { createApp } = await import("../src/app.js");
const { env } = await import("../src/config/env.js");
const server = createApp().listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const userIds: string[] = [],
  riderIds: string[] = [];
async function req(
  path: string,
  token = "",
  method = "GET",
  data?: unknown,
  headers: Record<string, string> = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const text = await response.text();
  return { status: response.status, ...(text ? JSON.parse(text) : {}) } as {
    status: number;
    data: any;
    error?: { message: string };
  };
}
const admin = {
  "x-actor-type": "ADMIN",
  "x-actor-id": "test-admin",
  "x-access-key": "local-errand-admin",
};
const root = "/api/user/errand-orders";
const input = {
  serviceType: "DELIVERY",
  deliveryMode: "SEND",
  pickupAddress: {
    name: "取件方",
    phone: "13800138000",
    region: "测试镇",
    detail: "东街1号",
  },
  deliveryAddress: {
    name: "收件方",
    phone: "13900139000",
    region: "测试镇",
    detail: "西街2号",
  },
  itemNote: "一袋衣服，约两公斤",
  remark: "流程测试",
};
async function create(token: string, extra: Record<string, unknown> = {}) {
  return req(root, token, "POST", {
    ...input,
    requestId: randomUUID(),
    ...extra,
  });
}
async function quote(id: string, serviceFee = 600) {
  return req(
    `/api/admin/errand-orders/${id}/quote`,
    "",
    "POST",
    { serviceFee },
    admin,
  );
}
async function pay(id: string, token: string, amount = 600) {
  return req(`${root}/${id}/pay/mock`, token, "POST", { quotedAmount: amount });
}
async function rider(
  path: string,
  headers: Record<string, string>,
  method = "GET",
) {
  return req(`/api/rider/errands${path}`, "", method, undefined, headers);
}
await test("跑腿需求、报价、测试支付和骑手配送完整流程", async (t) => {
  try {
    const users = [];
    for (const n of ["a", "b"]) {
      const r = await req("/api/auth/register", "", "POST", {
        account: `pt_${randomUUID().slice(0, 8)}_${n}`,
        password: "errand-test-password",
        nickname: `跑腿${n}`,
      });
      assert.equal(r.status, 201);
      users.push(r.data);
      userIds.push(r.data.user.id);
    }
    const [a, b] = users;
    const riders = [];
    for (const n of ["a", "b"]) {
      const row = await prisma.rider.create({ data: { name: `跑腿测试${n}` } });
      riderIds.push(row.id);
      const key = `local-rider-${n}`;
      env.staffAccessKeys[`RIDER:${row.id}`] = key;
      riders.push({
        "x-actor-type": "RIDER",
        "x-actor-id": row.id,
        "x-access-key": key,
      });
    }
    const [r1, r2] = riders;
    await t.test("游客与伪造身份被拒绝，三类需求校验有效", async () => {
      assert.equal((await create("")).status, 401);
      assert.equal(
        (
          await req(root, "", "GET", undefined, {
            "x-actor-type": "USER",
            "x-actor-id": a.user.id,
          })
        ).status,
        401,
      );
      assert.equal(
        (await create(a.token, { serviceType: "HELP" })).status,
        400,
      );
      assert.equal(
        (
          await create(a.token, {
            pickupAddress: { ...input.pickupAddress, phone: "" },
          })
        ).status,
        400,
      );
      assert.equal((await create(a.token, { serviceType: "BUY" })).status, 400);
      assert.equal(
        (await create(a.token, { deliveryAddress: input.pickupAddress }))
          .status,
        400,
      );
      const pick = await create(a.token, { deliveryMode: "PICK" });
      assert.equal(pick.status, 201);
      assert.equal(pick.data.deliveryMode, "PICK");
      const buy = await create(a.token, {
        serviceType: "BUY",
        goodsBudget: 5000,
        pickupAddress: { ...input.pickupAddress, phone: "" },
      });
      assert.equal(buy.status, 201);
      assert.equal(buy.data.goodsBudget, 5000);
      assert.equal(buy.data.status, "PENDING_QUOTE");
      assert.equal(buy.data.paymentStatus, "PENDING");
      assert.equal(buy.data.paidAt, null);
    });
    let order: any;
    await t.test(
      "重复提交只创建一单，金额不能由客户端指定，订单按账户隔离",
      async () => {
        const requestId = randomUUID();
        const result = await Promise.all([
          create(a.token, { requestId, totalAmount: 1 }),
          create(a.token, { requestId, totalAmount: 1 }),
        ]);
        assert.ok(result.every((r) => r.status === 201));
        assert.equal(result[0].data.id, result[1].data.id);
        order = result[0].data;
        assert.equal(order.totalAmount, 0);
        assert.equal(order.distanceText, null);
        assert.equal(
          await prisma.errandOrder.count({
            where: { userId: a.user.id, requestId },
          }),
          1,
        );
        assert.equal((await req(`${root}/${order.id}`, b.token)).status, 404);
        assert.equal(
          (await req(`${root}/${order.id}/cancel`, b.token, "POST")).status,
          404,
        );
        assert.equal((await pay(order.id, b.token)).status, 404);
        assert.equal((await rider(`/${order.id}`, r1)).status, 404);
      },
    );
    await t.test("仅后台可报价，用户必须确认一致费用才能支付", async () => {
      assert.equal(
        (
          await req(
            `/api/admin/errand-orders/${order.id}/quote`,
            a.token,
            "POST",
            { serviceFee: 600 },
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await req(
            `/api/admin/errand-orders/${order.id}/quote`,
            "",
            "POST",
            { serviceFee: 600 },
            r1,
          )
        ).status,
        401,
      );
      assert.equal((await quote(order.id, -1)).status, 400);
      const quoted = await quote(order.id);
      assert.equal(quoted.status, 200);
      assert.equal(quoted.data.status, "PENDING_PAYMENT");
      assert.equal(quoted.data.totalAmount, 600);
      assert.ok(quoted.data.expiresAt);
      assert.equal((await quote(order.id, 700)).status, 409);
      assert.equal((await pay(order.id, a.token, 1)).status, 409);
      env.mockPaymentEnabled = false;
      assert.equal((await pay(order.id, a.token)).status, 403);
      env.mockPaymentEnabled = true;
      const paid = await Promise.all([
        pay(order.id, a.token),
        pay(order.id, a.token),
      ]);
      assert.ok(paid.every((r) => r.status === 200));
      assert.equal(paid[0].data.status, "PENDING_ASSIGN");
      assert.equal(paid[0].data.paymentMethod, "MOCK");
      assert.equal(
        await prisma.errandStatusLog.count({
          where: { orderId: order.id, toStatus: "PENDING_ASSIGN" },
        }),
        1,
      );
    });
    let winner: Record<string, string>, loser: Record<string, string>;
    await t.test("待接单隐藏联系信息，两骑手并发接单只能一人成功", async () => {
      const list = await rider("/available", r1);
      const task = list.data.find((o: any) => o.id === order.id);
      assert.ok(task);
      assert.equal(task.pickupAddressSnapshot.detail, undefined);
      assert.equal(task.deliveryAddressSnapshot.phone, undefined);
      assert.equal(task.userId, undefined);
      const results = await Promise.all([
        rider(`/${order.id}/accept`, r1, "POST"),
        rider(`/${order.id}/accept`, r2, "POST"),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      winner = results[0].status === 200 ? r1 : r2;
      loser = winner === r1 ? r2 : r1;
      const detail = await rider(`/${order.id}`, winner);
      assert.equal(
        detail.data.pickupAddressSnapshot.phone,
        input.pickupAddress.phone,
      );
      assert.equal((await rider(`/${order.id}`, loser)).status, 404);
      assert.equal(
        (await rider(`/${order.id}/pickup`, loser, "POST")).status,
        404,
      );
      assert.equal(
        (await req(`${root}/${order.id}/cancel`, a.token, "POST")).status,
        409,
      );
    });
    await t.test(
      "配送状态顺序受控，重复取送只写一次进度，用户可看到骑手",
      async () => {
        assert.equal(
          (await rider(`/${order.id}/deliver`, winner, "POST")).status,
          409,
        );
        const pickups = await Promise.all([
          rider(`/${order.id}/pickup`, winner, "POST"),
          rider(`/${order.id}/pickup`, winner, "POST"),
        ]);
        assert.ok(pickups.every((r) => r.status === 200));
        assert.equal(pickups[0].data.status, "PICKED_UP");
        const done = await Promise.all([
          rider(`/${order.id}/deliver`, winner, "POST"),
          rider(`/${order.id}/deliver`, winner, "POST"),
        ]);
        assert.ok(done.every((r) => r.status === 200));
        assert.equal(done[0].data.status, "COMPLETED");
        assert.ok(done[0].data.completedAt);
        assert.equal(
          await prisma.errandStatusLog.count({
            where: { orderId: order.id, toStatus: "PICKED_UP" },
          }),
          1,
        );
        assert.equal(
          await prisma.errandStatusLog.count({
            where: { orderId: order.id, toStatus: "COMPLETED" },
          }),
          1,
        );
        assert.equal(
          (await req(`${root}/${order.id}`, a.token)).data.rider.id,
          winner["x-actor-id"],
        );
        assert.equal(
          (await rider("/", loser)).data.some((o: any) => o.id === order.id),
          false,
        );
      },
    );
    await t.test("取消与接单竞争，取消与支付竞争，金额状态一致", async () => {
      for (const race of ["accept", "pay"]) {
        const pending = (await create(a.token)).data;
        await quote(pending.id);
        if (race === "accept") await pay(pending.id, a.token);
        await Promise.all([
          req(`${root}/${pending.id}/cancel`, a.token, "POST"),
          race === "accept"
            ? rider(`/${pending.id}/accept`, r1, "POST")
            : pay(pending.id, a.token),
        ]);
        const final = await prisma.errandOrder.findUniqueOrThrow({
          where: { id: pending.id },
        });
        if (final.status === "CANCELLED") {
          assert.equal(final.riderId, null);
          assert.equal(
            final.paymentStatus,
            final.paidAt ? "REFUNDED" : "CLOSED",
          );
          assert.equal((await pay(pending.id, a.token)).status, 409);
        } else {
          assert.ok(
            ["RIDER_ACCEPTED", "PENDING_ASSIGN"].includes(final.status),
          );
          assert.equal(final.paymentStatus, "PAID");
        }
      }
    });
    await t.test("重复取消、报价超时关闭和平台拒绝均有明确进度", async () => {
      const pending = (await create(a.token)).data;
      const cancels = await Promise.all([
        req(`${root}/${pending.id}/cancel`, a.token, "POST"),
        req(`${root}/${pending.id}/cancel`, a.token, "POST"),
      ]);
      assert.ok(cancels.every((r) => r.status === 200));
      assert.equal(
        await prisma.errandStatusLog.count({
          where: { orderId: pending.id, toStatus: "CANCELLED" },
        }),
        1,
      );
      assert.equal((await quote(pending.id)).status, 409);
      const expiry = (await create(a.token)).data;
      await quote(expiry.id);
      await prisma.errandOrder.update({
        where: { id: expiry.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      assert.equal(
        (await req(`${root}/${expiry.id}`, a.token)).data.status,
        "CANCELLED",
      );
      assert.equal((await pay(expiry.id, a.token)).status, 409);
      const rejected = (await create(a.token)).data;
      const rejection = await req(
        `/api/admin/errand-orders/${rejected.id}/reject`,
        "",
        "POST",
        { reason: "超出配送区域" },
        admin,
      );
      assert.equal(rejection.status, 200);
      assert.equal(rejection.data.status, "CANCELLED");
      assert.match(rejection.data.statusLogs.at(-1).note, /超出配送区域/);
      assert.equal((await req(root, b.token)).data.length, 0);
    });
  } finally {
    await prisma.errandOrder.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.rider.deleteMany({ where: { id: { in: riderIds } } });
    await prisma.$disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
