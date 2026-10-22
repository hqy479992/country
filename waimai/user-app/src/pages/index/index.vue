<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { ProductCategory, Shop, ShopSortMode } from "../../api/types";
import AppIcon from "../../components/AppIcon.vue";
import BottomNav from "../../components/BottomNav.vue";
import DataState from "../../components/DataState.vue";
import ShopCard from "../../components/ShopCard.vue";
import { getToken, requireLogin, selectedAddressId } from "../../utils/session";
import { message } from "../../utils/ui";
const shops = ref<Shop[]>([]);
const loading = ref(true);
const error = ref("");
const addressText = ref("请选择收货地址");
const activeCategory = ref<ProductCategory | null>(null);
const sortBy = ref<ShopSortMode>("COMPREHENSIVE");
const categories: {
  key: ProductCategory | null;
  label: string;
  icon: string;
}[] = [
  { key: null, label: "全部", icon: "grid" },
  { key: "FOOD", label: "美食", icon: "food" },
  { key: "DRINK", label: "饮品甜品", icon: "drink" },
  { key: "FRUIT_VEGETABLE", label: "果蔬", icon: "fresh" },
  { key: "CONVENIENCE", label: "便利", icon: "store" },
];
const sorts: { key: ShopSortMode; label: string }[] = [
  { key: "COMPREHENSIVE", label: "综合排序" },
  { key: "DELIVERY_FEE", label: "配送费低" },
  { key: "MIN_ORDER", label: "起送价低" },
];
let generation = 0;
async function loadShops() {
  const ticket = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const result = await api.getShops({
      category: activeCategory.value || undefined,
      sortBy: sortBy.value,
    });
    if (ticket === generation) shops.value = result;
  } catch (e) {
    if (ticket === generation) error.value = message(e);
  } finally {
    if (ticket === generation) loading.value = false;
  }
}
async function loadAddress() {
  addressText.value = "请选择收货地址";
  if (!getToken()) return;
  try {
    const addresses = await api.getAddresses();
    const selected =
      addresses.find((item) => item.id === selectedAddressId()) ||
      addresses.find((item) => item.isDefault) ||
      addresses[0];
    if (selected) addressText.value = `${selected.region} ${selected.detail}`;
  } catch {
    /* Address loading never prevents browsing public shops. */
  }
}
function chooseCategory(category: ProductCategory | null) {
  activeCategory.value = category;
  void loadShops();
}
function chooseSort(value: ShopSortMode) {
  sortBy.value = value;
  void loadShops();
}
function search() {
  uni.navigateTo({ url: "/pages/search/index" });
}
function chooseAddress() {
  if (requireLogin("/pages/index/index"))
    uni.navigateTo({ url: "/pages/address/index?select=1" });
}
onShow(() => {
  void loadShops();
  void loadAddress();
});
</script>
<template>
  <view class="page with-nav home-page">
    <view class="home-header">
      <view class="brand-row"
        ><view class="brand-name">乡镇外卖<view class="brand-dot"></view></view
        ><text class="brand-note">附近好店 · 送到家</text></view
      >
      <AppButton class="location" @tap="chooseAddress" aria-label="选择收货地址"
        ><AppIcon name="pin" :size="18" /><text>{{ addressText }}</text
        ><AppIcon name="down" :size="15"
      /></AppButton>
      <AppButton class="search-entry" @tap="search"
        ><AppIcon name="search" :size="18" color="#83917e" /><text
          >搜商家、搜想吃的</text
        ></AppButton
      >
      <view class="categories"
        ><AppButton
          v-for="category in categories"
          :key="category.key || 'all'"
          :class="{ active: activeCategory === category.key }"
          :aria-pressed="activeCategory === category.key"
          @tap="chooseCategory(category.key)"
          ><view class="category-icon"
            ><AppIcon :name="category.icon" :size="22" /></view
          ><text>{{ category.label }}</text></AppButton
        ></view
      >
    </view>
    <view class="section-head"
      ><view
        ><text class="section-title">附近商家</text
        ><text v-if="!loading && !error" class="shop-count"
          >{{ shops.length }} 家商家</text
        ></view
      ><AppButton class="refresh-button" :disabled="loading" @tap="loadShops"
        >刷新</AppButton
      ></view
    >
    <view class="chips sort-row"
      ><AppButton
        v-for="sort in sorts"
        :key="sort.key"
        class="chip"
        :class="{ active: sortBy === sort.key }"
        :aria-pressed="sortBy === sort.key"
        @tap="chooseSort(sort.key)"
        >{{ sort.label }}</AppButton
      ></view
    >
    <DataState
      v-if="loading"
      kind="loading"
      title="正在寻找附近好店"
      description="马上就好…"
    />
    <DataState
      v-else-if="error"
      kind="error"
      title="商家加载失败"
      :description="error"
      action="重新加载"
      @action="loadShops"
    />
    <DataState
      v-else-if="!shops.length"
      title="这个分类暂时没有商家"
      description="可以看看其他分类，或稍后再来"
      action="查看全部商家"
      @action="chooseCategory(null)"
    />
    <view v-else class="stack shop-list"
      ><ShopCard v-for="shop in shops" :key="shop.id" :shop="shop"
    /></view>
    <view class="errand-card"
      ><view class="errand-icon"><AppIcon name="bike" :size="25" /></view
      ><view
        ><view class="errand-title">取件、送物，找跑腿</view
        ><view class="small muted">跑腿服务筹备中，敬请期待</view></view
      ><text class="coming-tag">即将开放</text></view
    >
    <view class="home-footnote">一份热饭，送到身边。</view>
    <BottomNav active="home" />
  </view>
