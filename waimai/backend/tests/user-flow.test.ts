import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
const url = new URL(process.env.TEST_DATABASE_URL || "http://not-configured");
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "55439" ||
  url.pathname !== "/country_user_flow"
)
  throw new Error(
    "请设置专用本地测试库 TEST_DATABASE_URL（127.0.0.1:55439/country_user_flow），禁止使用业务数据库",
  );
process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = "test";
process.env.ADMIN_ACCESS_KEY = "local-test-admin-key-only";
process.env.MOCK_PAYMENT_ENABLED = "true";
const { prisma } = await import("../src/config/db.js");
const { createApp } = await import("../src/app.js");
const { env } = await import("../src/config/env.js");
const run = randomUUID().replaceAll("-", "").slice(0, 8);
const server = createApp().listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const users: string[] = [];
const merchants: string[] = [];
async function request(
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
    error?: { code: string; message: string };
  };
}
async function register(name: string) {
  const account = `flow_${run}_${name}`;
  const result = await request("/api/auth/register", "", "POST", {
    account,
    password: "test-password-2026",
    nickname: name,
  });
  assert.equal(result.status, 201);
  users.push(result.data.user.id);
  return { ...result.data, account };
}
async function clear(token: string) {
  assert.equal((await request("/api/cart", token, "DELETE")).status, 204);
}
async function add(
  token: string,
  productId: string,
  quantity = 1,
  replaceCart = false,
) {
  return request("/api/cart/items", token, "POST", {
    productId,
    quantity,
    replaceCart,
  });
}
async function quote(token: string) {
  const result = await request("/api/cart/quote", token);
  assert.equal(result.status, 200);
  return result.data;
}
async function order(
  token: string,
  addressId: string,
  cart: any,
  requestId = randomUUID(),
) {
  return request("/api/orders", token, "POST", {
    addressId,
    cartVersion: cart.version,
    requestId,
    remark: "流程联调",
  });
}

