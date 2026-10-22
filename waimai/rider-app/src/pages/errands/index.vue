<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { ErrandTask } from "../../api/types";
import AppButton from "../../components/AppButton.vue";
const tab = ref("available"),
  error = ref(""),
  loading = ref(false);
const available = ref<ErrandTask[]>([]),
  mine = ref<ErrandTask[]>([]);
let visible = false,
  timer: ReturnType<typeof setInterval> | undefined;
const rows = computed(() =>
  tab.value === "available"
    ? available.value
    : mine.value.filter((o) =>
        tab.value === "done"
          ? ["COMPLETED", "DELIVERED"].includes(o.status)
          : !["COMPLETED", "DELIVERED", "CANCELLED"].includes(o.status),
      ),
);
onLoad((options) => {
  if (options?.tab === "mine") tab.value = "mine";
});
function label(o: ErrandTask) {
  return o.serviceType === "BUY"
    ? "帮我买"
    : o.deliveryMode === "PICK"
      ? "帮我取"
      : "帮我送";
}
function status(value: string) {
  return (
    (
      {
        PENDING_ASSIGN: "待接单",
        RIDER_ACCEPTED: "待取件 / 购买",
        PICKED_UP: "待送达",
        COMPLETED: "已完成",
        DELIVERED: "已送达",
      } as Record<string, string>
    )[value] || value
  );
}
function yuan(value: number) {
  return `¥${(value / 100).toFixed(2)}`;
}
async function load() {
  if (loading.value) return;
  loading.value = true;
  try {
    const result = await Promise.all([
      api.getAvailableErrands(),
      api.getMyErrands(),
    ]);
    if (visible) {
      [available.value, mine.value] = result;
      error.value = "";
    }
  } catch (e) {
    if (visible) {
      error.value = e instanceof Error ? e.message : "加载失败";
      available.value = [];
      mine.value = [];
    }
  } finally {
    loading.value = false;
  }
}
function stop() {
  visible = false;
  if (timer) clearInterval(timer);
  timer = undefined;
}
onShow(() => {
  visible = true;
  void load();
  if (timer) clearInterval(timer);
  timer = setInterval(load, 15000);
});
onHide(stop);
onUnload(stop);
function open(id: string) {
  uni.navigateTo({ url: `/pages/errands/detail?id=${id}` });
}
</script>
<template>
  <view class="errands-page"
    ><view class="head"
      ><view
        ><view class="heading">跑腿接单</view
        ><text class="muted">帮送 · 帮取 · 帮买</text></view
      ><AppButton class="errand-btn" :disabled="loading" @tap="load"
        >刷新</AppButton
      ></view
    >
    <view class="tabs"
      ><AppButton
        v-for="t in [
          { key: 'available', name: '待接单' },
          { key: 'mine', name: '我在配送' },
          { key: 'done', name: '已完成' },
        ]"
        :key="t.key"
        class="tab"
        :class="{ active: tab === t.key }"
        @tap="tab = t.key"
        >{{ t.name }}</AppButton
      ></view
    >
    <view class="notice"
      >跑腿订单需用户确认报价后才可接单。接单后显示完整取送地址和联系方式。</view
    ><view v-if="error" class="error">{{ error }}</view
    ><view v-if="!rows.length" class="empty">{{
      loading ? "正在加载…" : "暂无此类跑腿订单"
    }}</view>
    <AppButton v-for="o in rows" :key="o.id" class="task" @tap="open(o.id)"
      ><view class="head"
        ><text class="strong">{{ label(o) }}</text
        ><text class="fee">服务费 {{ yuan(o.totalAmount) }}</text></view
      ><view class="status">{{ status(o.status) }}</view
      ><view class="route"
        ><text
          >取 / 买：{{ o.pickupAddressSnapshot.region }}
          {{ o.pickupAddressSnapshot.detail || "（接单后查看详细地址）" }}</text
        ><text
          >送：{{ o.deliveryAddressSnapshot.region }}
          {{
            o.deliveryAddressSnapshot.detail || "（接单后查看详细地址）"
          }}</text
        ></view
      ><view class="note">{{ o.itemNote }}</view
      ><view v-if="o.serviceType === 'BUY'" class="muted"
        >商品预算 {{ yuan(o.goodsBudget || 0) }} · 商品款需另行确认</view
      ><view class="more">查看详情 →</view></AppButton
    >
  </view>
</template>
<style scoped>
.strong {
  font-weight: 600;
}
.errands-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.heading {
  font-size: 25px;
  font-weight: 700;
  margin-bottom: 6px;
}
.muted {
  font-size: 12px;
  color: #667085;
}
.errand-btn,
.tab {
  font-size: 14px;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid #d8dee7;
  background: #fff;
  color: #1d2939;
}
.tabs {
  display: flex;
  gap: 8px;
  margin: 22px 0 16px;
}
.active {
  background: #245d3f;
  color: white;
  border-color: #245d3f;
}
.notice {
  font-size: 12px;
  background: #edf3e8;
  color: #466448;
  padding: 14px;
  line-height: 1.8;
  border-radius: 12px;
}
.error {
  color: #b42318;
  padding: 14px 0;
}
.empty {
  text-align: center;
  padding: 60px 0;
  color: #667085;
}
.task {
  display: block;
  width: 100%;
  text-align: left;
  margin-top: 16px;
  background: #fff;
  border: 0;
  border-radius: 16px;
  padding: 20px;
  color: #1d2939;
}
.fee {
  font-size: 14px;
  color: #245d3f;
  font-weight: 600;
}
.status {
  font-size: 12px;
  color: #667085;
  margin: 10px 0;
}
.route {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.note {
  font-size: 13px;
  margin: 14px 0;
  white-space: pre-wrap;
}
.more {
  color: #245d3f;
  font-size: 13px;
  text-align: right;
  margin-top: 14px;
}
.app-button:after {
  border: 0;
}
</style>
