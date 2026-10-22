<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { ref } from "vue";
import { api } from "../../api";
import type { Shop } from "../../api/types";
import PageHead from "../../components/PageHead.vue";
import AppIcon from "../../components/AppIcon.vue";
import DataState from "../../components/DataState.vue";
import ShopCard from "../../components/ShopCard.vue";
import { message } from "../../utils/ui";
const keyword = ref("");
const shops = ref<Shop[]>([]);
const searched = ref(false);
const loading = ref(false);
const error = ref("");
const history = ref<string[]>(
  (uni.getStorageSync("town-search-history") || []) as string[],
);
let generation = 0;
async function search(value = keyword.value) {
  keyword.value = value.trim().slice(0, 40);
  if (!keyword.value) return;
  const ticket = ++generation;
  loading.value = true;
  error.value = "";
  searched.value = true;
  history.value = [
    keyword.value,
    ...history.value.filter((item) => item !== keyword.value),
  ].slice(0, 8);
  uni.setStorageSync("town-search-history", history.value);
  try {
    const result = await api.getShops({ keyword: keyword.value });
    if (ticket === generation) shops.value = result;
  } catch (e) {
    if (ticket === generation) error.value = message(e);
  } finally {
    if (ticket === generation) loading.value = false;
  }
}
function clearHistory() {
  history.value = [];
  uni.removeStorageSync("town-search-history");
}
</script>
<template>
  <view class="page"
    ><PageHead title="找点想吃的" /><view class="search-box"
      ><AppIcon name="search" color="#82917b" /><input
        v-model="keyword"
        placeholder="商家名称、菜品名称"
        confirm-type="search"
        maxlength="40"
        aria-label="搜索商家或菜品"
        @confirm="search()"
      /><AppButton @tap="search()">搜索</AppButton></view
    ><view v-if="!searched"
      ><view class="section-head"
        ><text class="section-title">最近搜索</text
        ><AppButton
          v-if="history.length"
          class="text-btn small"
          @tap="clearHistory"
          >清空</AppButton
        ></view
      ><view v-if="history.length" class="chips"
        ><AppButton
          v-for="item in history"
          :key="item"
          class="chip"
          @tap="search(item)"
          >{{ item }}</AppButton
        ></view
      ><view v-else class="muted small"
        >输入商家或菜品名称，找到喜欢的味道。</view
      ></view
    ><view v-else
      ><view class="section-head"
        ><text class="section-title">搜索结果</text
        ><text v-if="!loading && !error" class="small muted"
          >{{ shops.length }} 家商家</text
        ></view
      ><DataState v-if="loading" kind="loading" title="正在搜索" /><DataState
        v-else-if="error"
        kind="error"
        title="搜索失败"
        :description="error"
        action="重新搜索"
        @action="search()" /><DataState
        v-else-if="!shops.length"
        title="暂时没有找到"
        description="换个关键词试试，比如“奶茶”或“米饭”" /><view
        v-else
        class="stack"
        ><ShopCard
          v-for="shop in shops"
          :key="shop.id"
          :shop="shop" /></view></view
  ></view>
</template>
<style scoped>
.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  background: #fff;
  border-radius: 12px;
}
.search-box input {
  flex: 1;
  width: 0;
}
.search-box .app-button,
.search-box .app-button {
  color: #245d3f;
  font-size: 13px;
  min-height: 46px;
  padding: 0 5px;
}
</style>
