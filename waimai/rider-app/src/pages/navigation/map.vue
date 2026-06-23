<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { DeliveryOrder } from "../../api/types";
import { yuan } from "../../utils/format";

type Target = "shop" | "user";

const deliveryOrderId = ref("");
const target = ref<Target>("shop");
const delivery = ref<DeliveryOrder | null>(null);
const loading = ref(false);

const targetTitle = computed(() => (target.value === "shop" ? "导航到商家" : "导航到顾客"));
const targetLabel = computed(() => (target.value === "shop" ? "取" : "送"));
const targetName = computed(() => {
  if (!delivery.value) return "";
  if (target.value === "shop") return delivery.value.order.shop.name;
  return delivery.value.order.addressSnapshot.name;
});
const targetAddress = computed(() => {
  if (!delivery.value) return "";
  if (target.value === "shop") return delivery.value.order.shop.address;
  const address = delivery.value.order.addressSnapshot;
  return `${address.region} ${address.detail}`;
});
const disabledName = computed(() => {
  if (!delivery.value) return "";
  if (target.value === "shop") return delivery.value.order.addressSnapshot.name;
  return delivery.value.order.shop.name;
});
const disabledAddress = computed(() => {
  if (!delivery.value) return "";
  if (target.value === "shop") {
    const address = delivery.value.order.addressSnapshot;
    return `${address.region} ${address.detail}`;
  }
  return delivery.value.order.shop.address;
});

async function loadOrder() {
  if (!deliveryOrderId.value) return;
  loading.value = true;
  try {
    delivery.value = await api.getOrder(deliveryOrderId.value);
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function goBack() {
  uni.navigateBack();
}

function startNavigation() {
  uni.showToast({ title: "地图导航后续接入经纬度", icon: "none" });
}

function callTarget() {
  if (!delivery.value) return;
  const phone = target.value === "shop" ? delivery.value.order.shop.phone : delivery.value.order.addressSnapshot.phone;
  if (!phone) {
    uni.showToast({ title: "暂无电话", icon: "none" });
    return;
  }
  uni.makePhoneCall({ phoneNumber: phone });
}

onLoad((query) => {
  deliveryOrderId.value = String(query?.deliveryOrderId || "");
  target.value = query?.target === "user" ? "user" : "shop";
  void loadOrder();
});
</script>

<template>
  <view class="map-page">
    <view class="map-panel">
      <view class="back-btn" @tap="goBack">&lt;</view>
      <view class="notice">取送路线示意，非导航规划，请遵守交通规则</view>
      <view class="mock-map">
        <view class="road road-a"></view>
        <view class="road road-b"></view>
        <view class="road road-c"></view>
        <view class="route-line"></view>
        <view class="pin start">骑</view>
        <view class="pin target">{{ targetLabel }}</view>
        <view class="distance-tip">距送 405m</view>
      </view>
      <view class="map-tools left">
        <view>定</view>
        <view>{{ targetLabel }}</view>
        <view>标</view>
      </view>
      <view class="map-tools right">
        <view>!</view>
        <view>骑</view>
        <view>刷</view>
      </view>
    </view>

    <view class="sheet" v-if="delivery">
      <view class="sheet-head">
        <view>
          <text class="time-hot">剩 39分钟</text>
          <text>(预计前送达)</text>
        </view>
        <view class="order-no">{{ delivery.order.orderNo.slice(-6) }}</view>
      </view>

      <view class="route-row disabled">
        <view class="node muted">{{ target === "shop" ? "送" : "取" }}</view>
        <view>
          <view class="disabled-title">{{ disabledName }}</view>
          <view class="disabled-address">{{ disabledAddress }}</view>
        </view>
      </view>

      <view class="route-row active">
        <view class="node">{{ targetLabel }}</view>
        <view>
          <view class="target-name">{{ targetName }}</view>
          <view class="target-address">{{ targetAddress }}</view>
        </view>
      </view>

      <view v-if="target === 'user'" class="receiver">
        收货人：{{ delivery.order.addressSnapshot.name }} {{ delivery.order.addressSnapshot.phone }}
      </view>

      <view v-if="delivery.order.remark" class="remark">顾客备注：{{ delivery.order.remark }}</view>
      <view class="fee">配送费 {{ yuan(delivery.order.deliveryFee) }}</view>
    </view>
    <view v-else class="sheet empty">{{ loading ? "加载中..." : "暂无配送单" }}</view>

    <view class="bottom-actions">
      <view class="tool" @tap="callTarget">联系</view>
      <view class="tool">遇到问题</view>
      <view class="nav-action" @tap="startNavigation">{{ targetTitle }}</view>
    </view>
  </view>
</template>

<style scoped>
.map-page {
  min-height: 100vh;
  padding-bottom: 142rpx;
  background: #eef3f8;
}

.map-panel {
  position: relative;
  height: 720rpx;
  overflow: hidden;
  border-bottom-left-radius: 36rpx;
  border-bottom-right-radius: 36rpx;
  background: #dfeaf4;
}

.notice {
  position: absolute;
  top: 56rpx;
  left: 160rpx;
  right: 80rpx;
  z-index: 2;
  color: #667085;
  font-size: 26rpx;
  font-weight: 800;
}

.back-btn {
  position: absolute;
  top: 44rpx;
  left: 34rpx;
  z-index: 3;
  width: 82rpx;
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #101828;
  font-size: 76rpx;
  line-height: 1;
}

.mock-map {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent 0 23%, rgba(255, 255, 255, 0.92) 23% 25%, transparent 25% 100%),
    linear-gradient(0deg, transparent 0 30%, rgba(255, 255, 255, 0.92) 30% 32%, transparent 32% 100%),
    linear-gradient(120deg, transparent 0 48%, rgba(255, 255, 255, 0.92) 48% 50%, transparent 50% 100%),
    #dfeaf4;
}

.road {
  position: absolute;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.82);
}

