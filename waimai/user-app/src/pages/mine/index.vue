<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Shop, UserProfile } from "../../api/types";

const profile = ref<UserProfile | null>(null);
const favoriteShops = ref<Shop[]>([]);
const showAllFavorites = ref(false);
const loading = ref(false);

const displayName = computed(() => {
  const user = profile.value;
  if (!user) return "本地用户";
  return user.nickname || user.phone || `用户${user.id.slice(-6)}`;
});
const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase());
const visibleFavorites = computed(() => (showAllFavorites.value ? favoriteShops.value : favoriteShops.value.slice(0, 3)));

async function loadMine() {
  loading.value = true;
  try {
    const [nextProfile, shops] = await Promise.all([api.getProfile(), api.getShops()]);
    profile.value = nextProfile;
    favoriteShops.value = shops;
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function toggleFavorites() {
  if (favoriteShops.value.length <= 3) {
    uni.showToast({ title: "已展示全部收藏", icon: "none" });
    return;
  }
  showAllFavorites.value = !showAllFavorites.value;
}

function goShop(shopId: string) {
  uni.navigateTo({ url: `/pages/shop/detail?shopId=${shopId}` });
}

function goHome() {
  uni.reLaunch({ url: "/pages/index/index" });
}

function goOrders() {
  uni.navigateTo({ url: "/pages/orders/index" });
}

function goAddress() {
  uni.navigateTo({ url: "/pages/address/index" });
}

function comingSoon(title: string) {
  uni.showToast({ title: `${title}后续接入`, icon: "none" });
}

onShow(loadMine);
</script>

<template>
  <view class="mine-page">
    <view class="profile-head">
      <view class="avatar">{{ avatarText }}</view>
      <view class="profile-info">
        <view class="name">{{ displayName }}</view>
        <view class="muted">欢迎回来</view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-head">
        <view class="section-title">我的收藏</view>
        <view class="more-link" @tap="toggleFavorites">
          {{ showAllFavorites ? "收起" : "查看更多" }}
          <text class="chevron"></text>
        </view>
      </view>

      <view v-if="loading" class="empty-small">加载中...</view>
      <view v-else-if="favoriteShops.length === 0" class="empty-small">暂无收藏</view>
      <view v-else class="favorite-list" :class="{ expanded: showAllFavorites }">
        <view v-for="shop in visibleFavorites" :key="shop.id" class="favorite-item" @tap="goShop(shop.id)">
          <image v-if="shop.coverUrl || shop.logoUrl" class="favorite-img" :src="shop.coverUrl || shop.logoUrl || ''" mode="aspectFill" />
          <view v-else class="favorite-img placeholder">{{ shop.name.slice(0, 1) }}</view>
          <view class="favorite-name">{{ shop.name }}</view>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">我的功能</view>
      <view class="feature-grid">
        <view class="feature-item" @tap="goAddress">
          <view class="feature-icon pin"></view>
          <view>我的地址</view>
        </view>
        <view class="feature-item" @tap="comingSoon('我的足迹')">
          <view class="feature-icon footprint">●</view>
          <view>我的足迹</view>
        </view>
        <view class="feature-item" @tap="comingSoon('我的评价')">
          <view class="feature-icon comment">···</view>
          <view>我的评价</view>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item" @tap="goHome">
        <view class="nav-icon yellow">外</view>
        <view>外卖</view>
      </view>
      <view class="nav-item" @tap="goOrders">
        <view class="nav-icon line">单</view>
        <view>订单</view>
      </view>
      <view class="nav-item active">
        <view class="nav-icon yellow">我</view>
        <view>我的</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.mine-page {
  min-height: 100vh;
  padding: 52rpx 24rpx 150rpx;
  background: #f6f7f9;
  color: #1f2329;
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 20rpx 4rpx 32rpx;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffe57a, #ffb020);
  color: #101828;
  font-size: 42rpx;
  font-weight: 900;
}

.profile-info {
  min-width: 0;
}

.name {
  max-width: 480rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 42rpx;
  font-weight: 900;
}

.muted {
  margin-top: 8rpx;
  color: #667085;
  font-size: 24rpx;
}

.section-card {
  margin-bottom: 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: #fff;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.section-title {
  color: #1f2329;
  font-size: 32rpx;
  font-weight: 900;
}

.more-link {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #667085;
  font-size: 26rpx;
  font-weight: 800;
}

.chevron {
  width: 14rpx;
  height: 14rpx;
  border-right: 4rpx solid currentColor;
  border-bottom: 4rpx solid currentColor;
  transform: rotate(-45deg);
}

.favorite-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 26rpx;
}

.favorite-list.expanded {
  grid-template-columns: repeat(2, 1fr);
}

.favorite-item {
  min-width: 0;
}

.favorite-img {
  width: 100%;
  height: 132rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: #f2f4f7;
  color: #ff7a00;
  font-size: 42rpx;
  font-weight: 900;
}

.placeholder {
  background: linear-gradient(135deg, #ffcf66, #ff7a59);
  color: #fff;
}

.favorite-name {
  margin-top: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #344054;
  font-size: 24rpx;
  font-weight: 800;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  margin-top: 32rpx;
}

.feature-item {
  display: grid;
  justify-items: center;
  gap: 14rpx;
  color: #344054;
  font-size: 28rpx;
  font-weight: 800;
}

.feature-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffbe20;
  font-size: 34rpx;
  font-weight: 900;
}

.feature-icon.pin {
  position: relative;
  width: 44rpx;
  height: 44rpx;
  border: 13rpx solid #ffbe20;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}

.feature-icon.footprint {
  border-radius: 50%;
  background: #fff6d6;
}

.feature-icon.comment {
  border-radius: 14rpx;
  background: #ffbe20;
  color: #fff;
}

.empty-small {
  padding: 42rpx 0 12rpx;
  color: #98a2b3;
  text-align: center;
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
</style>
