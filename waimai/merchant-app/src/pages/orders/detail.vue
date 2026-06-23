<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Order } from "../../api/types";
import { canAccept, canReady, statusText, yuan } from "../../utils/format";

const orderId = ref("");
const order = ref<Order | null>(null);
const submitting = ref(false);

const showAcceptActions = computed(() => order.value && canAccept(order.value.status));
const showReadyAction = computed(() => order.value && canReady(order.value.status));

async function loadOrder() {
  if (!orderId.value) return;
  try {
    order.value = await api.getOrder(orderId.value);
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  }
}

async function runAction(action: () => Promise<Order>, successTitle: string) {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await action();
    uni.showToast({ title: successTitle, icon: "success" });
    await loadOrder();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

function acceptOrder() {
  if (!order.value) return;
  void runAction(() => api.acceptOrder(order.value!.id), "已接单");
}

function rejectOrder() {
  if (!order.value) return;
  uni.showModal({
    title: "确认拒单",
    content: "拒单后订单会取消，后续再接入退款处理。",
    success: (result) => {
      if (result.confirm) {
        void runAction(() => api.rejectOrder(order.value!.id), "已拒单");
      }
    }
  });
}

function readyOrder() {
  if (!order.value) return;
  void runAction(() => api.readyOrder(order.value!.id), "已出餐");
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
        <view class="status">{{ statusText(order.status) }}</view>
        <view class="muted">订单号 {{ order.orderNo }}</view>
      </view>

      <view class="card">
        <view class="block-title">收货信息</view>
        <view class="customer">{{ order.addressSnapshot.name }} {{ order.addressSnapshot.phone }}</view>
        <view class="muted">{{ order.addressSnapshot.region }} {{ order.addressSnapshot.detail }}</view>
        <view v-if="order.remark" class="remark">备注：{{ order.remark }}</view>
      </view>

      <view class="card">
        <view class="block-title">商品</view>
        <view v-for="item in order.items" :key="item.id" class="item">
          <view>
            <view class="item-name">{{ item.productName }}</view>
            <view class="muted">{{ yuan(item.unitPrice) }} x {{ item.quantity }}</view>
          </view>
          <view class="price">{{ yuan(item.totalPrice) }}</view>
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

      <view v-if="order.deliveryOrder" class="card">
        <view class="block-title">配送</view>
        <view>配送状态：{{ statusText(order.deliveryOrder.status) }}</view>
        <view v-if="order.deliveryOrder.rider" class="muted">
          骑手：{{ order.deliveryOrder.rider.name }} {{ order.deliveryOrder.rider.phone || "" }}
        </view>
      </view>

      <view class="actions" v-if="showAcceptActions">
        <view class="danger-btn" @tap="rejectOrder">拒单</view>
        <view class="primary-btn" @tap="acceptOrder">接单</view>
      </view>

      <view class="actions" v-if="showReadyAction">
        <view class="primary-btn wide" @tap="readyOrder">标记出餐</view>
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
  font-size: 42rpx;
  font-weight: 900;
  margin-bottom: 10rpx;
}

.status-card .muted {
  color: rgba(255, 255, 255, 0.82);
}

.block-title {
  font-weight: 900;
  margin-bottom: 18rpx;
}

.customer {
  font-size: 30rpx;
  font-weight: 800;
  margin-bottom: 8rpx;
}

.remark {
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: #fff7e6;
  color: #ad6800;
}

.item,
.row,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.item,
.row {
  padding: 12rpx 0;
}

.item-name {
  font-weight: 800;
  margin-bottom: 6rpx;
}

.row {
  color: #667085;
}

.total {
  color: #1f2329;
  font-size: 32rpx;
  font-weight: 900;
}

.actions {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 28rpx;
}

.actions > view {
  flex: 1;
}

.actions .wide {
  flex: 1;
}
</style>
