# 外卖系统后端

Node.js + Express + TypeScript + Prisma。当前版本只实现 MVP 生命线：

用户选商家 -> 加购物车 -> 下单支付 -> 商家接单 -> 骑手接单 -> 骑手送达 -> 订单完成。

## 启动

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## 身份验证

用户接口使用独立登录会话；工作人员接口使用角色、ID与私有访问凭证。配置和v2接口见文末。旧版仅传Header的模拟身份已停用。

## 核心接口

### 用户端

```text
GET  /api/shops
GET  /api/shops/:shopId
GET  /api/user/addresses
POST /api/user/addresses
PUT  /api/user/addresses/:addressId
POST /api/user/addresses/:addressId/default
DELETE /api/user/addresses/:addressId
GET  /api/cart
POST /api/cart/items
PATCH /api/cart/items/:itemId
POST /api/cart/items/:itemId/quantity
DELETE /api/cart/items/:itemId
DELETE /api/cart
POST /api/orders
POST /api/orders/:orderId/pay/mock
GET  /api/orders
GET  /api/orders/:orderId
```

### 商家端

```text
GET  /api/merchant/dashboard
GET  /api/merchant/shop
POST /api/merchant/shop/status
PUT  /api/merchant/shop/profile
GET  /api/merchant/products
POST /api/merchant/products
PUT  /api/merchant/products/:productId
POST /api/merchant/products/:productId/on-sale
POST /api/merchant/products/:productId/off-sale
POST /api/merchant/products/:productId/stock
GET  /api/merchant/orders
GET  /api/merchant/orders/:orderId
POST /api/merchant/orders/:orderId/accept
POST /api/merchant/orders/:orderId/reject
POST /api/merchant/orders/:orderId/ready
```

### 骑手端

```text
GET  /api/rider/orders/available
GET  /api/rider/orders
GET  /api/rider/orders/:deliveryOrderId
POST /api/rider/orders/:deliveryOrderId/accept
POST /api/rider/orders/:deliveryOrderId/pickup
POST /api/rider/orders/:deliveryOrderId/deliver
```

### 运营后台

```text
GET  /api/admin/users
POST /api/admin/users
GET  /api/admin/addresses
POST /api/admin/addresses
GET  /api/admin/shops
PUT  /api/admin/shops/:shopId
POST /api/admin/shops
GET  /api/admin/shops/:shopId/products
POST /api/admin/shops/:shopId/products
GET  /api/admin/riders
POST /api/admin/riders
GET  /api/admin/orders
GET  /api/admin/orders/:orderId
```

## 联调顺序

后台初始化接口除下列身份外，还必须提供服务器配置的 `x-access-key`：

```text
x-actor-type: ADMIN
x-actor-id: admin-dev
```

1. 创建用户：`POST /api/admin/users`
2. 创建用户地址：`POST /api/admin/addresses`
3. 创建商家：`POST /api/admin/shops`
4. 创建商品：`POST /api/admin/shops/:shopId/products`
5. 创建骑手：`POST /api/admin/riders`
6. 用户查看商家：`GET /api/shops`
7. 用户加购物车：`POST /api/cart/items`
8. 用户提交订单：`POST /api/orders`
9. 用户模拟支付：`POST /api/orders/:orderId/pay/mock`
10. 商家接单：`POST /api/merchant/orders/:orderId/accept`
11. 商家出餐：`POST /api/merchant/orders/:orderId/ready`
12. 骑手查看可接单：`GET /api/rider/orders/available`
13. 骑手接单：`POST /api/rider/orders/:deliveryOrderId/accept`
14. 骑手取货：`POST /api/rider/orders/:deliveryOrderId/pickup`
15. 骑手送达：`POST /api/rider/orders/:deliveryOrderId/deliver`

送达后订单会自动变为 `COMPLETED`。

## 用户端首期改版（v2）

