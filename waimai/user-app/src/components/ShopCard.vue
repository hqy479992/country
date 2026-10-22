<script setup lang="ts">
import AppButton from "./AppButton.vue";
import { ref, watch } from "vue";
import type { Shop } from "../api/types";
import { yuan } from "../utils/format";
const props = defineProps<{ shop: Shop }>();
const imageFailed = ref(false);
watch(
  () => [props.shop.id, props.shop.logoUrl, props.shop.coverUrl],
  () => {
    imageFailed.value = false;
  },
);
function open(id: string) {
  uni.navigateTo({ url: `/pages/shop/detail?shopId=${id}` });
}
</script>
<template>
  <AppButton class="shop-card" @tap="open(shop.id)"
    ><image
      v-if="(shop.logoUrl || shop.coverUrl) && !imageFailed"
      class="shop-cover"
      @error="imageFailed = true"
      :src="shop.logoUrl || shop.coverUrl || ''"
      mode="aspectFill"
    /><view v-else class="shop-cover monogram">{{ shop.name.slice(0, 1) }}</view
    ><view class="shop-copy"
      ><view class="shop-name-row"
        ><text class="shop-name">{{ shop.name }}</text
        ><text
          class="shop-status"
          :class="{ closed: shop.status !== 'OPEN' }"
          >{{ shop.status === "OPEN" ? "营业中" : "休息中" }}</text
        ></view
      ><view class="shop-description muted">{{
        shop.announcement ||
        shop.products
          ?.slice(0, 2)
          .map((p) => p.name)
          .join(" · ") ||
        shop.address
      }}</view
      ><view class="shop-fees"
        ><text>起送 {{ yuan(shop.minOrderAmount) }}</text
        ><text>{{
          shop.deliveryFee ? `配送 ${yuan(shop.deliveryFee)}` : "免配送费"
        }}</text></view
      ></view
    ></AppButton
  >
</template>
<style scoped>
.shop-card {
  display: flex;
  gap: 13px;
  background: #fff;
  padding: 16px;
  border-radius: 17px;
  text-align: left;
  width: 100%;
  align-items: flex-start;
}
.shop-cover {
  width: 68px;
  height: 72px;
  border-radius: 13px;
  flex-shrink: 0;
  background: #e8f0e1;
}
.monogram {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #245d3f;
}
.shop-copy {
  flex: 1;
  min-width: 0;
}
.shop-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.shop-name {
  font-size: 16px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.shop-status {
  font-size: 11px;
  color: #245d3f;
  white-space: nowrap;
}
.closed {
  color: #869188;
}
.shop-description {
  font-size: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.shop-fees {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #5d6c62;
  margin-top: 9px;
}
</style>
