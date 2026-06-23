<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Shop } from "../../api/types";
import { yuan } from "../../utils/format";

const shop = ref<Shop | null>(null);
const phone = ref("");
const announcement = ref("");
const businessHours = ref("");

async function loadShop() {
  try {
    const nextShop = await api.getShop();
    shop.value = nextShop;
    phone.value = nextShop.phone;
    announcement.value = nextShop.announcement || "";
    businessHours.value = nextShop.businessHours || "";
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  }
}

async function toggleStatus() {
  if (!shop.value) return;
  const nextStatus = shop.value.status === "OPEN" ? "CLOSED" : "OPEN";
  try {
    shop.value = await api.updateShopStatus(nextStatus);
    uni.showToast({ title: nextStatus === "OPEN" ? "已营业" : "已休息", icon: "success" });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
  }
}

async function saveProfile() {
  try {
    shop.value = await api.updateShopProfile({
      phone: phone.value,
      announcement: announcement.value,
      businessHours: businessHours.value
    });
    uni.showToast({ title: "店铺资料已保存", icon: "success" });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" });
  }
}

onShow(loadShop);
</script>

<template>
  <view class="page">
    <view v-if="shop" class="stack">
      <view class="status-card" :class="{ closed: shop.status === 'CLOSED' }">
        <view class="status">{{ shop.status === "OPEN" ? "营业中" : "休息中" }}</view>
        <view class="muted">{{ shop.name }}</view>
      </view>

      <view class="card">
        <view class="row">
          <text>店铺电话</text>
          <text>{{ shop.phone }}</text>
        </view>
        <view class="row">
          <text>店铺地址</text>
          <text>{{ shop.address }}</text>
        </view>
        <view class="row">
          <text>起送价</text>
          <text>{{ yuan(shop.minOrderAmount) }}</text>
        </view>
        <view class="row">
          <text>配送费</text>
          <text>{{ yuan(shop.deliveryFee) }}</text>
        </view>
      </view>

      <view class="card form-card">
        <view class="block-title">日常资料</view>
        <view class="field-label">店铺电话</view>
        <input v-model="phone" placeholder="店铺电话" />
        <view class="field-label">营业时间</view>
        <input v-model="businessHours" placeholder="例如 09:00-22:00" />
        <view class="field-label">店铺公告</view>
        <textarea v-model="announcement" placeholder="例如 欢迎下单，雨天配送可能稍慢" />
        <view class="primary-btn" @tap="saveProfile">保存日常资料</view>
      </view>

      <view class="primary-btn" v-if="shop.status === 'CLOSED'" @tap="toggleStatus">开始营业</view>
      <view class="danger-btn" v-else @tap="toggleStatus">临时休息</view>
    </view>
  </view>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 18rpx;
}

.status-card {
  padding: 34rpx 24rpx;
  border-radius: 18rpx;
  background: #1677ff;
  color: #fff;
}

.status-card.closed {
  background: #667085;
}

.status {
  font-size: 44rpx;
  font-weight: 900;
  margin-bottom: 8rpx;
}

.status-card .muted {
  color: rgba(255, 255, 255, 0.82);
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #eaecf0;
}

.row:last-child {
  border-bottom: 0;
}

.row text:first-child {
  color: #667085;
  white-space: nowrap;
}

.row text:last-child {
  text-align: right;
}

.block-title {
  font-size: 32rpx;
  font-weight: 900;
  margin-bottom: 18rpx;
}

.form-card {
  display: grid;
  gap: 14rpx;
}

.field-label {
  color: #667085;
  font-size: 24rpx;
}

input,
textarea {
  width: 100%;
  padding: 0 18rpx;
  border-radius: 12rpx;
  background: #f6f7f9;
}

input {
  height: 76rpx;
}

textarea {
  min-height: 150rpx;
  padding-top: 18rpx;
}
</style>
