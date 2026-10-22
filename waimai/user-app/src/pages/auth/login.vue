<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { api } from "../../api";
import { saveSession, safeUserRoute } from "../../utils/session";
import { goHome, message } from "../../utils/ui";
import AppIcon from "../../components/AppIcon.vue";
import PageHead from "../../components/PageHead.vue";
const mode = ref<"login" | "register">("login");
const account = ref("");
const password = ref("");
const repeated = ref("");
const nickname = ref("");
const busy = ref(false);
const error = ref("");
const redirect = ref("/pages/mine/index");
onLoad((query) => {
  const value = String(query?.redirect || "");
  try {
    redirect.value = safeUserRoute(decodeURIComponent(value));
  } catch {
    redirect.value = "/pages/mine/index";
  }
});
async function submit() {
  if (busy.value) return;
  error.value = "";
  const normalized = account.value.trim().toLowerCase();
  if (!/^[a-z0-9_]{4,24}$/.test(normalized)) {
    error.value = "账号需为4–24位字母、数字或下划线";
    return;
  }
  if (password.value.length < 8 || password.value.length > 72) {
    error.value = "请输入8–72位密码";
    return;
  }
  if (
    mode.value === "register" &&
    (!nickname.value.trim() || password.value !== repeated.value)
  ) {
    error.value = !nickname.value.trim()
      ? "请填写昵称"
      : "两次输入的密码不一致";
    return;
  }
  busy.value = true;
  try {
    const result =
      mode.value === "register"
        ? await api.register({
            account: normalized,
            password: password.value,
            nickname: nickname.value.trim(),
          })
        : await api.login({ account: normalized, password: password.value });
    saveSession(result);
    password.value = "";
    repeated.value = "";
    uni.redirectTo({ url: redirect.value, fail: goHome });
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
function switchMode() {
  if (busy.value) return;
  mode.value = mode.value === "login" ? "register" : "login";
  error.value = "";
  password.value = "";
  repeated.value = "";
}
</script>
<template>
  <view class="page"
    ><PageHead title="我的账户" /><view class="auth-intro"
      ><view class="auth-mark"><AppIcon name="bag" :size="32" /></view
      ><view class="title">{{
        mode === "login" ? "欢迎回来" : "创建你的账户"
      }}</view
      ><view class="muted small">登录后保存地址、购物车和订单</view></view
    ><view class="card"
      ><form @submit="submit">
        <label v-if="mode === 'register'" class="form-field"
          ><text class="field-label">昵称</text
          ><input
            v-model="nickname"
            maxlength="24"
            placeholder="怎么称呼你"
            aria-label="昵称"
            :disabled="busy" /></label
        ><label class="form-field"
          ><text class="field-label">账号</text
          ><input
            v-model="account"
            maxlength="24"
            placeholder="4–24位字母、数字或下划线"
            aria-label="账号"
            :disabled="busy" /></label
        ><label class="form-field"
          ><text class="field-label">密码</text
          ><input
            v-model="password"
            password
            maxlength="72"
            placeholder="至少8位，请妥善保存"
            aria-label="密码"
            :disabled="busy"
            @confirm="submit" /></label
        ><label v-if="mode === 'register'" class="form-field"
          ><text class="field-label">确认密码</text
          ><input
            v-model="repeated"
            password
            maxlength="72"
            placeholder="再次输入密码"
            aria-label="确认密码"
            :disabled="busy"
            @confirm="submit" /></label
        ><view v-if="error" class="error-message" role="alert">{{ error }}</view
        ><AppButton
          class="primary-btn auth-submit"
          @tap="submit"
          :disabled="busy"
          >{{
            busy ? "正在处理…" : mode === "login" ? "登录" : "注册并登录"
          }}</AppButton
        >
      </form>
      <AppButton
        class="text-btn switch-mode"
        :disabled="busy"
        @tap="switchMode"
        >{{
          mode === "login" ? "还没有账号？去注册" : "已有账号？去登录"
        }}</AppButton
      ></view
    ><view class="auth-note"
      >无需登录也能浏览商家。每个账户独立保存自己的订单与收货地址。</view
    ><AppButton class="text-btn browse" @tap="goHome"
      >先逛逛附近好店</AppButton
    ></view
  >
</template>
<style scoped>
.auth-intro {
  text-align: center;
  padding: 24px 0 27px;
}
.auth-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 23px;
  background: #e4eed8;
  margin: 0 auto 18px;
}
.auth-intro .small {
  margin-top: 9px;
}
.auth-submit {
  margin-top: 18px;
  width: 100%;
}
.switch-mode {
  width: 100%;
  font-size: 13px;
  margin-top: 12px;
}
.auth-note {
  font-size: 12px;
  color: #7d8b73;
  text-align: center;
  margin: 22px 18px 6px;
}
.browse {
  font-size: 13px;
  margin: auto;
}
</style>