</template>
<style scoped>
.home-page {
  padding-top: 0;
}
.home-header {
  background: #fff;
  margin: 0 -16px;
  padding: 25px 20px 19px;
  border-radius: 0 0 22px 22px;
}
.brand-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.brand-name {
  font-size: 25px;
  font-weight: 650;
  letter-spacing: -0.6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.brand-dot {
  width: 7px;
  height: 7px;
  background: #86ad61;
  border-radius: 50%;
  align-self: flex-end;
  margin-bottom: 7px;
}
.brand-note {
  font-size: 11px;
  color: #7a8b72;
}
.location {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 39px;
  text-align: left;
  max-width: 100%;
  font-size: 14px;
}
.location text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.search-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f3f6ef;
  border-radius: 12px;
  min-height: 46px;
  width: 100%;
  padding: 10px 13px;
  color: #899482;
  font-size: 13px;
  margin-top: 8px;
  text-align: left;
}
.categories {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  margin-top: 20px;
}
.categories .app-button,
.categories .app-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  min-height: 66px;
  color: #7b8876;
}
.category-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #f4f7f0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.categories .active {
  color: #245d3f;
  font-weight: 600;
}
.active .category-icon {
  background: #e7f0dc;
}
.shop-count {
  font-size: 11px;
  color: #8a9584;
  margin-left: 9px;
}
.refresh-button {
  font-size: 12px;
  color: #7b8b73;
  padding: 7px;
  min-height: 36px;
}
.sort-row {
  margin-bottom: 14px;
}
.shop-list {
  gap: 11px;
}
.errand-card {
  display: flex;
  gap: 10px;
  align-items: center;
  background: #e9f0df;
  border-radius: 16px;
  padding: 17px 14px;
  margin-top: 20px;
}
.errand-icon {
  width: 35px;
  flex-shrink: 0;
}
.errand-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
.coming-tag {
  font-size: 10px;
  color: #758768;
  margin-left: auto;
  white-space: nowrap;
}
.home-footnote {
  text-align: center;
  color: #9aa58f;
  font-size: 11px;
  letter-spacing: 2px;
  margin: 25px 0 8px;
}
@media (max-width: 360px) {
  .home-header {
    margin-left: -12px;
    margin-right: -12px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .brand-name {
    font-size: 23px;
  }
  .brand-note {
    font-size: 10px;
  }
  .coming-tag {
    display: none;
  }
}
</style>
