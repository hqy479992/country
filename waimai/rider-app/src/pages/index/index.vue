<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { DeliveryOrder } from "../../api/types";
import { statusText, yuan } from "../../utils/format";

type WorkTab = "NEW" | "PICKUP" | "DELIVER";

const availableOrders = ref<DeliveryOrder[]>([]);
const myOrders = ref<DeliveryOrder[]>([]);
const activeTab = ref<WorkTab>("NEW");
const loading = ref(false);
const actingOrderId = ref("");
const isOnline = ref(true);
const statusMenuOpen = ref(false);

const pickupOrders = computed(() => myOrders.value.filter((order) => order.status === "RIDER_ACCEPTED"));
const deliverOrders = computed(() => myOrders.value.filter((order) => order.status === "PICKED_UP"));
const orderCount = computed(() => availableOrders.value.length + pickupOrders.value.length + deliverOrders.value.length);

const tabs = computed(() => [
  { key: "NEW" as const, label: "待接单", count: availableOrders.value.length },
  { key: "PICKUP" as const, label: "待取货", count: pickupOrders.value.length },
  { key: "DELIVER" as const, label: "待送达", count: deliverOrders.value.length }
]);

const currentOrders = computed(() => {
  if (activeTab.value === "NEW") return availableOrders.value;
  if (activeTab.value === "PICKUP") return pickupOrders.value;
  return deliverOrders.value;
});

