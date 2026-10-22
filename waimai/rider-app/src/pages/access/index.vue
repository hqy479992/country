<script setup lang="ts">
import { ref } from "vue";
import { API_BASE_URL } from "../../config";
const id = ref("");
const key = ref("");
const busy = ref(false);
const error = ref("");
function submit() {
  if (busy.value) return;
  if (!id.value.trim() || !key.value.trim()) {
    error.value = "请填写身份ID和访问凭证";
    return;
  }
  busy.value = true;
  error.value = "";
  uni.request({
    url: `${API_BASE_URL}/api/staff/session`,
    timeout: 12000,
    header: {
      "x-actor-type": "RIDER",
      "x-actor-id": id.value.trim(),
      "x-access-key": key.value.trim(),
    },
    success: (response) => {
      if (response.statusCode === 200) {
        uni.setStorageSync("town-rider-access", {
          id: id.value.trim(),
          key: key.value.trim(),
        });
        key.value = "";
        uni.reLaunch({ url: "/pages/index/index" });
      } else {
        error.value =
          (response.data as { error?: { message?: string } })?.error?.message ||
          "登录失败";
      }
    },
    fail: () => {
      error.value = "网络连接失败，请重试";
    },
    complete: () => {
      busy.value = false;
    },
  });
}
</script>
<template>
  <view class="page"
    ><view class="card"
      ><view class="heading">骑手登录</view
      ><label class="field"
        >身份 ID<input
          v-model="id"
          placeholder="工作人员ID"
          :disabled="busy" /></label
      ><label class="field"
        >访问凭证<input
          v-model="key"
          password
          placeholder="请输入管理员分配的访问凭证"
          :disabled="busy" /></label
      ><view v-if="error" class="error" role="alert">{{ error }}</view
      ><button class="login-button" :disabled="busy" @tap="submit">
        {{ busy ? "正在验证…" : "登录" }}
      </button></view
    ></view
  >
</template>
<style scoped>
.heading {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 24px;
}
.field {
  display: block;
  margin: 18px 0;
  font-size: 13px;
}
.field input {
  background: #f1f4ef;
  border-radius: 8px;
  height: 44px;
  margin-top: 9px;
  padding: 0 12px;
  font-size: 16px;
}
.login-button {
  background: #245d3f;
  color: #fff;
  border-radius: 10px;
  margin-top: 20px;
}
.error {
  color: #b43e30;
  font-size: 13px;
}
</style>
