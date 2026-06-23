<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Order } from "../../api/types";
import { statusText, yuan } from "../../utils/format";

const orderId = ref("");
const order = ref<Order | null>(null);
const paying = ref(false);

async function loadOrder() {
  if (!orderId.value) return;
  try {
    order.value = await api.getOrder(orderId.value);
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  }
}

async function payOrder() {
  if (!order.value || paying.value) return;
  paying.value = true;
  try {
    await api.payMock(order.value.id);
    uni.showToast({ title: "支付成功", icon: "success" });
    uni.redirectTo({ url: `/pages/orders/detail?orderId=${order.value.id}` });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "支付失败", icon: "none" });
  } finally {
    paying.value = false;
  }
}

function goOrder() {
  if (!order.value) return;
  uni.redirectTo({ url: `/pages/orders/detail?orderId=${order.value.id}` });
}

onLoad((query) => {
  orderId.value = String(query?.orderId || "");
});

onShow(loadOrder);
</script>

<template>
  <view class="page">
    <view v-if="order" class="stack">
      <view class="pay-card">
        <view class="muted">待支付金额</view>
        <view class="amount">{{ yuan(order.totalAmount) }}</view>
        <view class="muted">订单状态：{{ statusText(order.status) }}</view>
      </view>

      <view class="card">
        <view class="block-title">{{ order.shop?.name || "商家" }}</view>
        <view v-for="item in order.items" :key="item.id" class="row">
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
      </view>

      <view v-if="order.status === 'PENDING_PAYMENT'" class="primary-btn" @tap="payOrder">
        {{ paying ? "支付中..." : "模拟支付" }}
      </view>
      <view v-else class="secondary-btn" @tap="goOrder">查看订单</view>
    </view>
  </view>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 18rpx;
}

.pay-card {
  padding: 38rpx 24rpx;
  border-radius: 18rpx;
  background: #1677ff;
  color: #fff;
  text-align: center;
}

.pay-card .muted {
  color: rgba(255, 255, 255, 0.82);
}

.amount {
  margin: 16rpx 0;
  font-size: 58rpx;
  font-weight: 900;
}

.block-title {
  font-size: 32rpx;
  font-weight: 900;
  margin-bottom: 14rpx;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  padding: 12rpx 0;
  color: #667085;
}

.row text:last-child {
  color: #1f2329;
  font-weight: 700;
}
</style>
