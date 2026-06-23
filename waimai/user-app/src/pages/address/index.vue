<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { UserAddress } from "../../api/types";

const addresses = ref<UserAddress[]>([]);

async function loadAddresses() {
  try {
    addresses.value = await api.getAddresses();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  }
}

function addAddress() {
  uni.navigateTo({ url: "/pages/address/edit" });
}

function editAddress(address: UserAddress) {
  uni.navigateTo({ url: `/pages/address/edit?addressId=${address.id}` });
}

async function setDefault(address: UserAddress) {
  try {
    await api.setDefaultAddress(address.id);
    await loadAddresses();
    uni.showToast({ title: "已设为默认", icon: "success" });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
  }
}

async function deleteAddress(address: UserAddress) {
  uni.showModal({
    title: "删除地址",
    content: "确认删除这个收货地址？",
    success: async (result) => {
      if (!result.confirm) return;
      try {
        await api.deleteAddress(address.id);
        await loadAddresses();
        uni.showToast({ title: "已删除", icon: "success" });
      } catch (error) {
        uni.showToast({ title: error instanceof Error ? error.message : "删除失败", icon: "none" });
      }
    }
  });
}

onShow(loadAddresses);
</script>

<template>
  <view class="page">
    <view class="primary-btn add" @tap="addAddress">新增地址</view>

    <view v-if="addresses.length === 0" class="empty">暂无地址</view>

    <view v-for="address in addresses" :key="address.id" class="address-card">
      <view class="address-head">
        <view class="name">{{ address.name }} {{ address.phone }}</view>
        <view v-if="address.isDefault" class="default-tag">默认</view>
      </view>
      <view class="muted">{{ address.region }} {{ address.detail }}</view>
      <view class="actions">
        <view class="mini-btn" @tap="editAddress(address)">编辑</view>
        <view class="mini-btn" v-if="!address.isDefault" @tap="setDefault(address)">设默认</view>
        <view class="mini-btn danger" @tap="deleteAddress(address)">删除</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.add {
  margin-bottom: 18rpx;
}

.address-card {
  padding: 24rpx;
  margin-bottom: 18rpx;
  border-radius: 16rpx;
  background: #fff;
}

.address-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 10rpx;
}

.name {
  font-size: 30rpx;
  font-weight: 900;
}

.default-tag {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: #eef4ff;
  color: #165dff;
  font-size: 22rpx;
  font-weight: 800;
}

.actions {
  display: flex;
  gap: 14rpx;
  margin-top: 18rpx;
}

.mini-btn {
  padding: 10rpx 18rpx;
  border-radius: 10rpx;
  background: #eef4ff;
  color: #165dff;
  font-weight: 800;
}

.mini-btn.danger {
  background: #fff1f0;
  color: #d92d20;
}

.empty {
  padding: 80rpx 0;
  text-align: center;
  color: #667085;
}
</style>
