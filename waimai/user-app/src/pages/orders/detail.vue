<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Order } from "../../api/types";
import { statusText, yuan } from "../../utils/format";

const orderId = ref("");
const order = ref<Order | null>(null);
const loading = ref(false);

const statusSteps = [
  "PENDING_PAYMENT",
  "PAID",
  "MERCHANT_ACCEPTED",
  "READY_FOR_PICKUP",
  "RIDER_ACCEPTED",
  "PICKED_UP",
  "DELIVERED",
  "COMPLETED"
];

async function loadOrder() {
  if (!orderId.value) return;
  loading.value = true;
  try {
    order.value = await api.getOrder(orderId.value);
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function goHome() {
  uni.reLaunch({ url: "/pages/index/index" });
}

function goPay() {
  if (!order.value) return;
  uni.navigateTo({ url: `/pages/pay/pay?orderId=${order.value.id}` });
}

function stepDone(step: string) {
  if (!order.value) return false;
  if (order.value.status === "CANCELLED") return false;
  return statusSteps.indexOf(order.value.status) >= statusSteps.indexOf(step);
}

onLoad((query) => {
  orderId.value = String(query?.orderId || "");
});

onShow(loadOrder);
</script>

<template>
  <view class="page">
    <view v-if="order" class="stack">
      <view class="status-card">
        <view class="status-row">
          <view>
            <view class="status">{{ statusText(order.status) }}</view>
            <view class="muted">订单号 {{ order.orderNo }}</view>
          </view>
          <view class="refresh" @tap="loadOrder">{{ loading ? "刷新中" : "刷新" }}</view>
        </view>
      </view>

      <view class="card">
        <view class="block-title">订单进度</view>
        <view class="steps">
          <view v-for="step in statusSteps" :key="step" class="step" :class="{ done: stepDone(step) }">
            <view class="dot"></view>
            <text>{{ statusText(step) }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="block-title">{{ order.shop?.name || "商家" }}</view>
        <view v-for="item in order.items" :key="item.id" class="item">
          <text>{{ item.productName }} x {{ item.quantity }}</text>
          <text>{{ yuan(item.totalPrice) }}</text>
        </view>
      </view>

      <view class="card">
        <view class="row">
          <text>商品金额</text>
          <text>{{ yuan(order.goodsAmount) }}</text>
        </view>
        <view class="row">
          <text>配送费</text>
          <text>{{ yuan(order.deliveryFee) }}</text>
        </view>
        <view class="row total">
          <text>实付</text>
          <text>{{ yuan(order.totalAmount) }}</text>
        </view>
      </view>

      <view class="card">
        <view class="block-title">配送地址</view>
        <view>{{ order.addressSnapshot.name }} {{ order.addressSnapshot.phone }}</view>
        <view class="muted">{{ order.addressSnapshot.region }} {{ order.addressSnapshot.detail }}</view>
      </view>

      <view v-if="order.deliveryOrder?.rider" class="card">
        <view class="block-title">骑手</view>
        <view>{{ order.deliveryOrder.rider.name }}</view>
        <view class="muted">{{ order.deliveryOrder.rider.phone || "" }}</view>
        <view class="muted">配送状态：{{ statusText(order.deliveryOrder.status) }}</view>
      </view>

      <view v-if="order.status === 'PENDING_PAYMENT'" class="primary-btn" @tap="goPay">去支付</view>
      <view class="primary-btn" @tap="goHome">继续逛逛</view>
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

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.refresh {
  height: 56rpx;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  font-size: 24rpx;
  font-weight: 800;
}

.status {
  font-size: 42rpx;
  font-weight: 800;
  margin-bottom: 10rpx;
}

.status-card .muted {
  color: rgba(255, 255, 255, 0.82);
}

.block-title {
  font-weight: 800;
  margin-bottom: 18rpx;
}

.steps {
  display: grid;
  gap: 14rpx;
}

.step {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: #98a2b3;
}

.step.done {
  color: #165dff;
  font-weight: 800;
}

.dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #d0d5dd;
}

.step.done .dot {
  background: #1677ff;
}

.item,
.row {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  padding: 12rpx 0;
}

.row {
  color: #667085;
}

.total {
  color: #1f2329;
  font-size: 32rpx;
  font-weight: 800;
}
</style>
