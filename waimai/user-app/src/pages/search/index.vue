<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { ProductCategory, Shop, ShopSortMode } from "../../api/types";
import { yuan } from "../../utils/format";

const shops = ref<Shop[]>([]);
const keyword = ref("");
const loading = ref(false);
const activeTab = ref("全部");
const activeCategory = ref<ProductCategory | null>(null);
const sortMode = ref<ShopSortMode>("COMPREHENSIVE");
const sortMenuOpen = ref(false);
const tabs = ["全部", "外卖", "团购", "笔记"];
const categoryKeys: ProductCategory[] = ["FOOD", "DRINK", "FRUIT_VEGETABLE", "CONVENIENCE"];
const primarySortOptions = [
  { key: "DISTANCE" as const, label: "距离优先" },
  { key: "MIN_ORDER" as const, label: "起送价优先" },
  { key: "DELIVERY_FEE" as const, label: "配送费优先" }
];
const primarySortLabel = computed(
  () => primarySortOptions.find((option) => option.key === sortMode.value)?.label || "综合排序"
);

async function loadShops() {
  loading.value = true;
  try {
    shops.value = await api.getShops({
      category: activeCategory.value || undefined,
      keyword: keyword.value.trim() || undefined,
      sortBy: sortMode.value
    });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function goBack() {
  uni.navigateBack();
}

function goShop(shopId: string) {
  uni.navigateTo({ url: `/pages/shop/detail?shopId=${shopId}` });
}

function doSearch() {
  void loadShops();
}

function clearKeyword() {
  keyword.value = "";
  void loadShops();
}

function toggleSortMenu() {
  sortMenuOpen.value = !sortMenuOpen.value;
}

function selectSort(nextSortMode: ShopSortMode) {
  sortMode.value = nextSortMode;
  sortMenuOpen.value = false;
  void loadShops();
}

onLoad((query) => {
  keyword.value = String(query?.keyword || "");
  const category = String(query?.category || "");
  activeCategory.value = categoryKeys.includes(category as ProductCategory) ? (category as ProductCategory) : null;
});

onShow(loadShops);
</script>

<template>
  <view class="search-page">
    <view class="search-top">
      <view class="back" @tap="goBack"></view>
      <view class="search-input-wrap">
        <input
          v-model="keyword"
          class="search-input"
          focus
          confirm-type="search"
          placeholder="搜索商家名称"
          @confirm="doSearch"
        />
        <view v-if="keyword" class="clear" @tap="clearKeyword">x</view>
      </view>
      <view class="map-entry">
        <view class="map-pin"></view>
        <text>地图</text>
      </view>
    </view>

    <scroll-view class="tabs-scroll" scroll-x>
      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab"
          class="tab"
          :class="{ active: activeTab === tab }"
          @tap="activeTab = tab"
        >
          {{ tab }}
        </view>
      </view>
    </scroll-view>

    <view class="filters-wrap">
      <view class="filters">
        <view
          class="sort-cell"
          :class="{ active: sortMenuOpen || ['DISTANCE', 'MIN_ORDER', 'DELIVERY_FEE'].includes(sortMode) }"
          @tap.stop="toggleSortMenu"
        >
          <text>{{ primarySortLabel }}</text>
          <text class="sort-arrow" :class="{ open: sortMenuOpen }"></text>
        </view>
        <view class="sort-cell" :class="{ active: sortMode === 'SPEED' }" @tap="selectSort('SPEED')">速度优先</view>
        <view class="sort-cell" :class="{ active: sortMode === 'SALES' }" @tap="selectSort('SALES')">销量优先</view>
      </view>
      <view v-if="sortMenuOpen" class="sort-dropdown">
        <view
          v-for="option in primarySortOptions"
          :key="option.key"
          class="sort-option"
          :class="{ active: sortMode === option.key }"
          @tap="selectSort(option.key)"
        >
          {{ option.label }}
        </view>
      </view>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="shops.length === 0" class="empty">暂无匹配商家</view>

    <view v-for="shop in shops" :key="shop.id" class="result-card" @tap="goShop(shop.id)">
      <image v-if="shop.logoUrl || shop.coverUrl" class="shop-cover" :src="shop.logoUrl || shop.coverUrl || ''" mode="aspectFill" />
      <view v-else class="shop-cover placeholder">
        <text>{{ shop.name.slice(0, 1) }}</text>
      </view>
      <view class="shop-info">
        <view class="shop-title-row">
          <view class="shop-title">{{ shop.name }}</view>
          <view class="tag-takeout">外卖</view>
        </view>
        <view class="meta-row">
          <text class="star">★ 4.7</text>
          <text>月售 {{ shop._count?.orders ?? 0 }}+</text>
          <text class="time">41分钟</text>
        </view>
        <view class="fee-row">起送{{ yuan(shop.minOrderAmount) }} 配送约{{ yuan(shop.deliveryFee) }}</view>
        <view class="address-row">{{ shop.address }}</view>
        <view class="promo-row">
          <text>44减1</text>
          <text>66减2</text>
          <text>新客减3</text>
        </view>
        <scroll-view class="product-scroll" scroll-x>
          <view class="product-row">
            <view v-for="product in (shop.products || []).slice(0, 4)" :key="product.id" class="product-card">
              <view class="product-img">{{ product.name.slice(0, 1) }}</view>
              <view class="product-name">{{ product.name }}</view>
              <view class="product-price">{{ yuan(product.price) }}</view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.search-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 40rpx;
  background: #fff;
  color: #1f2329;
}

.search-top {
  display: grid;
  grid-template-columns: 42rpx 1fr 72rpx;
  gap: 18rpx;
  align-items: center;
}

.back {
  width: 28rpx;
  height: 28rpx;
  border-left: 7rpx solid #101828;
  border-bottom: 7rpx solid #101828;
  transform: rotate(45deg);
}

.search-input-wrap {
  height: 76rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-radius: 24rpx;
  background: #f2f2f2;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 76rpx;
  color: #1f2329;
  font-size: 30rpx;
}

.clear {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #d0d5dd;
  color: #fff;
}

.map-entry {
  display: grid;
  justify-items: center;
  color: #101828;
  font-size: 24rpx;
  font-weight: 800;
}

.map-pin {
  width: 34rpx;
  height: 34rpx;
  border: 5rpx solid #101828;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}

.tabs-scroll {
  margin: 28rpx -24rpx 0;
  padding-left: 24rpx;
  white-space: nowrap;
  border-bottom: 1rpx solid #f0f0f0;
}

.tabs {
  display: inline-flex;
  gap: 54rpx;
  padding: 0 24rpx 18rpx 24rpx;
}

.tab {
  position: relative;
  font-size: 32rpx;
  font-weight: 900;
  color: #1f2329;
}

.tab.active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -12rpx;
  width: 46rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #ffe100;
  transform: translateX(-50%);
}

.filters-wrap {
  position: relative;
  margin: 22rpx 0 28rpx;
  z-index: 2;
}

.filters {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  border-radius: 14rpx;
  background: #f8f9fb;
  overflow: hidden;
}

.sort-cell {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #475467;
  font-size: 27rpx;
  font-weight: 800;
}

.sort-cell.active {
  color: #101828;
  background: #fff6d6;
}

.sort-arrow {
  width: 12rpx;
  height: 12rpx;
  border-right: 4rpx solid currentColor;
  border-bottom: 4rpx solid currentColor;
  transform: translateY(-3rpx) rotate(45deg);
  transition: transform 0.18s ease;
}

.sort-arrow.open {
  transform: translateY(3rpx) rotate(225deg);
}

.sort-dropdown {
  position: absolute;
  left: 0;
  top: 82rpx;
  width: 100%;
  padding: 10rpx 0;
  border-radius: 14rpx;
  background: #fff;
  box-shadow: 0 16rpx 42rpx rgba(15, 23, 42, 0.12);
}

.sort-option {
  height: 74rpx;
  display: flex;
  align-items: center;
  padding: 0 30rpx;
  color: #344054;
  font-size: 28rpx;
  font-weight: 800;
}

.sort-option.active {
  color: #f79009;
  background: #fff8dc;
}

.result-card {
  display: flex;
  gap: 22rpx;
  margin-bottom: 42rpx;
}

.shop-cover {
  width: 168rpx;
  height: 168rpx;
  flex: 0 0 auto;
  border-radius: 12rpx;
  background: #e4e7ec;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff6a00, #ffcf33);
  color: #fff;
  font-size: 56rpx;
  font-weight: 900;
}

.shop-info {
  flex: 1;
  min-width: 0;
}

.shop-title-row,
.meta-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.shop-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 34rpx;
  font-weight: 900;
}

