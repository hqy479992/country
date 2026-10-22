<script setup lang="ts">
import AppButton from "./AppButton.vue";
import AppIcon from "./AppIcon.vue";
defineProps<{ active: string }>();
const links = [
  { key: "home", path: "/pages/index/index", label: "首页", icon: "home" },
  { key: "orders", path: "/pages/orders/index", label: "订单", icon: "order" },
  { key: "mine", path: "/pages/mine/index", label: "我的", icon: "user" },
];
function go(item: (typeof links)[number]) {
  uni.reLaunch({ url: item.path });
}
</script>
<template>
  <view class="bottom-nav" aria-label="底部导航"
    ><AppButton
      v-for="item in links"
      :key="item.key"
      :class="{ active: active === item.key }"
      :aria-label="item.label"
      @tap="go(item)"
      ><AppIcon
        :name="item.icon"
        :color="active === item.key ? '#245d3f' : '#77867b'"
        :size="22"
      /><text>{{ item.label }}</text></AppButton
    ></view
  >
</template>
