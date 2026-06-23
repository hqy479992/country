<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { CartItem, Product, Shop } from "../../api/types";
import { yuan } from "../../utils/format";

const shop = ref<Shop | null>(null);
const cartItems = ref<CartItem[]>([]);
const loading = ref(false);
const activeTopTab = ref("ORDER");
const activeCategory = ref("recommend");
const shopId = ref("");

const menuTabs = [
  { key: "ORDER", label: "点餐" },
  { key: "REVIEWS", label: "评价(3826)" },
  { key: "SHOP", label: "商家" }
];

const categories = [
  { key: "recommend", label: "人气推荐", badge: 1 },
  { key: "soup", label: "麻辣烫·汤底" },
  { key: "vegetable", label: "荤菜小料" },
  { key: "soy", label: "蔬菜豆制品" },
  { key: "main", label: "主食配菜" },
  { key: "drink", label: "饮品酸奶", badge: 1 },
  { key: "combo", label: "双人套餐" },
  { key: "bonus", label: "红包专区" }
];

const products = computed(() => shop.value?.products ?? []);
const cartCount = computed(() => cartItems.value.reduce((sum, item) => sum + item.quantity, 0));
const cartAmount = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
);
const discountAmount = computed(() => (cartAmount.value > 0 ? Math.min(500, Math.floor(cartAmount.value * 0.12)) : 0));
const productQuantityMap = computed(() => {
  const map: Record<string, { itemId: string; quantity: number }> = {};
  for (const item of cartItems.value) {
    map[item.productId] = { itemId: item.id, quantity: item.quantity };
  }
  return map;
});

