<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import {
  session,
  getToken,
  requireLogin,
  clearSession,
  saveSession,
} from "../../utils/session";
import { confirm, toast } from "../../utils/ui";
import PageHead from "../../components/PageHead.vue";
import AppIcon from "../../components/AppIcon.vue";
import BottomNav from "../../components/BottomNav.vue";
const leaving = ref(false);
function orders() {
  uni.reLaunch({ url: "/pages/orders/index" });
}
function errands() {
  uni.reLaunch({ url: "/pages/orders/index?type=errand" });
}
function addresses() {
  if (requireLogin("/pages/mine/index"))
    uni.navigateTo({ url: "/pages/address/index" });
}
async function logout() {
  if (
    leaving.value ||
    !(await confirm(
      "退出登录",
      "退出后可以继续浏览商家，查看订单时需重新登录。",
    ))
  )
    return;
  leaving.value = true;
  try {
    await api.logout();
    clearSession();
  } catch (e) {
    if (!getToken()) clearSession();
    else toast(e);
  } finally {
    leaving.value = false;
  }
}
async function load() {
  if (!getToken()) return;
  const token = session.value!.token;
  try {
    const user = await api.getProfile();
    if (session.value?.token === token) saveSession({ ...session.value, user });
  } catch {
    /* An expired session is cleared centrally. */
  }
}
onShow(load);
</script>
<template>
  <view class="page with-nav"
    ><PageHead title="我的" :back="false" /><view class="profile"
      ><view class="avatar"><AppIcon name="user" :size="32" /></view
      ><view class="profile-copy"
        ><view class="profile-name">{{
          session?.user.nickname || "欢迎来到乡镇外卖"
        }}</view
        ><view v-if="session" class="small muted"
          >账号 {{ session.user.account || "我的账户" }}</view
        ><AppButton
          v-else
          class="login-entry"
          @tap="requireLogin('/pages/mine/index')"
          >登录 / 注册<AppIcon
            name="arrow"
            :size="14" /></AppButton></view></view
    ><view class="card account-menu"
      ><AppButton class="menu-row" @tap="orders"
        ><view class="menu-icon"><AppIcon name="order" /></view
        ><text>我的订单</text
        ><AppIcon name="arrow" :size="17" color="#8a967f" /></AppButton
      ><AppButton class="menu-row" @tap="errands"
        ><view class="menu-icon"><AppIcon name="bag" /></view
        ><text>跑腿订单</text
        ><AppIcon name="arrow" :size="17" color="#8a967f" /></AppButton
      ><AppButton class="menu-row" @tap="addresses"
        ><view class="menu-icon"><AppIcon name="pin" /></view
        ><text>收货地址</text
        ><AppIcon name="arrow" :size="17" color="#8a967f" /></AppButton
      ><AppButton
        v-if="session"
        class="menu-row"
        :disabled="leaving"
        @tap="logout"
        ><view class="menu-icon"><AppIcon name="exit" /></view
        ><text>{{ leaving ? "正在退出…" : "退出登录" }}</text
        ><AppIcon name="arrow" :size="17" color="#8a967f" /></AppButton></view
    ><view class="account-note"
      ><AppIcon name="bag" :size="21" color="#96a387" /><view
        >把附近的好味道，送到你身边。</view
      ></view
    ><BottomNav active="mine"
  /></view>
</template>
<style scoped>
.profile {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 25px 0 32px;
}
.avatar {
  width: 74px;
  height: 74px;
  background: #e5efd8;
  border-radius: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.profile-copy {
  min-width: 0;
}
.profile-name {
  font-size: 21px;
  font-weight: 600;
  margin-bottom: 6px;
  overflow-wrap: anywhere;
}
.login-entry {
  color: #245d3f;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
}
.account-menu {
  padding-top: 5px;
  padding-bottom: 5px;
}
.menu-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 68px;
  border-bottom: 1px solid #edf0e8;
  text-align: left;
}
.menu-row:last-child {
  border: 0;
}
.menu-row > text {
  flex: 1;
}
.menu-icon {
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f5e9;
  border-radius: 10px;
}
.account-note {
  text-align: center;
  font-size: 12px;
  color: #96a387;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 56px;
}
</style>
