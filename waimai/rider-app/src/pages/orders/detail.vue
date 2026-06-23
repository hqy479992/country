<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { DeliveryOrder } from "../../api/types";
import { canAccept, canDeliver, canPickup, statusText, yuan } from "../../utils/format";

const deliveryOrderId = ref("");
const delivery = ref<DeliveryOrder | null>(null);
const submitting = ref(false);

const showAccept = computed(() => delivery.value && canAccept(delivery.value.status));
const showPickup = computed(() => delivery.value && canPickup(delivery.value.status));
const showDeliver = computed(() => delivery.value && canDeliver(delivery.value.status));

async function loadOrder() {
  if (!deliveryOrderId.value) return;
  try {
    delivery.value = await api.getOrder(deliveryOrderId.value);
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  }
}

async function runAction(action: () => Promise<DeliveryOrder>, title: string) {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await action();
    uni.showToast({ title, icon: "success" });
    await loadOrder();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

function acceptOrder() {
  if (!delivery.value) return;
  void runAction(() => api.acceptOrder(delivery.value!.id), "接单成功");
}

function pickupOrder() {
  if (!delivery.value) return;
  void runAction(() => api.pickupOrder(delivery.value!.id), "已取货");
}

function deliverOrder() {
  if (!delivery.value) return;
  void runAction(() => api.deliverOrder(delivery.value!.id), "已送达");
}

function callPhone(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone });
}

onLoad((query) => {
  deliveryOrderId.value = String(query?.deliveryOrderId || "");
});

onShow(loadOrder);
</script>

<template>
  <view class="page">
    <view v-if="delivery" class="stack">
      <view class="status-card">
        <view class="status">{{ statusText(delivery.status) }}</view>
        <view class="muted">配送费 {{ yuan(delivery.order.deliveryFee) }}</view>
      </view>

      <view class="card">
        <view class="block-title">取货商家</view>
        <view class="main-text">{{ delivery.order.shop.name }}</view>
        <view class="muted">{{ delivery.order.shop.address }}</view>
        <view class="secondary-btn small" @tap="callPhone(delivery.order.shop.phone)">联系商家</view>
      </view>

      <view class="card">
        <view class="block-title">送达地址</view>
        <view class="main-text">{{ delivery.order.addressSnapshot.name }} {{ delivery.order.addressSnapshot.phone }}</view>
        <view class="muted">{{ delivery.order.addressSnapshot.region }} {{ delivery.order.addressSnapshot.detail }}</view>
        <view class="secondary-btn small" @tap="callPhone(delivery.order.addressSnapshot.phone)">联系用户</view>
      </view>

      <view class="card">
        <view class="block-title">商品</view>
        <view v-for="item in delivery.order.items" :key="item.id" class="item">
          <text>{{ item.productName }} x {{ item.quantity }}</text>
          <text>{{ yuan(item.totalPrice) }}</text>
        </view>
        <view v-if="delivery.order.remark" class="remark">备注：{{ delivery.order.remark }}</view>
      </view>

      <view class="card">
        <view class="row">
          <text>订单号</text>
          <text>{{ delivery.order.orderNo }}</text>
        </view>
        <view class="row">
          <text>订单金额</text>
          <text>{{ yuan(delivery.order.totalAmount) }}</text>
        </view>
      </view>

      <view class="fixed-actions">
        <view v-if="showAccept" class="primary-btn" @tap="acceptOrder">接单</view>
        <view v-else-if="showPickup" class="primary-btn" @tap="pickupOrder">已取货</view>
        <view v-else-if="showDeliver" class="primary-btn" @tap="deliverOrder">已送达</view>
        <view v-else class="secondary-btn">当前状态：{{ statusText(delivery.status) }}</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 18rpx;
  padding-bottom: 120rpx;
}

.status-card {
  padding: 34rpx 24rpx;
  border-radius: 18rpx;
  background: #1677ff;
  color: #fff;
}

.status {
  font-size: 44rpx;
  font-weight: 900;
  margin-bottom: 8rpx;
}

.status-card .muted {
  color: rgba(255, 255, 255, 0.82);
}

.block-title {
  color: #667085;
  margin-bottom: 12rpx;
}

.main-text {
  font-size: 32rpx;
  font-weight: 900;
  margin-bottom: 10rpx;
}

.small {
  height: 64rpx;
  margin-top: 18rpx;
}

.item,
.row {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  padding: 12rpx 0;
}

.remark {
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: #fff7e6;
  color: #ad6800;
}

.row {
  color: #667085;
}

.row text:last-child {
  color: #1f2329;
  text-align: right;
}

.fixed-actions {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 28rpx;
}
</style>