async function loadShop(nextShopId = shopId.value) {
  if (!nextShopId) return;
  loading.value = true;
  try {
    shop.value = await api.getShop(nextShopId);
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function loadCart() {
  try {
    cartItems.value = await api.getCart();
  } catch {
    cartItems.value = [];
  }
}

async function addCart(productId: string) {
  try {
    await api.addCartItem(productId, 1);
    await loadCart();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加入失败", icon: "none" });
  }
}

async function decreaseCart(product: Product) {
  const cart = productQuantityMap.value[product.id];
  if (!cart) return;
  try {
    if (cart.quantity <= 1) {
      await api.removeCartItem(cart.itemId);
    } else {
      await api.updateCartItem(cart.itemId, cart.quantity - 1);
    }
    await loadCart();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
  }
}

function quantityOf(productId: string) {
  return productQuantityMap.value[productId]?.quantity ?? 0;
}

function goCart() {
  uni.navigateTo({ url: "/pages/cart/cart" });
}

function goBack() {
  uni.navigateBack();
}

onLoad((query) => {
  shopId.value = String(query?.shopId || "");
  void loadShop(shopId.value);
});

onShow(() => {
  void loadCart();
  void loadShop();
});
</script>

<template>
  <view class="order-page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="shop" class="content">
      <view class="shop-hero">
        <view class="hero-actions">
          <view class="round-btn back" @tap="goBack"></view>
          <view class="right-actions">
            <view class="round-btn search"></view>
            <view class="round-btn share"></view>
            <view class="round-btn more">...</view>
          </view>
        </view>

        <view class="shop-main">
          <image v-if="shop.logoUrl" class="shop-logo-img" :src="shop.logoUrl" mode="aspectFill" />
          <view v-else class="shop-logo">{{ shop.name.slice(0, 1) }}</view>
          <view class="shop-info">
            <view class="shop-name">{{ shop.name }} <text class="arrow">›</text></view>
            <view class="shop-meta">
              <text class="star">★ 4.8</text>
              <text>月售 6000+</text>
              <text>28分钟</text>
              <text>380m</text>
            </view>
            <view class="announcement">公告：{{ shop.announcement || "本店所有菜品现点现做，建议趁热享用。" }}</view>
          </view>
          <view class="favorite">♡<text>收藏</text></view>
        </view>

        <view class="coupon-strip">
          <text>领券</text>
          <text>满38减5 · 满68减12 · 新客立减8</text>
          <text class="claim">领取</text>
        </view>
      </view>

      <view class="top-tabs">
        <view
          v-for="tab in menuTabs"
          :key="tab.key"
          class="top-tab"
          :class="{ active: activeTopTab === tab.key }"
          @tap="activeTopTab = tab.key"
        >
          {{ tab.label }}
        </view>
      </view>

      <view v-if="activeTopTab === 'ORDER'" class="order-layout">
        <scroll-view class="category-list" scroll-y>
          <view
            v-for="category in categories"
            :key="category.key"
            class="category-item"
            :class="{ active: activeCategory === category.key }"
            @tap="activeCategory = category.key"
          >
            <text>{{ category.label }}</text>
            <text v-if="category.badge" class="badge">{{ category.badge }}</text>
          </view>
        </scroll-view>

        <scroll-view class="product-list" scroll-y>
          <view class="rank-card">🔥 月度榜单 · 3件人气单品</view>
          <view v-for="product in products" :key="product.id" class="product-card">
            <image v-if="product.imageUrl" class="product-img" :src="product.imageUrl" mode="aspectFill" />
            <view v-else class="product-img placeholder-img">{{ product.name.slice(0, 1) }}</view>
            <view class="product-info">
              <view class="product-name">{{ product.name }}</view>
              <view class="product-desc">{{ product.description || "现做现卖 / 自选好味" }}</view>
              <view class="product-tags">
                <text>月售2300+</text>
                <text>回头客89%</text>
              </view>
              <view class="product-bottom">
                <view>
                  <text class="price">{{ yuan(product.price) }}</text>
                  <text class="origin-price">{{ yuan(product.price + 600) }}</text>
                </view>
                <view class="counter">
                  <view v-if="quantityOf(product.id) > 0" class="minus" @tap="decreaseCart(product)">-</view>
                  <view v-if="quantityOf(product.id) > 0" class="qty">{{ quantityOf(product.id) }}</view>
                  <view class="plus" @tap="addCart(product.id)">+</view>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-else-if="activeTopTab === 'REVIEWS'" class="panel">
        暂无评价模块，后续接入用户评价。
      </view>
      <view v-else class="panel">
        <view>{{ shop.address }}</view>
        <view>联系电话：{{ shop.phone }}</view>
        <view>营业时间：{{ shop.businessHours || "商家暂未设置" }}</view>
      </view>
    </view>

    <view class="cart-bar" @tap="goCart">
      <view class="cart-icon">
        <text>车</text>
        <view v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</view>
      </view>
      <view class="cart-summary">
        <view class="cart-price">{{ yuan(cartAmount) }}</view>
        <view class="cart-discount">另需配送费 {{ shop ? yuan(shop.deliveryFee) : "¥0.00" }} · 已减 {{ yuan(discountAmount) }}</view>
      </view>
      <view class="checkout-btn">去结算</view>
    </view>
  </view>
</template>

<style scoped>
.order-page {
  min-height: 100vh;
  padding-bottom: 132rpx;
  background: #f6f7f9;
  color: #1f2329;
}

.content {
  min-height: 100vh;
}

.shop-hero {
  padding: 32rpx 28rpx 0;
  background: linear-gradient(180deg, #fff4cf 0%, #fff8e8 70%, #fff 100%);
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.right-actions {
  display: flex;
  gap: 16rpx;
}

.round-btn {
  width: 58rpx;
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #1f2329;
  font-weight: 900;
}

.back::before {
  content: "";
  width: 18rpx;
  height: 18rpx;
  border-left: 5rpx solid #1f2329;
  border-bottom: 5rpx solid #1f2329;
  transform: rotate(45deg);
}

.search::before {
  content: "";
  width: 22rpx;
  height: 22rpx;
  border: 4rpx solid #1f2329;
  border-radius: 50%;
}

.share::before {
  content: "";
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #1f2329;
  box-shadow: -16rpx 13rpx 0 #1f2329, 16rpx 13rpx 0 #1f2329;
}

.shop-main {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: 26rpx;
}

.shop-logo,
.shop-logo-img,
.product-img {
  flex: 0 0 auto;
  border-radius: 16rpx;
}

.shop-logo,
.shop-logo-img {
  width: 110rpx;
  height: 110rpx;
}

.shop-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #ff7a00;
  font-size: 48rpx;
  font-weight: 900;
}

.shop-info {
  flex: 1;
  min-width: 0;
}

.shop-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 34rpx;
  font-weight: 900;
}

.arrow {
  color: #667085;
}

.shop-meta {
  display: flex;
  gap: 12rpx;
  margin-top: 8rpx;
  color: #667085;
  font-size: 23rpx;
}

.star {
  color: #f79009;
  font-weight: 900;
}

.announcement {
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #667085;
  font-size: 23rpx;
}

.favorite {
  display: grid;
  justify-items: center;
  color: #667085;
  font-size: 32rpx;
}

.favorite text {
  font-size: 20rpx;
}

.coupon-strip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 20rpx;
  padding: 12rpx 16rpx;
  border-radius: 16rpx 16rpx 0 0;
  background: #ffd8b0;
  color: #8a3b00;
  font-size: 24rpx;
  font-weight: 800;
}

.claim {
  margin-left: auto;
  color: #f04438;
}

.top-tabs {
  display: flex;
  height: 76rpx;
  align-items: center;
  gap: 46rpx;
  padding: 0 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.top-tab {
  position: relative;
  font-size: 28rpx;
  font-weight: 900;
  color: #475467;
}

.top-tab.active {
  color: #1f2329;
}

.top-tab.active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -20rpx;
  width: 46rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: #ffd21e;
  transform: translateX(-50%);
}

.order-layout {
  display: flex;
  height: calc(100vh - 394rpx);
  min-height: 620rpx;
  background: #fff;
}

.category-list {
  width: 170rpx;
  flex: 0 0 auto;
  background: #f7f7f7;
}

.category-item {
  position: relative;
  min-height: 92rpx;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
  color: #667085;
  font-size: 24rpx;
}

.category-item.active {
  background: #fff;
  color: #1f2329;
  font-weight: 900;
}

.category-item.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 18rpx;
  bottom: 18rpx;
  width: 6rpx;
  border-radius: 999rpx;
  background: #ffd21e;
}

