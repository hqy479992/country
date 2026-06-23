<script setup lang="ts">
</script>

<template>
  <slot />
</template>

<style>
page {
  background: #f6f7f9;
  color: #1f2329;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

view,
text {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  padding: 24rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.muted {
  color: #667085;
}

.price {
  color: #f04438;
  font-weight: 700;
}

.primary-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #1677ff;
  color: #fff;
  font-weight: 700;
}

.secondary-btn {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #eef4ff;
  color: #165dff;
  font-weight: 700;
}
</style>
