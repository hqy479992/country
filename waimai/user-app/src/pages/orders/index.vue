<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { ErrandOrder, Order } from "../../api/types";
import { orderStage, statusClass, statusText, yuan } from "../../utils/format";

const orders = ref<Order[]>([]);
const errandOrders = ref<ErrandOrder[]>([]);
const activeService = ref<"TAKEOUT" | "ERRAND">("TAKEOUT");
const activeStatus = ref("ALL");
const loading = ref(false);

const tabs = [
  { key: "ALL", label: "全部" },
  { key: "PENDING_PAYMENT", label: "待支付" },
  { key: "PROCESSING", label: "处理中" },
  { key: "DELIVERY", label: "配送中" },
  { key: "COMPLETED", label: "已完成" }
];

const filteredOrders = computed(() => {
  if (activeStatus.value === "ALL") return orders.value;
  if (activeStatus.value === "PROCESSING") {
    return orders.value.filter((order) =>
      ["PAID", "MERCHANT_ACCEPTED", "READY_FOR_PICKUP"].includes(order.status)
    );
  }
  if (activeStatus.value === "DELIVERY") {
    return orders.value.filter((order) => ["RIDER_ACCEPTED", "PICKED_UP"].includes(order.status));
  }
  if (activeStatus.value === "COMPLETED") {
    return orders.value.filter((order) => ["DELIVERED", "COMPLETED"].includes(order.status));
  }
  return orders.value.filter((order) => order.status === activeStatus.value);
});

async function loadOrders() {
  loading.value = true;
  try {
    const [nextOrders, nextErrandOrders] = await Promise.all([api.getOrders(), api.getErrandOrders()]);
    orders.value = nextOrders;
    errandOrders.value = nextErrandOrders;
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function goDetail(orderId: string) {
  uni.navigateTo({ url: `/pages/orders/detail?orderId=${orderId}` });
}

function goPay(orderId: string) {
  uni.navigateTo({ url: `/pages/pay/pay?orderId=${orderId}` });
}

function errandStatusText(status: string) {
  const map: Record<string, string> = {
    PENDING_ASSIGN: "待接单",
    RIDER_ACCEPTED: "骑手已接单",
    PICKED_UP: "配送中",
    DELIVERED: "已送达",
    COMPLETED: "已完成",
    CANCELLED: "已取消"
  };
  return map[status] ?? status;
}

function errandModeText(mode?: string) {
  const map: Record<string, string> = {
    SEND: "帮送",
    PICK: "帮取",
    EXPRESS: "1对1急送"
  };
  return map[mode || ""] ?? "跑腿";
}

onShow(loadOrders);
</script>

<template>
  <view class="page">
    <view class="topbar">
      <view>
        <view class="title">我的订单</view>
        <view class="muted">查看下单后的每一步状态</view>
      </view>
      <view class="refresh" @tap="loadOrders">{{ loading ? "刷新中" : "刷新" }}</view>
    </view>

    <view class="service-switch">
      <view class="service-item" :class="{ active: activeService === 'TAKEOUT' }" @tap="activeService = 'TAKEOUT'">外卖</view>
      <view class="service-item" :class="{ active: activeService === 'ERRAND' }" @tap="activeService = 'ERRAND'">跑腿</view>
    </view>

    <scroll-view v-if="activeService === 'TAKEOUT'" class="tabs" scroll-x>
      <view class="tab-row">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeStatus === tab.key }"
          @tap="activeStatus = tab.key"
        >
          {{ tab.label }}
        </view>
      </view>
    </scroll-view>

    <view v-if="activeService === 'TAKEOUT' && filteredOrders.length === 0" class="empty">暂无外卖订单</view>
    <view v-for="order in activeService === 'TAKEOUT' ? filteredOrders : []" :key="order.id" class="order-card" @tap="goDetail(order.id)">
      <view class="order-head">
        <text class="shop">{{ order.shop?.name || "订单" }}</text>
        <text class="status" :class="statusClass(order.status)">{{ statusText(order.status) }}</text>
      </view>
      <view class="muted">订单号 {{ order.orderNo }}</view>
      <view class="stage">当前阶段：{{ orderStage(order.status) }}</view>
      <view class="items">
        <text v-for="item in order.items" :key="item.id">{{ item.productName }} x {{ item.quantity }}</text>
      </view>
      <view v-if="order.deliveryOrder" class="muted">配送状态：{{ statusText(order.deliveryOrder.status) }}</view>
      <view class="order-bottom">
        <text>{{ new Date(order.createdAt).toLocaleString() }}</text>
        <text class="price">{{ yuan(order.totalAmount) }}</text>
      </view>
      <view v-if="order.status === 'PENDING_PAYMENT'" class="pay-btn" @tap.stop="goPay(order.id)">去支付</view>
    </view>

    <view v-if="activeService === 'ERRAND' && errandOrders.length === 0" class="empty">暂无跑腿订单</view>
    <view v-for="order in activeService === 'ERRAND' ? errandOrders : []" :key="order.id" class="order-card">
      <view class="order-head">
        <text class="shop">跑腿 {{ order.serviceType === "BUY" ? "帮我买" : order.serviceType === "HELP" ? "帮个忙" : errandModeText(order.deliveryMode) }}</text>
        <text class="status">{{ errandStatusText(order.status) }}</text>
      </view>
      <view class="muted">订单号 {{ order.orderNo }}</view>
      <view class="stage">当前阶段：{{ errandStatusText(order.status) }}</view>
      <view class="items">
        <text>取：{{ order.pickupAddressSnapshot.region }} {{ order.pickupAddressSnapshot.detail }}</text>
        <text>送：{{ order.deliveryAddressSnapshot.region }} {{ order.deliveryAddressSnapshot.detail }}</text>
        <text v-if="order.itemNote">物品：{{ order.itemNote }}</text>
      </view>
      <view class="order-bottom">
        <text>{{ new Date(order.createdAt).toLocaleString() }}</text>
        <text class="price">{{ yuan(order.totalAmount) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.title {
  font-size: 40rpx;
  font-weight: 900;
}

.refresh {
  color: #165dff;
  font-weight: 900;
}

.service-switch {
  display: flex;
  gap: 14rpx;
  margin-bottom: 18rpx;
}

.service-item {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: #fff;
  color: #667085;
  font-weight: 900;
}

.service-item.active {
  background: #1f2329;
  color: #fff;
}

.tabs {
  margin-bottom: 20rpx;
  white-space: nowrap;
}

.tab-row {
  display: flex;
  gap: 12rpx;
}

.tab {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #475467;
  font-weight: 800;
}

.tab.active {
  background: #1f2329;
  color: #fff;
}

.order-card {
  padding: 24rpx;
  margin-bottom: 18rpx;
  border-radius: 16rpx;
  background: #fff;
}

.order-head,
.order-bottom {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.shop {
  font-size: 30rpx;
  font-weight: 800;
}

.status {
  color: #165dff;
  font-weight: 700;
}

.status.done {
  color: #039855;
}

.status.cancelled {
  color: #d92d20;
}

.status.paying {
  color: #ad6800;
}

.stage {
  margin-top: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 12rpx;
  background: #f6f7f9;
  color: #475467;
  font-weight: 700;
}

.items {
  display: grid;
  gap: 8rpx;
  margin: 18rpx 0;
}

.order-bottom {
  margin-top: 14rpx;
  color: #667085;
  font-size: 24rpx;
}

.pay-btn {
  margin-top: 18rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #1677ff;
  color: #fff;
  font-weight: 900;
}

.empty {
  padding: 80rpx 0;
  text-align: center;
  color: #667085;
}
</style>
