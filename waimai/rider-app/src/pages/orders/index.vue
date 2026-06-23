<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { DeliveryOrder } from "../../api/types";
import { statusText, yuan } from "../../utils/format";

const orders = ref<DeliveryOrder[]>([]);
const activeStatus = ref("ACTIVE");

const tabs = [
  { key: "ACTIVE", label: "进行中" },
  { key: "DELIVERED", label: "已完成" },
  { key: "ALL", label: "全部" }
];

const filteredOrders = computed(() => {
  if (activeStatus.value === "ALL") return orders.value;
  if (activeStatus.value === "ACTIVE") {
    return orders.value.filter((order) => ["RIDER_ACCEPTED", "PICKED_UP"].includes(order.status));
  }
  return orders.value.filter((order) => order.status === activeStatus.value);
});

async function loadOrders() {
  try {
    orders.value = await api.getMyOrders();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  }
}

function goDetail(deliveryOrderId: string) {
  uni.navigateTo({ url: `/pages/orders/detail?deliveryOrderId=${deliveryOrderId}` });
}

onShow(loadOrders);
</script>

<template>
  <view class="page">
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

    <view v-if="filteredOrders.length === 0" class="empty">暂无配送单</view>

    <view v-for="delivery in filteredOrders" :key="delivery.id" class="order-card" @tap="goDetail(delivery.id)">
      <view class="order-head">
        <text class="shop">{{ delivery.order.shop.name }}</text>
        <text class="status">{{ statusText(delivery.status) }}</text>
      </view>
      <view class="muted">订单号 {{ delivery.order.orderNo }}</view>
      <view class="address">{{ delivery.order.addressSnapshot.region }} {{ delivery.order.addressSnapshot.detail }}</view>
      <view class="order-bottom">
        <text>{{ new Date(delivery.createdAt).toLocaleString() }}</text>
        <text class="price">{{ yuan(delivery.order.deliveryFee) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
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
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.shop {
  font-size: 30rpx;
  font-weight: 900;
}

.status {
  color: #165dff;
  font-weight: 900;
}

.address {
  margin: 18rpx 0;
  font-weight: 700;
}

.order-bottom {
  color: #667085;
  font-size: 24rpx;
}

.empty {
  padding: 80rpx 0;
  text-align: center;
  color: #667085;
}
</style>
