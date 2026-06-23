<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { ProductCategory, Shop, UserAddress } from "../../api/types";
import { yuan } from "../../utils/format";

const shops = ref<Shop[]>([]);
const addresses = ref<UserAddress[]>([]);
const loading = ref(false);
const activeService = ref<"TAKEOUT" | "ERRAND">("TAKEOUT");
const activeCategory = ref<ProductCategory | null>(null);
const errandService = ref<"DELIVERY" | "BUY" | "HELP">("DELIVERY");
const errandMode = ref<"SEND" | "PICK" | "EXPRESS">("SEND");
const errandVehicle = ref<"BIKE" | "CAR">("BIKE");
const pickupName = ref("黄小小");
const pickupPhone = ref("15682016244");
const pickupRegion = ref("正成南郡");
const pickupDetail = ref("2栋2栋501");
const deliveryName = ref("收货人");
const deliveryPhone = ref("15682016244");
const deliveryRegion = ref("");
const deliveryDetail = ref("");
const itemNote = ref("");
const errandSubmitting = ref(false);

const categories: Array<{ key: ProductCategory; label: string }> = [
  { key: "FOOD", label: "美食" },
  { key: "DRINK", label: "甜品饮品" },
  { key: "FRUIT_VEGETABLE", label: "蔬菜水果" },
  { key: "CONVENIENCE", label: "超市便利" }
];
const errandServices = [
  { key: "DELIVERY" as const, label: "帮取送" },
  { key: "BUY" as const, label: "帮我买" },
  { key: "HELP" as const, label: "帮个忙" }
];
const errandModes = [
  { key: "SEND" as const, label: "帮送" },
  { key: "PICK" as const, label: "帮取" },
  { key: "EXPRESS" as const, label: "1对1急送" }
];
const errandShortcuts = ["帮我办事", "取送鲜花", "取送蛋糕", "取送礼盒", "更多服务"];
const currentAddress = computed(() => addresses.value.find((item) => item.isDefault) || addresses.value[0]);
const addressText = computed(() => {
  const address = currentAddress.value;
  if (!address) return "请选择收货地址";
  return `${address.region}${address.detail ? ` ${address.detail}` : ""}`;
});
const activeCategoryLabel = computed(() => categories.find((item) => item.key === activeCategory.value)?.label || "");
const pickupIsCurrent = computed(() => errandMode.value !== "PICK");
const deliveryIsCurrent = computed(() => errandMode.value === "PICK");

