# 骑手端 uni-app

支持接单、取货与送达。首次进入需输入身份ID和管理员分配的独立访问凭证，失效后重新登录。仅设置开发期ID不能访问接口。

```bash
npm ci
npm run dev:h5
npm run type-check
npm run build:h5
```

默认连接 https://api.xiangzhen.site。管理员在后端执行 `node scripts/configure-access.mjs` 后，分别分配对应角色和ID的凭证；请勿写入前端源码或提交Git。

跑腿接单：登录后从首页“跑腿接单”进入。支持帮送、帮取、帮买；用户确认报价并完成测试支付后可接单。接单后展示完整取送信息，依次确认已取件或买齐、物品送达。待接单展示区域信息，不展示联系人电话或门牌。

本地联调可通过 `VITE_API_BASE_URL=http://127.0.0.1:3094 npm run dev:h5` 指定测试后端；未指定时使用线上 API。登录页需填写后台分配的骑手 ID 和访问凭证，登录成功后进入接单大厅。