async function loadOrders() {
  loading.value = true;
  try {
    const [nextAvailable, nextMine] = await Promise.all([api.getAvailableOrders(), api.getMyOrders()]);
    availableOrders.value = nextAvailable;
    myOrders.value = nextMine;
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function runAction(order: DeliveryOrder, action: () => Promise<DeliveryOrder>, successTitle: string) {
  if (actingOrderId.value) return;
  actingOrderId.value = order.id;
  try {
    await action();
    uni.showToast({ title: successTitle, icon: "success" });
    if (activeTab.value === "NEW") activeTab.value = "PICKUP";
    else if (activeTab.value === "PICKUP") activeTab.value = "DELIVER";
    await loadOrders();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
  } finally {
    actingOrderId.value = "";
  }
}

function acceptOrder(order: DeliveryOrder) {
  void runAction(order, () => api.acceptOrder(order.id), "抢单成功");
}

function pickupOrder(order: DeliveryOrder) {
  void runAction(order, () => api.pickupOrder(order.id), "已确认取货");
}

function deliverOrder(order: DeliveryOrder) {
  void runAction(order, () => api.deliverOrder(order.id), "已送达");
}

function goDetail(deliveryOrderId: string) {
  uni.navigateTo({ url: `/pages/orders/detail?deliveryOrderId=${deliveryOrderId}` });
}

function currentTarget(order: DeliveryOrder) {
  if (order.status === "PICKED_UP") return "user";
  return "shop";
}

function isActiveTarget(order: DeliveryOrder, target: "shop" | "user") {
  if (order.status === "PENDING_ASSIGN") return true;
  return currentTarget(order) === target;
}

function goNavigation(order: DeliveryOrder, target: "shop" | "user") {
  if (!isActiveTarget(order, target)) {
    uni.showToast({
      title: target === "shop" ? "当前先送达用户" : "当前先去商家取货",
      icon: "none"
    });
    return;
  }
  uni.navigateTo({
    url: `/pages/navigation/map?deliveryOrderId=${order.id}&target=${target}`
  });
}

function goMyOrders() {
  uni.navigateTo({ url: "/pages/orders/index" });
}

function callPhone(phone?: string | null) {
  if (!phone) {
    uni.showToast({ title: "暂无电话", icon: "none" });
    return;
  }
  uni.makePhoneCall({ phoneNumber: phone });
}

function openMessage() {
  uni.showToast({ title: "聊天功能后续接入", icon: "none" });
}

function toggleStatusMenu() {
  statusMenuOpen.value = !statusMenuOpen.value;
}

function setOnlineStatus(nextOnline: boolean) {
  isOnline.value = nextOnline;
  statusMenuOpen.value = false;
  uni.showToast({ title: nextOnline ? "已上线" : "已离线", icon: "none" });
}

function etaText(order: DeliveryOrder) {
  const createdAt = new Date(order.createdAt).getTime();
  const minutes = Number.isNaN(createdAt)
    ? 39
    : Math.max(1, 45 - Math.floor((Date.now() - createdAt) / 60000));
  return `${minutes}分钟内`;
}

function deadlineText(order: DeliveryOrder) {
  const createdAt = new Date(order.createdAt).getTime();
  const deadline = new Date((Number.isNaN(createdAt) ? Date.now() : createdAt) + 45 * 60000);
  const hour = String(deadline.getHours()).padStart(2, "0");
  const minute = String(deadline.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}前送达`;
}

function maskedPhone(phone?: string | null) {
  if (!phone) return "";
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function actionText(order: DeliveryOrder) {
  if (order.status === "PENDING_ASSIGN") return "抢单";
  if (order.status === "RIDER_ACCEPTED") return "确认取货";
  if (order.status === "PICKED_UP") return "确认送达";
  return statusText(order.status);
}

function primaryAction(order: DeliveryOrder) {
  if (order.status === "PENDING_ASSIGN") acceptOrder(order);
  else if (order.status === "RIDER_ACCEPTED") pickupOrder(order);
  else if (order.status === "PICKED_UP") deliverOrder(order);
}

onShow(loadOrders);
</script>

<template>
  <view class="page rider-page">
    <view class="top-safe">
      <view class="top-row">
        <view class="profile-icon" @tap="goMyOrders">
          <view class="profile-head"></view>
          <view class="profile-body"></view>
        </view>
        <view class="status-wrap">
          <view class="status-pill" :class="{ offline: !isOnline }" @tap="toggleStatusMenu">
            <text class="status-dot"></text>
            <text>{{ isOnline ? "上线" : "离线" }}</text>
            <text class="dropdown-icon"></text>
          </view>
          <view v-if="statusMenuOpen" class="status-menu">
            <view class="status-option" :class="{ active: isOnline }" @tap="setOnlineStatus(true)">
              <text class="status-dot"></text>
              <text>上线</text>
            </view>
            <view class="status-option offline" :class="{ active: !isOnline }" @tap="setOnlineStatus(false)">
              <text class="status-dot"></text>
              <text>离线</text>
            </view>
          </view>
        </view>
      </view>

      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <text>{{ tab.label }}</text>
          <text v-if="tab.count > 0" class="tab-count">{{ tab.count }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="currentOrders.length === 0" class="empty">
      {{ activeTab === "NEW" ? "暂无待接单订单" : activeTab === "PICKUP" ? "暂无待取货订单" : "暂无待送达订单" }}
    </view>

    <view
      v-for="delivery in currentOrders"
      :key="delivery.id"
      class="task-card"
      @tap="goDetail(delivery.id)"
    >
      <view class="card-head">
        <view class="time-line">
          <text class="time-hot">{{ etaText(delivery) }}</text>
          <text>({{ deadlineText(delivery) }})</text>
        </view>
        <text class="fee">{{ yuan(delivery.order.deliveryFee) }}</text>
      </view>

      <view class="route">
        <view class="distance">
          <text>1.1</text>
          <text>km</text>
          <view class="route-dot"></view>
          <text>{{ activeTab === "NEW" ? "5" : "603" }}</text>
          <text>{{ activeTab === "NEW" ? "km" : "m" }}</text>
        </view>
        <view class="route-main">
          <view
            class="route-point"
            :class="{ active: isActiveTarget(delivery, 'shop'), muted: !isActiveTarget(delivery, 'shop') }"
            @tap.stop="goNavigation(delivery, 'shop')"
          >
            <view class="point-label">取</view>
            <view class="point-content">
              <view class="shop-name">{{ delivery.order.shop.name }}</view>
              <view class="shop-address">{{ delivery.order.shop.address }}</view>
            </view>
            <view v-if="isActiveTarget(delivery, 'shop')" class="nav-dot">导航</view>
          </view>
          <view
            class="route-point user-point"
            :class="{ active: isActiveTarget(delivery, 'user'), muted: !isActiveTarget(delivery, 'user') }"
            @tap.stop="goNavigation(delivery, 'user')"
          >
            <view class="point-label user">送</view>
            <view class="point-content">
              <view class="user-address">
                {{ delivery.order.addressSnapshot.region }} {{ delivery.order.addressSnapshot.detail }}
              </view>
            </view>
            <view v-if="isActiveTarget(delivery, 'user')" class="nav-dot">导航</view>
          </view>
        </view>
      </view>

      <view v-if="activeTab !== 'NEW'" class="receiver">
        收货人：{{ delivery.order.addressSnapshot.name }}
        <text v-if="delivery.order.addressSnapshot.phone" class="phone-tail">
          {{ maskedPhone(delivery.order.addressSnapshot.phone) }}
        </text>
      </view>

      <view class="tags">
        <text class="tag purple">零售</text>
        <text v-if="activeTab === 'NEW'" class="tag">商家已确认出餐</text>
        <text v-else-if="activeTab === 'PICKUP'" class="tag">预计出货</text>
        <text v-else class="tag">顾客备注：{{ delivery.order.remark || "无" }}</text>
      </view>

      <view class="goods">
        货品：
        <text v-for="item in delivery.order.items" :key="item.id">
          {{ item.productName }} x {{ item.quantity }}
        </text>
      </view>

      <view class="card-actions" @tap.stop>
        <view class="tool-btn" @tap="openMessage">
          <text class="tool-icon">聊</text>
          <text>聊天消息</text>
        </view>
        <view class="tool-btn" @tap="callPhone(activeTab === 'PICKUP' ? delivery.order.shop.phone : delivery.order.addressSnapshot.phone)">
          <text class="tool-icon">电</text>
          <text>联系</text>
        </view>
        <view
          class="main-action"
          :class="{ green: activeTab === 'DELIVER' }"
          @tap="primaryAction(delivery)"
        >
          {{ actingOrderId === delivery.id ? "处理中..." : actionText(delivery) }}
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="bottom-tool" @tap="goMyOrders">
        <text class="bottom-badge">{{ orderCount }}单</text>
        <text>跑单设置</text>
      </view>
      <view class="bottom-tool" @tap="goMyOrders">
        <text class="bottom-icon">单</text>
        <text>跑单中心</text>
      </view>
      <view class="refresh-order" @tap="loadOrders">
        {{ loading ? "刷新中..." : isOnline ? "刷新订单" : "开工" }}
      </view>
    </view>
  </view>
</template>

<style scoped>
.rider-page {
  min-height: 100vh;
  padding: 0 20rpx 160rpx;
  background: #f2f3f5;
}

.top-safe {
  margin: 0 -20rpx 18rpx;
  padding: 28rpx 32rpx 0;
  background: linear-gradient(180deg, #fff2e8 0%, #fff8f2 78%, #f2f3f5 100%);
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 18rpx;
  min-height: 92rpx;
}

.profile-icon {
  width: 70rpx;
  height: 70rpx;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 4rpx;
  border-radius: 50%;
  background: #fff;
}

.profile-head {
  width: 20rpx;
  height: 20rpx;
  border: 5rpx solid #101828;
  border-radius: 50%;
}

.profile-body {
  width: 34rpx;
  height: 18rpx;
  border: 5rpx solid #101828;
  border-top: 0;
  border-radius: 0 0 22rpx 22rpx;
}

.status-wrap {
  position: relative;
  z-index: 5;
}

.status-pill {
  height: 64rpx;
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 900;
}

.status-pill.offline {
  color: #667085;
}

.status-dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #21c45d;
}

.status-pill.offline .status-dot {
  background: #d0d5dd;
}

.dropdown-icon {
  width: 0;
  height: 0;
  margin-left: 2rpx;
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-top: 10rpx solid #101828;
}

.status-pill.offline .dropdown-icon {
  border-top-color: #667085;
}

.status-menu {
  position: absolute;
  left: 0;
  top: 78rpx;
  width: 190rpx;
  padding: 10rpx;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 16rpx 42rpx rgba(16, 24, 40, 0.16);
}

.status-option {
  height: 62rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 14rpx;
  border-radius: 14rpx;
  color: #1f2329;
  font-size: 28rpx;
  font-weight: 900;
}

.status-option.active {
  background: #f2f4f7;
}

.status-option.offline .status-dot {
  background: #d0d5dd;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 22rpx;
}

.tab {
  position: relative;
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  color: #667085;
  font-size: 32rpx;
  font-weight: 900;
}

.tab.active {
  color: #1f2329;
}

.tab.active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 72rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: #1f2329;
  transform: translateX(-50%);
}

.tab-count {
  color: #ff4d00;
}

.task-card {
  margin-bottom: 22rpx;
  padding: 28rpx 24rpx;
  border-radius: 24rpx;
  background: #fff;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 24rpx;
}

.time-line {
  font-size: 30rpx;
  font-weight: 900;
}

.time-hot {
  color: #ff4d00;
}

.fee {
  color: #f20d0d;
  font-size: 42rpx;
  font-weight: 900;
}

.route {
  display: flex;
  gap: 22rpx;
}

.distance {
  width: 70rpx;
  display: grid;
  justify-items: center;
  align-content: start;
  color: #667085;
  font-weight: 900;
  line-height: 1.05;
}

.distance text:nth-child(1),
.distance text:nth-child(4) {
  color: #1f2329;
  font-size: 30rpx;
}

.distance text:nth-child(2),
.distance text:nth-child(5) {
  font-size: 22rpx;
}

.route-dot {
  width: 2rpx;
  height: 60rpx;
  margin: 12rpx 0;
  background: #e4e7ec;
}

.route-main {
  flex: 1;
  min-width: 0;
}

.route-point {
  display: grid;
  grid-template-columns: 48rpx 1fr auto;
  gap: 14rpx;
  align-items: start;
  padding: 12rpx 0;
  color: #1f2329;
}

.route-point.muted {
  color: #98a2b3;
}

.route-point.active {
  border-radius: 14rpx;
}

.point-label {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #eef4ff;
  color: #165dff;
  font-size: 22rpx;
  font-weight: 900;
}

.point-label.user {
  background: #e8f7ef;
  color: #12a150;
}

.route-point.muted .point-label {
  background: #f2f4f7;
  color: #98a2b3;
}

.point-content {
  min-width: 0;
}

.shop-name,
.user-address {
  font-size: 40rpx;
  font-weight: 900;
  line-height: 1.28;
}

.shop-address {
  margin-top: 10rpx;
  color: inherit;
  font-size: 28rpx;
}

.route-point.muted .shop-name,
.route-point.muted .shop-address,
.route-point.muted .user-address {
  color: #98a2b3;
  font-weight: 700;
}

.user-point {
  margin-top: 8rpx;
}

.nav-dot {
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  background: #fff4e8;
  color: #ff5a00;
  font-size: 22rpx;
  font-weight: 900;
}

.receiver {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin: 24rpx 0 12rpx 92rpx;
  padding: 10rpx 16rpx;
  border: 2rpx solid #eef0f3;
  border-radius: 8rpx;
  color: #475467;
  font-size: 28rpx;
}

.phone-tail {
  color: #e35d22;
  font-weight: 900;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin: 18rpx 0 14rpx 92rpx;
}

.tag {
  padding: 8rpx 14rpx;
  border: 2rpx solid #e4e7ec;
  border-radius: 8rpx;
  color: #475467;
  font-size: 24rpx;
  font-weight: 800;
}

.tag.purple {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #fff;
}

.goods {
  margin-left: 92rpx;
  padding: 18rpx;
  border-radius: 10rpx;
  background: #f7f8fa;
  color: #475467;
  font-size: 26rpx;
}

.goods text {
  margin-right: 12rpx;
}

.card-actions {
  display: flex;
  gap: 16rpx;
  align-items: center;
  margin-top: 28rpx;
}

.tool-btn {
  width: 112rpx;
  flex: 0 0 auto;
  display: grid;
  justify-items: center;
  gap: 8rpx;
  color: #1f2329;
  font-size: 24rpx;
  font-weight: 700;
}

.tool-icon {
  font-size: 34rpx;
}

.main-action {
  flex: 1;
  min-width: 0;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: #ff5a00;
  color: #fff;
  font-size: 34rpx;
  font-weight: 900;
}

.main-action.green {
  background: #45a675;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 120rpx 120rpx 1fr;
  gap: 18rpx;
  align-items: center;
  padding: 18rpx 24rpx 30rpx;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #e4e7ec;
}

.bottom-tool {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 4rpx;
  color: #475467;
  font-size: 22rpx;
  font-weight: 800;
}

.bottom-badge {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #1f2329;
  box-shadow: 0 0 0 1rpx #e4e7ec;
  font-size: 24rpx;
}

.bottom-icon {
  font-size: 34rpx;
}

.refresh-order {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  border: 2rpx solid #e4e7ec;
  color: #1f2329;
  font-size: 32rpx;
  font-weight: 900;
}

.empty {
  padding: 120rpx 0;
  color: #667085;
  text-align: center;
}
</style>