async function loadHome() {
  loading.value = true;
  try {
    const [nextShops, nextAddresses] = await Promise.all([
      api.getShops(activeCategory.value ? { category: activeCategory.value } : undefined),
      api.getAddresses()
    ]);
    shops.value = nextShops;
    addresses.value = nextAddresses;
    const defaultAddress = nextAddresses.find((item) => item.isDefault) || nextAddresses[0];
    if (defaultAddress) {
      applyCurrentAddressForMode(errandMode.value, defaultAddress);
    }
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function goShop(shopId: string) {
  uni.navigateTo({ url: `/pages/shop/detail?shopId=${shopId}` });
}

function goOrders() {
  uni.navigateTo({ url: "/pages/orders/index" });
}

function goAddress() {
  uni.navigateTo({ url: "/pages/address/index" });
}

function locateAddress() {
  uni.getLocation({
    type: "gcj02",
    success: () => {
      uni.showToast({ title: "定位成功", icon: "success" });
    },
    fail: () => {
      uni.showToast({ title: "定位失败，请选择地址", icon: "none" });
      goAddress();
    }
  });
}

function searchShop() {
  uni.navigateTo({ url: "/pages/search/index" });
}

function chooseCategory(category: ProductCategory) {
  activeCategory.value = category;
  void loadHome();
}

function goMine() {
  uni.navigateTo({ url: "/pages/mine/index" });
}

function applyAddressToPickup(address: UserAddress) {
  pickupName.value = address.name;
  pickupPhone.value = address.phone;
  pickupRegion.value = address.region;
  pickupDetail.value = address.detail;
}

function applyAddressToDelivery(address: UserAddress) {
  deliveryName.value = address.name;
  deliveryPhone.value = address.phone;
  deliveryRegion.value = address.region;
  deliveryDetail.value = address.detail;
}

function applyCurrentAddressForMode(mode: "SEND" | "PICK" | "EXPRESS", address = currentAddress.value) {
  if (!address) return;
  if (mode === "PICK") {
    applyAddressToDelivery(address);
    pickupName.value = "取件人";
    pickupPhone.value = address.phone;
    pickupRegion.value = "";
    pickupDetail.value = "";
    return;
  }
  applyAddressToPickup(address);
  deliveryName.value = "收货人";
  deliveryPhone.value = address.phone;
  deliveryRegion.value = "";
  deliveryDetail.value = "";
}

function setErrandMode(mode: "SEND" | "PICK" | "EXPRESS") {
  errandMode.value = mode;
  applyCurrentAddressForMode(mode);
}

async function submitErrandOrder() {
  if (!pickupDetail.value.trim()) {
    uni.showToast({ title: "请填写取件地址", icon: "none" });
    return;
  }
  if (!deliveryDetail.value.trim()) {
    uni.showToast({ title: "请填写收货地址", icon: "none" });
    return;
  }
  errandSubmitting.value = true;
  try {
    const order = await api.createErrandOrder({
      serviceType: errandService.value,
      deliveryMode: errandMode.value,
      vehicleType: errandVehicle.value,
      pickupAddress: {
        name: pickupName.value,
        phone: pickupPhone.value,
        region: pickupRegion.value || "同城",
        detail: pickupDetail.value
      },
      deliveryAddress: {
        name: deliveryName.value || "收货人",
        phone: deliveryPhone.value,
        region: deliveryRegion.value || "同城",
        detail: deliveryDetail.value
      },
      itemNote: itemNote.value,
      remark: "用户从跑腿首页下单"
    });
    uni.showToast({ title: `已下单 ${order.orderNo}`, icon: "success" });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "下单失败", icon: "none" });
  } finally {
    errandSubmitting.value = false;
  }
}

onShow(loadHome);
</script>

