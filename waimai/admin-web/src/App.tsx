import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, yuan, yuanToCents } from "./api";
import type { Order, ProductCategory, Rider, Shop, User } from "./api";

type Tab = "overview" | "users" | "shops" | "products" | "riders" | "orders";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "概览" },
  { key: "users", label: "用户地址" },
  { key: "shops", label: "商家" },
  { key: "products", label: "商品" },
  { key: "riders", label: "骑手" },
  { key: "orders", label: "订单" }
];

const productCategoryOptions: Array<{ key: ProductCategory; label: string }> = [
  { key: "FOOD", label: "美食" },
  { key: "DRINK", label: "甜品饮品" },
  { key: "FRUIT_VEGETABLE", label: "蔬菜水果" },
  { key: "CONVENIENCE", label: "超市便利" }
];

function productCategoryLabel(category: ProductCategory) {
  return productCategoryOptions.find((item) => item.key === category)?.label || "美食";
}

export function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("准备就绪");

  async function loadAll() {
    setLoading(true);
    try {
      const [nextUsers, nextShops, nextRiders, nextOrders] = await Promise.all([
        api.getUsers(),
        api.getShops(),
        api.getRiders(),
        api.getOrders()
      ]);
      setUsers(nextUsers);
      setShops(nextShops);
      setRiders(nextRiders);
      setOrders(nextOrders);
      setMessage("数据已刷新");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const stats = useMemo(
    () => [
      { label: "用户", value: users.length },
      { label: "商家", value: shops.length },
      { label: "商品", value: shops.reduce((sum, shop) => sum + shop.products.length, 0) },
      { label: "骑手", value: riders.length },
      { label: "订单", value: orders.length }
    ],
    [orders.length, riders.length, shops, users.length]
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">乡镇本地外卖</p>
          <h1>运营后台</h1>
        </div>
        <button className="secondary" onClick={loadAll} disabled={loading}>
          {loading ? "刷新中..." : "刷新数据"}
        </button>
      </header>

      <nav className="tabs" aria-label="后台模块">
        {tabs.map((item) => (
          <button
            key={item.key}
            className={tab === item.key ? "active" : ""}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="notice">{message}</div>

      {tab === "overview" && <Overview stats={stats} orders={orders} />}
      {tab === "users" && <UsersPanel users={users} onDone={loadAll} setMessage={setMessage} />}
      {tab === "shops" && <ShopsPanel shops={shops} onDone={loadAll} setMessage={setMessage} />}
      {tab === "products" && (
        <ProductsPanel shops={shops} onDone={loadAll} setMessage={setMessage} />
      )}
      {tab === "riders" && <RidersPanel riders={riders} onDone={loadAll} setMessage={setMessage} />}
      {tab === "orders" && <OrdersPanel orders={orders} />}
    </main>
  );
}

function Overview({ stats, orders }: { stats: Array<{ label: string; value: number }>; orders: Order[] }) {
  return (
    <section className="stack">
      <div className="stats">
        {stats.map((item) => (
          <div className="stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>最近订单</h2>
        <OrderTable orders={orders.slice(0, 5)} />
      </section>
    </section>
  );
}

function UsersPanel({
  users,
  onDone,
  setMessage
}: {
  users: User[];
  onDone: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(setMessage, async () => {
      await api.createUser({
        nickname: String(form.get("nickname") || ""),
        phone: String(form.get("phone") || "")
      });
      formElement.reset();
      await onDone();
      return "用户已创建";
    });
  }

  async function createAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(setMessage, async () => {
      await api.createAddress({
        userId: String(form.get("userId")),
        name: String(form.get("name")),
        phone: String(form.get("phone")),
        region: String(form.get("region")),
        detail: String(form.get("detail")),
        isDefault: form.get("isDefault") === "on"
      });
      formElement.reset();
      await onDone();
      return "地址已创建";
    });
  }

  return (
    <section className="grid two">
      <div className="panel">
        <h2>创建用户</h2>
        <form onSubmit={createUser}>
          <input name="nickname" placeholder="昵称，例如 张三" />
          <input name="phone" placeholder="手机号" />
          <button type="submit">创建用户</button>
        </form>
      </div>
      <div className="panel">
        <h2>创建地址</h2>
        <form onSubmit={createAddress}>
          <select name="userId" required>
            <option value="">选择用户</option>
            {users.map((user) => (
              <option value={user.id} key={user.id}>
                {user.nickname || user.phone || user.id}
              </option>
            ))}
          </select>
          <input name="name" placeholder="收货人" required />
          <input name="phone" placeholder="联系电话" required />
          <input name="region" placeholder="区域，例如 青溪镇" required />
          <input name="detail" placeholder="详细地址" required />
          <label className="check">
            <input type="checkbox" name="isDefault" /> 默认地址
          </label>
          <button type="submit">创建地址</button>
        </form>
      </div>
      <div className="panel span">
        <h2>用户列表</h2>
        <table>
          <thead>
            <tr>
              <th>用户</th>
              <th>手机号</th>
              <th>地址</th>
              <th>订单数</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.nickname || "未命名用户"}</strong>
                  <small>{user.id}</small>
                </td>
                <td>{user.phone || "-"}</td>
                <td>
                  {user.addresses.map((address) => (
                    <div key={address.id}>
                      {address.region} {address.detail}
                    </div>
                  ))}
                </td>
                <td>{user._count?.orders ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShopsPanel({
  shops,
  onDone,
  setMessage
}: {
  shops: Shop[];
  onDone: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  const [editingShopId, setEditingShopId] = useState("");

  async function createShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(setMessage, async () => {
      await api.createShop({
        merchantName: String(form.get("merchantName")),
        merchantPhone: String(form.get("merchantPhone") || ""),
        shopName: String(form.get("shopName")),
        address: String(form.get("address")),
        phone: String(form.get("phone")),
        deliveryFee: yuanToCents(form.get("deliveryFee")),
        minOrderAmount: yuanToCents(form.get("minOrderAmount"))
      });
      formElement.reset();
      await onDone();
      return "商家已创建";
    });
  }

  async function updateShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const shopId = String(form.get("shopId"));
    await run(setMessage, async () => {
      await api.updateShop(shopId, {
        name: String(form.get("name")),
        address: String(form.get("address")),
        phone: String(form.get("phone")),
        logoUrl: String(form.get("logoUrl") || ""),
        coverUrl: String(form.get("coverUrl") || ""),
        deliveryFee: yuanToCents(form.get("deliveryFee")),
        minOrderAmount: yuanToCents(form.get("minOrderAmount")),
        status: String(form.get("status")) as "OPEN" | "CLOSED"
      });
      setEditingShopId("");
      formElement.reset();
      await onDone();
      return "商家资料已更新";
    });
  }

  const editingShop = shops.find((shop) => shop.id === editingShopId);

  return (
    <section className="grid">
      <div className="panel">
        <h2>创建商家</h2>
        <form onSubmit={createShop}>
          <input name="merchantName" placeholder="商家老板/主体名称" required />
          <input name="merchantPhone" placeholder="商家登录手机号" />
          <input name="shopName" placeholder="店铺名称" required />
          <input name="address" placeholder="店铺地址" required />
          <input name="phone" placeholder="店铺电话" required />
          <input name="deliveryFee" type="number" min="0" step="0.01" placeholder="配送费，单位元" required />
          <input name="minOrderAmount" type="number" min="0" step="0.01" placeholder="起送价，单位元" required />
          <button type="submit">创建商家</button>
        </form>
      </div>
      <div className="panel">
        <h2>编辑商家资料</h2>
        <form key={editingShopId || "empty-shop-form"} onSubmit={updateShop}>
          <select
            name="shopId"
            required
            value={editingShopId}
            onChange={(event) => setEditingShopId(event.target.value)}
          >
            <option value="">选择商家</option>
            {shops.map((shop) => (
              <option value={shop.id} key={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
          <input name="name" placeholder="店铺名称" defaultValue={editingShop?.name ?? ""} required />
          <input name="address" placeholder="店铺地址" defaultValue={editingShop?.address ?? ""} required />
          <input name="phone" placeholder="店铺电话" defaultValue={editingShop?.phone ?? ""} required />
          <input name="logoUrl" placeholder="Logo URL" defaultValue={editingShop?.logoUrl ?? ""} />
          <input name="coverUrl" placeholder="封面 URL" defaultValue={editingShop?.coverUrl ?? ""} />
          <input
            name="deliveryFee"
            type="number"
            min="0"
            step="0.01"
            placeholder="配送费，单位元"
            defaultValue={editingShop ? (editingShop.deliveryFee / 100).toFixed(2) : ""}
            required
          />
          <input
            name="minOrderAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="起送价，单位元"
            defaultValue={editingShop ? (editingShop.minOrderAmount / 100).toFixed(2) : ""}
            required
          />
          <select name="status" defaultValue={editingShop?.status ?? "OPEN"}>
            <option value="OPEN">启用/营业</option>
            <option value="CLOSED">禁用/休息</option>
          </select>
          <button type="submit" disabled={!editingShopId}>
            保存资料
          </button>
        </form>
      </div>
      <div className="panel">
        <h2>商家列表</h2>
        <table>
          <thead>
            <tr>
              <th>店铺</th>
              <th>老板</th>
              <th>配送费</th>
              <th>起送</th>
              <th>商品</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td>
                  <strong>{shop.name}</strong>
                  <small>店铺ID: {shop.id}</small>
                  <small>商家ID: {shop.merchant.id}</small>
                  <small>{shop.address}</small>
                </td>
                <td>{shop.merchant.name}</td>
                <td>{yuan(shop.deliveryFee)}</td>
                <td>{yuan(shop.minOrderAmount)}</td>
                <td>{shop.products.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductsPanel({
  shops,
  onDone,
  setMessage
}: {
  shops: Shop[];
  onDone: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(setMessage, async () => {
      await api.createProduct(String(form.get("shopId")), {
        name: String(form.get("name")),
        description: String(form.get("description") || ""),
        category: String(form.get("category") || "FOOD") as ProductCategory,
        price: yuanToCents(form.get("price")),
        stock: Number(form.get("stock"))
      });
      formElement.reset();
      await onDone();
      return "商品已创建";
    });
  }

  return (
    <section className="grid">
      <div className="panel">
        <h2>创建商品</h2>
        <form onSubmit={createProduct}>
          <select name="shopId" required>
            <option value="">选择商家</option>
            {shops.map((shop) => (
              <option value={shop.id} key={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
          <input name="name" placeholder="商品名称" required />
          <input name="description" placeholder="商品描述" />
          <select name="category" defaultValue="FOOD" required>
            {productCategoryOptions.map((category) => (
              <option value={category.key} key={category.key}>
                {category.label}
              </option>
            ))}
          </select>
          <input name="price" type="number" min="0.01" step="0.01" placeholder="价格，单位元" required />
          <input name="stock" type="number" min="0" placeholder="库存" defaultValue="9999" required />
          <button type="submit">创建商品</button>
        </form>
      </div>
      <div className="panel">
        <h2>商品列表</h2>
        <table>
          <thead>
            <tr>
              <th>商家</th>
              <th>商品</th>
              <th>分类</th>
              <th>价格</th>
              <th>库存</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {shops.flatMap((shop) =>
              shop.products.map((product) => (
                <tr key={product.id}>
                  <td>{shop.name}</td>
                  <td>
                    <strong>{product.name}</strong>
                    <small>{product.id}</small>
                    <small>{product.description || "-"}</small>
                  </td>
                  <td>{productCategoryLabel(product.category)}</td>
                  <td>{yuan(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>{product.isOnSale ? "上架" : "下架"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RidersPanel({
  riders,
  onDone,
  setMessage
}: {
  riders: Rider[];
  onDone: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  async function createRider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(setMessage, async () => {
      await api.createRider({
        name: String(form.get("name")),
        phone: String(form.get("phone") || "")
      });
      formElement.reset();
      await onDone();
      return "骑手已创建";
    });
  }

  return (
    <section className="grid">
      <div className="panel">
        <h2>创建骑手</h2>
        <form onSubmit={createRider}>
          <input name="name" placeholder="骑手姓名" required />
          <input name="phone" placeholder="手机号" />
          <button type="submit">创建骑手</button>
        </form>
      </div>
      <div className="panel">
        <h2>骑手列表</h2>
        <table>
          <thead>
            <tr>
              <th>骑手</th>
              <th>手机号</th>
              <th>在线</th>
              <th>配送单</th>
            </tr>
          </thead>
          <tbody>
            {riders.map((rider) => (
              <tr key={rider.id}>
                <td>
                  <strong>{rider.name}</strong>
                  <small>{rider.id}</small>
                </td>
                <td>{rider.phone || "-"}</td>
                <td>{rider.isOnline ? "在线" : "离线"}</td>
                <td>{rider._count?.deliveryOrders ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrdersPanel({ orders }: { orders: Order[] }) {
  return (
    <section className="panel">
      <h2>订单列表</h2>
      <OrderTable orders={orders} />
    </section>
  );
}

function OrderTable({ orders }: { orders: Order[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>订单号</th>
          <th>用户</th>
          <th>商家</th>
          <th>商品</th>
          <th>金额</th>
          <th>状态</th>
          <th>骑手</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>
              <strong>{order.orderNo}</strong>
              <small>{order.id}</small>
              <small>{new Date(order.createdAt).toLocaleString()}</small>
            </td>
            <td>{order.user.nickname || order.user.phone || order.user.id}</td>
            <td>{order.shop.name}</td>
            <td>
              {order.items.map((item) => (
                <div key={item.id}>
                  {item.productName} x {item.quantity}
                </div>
              ))}
            </td>
            <td>{yuan(order.totalAmount)}</td>
            <td>
              <span className="pill">{order.status}</span>
            </td>
            <td>{order.deliveryOrder?.rider?.name || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function run(setMessage: (message: string) => void, action: () => Promise<string>) {
  try {
    setMessage("提交中...");
    const message = await action();
    setMessage(message);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "操作失败");
  }
}
