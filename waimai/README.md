# 乡镇本地外卖系统

当前按 MVP 生命线开发：

```text
用户选商家 -> 加购物车 -> 下单支付 -> 商家接单 -> 骑手接单 -> 骑手送达 -> 订单完成
```

## 项目结构

```text
waimai/
├── backend/        Node.js 后端接口
├── user-app/       用户小程序 uni-app
├── merchant-app/   商家端 uni-app
├── rider-app/      骑手端 uni-app
└── admin-web/      运营后台 React
```

## 当前进度

- `backend` 已搭好 Express + TypeScript + Prisma 骨架
- 数据库模型已覆盖用户、地址、商家、商品、购物车、订单、配送单、骑手
- 已实现生命线核心接口
- `admin-web` 已搭好 React 最小后台，可创建/查看用户、地址、商家、商品、骑手、订单
- `user-app`、`merchant-app`、`rider-app` 已按用户、商家、骑手核心流程搭建页面
- 微信支付暂用模拟支付接口，等小程序主体和微信商户号确认后再接真实微信支付

## 本地启动

先启动 Docker Desktop，然后在 `waimai` 目录执行：

```bash
docker compose up -d
```

后端数据库连接使用 PostgreSQL：

```env
DATABASE_URL="postgresql://waimai:waimai123456@localhost:5432/waimai?schema=public"
```

初始化数据库表：

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run dev
```

另开一个终端启动后台：

```bash
cd admin-web
npm install
npm run dev
```

访问：

```text
http://localhost:5173
```

## 常用开发命令

后端：

```bash
cd backend
npm run dev
npm run lint
```

用户端 H5：

```bash
cd user-app
npm run dev:h5
```

商家端 H5：

```bash
cd merchant-app
npm run dev:h5
```

骑手端 H5：

```bash
cd rider-app
npm run dev:h5
```

运营后台：

```bash
cd admin-web
npm run dev
```

## 下一步建议

1. 用后台初始化用户、地址、商家、商品、骑手
2. 逐个接口联调完整订单链路
3. 接入真实微信登录、微信支付和生产环境部署配置