<template>
  <view class="home-page">
    <view class="top-panel">
      <view class="service-tabs">
        <view
          class="service-tab"
          :class="{ active: activeService === 'TAKEOUT' }"
          @tap="activeService = 'TAKEOUT'"
        >
          外卖
        </view>
        <view
          class="service-tab"
          :class="{ active: activeService === 'ERRAND' }"
          @tap="activeService = 'ERRAND'"
        >
          跑腿
        </view>
      </view>

      <view class="address-bar" @tap="locateAddress">
        <view class="pin-icon"></view>
        <view class="address-label">我的地址</view>
        <view class="address-text">{{ addressText }}</view>
        <view class="address-arrow"></view>
      </view>

      <view v-if="activeService === 'TAKEOUT'" class="search-box" @tap="searchShop">
        <view class="search-icon"></view>
        <view class="search-placeholder">家常炒菜</view>
        <view class="search-submit">搜索</view>
      </view>

      <scroll-view v-if="activeService === 'TAKEOUT'" class="category-scroll" scroll-x>
        <view class="category-row">
          <view
            v-for="category in categories"
            :key="category.key"
            class="category"
            :class="{ active: activeCategory === category.key }"
            @tap="chooseCategory(category.key)"
          >
            <view class="category-img">{{ category.label.slice(0, 1) }}</view>
            <view class="category-name">{{ category.label }}</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="activeService === 'TAKEOUT'">
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="shops.length === 0" class="empty">
        {{ activeCategoryLabel ? `${activeCategoryLabel}暂无营业商家` : "暂无营业商家" }}
      </view>

      <view v-for="shop in shops" :key="shop.id" class="shop-list-card" @tap="goShop(shop.id)">
        <image v-if="shop.coverUrl || shop.logoUrl" class="shop-cover" :src="shop.coverUrl || shop.logoUrl || ''" mode="aspectFill" />
        <view v-else class="shop-cover placeholder-cover">
          <text>{{ shop.name.slice(0, 1) }}</text>
          <view class="new-tag">附近上新</view>
        </view>
        <view class="shop-info">
          <view class="shop-title-row">
            <view class="shop-title">{{ shop.name }}</view>
            <view class="more-dot">⋮</view>
          </view>
          <view class="sale-line">
            <text>月售300+</text>
            <text class="green">堂食店</text>
            <text>{{ shop.businessHours || "本地好店" }}</text>
          </view>
          <view class="delivery-line">
            <text>起送 {{ yuan(shop.minOrderAmount) }}</text>
            <text>配送 约{{ yuan(shop.deliveryFee) }}</text>
            <text class="distance">4.3km</text>
            <text>45分钟</text>
          </view>
          <view class="comment-line">
            <text class="score">4.6分</text>
            <text>用户刚刚看过 {{ shop.name }}</text>
          </view>
          <view class="coupon-line">
            <text>满38减13</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="errand-page">
      <view class="errand-hero">
        <view class="errand-service-tabs">
          <view
            v-for="service in errandServices"
            :key="service.key"
            class="errand-service"
            :class="{ active: errandService === service.key }"
            @tap="errandService = service.key"
          >
            {{ service.label }}
          </view>
        </view>
      </view>

      <view class="errand-order-card">
        <view class="errand-tip">
          <text>距离远 / 物品重，用汽车送</text>
          <view class="tip-btn" @tap="submitErrandOrder">去下单</view>
        </view>

        <view class="order-card-body">
          <view class="form-head">
            <view class="form-tabs">
              <view
                v-for="mode in errandModes"
                :key="mode.key"
                class="form-tab"
                :class="{ active: errandMode === mode.key }"
                @tap="setErrandMode(mode.key)"
              >
                {{ mode.label }}
              </view>
            </view>
            <view class="vehicle-tabs">
              <view class="vehicle" :class="{ active: errandVehicle === 'BIKE' }" @tap="errandVehicle = 'BIKE'">两轮车</view>
              <view class="vehicle" :class="{ active: errandVehicle === 'CAR' }" @tap="errandVehicle = 'CAR'">汽车</view>
            </view>
          </view>

          <view class="nearby">附近有500位骑手，预计<text>1分钟</text>内接单</view>

          <view class="address-form">
            <view class="node-col">
              <view class="node black">取</view>
              <view class="node-line"></view>
              <view class="swap">换</view>
              <view class="node green">收</view>
            </view>
            <view class="address-fields">
              <view class="pickup-row" :class="{ editable: !pickupIsCurrent }">
                <view class="address-main">
                  <view v-if="pickupIsCurrent">
                    <view class="pickup-address">{{ pickupRegion }}-{{ pickupDetail }}</view>
                    <view class="pickup-contact">{{ pickupName }} {{ pickupPhone }}</view>
                  </view>
                  <view v-else class="editable-address">
                    <input v-model="pickupDetail" class="address-input" placeholder="从哪里取？" />
                    <input v-model="pickupPhone" class="contact-input" placeholder="取件人电话" />
                  </view>
                </view>
                <view class="address-book" @tap="goAddress">地址簿</view>
              </view>
              <view class="delivery-row" :class="{ readonly: deliveryIsCurrent }">
                <view v-if="deliveryIsCurrent" class="address-main">
                  <view class="pickup-address">{{ deliveryRegion }}-{{ deliveryDetail }}</view>
                  <view class="pickup-contact">{{ deliveryName }} {{ deliveryPhone }}</view>
                </view>
                <input v-else v-model="deliveryDetail" class="delivery-input" placeholder="送到哪里？" />
                <view class="address-book" @tap="goAddress">地址簿</view>
              </view>
            </view>
          </view>

          <input v-model="itemNote" class="item-input" placeholder="物品信息，可不填" />

          <view class="errand-submit">
            <view class="fee"><text>¥</text>{{ errandVehicle === "CAR" ? "18" : "10" }}<text>起</text></view>
            <view class="submit-btn" @tap="submitErrandOrder">{{ errandSubmitting ? "下单中..." : "去下单" }}</view>
          </view>

          <view class="warn">请勿运送黄金及现金</view>
        </view>
      </view>

      <view class="shortcut-panel">
        <view v-for="item in errandShortcuts" :key="item" class="shortcut-item">
          <view class="shortcut-icon">{{ item.slice(0, 1) }}</view>
          <view>{{ item }}</view>
        </view>
      </view>
    </view>

    <view class="bottom-nav" v-if="activeService === 'TAKEOUT'">
      <view class="nav-item active" @tap="activeService = 'TAKEOUT'">
        <view class="nav-icon yellow">外卖</view>
        <view>外卖</view>
      </view>
      <view class="nav-item" @tap="goOrders">
        <view class="nav-icon line">单</view>
        <view>订单</view>
      </view>
      <view class="nav-item" @tap="goMine">
        <view class="nav-icon line">我</view>
        <view>我的</view>
      </view>
    </view>

    <view class="bottom-nav errand-bottom" v-else>
      <view class="nav-item active" @tap="activeService = 'ERRAND'">
        <view class="nav-icon yellow">跑</view>
        <view>跑腿</view>
      </view>
      <view class="nav-item" @tap="goOrders">
        <view class="nav-icon line">单</view>
        <view>订单</view>
      </view>
      <view class="nav-item" @tap="goMine">
        <view class="nav-icon line">我</view>
        <view>我的</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: 0 28rpx 150rpx;
  background: #fff;
  color: #2f3437;
}