.badge {
  min-width: 26rpx;
  height: 26rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4rpx;
  border-radius: 50%;
  background: #f04438;
  color: #fff;
  font-size: 18rpx;
}

.product-list {
  flex: 1;
  min-width: 0;
  padding: 18rpx 20rpx 30rpx;
}

.rank-card {
  padding: 12rpx 18rpx;
  border-radius: 10rpx;
  background: #fff9e6;
  color: #8a5a00;
  font-size: 24rpx;
  font-weight: 800;
}

.product-card {
  display: flex;
  gap: 18rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f1f1f1;
}

.product-img {
  width: 150rpx;
  height: 150rpx;
  background: #ffe1df;
}

.placeholder-img {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f79009;
  font-size: 48rpx;
  font-weight: 900;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1.3;
}

.product-desc {
  margin-top: 8rpx;
  color: #98a2b3;
  font-size: 23rpx;
}

.product-tags {
  display: flex;
  gap: 8rpx;
  margin-top: 10rpx;
}

.product-tags text {
  padding: 4rpx 8rpx;
  border-radius: 6rpx;
  background: #fff3e8;
  color: #f79009;
  font-size: 20rpx;
}

.product-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14rpx;
}

.price {
  color: #f04438;
  font-size: 31rpx;
  font-weight: 900;
}

.origin-price {
  margin-left: 10rpx;
  color: #b5b5b5;
  font-size: 22rpx;
  text-decoration: line-through;
}

.counter {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.plus,
.minus {
  width: 42rpx;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 30rpx;
  font-weight: 900;
}

.plus {
  background: #ffd21e;
  color: #1f2329;
}

.minus {
  border: 2rpx solid #d0d5dd;
  color: #667085;
}

.qty {
  font-weight: 900;
}

.panel {
  margin: 24rpx;
  padding: 28rpx;
  border-radius: 16rpx;
  background: #fff;
  color: #667085;
  line-height: 1.8;
}

.cart-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 116rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 0 28rpx;
  background: #1f2329;
  color: #fff;
}

.cart-icon {
  position: relative;
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -40rpx;
  border-radius: 50%;
  background: #ffd21e;
  color: #1f2329;
  font-weight: 900;
}

.cart-badge {
  position: absolute;
  top: -8rpx;
  right: -6rpx;
  min-width: 30rpx;
  height: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f04438;
  color: #fff;
  font-size: 20rpx;
}

.cart-summary {
  flex: 1;
  min-width: 0;
}

.cart-price {
  font-size: 34rpx;
  font-weight: 900;
}

.cart-discount {
  margin-top: 4rpx;
  color: #d0d5dd;
  font-size: 21rpx;
}

.checkout-btn {
  min-width: 130rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: #ffd21e;
  color: #1f2329;
  font-size: 28rpx;
  font-weight: 900;
}

.empty {
  padding: 100rpx 0;
  color: #667085;
  text-align: center;
}
</style>
