# 乡镇本地外卖系统

面向乡镇本地配送场景的外卖 MVP 项目，包含用户端、商家端、骑手端、运营后台和 Node.js 后端接口。

核心链路：

```text
用户选商家 -> 加购物车 -> 下单支付 -> 商家接单 -> 骑手接单 -> 骑手送达 -> 订单完成
```

## 项目目录

```text
waimai/
├── backend/        Express + TypeScript + Prisma 后端服务
├── user-app/       用户端 uni-app
├── merchant-app/   商家端 uni-app
├── rider-app/      骑手端 uni-app
└── admin-web/      React + Vite 运营后台
```

## 当前功能

- 后端已实现用户、地址、商家、商品、购物车、订单、配送单、骑手等核心模型
- 已打通 MVP 订单链路：下单、模拟支付、商家接单、骑手接单、取货、送达
- 运营后台支持创建和查看基础数据，便于本地联调
- 用户端、商家端、骑手端已按核心页面拆分
- 微信支付暂用模拟支付接口，待小程序主体和商户号确认后接入真实支付

## 本地启动

进入项目目录：

```bash
cd waimai
```

启动 PostgreSQL：

```bash
docker compose up -d
```

启动后端：

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

启动运营后台：

```bash
cd ../admin-web
npm install
npm run dev
```

默认访问：

```text
http://localhost:5173
```

## 子项目说明

更详细的接口和联调顺序见：

- `waimai/README.md`
- `waimai/backend/README.md`