.top-panel {
  margin: 0 -28rpx;
  padding: 28rpx 28rpx 0;
  background: linear-gradient(180deg, #c9ff68 0%, #bdff73 62%, #fff 100%);
}

.address-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-height: 58rpx;
  color: #101828;
}

.pin-icon {
  width: 28rpx;
  height: 28rpx;
  border: 5rpx solid #101828;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}

.address-label {
  color: #101828;
  font-size: 23rpx;
  font-weight: 800;
}

.address-text {
  max-width: 360rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #101828;
  font-size: 34rpx;
  font-weight: 900;
}

.address-arrow {
  width: 14rpx;
  height: 14rpx;
  border-right: 4rpx solid #101828;
  border-bottom: 4rpx solid #101828;
  transform: rotate(-45deg);
}

.search-box {
  height: 80rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: 18rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: #fff;
}

.search-icon {
  width: 30rpx;
  height: 30rpx;
  border: 5rpx solid #7d7d7d;
  border-radius: 50%;
  position: relative;
}

.search-icon::after {
  content: "";
  position: absolute;
  right: -13rpx;
  bottom: -10rpx;
  width: 18rpx;
  height: 5rpx;
  border-radius: 999rpx;
  background: #7d7d7d;
  transform: rotate(45deg);
}

.search-placeholder {
  flex: 1;
  min-width: 0;
  height: 80rpx;
  display: flex;
  align-items: center;
  color: #667085;
  font-size: 30rpx;
}

.search-submit {
  min-width: 92rpx;
  color: #101828;
  font-size: 32rpx;
  font-weight: 900;
  text-align: center;
}

.category-scroll {
  margin-top: 22rpx;
  white-space: nowrap;
  padding: 26rpx 0 22rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #fff;
}

.category-row {
  display: inline-flex;
  gap: 26rpx;
  padding: 0 24rpx;
}

.category {
  width: 122rpx;
  flex: 0 0 auto;
  text-align: center;
}

.category.active .category-img {
  box-shadow: 0 0 0 6rpx rgba(255, 210, 30, 0.36);
}

.category.active .category-name {
  color: #101828;
}

.category-img {
  width: 104rpx;
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffec64, #ff7a59);
  color: #fff;
  font-size: 38rpx;
  font-weight: 900;
}

.category-name {
  margin-top: 14rpx;
  color: #333;
  font-size: 27rpx;
  font-weight: 900;
}

.service-tabs {
  display: flex;
  gap: 40rpx;
  margin-bottom: 18rpx;
  padding-bottom: 10rpx;
}

.service-tab {
  position: relative;
  color: #667085;
  font-size: 34rpx;
  font-weight: 900;
}

.service-tab.active {
  color: #1f2329;
}

.service-tab.active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -10rpx;
  width: 44rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #ffd21e;
  transform: translateX(-50%);
}