.road-a {
  left: 42%;
  top: -8%;
  width: 28rpx;
  height: 108%;
  transform: rotate(8deg);
}

.road-b {
  left: 10%;
  right: 5%;
  top: 52%;
  height: 24rpx;
  transform: rotate(-12deg);
}

.road-c {
  left: 68%;
  top: 5%;
  width: 24rpx;
  height: 92%;
  transform: rotate(-4deg);
}

.route-line {
  position: absolute;
  left: 300rpx;
  top: 240rpx;
  width: 34rpx;
  height: 176rpx;
  border-radius: 999rpx;
  background: #19b756;
  transform: rotate(22deg);
  box-shadow: -34rpx 86rpx 0 #19b756;
}

.pin {
  position: absolute;
  width: 58rpx;
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 900;
}

.pin.start {
  left: 284rpx;
  top: 350rpx;
  background: #2d7ff9;
}

.pin.target {
  left: 245rpx;
  top: 300rpx;
  background: #1fb75d;
}

.distance-tip {
  position: absolute;
  left: 220rpx;
  top: 235rpx;
  padding: 14rpx 22rpx;
  border-radius: 10rpx;
  background: #fff;
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 900;
}

.map-tools {
  position: absolute;
  display: grid;
  gap: 18rpx;
}

.map-tools.left {
  left: 38rpx;
  top: 420rpx;
}

.map-tools.right {
  right: 34rpx;
  top: 360rpx;
}

.map-tools view {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.92);
  color: #1f2329;
  font-weight: 900;
}

.sheet {
  margin-top: -20rpx;
  padding: 34rpx 28rpx 28rpx;
  border-top-left-radius: 34rpx;
  border-top-right-radius: 34rpx;
  background: #fff;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 28rpx;
  font-size: 30rpx;
  font-weight: 900;
}

.time-hot {
  color: #f04438;
}

.order-no {
  font-size: 42rpx;
  font-weight: 900;
}

.route-row {
  display: grid;
  grid-template-columns: 54rpx 1fr;
  gap: 18rpx;
  margin-bottom: 24rpx;
}

.route-row.disabled {
  color: #98a2b3;
}

.node {
  width: 42rpx;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #12a150;
  color: #fff;
  font-weight: 900;
}

.node.muted {
  background: #d0d5dd;
}

.target-name {
  color: #101828;
  font-size: 40rpx;
  font-weight: 900;
  line-height: 1.3;
}

.target-address,
.disabled-address {
  margin-top: 8rpx;
  color: inherit;
  font-size: 26rpx;
}

.disabled-title {
  font-size: 30rpx;
  font-weight: 900;
}

.receiver,
.remark {
  margin-top: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 10rpx;
  background: #f6f7f9;
  color: #475467;
  font-size: 28rpx;
}

.remark {
  color: #e35d22;
}

.fee {
  margin-top: 18rpx;
  color: #667085;
}

.empty {
  color: #667085;
  text-align: center;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 100rpx 140rpx 1fr;
  gap: 14rpx;
  align-items: center;
  padding: 18rpx 24rpx 32rpx;
  border-top: 1rpx solid #e4e7ec;
  background: #fff;
}

.tool {
  height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1f2329;
  font-size: 24rpx;
  font-weight: 800;
}

.nav-action {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: #10a66b;
  color: #fff;
  font-size: 34rpx;
  font-weight: 900;
}
</style>
