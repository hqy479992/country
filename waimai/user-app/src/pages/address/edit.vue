<script setup lang="ts">
import { reactive, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { api } from "../../api";

const addressId = ref("");
const form = reactive({
  name: "",
  phone: "",
  region: "",
  detail: "",
  isDefault: true
});

async function loadAddress() {
  if (!addressId.value) return;
  try {
    const addresses = await api.getAddresses();
    const current = addresses.find((address) => address.id === addressId.value);
    if (!current) return;
    form.name = current.name;
    form.phone = current.phone;
    form.region = current.region;
    form.detail = current.detail;
    form.isDefault = current.isDefault;
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  }
}

async function saveAddress() {
  if (!form.name || !form.phone || !form.region || !form.detail) {
    uni.showToast({ title: "请填写完整地址信息", icon: "none" });
    return;
  }

  try {
    if (addressId.value) {
      await api.updateAddress(addressId.value, form);
      uni.showToast({ title: "地址已更新", icon: "success" });
    } else {
      await api.createAddress(form);
      uni.showToast({ title: "地址已新增", icon: "success" });
    }
    setTimeout(() => uni.navigateBack(), 350);
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" });
  }
}

onLoad((query) => {
  addressId.value = String(query?.addressId || "");
  void loadAddress();
});
</script>

<template>
  <view class="page">
    <view class="card form-card">
      <view class="label">收货人</view>
      <input v-model="form.name" placeholder="请输入收货人" />
      <view class="label">手机号</view>
      <input v-model="form.phone" placeholder="请输入手机号" />
      <view class="label">区域</view>
      <input v-model="form.region" placeholder="例如 洛旺乡" />
      <view class="label">详细地址</view>
      <input v-model="form.detail" placeholder="村/小区/门牌号" />
      <label class="check">
        <checkbox :checked="form.isDefault" @tap="form.isDefault = !form.isDefault" />
        <text>设为默认地址</text>
      </label>
      <view class="primary-btn" @tap="saveAddress">保存地址</view>
    </view>
  </view>
</template>

<style scoped>
.form-card {
  display: grid;
  gap: 14rpx;
}

.label {
  color: #667085;
  font-size: 24rpx;
}

input {
  height: 78rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  background: #f6f7f9;
}

.check {
  display: flex;
  align-items: center;
  gap: 10rpx;
  color: #475467;
  margin: 10rpx 0;
}
</style>