await test("真实数据库上的用户下单流程与并发约束", async (t) => {
  try {
    const a = await register("a");
    const b = await register("b");
    const addressInput = {
      name: "测试收货人",
      phone: "13800138000",
      region: "测试镇",
      detail: "测试街1号",
      isDefault: false,
    };
    const aa = await request(
      "/api/user/addresses",
      a.token,
      "POST",
      addressInput,
    );
    assert.equal(aa.status, 201);
    const addressA = aa.data.id;
    const bb = await request(
      "/api/user/addresses",
      b.token,
      "POST",
      addressInput,
    );
    assert.equal(bb.status, 201);
    const addressB = bb.data.id;
    const merchant = await prisma.merchant.create({
      data: { name: `流程测试${run}` },
    });
    merchants.push(merchant.id);
    const shop = await prisma.shop.create({
      data: {
        merchantId: merchant.id,
        name: "流程测试餐厅",
        address: "测试地址",
        phone: "13800138000",
        minOrderAmount: 2000,
        deliveryFee: 200,
      },
    });
    const other = await prisma.shop.create({
      data: {
        merchantId: merchant.id,
        name: "流程测试饮品",
        address: "测试地址",
        phone: "13800138000",
        minOrderAmount: 0,
        deliveryFee: 100,
      },
    });
    const rice = await prisma.product.create({
      data: { shopId: shop.id, name: "套餐", price: 1800, stock: 30 },
    });
    const tea = await prisma.product.create({
      data: { shopId: shop.id, name: "茶", price: 600, stock: 30 },
    });
    const scarce = await prisma.product.create({
      data: { shopId: other.id, name: "最后一份", price: 1200, stock: 1 },
    });
    const soldOut = await prisma.product.create({
      data: { shopId: other.id, name: "售罄商品", price: 1000, stock: 0 },
    });

    await t.test("游客可浏览，伪造用户或管理员ID无法读取私有数据", async () => {
      assert.equal((await request("/api/shops")).status, 200);
      assert.equal(
        (
          await request("/api/user/profile", "", "GET", undefined, {
            "x-actor-type": "USER",
            "x-actor-id": a.user.id,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await request("/api/admin/users", "", "GET", undefined, {
            "x-actor-type": "ADMIN",
            "x-actor-id": "admin-dev",
          })
        ).status,
        401,
      );
      const me = await request("/api/user/profile", a.token, "GET", undefined, {
        "x-actor-type": "USER",
        "x-actor-id": b.user.id,
      });
      assert.equal(me.data.id, a.user.id);
      const session = await prisma.userSession.findFirstOrThrow({
        where: { userId: a.user.id },
      });
      assert.notEqual(session.tokenHash, a.token);
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: a.user.id },
      });
      assert.notEqual(user.passwordHash, "test-password-2026");
      const admin = await request("/api/admin/users", "", "GET", undefined, {
        "x-actor-type": "ADMIN",
        "x-actor-id": "admin-dev",
        "x-access-key": process.env.ADMIN_ACCESS_KEY!,
      });
      assert.equal(admin.status, 200);
      assert.ok(!JSON.stringify(admin.data).includes("passwordHash"));
    });
    await t.test("地址隔离、首个默认地址、并发设置与删除默认地址", async () => {
      assert.equal(aa.data.isDefault, true);
      const second = await request("/api/user/addresses", a.token, "POST", {
        ...addressInput,
        detail: "2号",
      });
      assert.equal(second.status, 201);
      await Promise.all([
        request(`/api/user/addresses/${addressA}/default`, a.token, "POST"),
        request(
          `/api/user/addresses/${second.data.id}/default`,
          a.token,
          "POST",
        ),
      ]);
      const addresses = await request("/api/user/addresses", a.token);
      assert.equal(
        addresses.data.filter((item: any) => item.isDefault).length,
        1,
      );
      assert.equal(
        (
          await request(`/api/user/addresses/${addressA}`, b.token, "PUT", {
            name: "越权",
          })
        ).status,
        404,
      );
      const defaultId = addresses.data.find((item: any) => item.isDefault).id;
      if (defaultId !== addressA) {
        await request(`/api/user/addresses/${defaultId}`, a.token, "DELETE");
        assert.equal(
          (await request("/api/user/addresses", a.token)).data.find(
            (item: any) => item.id === addressA,
          ).isDefault,
          true,
        );
      }
      assert.equal(
        (await request("/api/user/addresses", b.token)).data.length,
        1,
      );
    });
    await t.test("购物车隔离、换店原子替换、失败不清空旧购物车", async () => {
      assert.equal((await add(a.token, rice.id)).status, 201);
      assert.equal((await request("/api/cart", b.token)).data.length, 0);
      assert.equal((await add(a.token, scarce.id)).status, 409);
      assert.equal((await add(a.token, soldOut.id, 1, true)).status, 409);
      assert.equal(
        (await request("/api/cart", a.token)).data[0].productId,
        rice.id,
      );
      assert.equal((await add(a.token, scarce.id, 1, true)).status, 201);
      assert.equal((await request("/api/cart", a.token)).data.length, 1);
      assert.equal(
        (await request("/api/cart", a.token)).data[0].productId,
        scarce.id,
      );
      await clear(a.token);
    });
    await t.test("起送门槛、服务端报价与价格变化保护", async () => {
      await add(a.token, rice.id);
      let cart = await quote(a.token);
      assert.equal(cart.canOrder, false);
      assert.equal((await order(a.token, addressA, cart)).status, 409);
      await add(a.token, tea.id);
      cart = await quote(a.token);
      assert.equal(cart.totalAmount, 2600);
      assert.equal(cart.canOrder, true);
      await prisma.product.update({
        where: { id: tea.id },
        data: { price: 700 },
      });
      assert.equal(
        (await order(a.token, addressA, cart)).error?.code,
        "CART_CHANGED",
      );
      assert.equal((await quote(a.token)).totalAmount, 2700);
      await prisma.product.update({
        where: { id: tea.id },
        data: { price: 600 },
      });
    });
    let created: any;
    await t.test(
      "并发重复提交只创建一单、只扣一次库存，不能查看他人订单",
      async () => {
        const cart = await quote(a.token);
        const requestId = randomUUID();
        const results = await Promise.all([
          order(a.token, addressA, cart, requestId),
          order(a.token, addressA, cart, requestId),
        ]);
        assert.deepEqual(
          results.map((result) => result.status),
          [201, 201],
        );
        assert.equal(results[0].data.id, results[1].data.id);
        created = results[0].data;
        assert.equal(created.totalAmount, 2600);
        assert.equal(
          (await prisma.product.findUniqueOrThrow({ where: { id: rice.id } }))
            .stock,
          29,
        );
        assert.equal(
          (await request(`/api/orders/${created.id}`, b.token)).status,
          404,
        );
        assert.equal(
          (await request(`/api/orders/${created.id}/cancel`, b.token, "POST"))
            .status,
          404,
        );
        assert.equal(
          (await request(`/api/orders/${created.id}/pay/mock`, b.token, "POST"))
            .status,
          404,
        );
      },
    );
    await t.test("重复取消仅恢复一次库存，取消后不能支付", async () => {
      const results = await Promise.all([
        request(`/api/orders/${created.id}/cancel`, a.token, "POST"),
        request(`/api/orders/${created.id}/cancel`, a.token, "POST"),
      ]);
      assert.ok(results.every((result) => result.status === 200));
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: rice.id } }))
          .stock,
        30,
      );
      assert.equal(
        (await request(`/api/orders/${created.id}/pay/mock`, a.token, "POST"))
          .status,
        409,
      );
    });
    await t.test("两个用户争抢最后一份，不超卖，失败方购物车保留", async () => {
      await clear(a.token);
      await clear(b.token);
      await add(a.token, scarce.id);
      await add(b.token, scarce.id);
      const qa = await quote(a.token),
        qb = await quote(b.token);
      const results = await Promise.all([
        order(a.token, addressA, qa),
        order(b.token, addressB, qb),
      ]);
      assert.deepEqual(
        results.map((result) => result.status).sort(),
        [201, 409],
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: scarce.id } }))
          .stock,
        0,
      );
      const winner = results[0].status === 201 ? a : b;
      const loser = winner === a ? b : a;
      const won = results.find((result) => result.status === 201)!.data;
      assert.equal((await request("/api/cart", loser.token)).data.length, 1);
      await request(`/api/orders/${won.id}/cancel`, winner.token, "POST");
      await clear(a.token);
      await clear(b.token);
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: scarce.id } }))
          .stock,
        1,
      );
    });
    await t.test("支付超时自动关闭，库存只恢复一次", async () => {
      await add(a.token, scarce.id);
      const pending = await order(a.token, addressA, await quote(a.token));
      assert.equal(pending.status, 201);
      await prisma.order.update({
        where: { id: pending.data.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const detail = await request(`/api/orders/${pending.data.id}`, a.token);
      assert.equal(detail.data.status, "CANCELLED");
      assert.equal(detail.data.paymentStatus, "CLOSED");
      await request(`/api/orders/${pending.data.id}`, a.token);
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: scarce.id } }))
          .stock,
        1,
      );
    });
    await t.test("取消与支付竞争，终态和库存保持一致", async () => {
      await add(a.token, scarce.id);
      const pending = await order(a.token, addressA, await quote(a.token));
      await Promise.all([
        request(`/api/orders/${pending.data.id}/pay/mock`, a.token, "POST"),
        request(`/api/orders/${pending.data.id}/cancel`, a.token, "POST"),
      ]);
      const final = await prisma.order.findUniqueOrThrow({
        where: { id: pending.data.id },
      });
      const stock = (
        await prisma.product.findUniqueOrThrow({ where: { id: scarce.id } })
      ).stock;
      assert.ok(["PAID", "CANCELLED"].includes(final.status));
      assert.equal(stock, final.status === "PAID" ? 0 : 1);
      assert.equal(
        final.paymentStatus,
        final.status === "PAID" ? "PAID" : "CLOSED",
      );
    });
    await t.test("可关闭测试支付；错误密码、退出与过期会话被拒绝", async () => {
      env.mockPaymentEnabled = false;
      assert.equal(
        (await request("/api/capabilities")).data.paymentMode,
        "unavailable",
      );
      assert.equal(
        (await request(`/api/orders/${created.id}/pay/mock`, a.token, "POST"))
          .status,
        403,
      );
      env.mockPaymentEnabled = true;
      assert.equal(
        (
          await request("/api/auth/login", "", "POST", {
            account: a.account,
            password: "wrong-password",
          })
        ).status,
        401,
      );
      const login = await request("/api/auth/login", "", "POST", {
        account: a.account,
        password: "test-password-2026",
      });
      assert.equal(login.status, 200);
      assert.equal(
        (await request("/api/auth/logout", login.data.token, "POST")).status,
        204,
      );
      assert.equal(
        (await request("/api/user/profile", login.data.token)).status,
        401,
      );
      await prisma.userSession.updateMany({
        where: { userId: b.user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      assert.equal((await request("/api/user/profile", b.token)).status, 401);
    });
  } finally {
    await prisma.orderStatusLog.deleteMany({
      where: { order: { userId: { in: users } } },
    });
    await prisma.deliveryOrder.deleteMany({
      where: { order: { userId: { in: users } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: { in: users } } },
    });
    await prisma.order.deleteMany({ where: { userId: { in: users } } });
    await prisma.cartItem.deleteMany({ where: { userId: { in: users } } });
    await prisma.userAddress.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.product.deleteMany({
      where: { shop: { merchantId: { in: merchants } } },
    });
    await prisma.shop.deleteMany({ where: { merchantId: { in: merchants } } });
    await prisma.merchant.deleteMany({ where: { id: { in: merchants } } });
    await prisma.$disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