用户接口不再接受开发期身份 Header。游客可以读取商家，购物车、地址、订单必须携带注册/登录获得的 `Authorization: Bearer <token>`。

```text
GET  /api/capabilities
POST /api/auth/register  { account, nickname, password }
POST /api/auth/login     { account, password }
POST /api/auth/logout
GET  /api/user/profile
GET  /api/cart/quote
POST /api/cart/items     { productId, quantity, replaceCart? }
POST /api/orders        { addressId, remark?, requestId, cartVersion }
POST /api/orders/:orderId/cancel
```

`cartVersion` 来自最新报价；商品、价格、运费或数量变化时，创建订单返回409，客户端须重新确认。相同用户的相同 `requestId` 只生成一笔订单。库存使用数据库条件扣减，未支付订单15分钟后自动取消并归还库存；取消与测试支付互斥，重复请求不会重复归还库存。

工作人员仍通过角色和ID标识身份，同时必须携带 `x-access-key`。运营凭证读取 `.env` 的 `ADMIN_ACCESS_KEY`，商家和骑手按 `STAFF_ACCESS_KEYS` 中的 `MERCHANT:<id>` / `RIDER:<id>` 查验独立凭证。未配置时拒绝访问，不回退到开发期身份。运营前端在当前浏览器会话中保存凭证。工作人员登录入口使用 `GET /api/staff/session` 验证。

测试支付只有在服务器设置 `MOCK_PAYMENT_ENABLED=true` 时开放，默认关闭且不发生真实扣款。微信支付、退款及跑腿支付不在本期范围内。

### 腾讯云现有后端更新

当前代码目录 `/var/www/country/waimai/backend`，PM2进程 `waimai-api`。先获取经过验证的发布分支或提交，确认目录无个人改动。

```bash
cd /var/www/country/waimai/backend
npm ci
npm run prisma:generate
# 首次配置由服务器所有者本人执行，真实凭证仅写入服务器私有目录：
node scripts/configure-access.mjs
# 自动备份数据库、环境配置及原dist，再迁移、构建、重载并健康检查：
node scripts/deploy-backend.mjs waimai-api
```

`configure-access.mjs` 保留已有凭证，只补齐缺少的工作人员凭证；访问凭证位于 `~/.local/state/country/staff-access.txt`（权限600），不要提交Git或贴到聊天。它会保留配置前的环境备份。新建商家或骑手后需再次运行并单独分配凭证。

`deploy-backend.mjs` 必须在旧服务仍运行、旧dist还在时执行；需要 `pg_dump`、Node.js18以上和PM2。数据库、环境配置及旧编译文件保存在 `~/.local/state/country/backups/`。本次迁移只新增字段、会话表与索引；不会删除原用户或订单。原来已超时的未支付订单会关闭并恢复库存。更新前如有异常，请先检查备份和进程日志，勿直接覆盖数据库。

Nginx代理须设置 `X-Forwarded-For`；后端仅信任来自loopback的代理，以便登录限流按客户端IP计算。对公网仅开放HTTPS入口。

### 隔离数据库的流程验证

测试只接受 `127.0.0.1:55439/country_user_flow`，拒绝业务库地址。测试使用自己创建的数据并在结束后清理。

```bash
docker run --name country-user-flow-test -e POSTGRES_USER=country_test -e POSTGRES_PASSWORD=country_test_local -e POSTGRES_DB=country_user_flow -p 127.0.0.1:55439:5432 -d postgres:15
export DATABASE_URL='postgresql://country_test:country_test_local@127.0.0.1:55439/country_user_flow?schema=public'
npx prisma migrate deploy
TEST_DATABASE_URL="$DATABASE_URL" npm run test:flow
npm run lint
npm run build
```

覆盖游客访问、伪造身份、两个账户的数据隔离、默认地址并发修改、换店失败保留购物车、服务端报价与价格变化、重复下单、库存争抢、重复取消、超时恢复库存、支付取消竞争及退出/过期会话。
