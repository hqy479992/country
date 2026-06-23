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

## 开发期身份

第一版先不用完整登录，接口通过 Header 模拟身份：

```text
x-actor-type: USER | MERCHANT | RIDER | ADMIN
x-actor-id: 对应用户/商家/骑手/管理员 id
```

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

所有后台初始化接口使用：

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
