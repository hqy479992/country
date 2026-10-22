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
- 用户端采用简洁商家列表，已完善独立登录、搜索、点餐、地址选择、服务端报价与订单进度
- 未支付订单15分钟超时关闭，支持用户取消并恢复库存；重复下单与库存争抢由数据库保护
- 运营、商家、骑手接口需配置独立访问凭证，不再仅凭开发期ID访问
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

## 线上入口

- 网站首页：<https://www.xiangzhen.site/>（当前展示“网站建设中”）
- 运营后台：<https://www.xiangzhen.site/admin/>
- 骑手端：<https://www.xiangzhen.site/rider/>

原用户端地址 `/user/` 会跳转到首页，并保留查询参数和页面路由。

当前公开首页临时使用 `.github/pages/construction.html`，页脚展示备案号并链接到工信部备案查询网站。用户端资源暂不发布到网站根目录，历史用户端页面链接也会显示建设中页面；运营后台和骑手端继续保留。

需要恢复用户端时，将 `.github/workflows/deploy-pages.yml` 中 `PUBLIC_SITE_MODE` 从 `construction` 改为 `app` 后重新发布。

## 子项目说明

更详细的接口和联调顺序见：

- `waimai/README.md`
- `waimai/backend/README.md`
