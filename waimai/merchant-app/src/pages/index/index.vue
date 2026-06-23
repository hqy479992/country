<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Dashboard, Order } from "../../api/types";
import { canAccept, canReady, statusText, yuan } from "../../utils/format";

const dashboard = ref<Dashboard | null>(null);
const orders = ref<Order[]>([]);
const activeStatus = ref("ALL");
const loading = ref(false);
const actingOrderId = ref("");

const tabs = [
  { key: "ALL", label: "全部" },
  { key: "PAID", label: "待接单" },
  { key: "MERCHANT_ACCEPTED", label: "制作中" },
  { key: "READY_FOR_PICKUP", label: "待取货" },
  { key: "COMPLETED", label: "已完成" }
];

const filteredOrders = computed(() => {
  if (activeStatus.value === "ALL") return orders.value;
  return orders.value.filter((order) => order.status === activeStatus.value);
});

async function loadData() {
  loading.value = true;
  try {
    const [nextDashboard, nextOrders] = await Promise.all([api.getDashboard(), api.getOrders()]);
    dashboard.value = nextDashboard;
    orders.value = nextOrders;
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function goDetail(orderId: string) {
  uni.navigateTo({ url: `/pages/orders/detail?orderId=${orderId}` });
}

async function runOrderAction(orderId: string, action: () => Promise<Order>, successTitle: string) {
  if (actingOrderId.value) return;
  actingOrderId.value = orderId;
  try {
    await action();
    uni.showToast({ title: successTitle, icon: "success" });
    await loadData();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
  } finally {
    actingOrderId.value = "";
  }
}

function acceptOrder(order: Order) {
  void runOrderAction(order.id, () => api.acceptOrder(order.id), "已接单");
}

function rejectOrder(order: Order) {
  uni.showModal({
    title: "确认拒单",
    content: "拒单后订单会取消，后续再接入退款处理。",
    success: (result) => {
      if (result.confirm) {
        void runOrderAction(order.id, () => api.rejectOrder(order.id), "已拒单");
      }
    }
  });
}

function readyOrder(order: Order) {
  void runOrderAction(order.id, () => api.readyOrder(order.id), "已出餐");
}

function goProducts() {
  uni.navigateTo({ url: "/pages/products/index" });
}

function goSettings() {
  uni.navigateTo({ url: "/pages/shop/settings" });
}

onShow(loadData);
</script>

<template>
  <view class="page">
    <view class="header">
      <view>
        <view class="hello">{{ dashboard?.shop.name || "商家工作台" }}</view>
        <view class="title">{{ dashboard?.shop.status === "CLOSED" ? "休息中" : "营业中" }}</view>
      </view>
      <view class="refresh" @tap="loadData">刷新</view>
    </view>

    <view class="quick-actions">
      <view class="quick-card" @tap="goProducts">
        <text class="quick-title">商品管理</text>
        <text class="muted">上架、库存、新增</text>
      </view>
      <view class="quick-card" @tap="goSettings">
        <text class="quick-title">店铺设置</text>
        <text class="muted">营业状态</text>
      </view>
    </view>

    <view class="stats" v-if="dashboard">
      <view class="stat" @tap="activeStatus = 'ALL'">
        <text>今日订单</text>
        <strong>{{ dashboard.todayOrderCount }}</strong>
      </view>
      <view class="stat">
        <text>今日营业额</text>
        <strong>{{ yuan(dashboard.todayRevenue) }}</strong>
      </view>
      <view class="stat" @tap="activeStatus = 'PAID'">
        <text>待接单</text>
        <strong>{{ dashboard.pendingCount }}</strong>
      </view>
      <view class="stat" @tap="activeStatus = 'MERCHANT_ACCEPTED'">
        <text>制作中</text>
        <strong>{{ dashboard.makingCount }}</strong>
      </view>
      <view class="stat" @tap="activeStatus = 'READY_FOR_PICKUP'">
        <text>待取货</text>
        <strong>{{ dashboard.readyCount }}</strong>
      </view>
    </view>

    <scroll-view class="tabs" scroll-x>
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

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="filteredOrders.length === 0" class="empty">暂无订单</view>

    <view v-for="order in filteredOrders" :key="order.id" class="order-card" @tap="goDetail(order.id)">
      <view class="order-head">
        <text class="order-no">{{ order.orderNo }}</text>
        <text class="status">{{ statusText(order.status) }}</text>
      </view>
      <view class="customer">
        {{ order.addressSnapshot.name }} {{ order.addressSnapshot.phone }}
      </view>
      <view class="muted">{{ order.addressSnapshot.region }} {{ order.addressSnapshot.detail }}</view>
      <view class="items">
        <text v-for="item in order.items" :key="item.id">
          {{ item.productName }} x {{ item.quantity }}
        </text>
      </view>
      <view class="order-bottom">
        <text>{{ new Date(order.createdAt).toLocaleString() }}</text>
        <text class="price">{{ yuan(order.totalAmount) }}</text>
      </view>

      <view v-if="canAccept(order.status)" class="order-actions">
        <view class="reject-btn" @tap.stop="rejectOrder(order)">
          {{ actingOrderId === order.id ? "处理中" : "拒单" }}
        </view>
        <view class="accept-btn" @tap.stop="acceptOrder(order)">
          {{ actingOrderId === order.id ? "处理中" : "接单" }}
        </view>
      </view>

      <view v-if="canReady(order.status)" class="order-actions">
        <view class="accept-btn wide" @tap.stop="readyOrder(order)">
          {{ actingOrderId === order.id ? "处理中" : "标记出餐" }}
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-radius: 20rpx;
  background: #1677ff;
  color: #fff;
}

.hello {
  opacity: 0.86;
  font-size: 26rpx;
}

.title {
  margin-top: 8rpx;
  font-size: 44rpx;
  font-weight: 900;
}

.refresh {
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  font-weight: 800;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin: 20rpx 0;
}

.quick-card {
  padding: 22rpx;
  border-radius: 16rpx;
  background: #fff;
}

.quick-title {
  display: block;
  font-size: 30rpx;
  font-weight: 900;
  margin-bottom: 8rpx;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
  margin-bottom: 20rpx;
}

.stat {
  padding: 20rpx;
  border-radius: 16rpx;
  background: #fff;
}

.stat text {
  display: block;
  color: #667085;
  font-size: 24rpx;
}

.stat strong {
  display: block;
  margin-top: 8rpx;
  font-size: 34rpx;
}

.tabs {
  margin: 22rpx 0;
  white-space: nowrap;
}

.tab-row {
  display: flex;
  gap: 12rpx;
}

.tab {
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #475467;
  font-weight: 700;
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
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.order-no {
  font-weight: 800;
}

.status {
  color: #165dff;
  font-weight: 800;
}

.customer {
  margin-top: 16rpx;
  font-size: 30rpx;
  font-weight: 800;
}

.items {
  display: grid;
  gap: 8rpx;
  margin: 18rpx 0;
}

.order-bottom {
  color: #667085;
  font-size: 24rpx;
}

.order-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.reject-btn,
.accept-btn {
  flex: 1;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  font-weight: 900;
}

.reject-btn {
  background: #fff1f0;
  color: #d92d20;
}

.accept-btn {
  background: #1677ff;
  color: #fff;
}

.accept-btn.wide {
  flex: 1;
}

.empty {
  padding: 80rpx 0;
  color: #667085;
  text-align: center;
}
</style>