.shop-list-card {
  display: flex;
  gap: 18rpx;
  padding: 18rpx 8rpx 22rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.shop-cover {
  position: relative;
  width: 176rpx;
  height: 176rpx;
  flex: 0 0 auto;
  border-radius: 12rpx;
  background: #e4e7ec;
}

.placeholder-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, #ce1f1f, #ffcf66);
  color: #fff;
  font-size: 56rpx;
  font-weight: 900;
}

.new-tag {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  padding: 4rpx 8rpx;
  border-radius: 6rpx;
  background: #12b76a;
  color: #fff;
  font-size: 20rpx;
  font-weight: 900;
}

.shop-info {
  flex: 1;
  min-width: 0;
}

.shop-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.shop-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2329;
  font-size: 34rpx;
  font-weight: 900;
}

.more-dot {
  color: #b5b5b5;
  font-size: 30rpx;
}

.sale-line,
.delivery-line,
.comment-line {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 8rpx;
  color: #667085;
  font-size: 25rpx;
}

.sale-line .green {
  color: #12a150;
  font-weight: 900;
}

.delivery-line .distance {
  margin-left: auto;
}

.comment-line {
  color: #9a6a38;
}

.score {
  color: #f79009;
  font-size: 30rpx;
  font-weight: 900;
}

.coupon-line {
  display: inline-flex;
  gap: 8rpx;
  margin-top: 10rpx;
  padding: 4rpx 10rpx;
  border: 1rpx solid #ffd7d7;
  border-radius: 8rpx;
  color: #f04438;
  font-size: 23rpx;
  font-weight: 800;
}

.errand-page {
  margin: 18rpx -28rpx 0;
  background: #80f7a5;
}

.errand-hero {
  padding: 32rpx 28rpx 180rpx;
  background: linear-gradient(135deg, #a8ffc2, #76f69d);
}

.errand-service-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx;
  margin-top: 0;
}

.errand-service {
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.35);
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 900;
}

.errand-service.active {
  background: #fff;
}

.errand-order-card {
  margin: -150rpx 28rpx 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #fff;
}

.errand-tip {
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background: #ff2e8a;
  color: #fff;
  font-size: 28rpx;
  font-weight: 900;
}

.tip-btn {
  height: 54rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #ff2e8a;
}

.order-card-body {
  padding: 26rpx;
}

.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.form-tabs {
  display: flex;
  gap: 24rpx;
  color: #101828;
  font-size: 30rpx;
  font-weight: 900;
}

.form-tab {
  white-space: nowrap;
}

.form-tab.active {
  position: relative;
}

.form-tab.active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -14rpx;
  width: 44rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #7df79f;
  transform: translateX(-50%);
}

.vehicle-tabs {
  display: flex;
  padding: 6rpx;
  border-radius: 999rpx;
  background: #f5f5f5;
}

.vehicle {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  color: #667085;
  font-size: 24rpx;
  font-weight: 900;
}

.vehicle.active {
  background: #fff;
  color: #101828;
  box-shadow: 0 4rpx 14rpx rgba(16, 24, 40, 0.08);
}

.nearby {
  margin-top: 34rpx;
  padding: 18rpx;
  border-radius: 10rpx;
  background: #f7f8fa;
  color: #667085;
  font-size: 26rpx;
}

.nearby text {
  color: #ff7a00;
}

.address-form {
  display: flex;
  gap: 18rpx;
  margin-top: 28rpx;
}