.tag-takeout {
  padding: 6rpx 10rpx;
  border-radius: 6rpx;
  background: #ffd000;
  color: #7a4d00;
  font-size: 22rpx;
  font-weight: 900;
}

.meta-row {
  margin-top: 8rpx;
  color: #667085;
  font-size: 26rpx;
}

.star {
  color: #ff5a00;
  font-weight: 900;
}

.time {
  margin-left: auto;
}

.fee-row,
.address-row {
  margin-top: 8rpx;
  color: #475467;
  font-size: 26rpx;
}

.address-row {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.promo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 12rpx;
}

.promo-row text {
  padding: 5rpx 10rpx;
  border: 1rpx solid #ffd7d7;
  border-radius: 6rpx;
  color: #f04438;
  font-size: 23rpx;
}

.product-scroll {
  margin-top: 18rpx;
  white-space: nowrap;
}

.product-row {
  display: inline-flex;
  gap: 16rpx;
}

.product-card {
  width: 140rpx;
}

.product-img {
  width: 140rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #f2f4f7;
  color: #ff5a00;
  font-size: 42rpx;
  font-weight: 900;
}

.product-name {
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2329;
  font-size: 24rpx;
}

.product-price {
  margin-top: 4rpx;
  color: #f04438;
  font-size: 26rpx;
  font-weight: 900;
}

.empty {
  padding: 100rpx 0;
  color: #667085;
  text-align: center;
}
</style>