.node-col {
  width: 48rpx;
  display: grid;
  justify-items: center;
  align-content: start;
}

.node {
  width: 42rpx;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-size: 23rpx;
  font-weight: 900;
}

.node.black {
  background: #101828;
}

.node.green {
  background: #71f69b;
  color: #101828;
}

.node-line {
  width: 2rpx;
  height: 54rpx;
  border-left: 2rpx dashed #d0d5dd;
  margin: 8rpx 0;
}

.swap {
  margin-bottom: 10rpx;
  color: #667085;
  font-size: 22rpx;
}

.address-fields {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 20rpx;
}

.pickup-row,
.delivery-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.pickup-row.editable {
  min-height: 92rpx;
  padding: 0 18rpx;
  border: 3rpx solid #101828;
  border-radius: 999rpx;
}

.address-main {
  flex: 1;
  min-width: 0;
}

.pickup-address {
  color: #101828;
  font-size: 30rpx;
  font-weight: 900;
}

.pickup-contact {
  margin-top: 6rpx;
  color: #667085;
  font-size: 26rpx;
}

.address-book {
  flex: 0 0 auto;
  padding: 10rpx 18rpx;
  border: 1rpx solid #d0d5dd;
  border-radius: 999rpx;
  color: #667085;
  font-size: 24rpx;
}

.delivery-row {
  min-height: 92rpx;
  padding: 0 18rpx;
  border: 3rpx solid #101828;
  border-radius: 999rpx;
}

.delivery-row.readonly {
  border-color: transparent;
  padding: 0;
}

.editable-address {
  flex: 1;
  min-width: 0;
}

.address-input,
.contact-input,
.delivery-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 46rpx;
  color: #101828;
  font-size: 30rpx;
  font-weight: 900;
}

.contact-input {
  margin-top: 4rpx;
  color: #667085;
  font-size: 24rpx;
  font-weight: 500;
}

.delivery-input {
  height: 84rpx;
  font-size: 34rpx;
}

.item-input {
  height: 72rpx;
  margin-top: 22rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
  background: #f6f7f9;
  color: #101828;
  font-size: 27rpx;
}

.errand-submit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28rpx;
  border-radius: 999rpx;
  background: #e4ffe9;
  overflow: hidden;
}

.fee {
  padding-left: 34rpx;
  color: #101828;
  font-size: 50rpx;
  font-weight: 900;
}

.fee text {
  font-size: 24rpx;
}

.submit-btn {
  width: 250rpx;
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #75f69b;
  color: #101828;
  font-size: 34rpx;
  font-weight: 900;
}

.warn {
  margin-top: 22rpx;
  color: #98a2b3;
  font-size: 24rpx;
  text-align: center;
}

.shortcut-panel {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  margin: 0 28rpx 24rpx;
  padding: 28rpx 12rpx;
  border-radius: 24rpx;
  background: #fff;
}

.shortcut-item {
  display: grid;
  justify-items: center;
  gap: 10rpx;
  color: #101828;
  font-size: 22rpx;
  font-weight: 800;
}

.shortcut-icon {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e8f7ef;
  font-weight: 900;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  padding: 14rpx 18rpx 28rpx;
  border-top: 1rpx solid #eef0f3;
  background: rgba(255, 255, 255, 0.96);
}

.bottom-nav.errand-bottom {
  grid-template-columns: repeat(3, 1fr);
}

.nav-item {
  display: grid;
  justify-items: center;
  gap: 6rpx;
  color: #667085;
  font-size: 22rpx;
  font-weight: 800;
}

.nav-item.active {
  color: #101828;
}

.nav-icon {
  min-width: 54rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 20rpx;
  font-weight: 900;
}

.nav-icon.yellow {
  background: #ffdf24;
  color: #101828;
}

.nav-icon.line {
  border: 3rpx solid #667085;
  color: #475467;
}

.empty {
  padding: 80rpx 0;
  color: #999;
  text-align: center;
}
</style>
