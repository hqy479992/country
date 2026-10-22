<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { ErrandTask } from "../../api/types";
import AppButton from "../../components/AppButton.vue";
const order = ref<ErrandTask | null>(null),
  error = ref(""),
  busy = ref(false),
  loading = ref(false);
let id = "",
  visible = false,
  timer: ReturnType<typeof setInterval> | undefined;
onLoad((options) => {
  id = String(options?.id || "");
});
function yuan(n: number) {
  return `¥${(n / 100).toFixed(2)}`;
}
function status(s: string) {
  return (
    (
      {
        PENDING_ASSIGN: "等待接单",
        RIDER_ACCEPTED: "已接单，等待取件 / 购买",
        PICKED_UP: "已取件，配送中",
        COMPLETED: "已送达完成",
        CANCELLED: "已取消",
      } as Record<string, string>
    )[s] || s
  );
}
async function load() {
  if (loading.value || !id) return;
  loading.value = true;
  try {
    const row = await api.getErrand(id);
    if (visible) {
      order.value = row;
      error.value = "";
    }
  } catch (e) {
    if (visible) {
      error.value = e instanceof Error ? e.message : "加载失败";
      order.value = null;
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
async function action(kind: "accept" | "pickup" | "deliver") {
  if (busy.value || !order.value) return;
  const content =
    kind === "accept"
      ? "确认承接此跑腿需求？接单后请联系取送双方确认细节。"
      : kind === "pickup"
        ? "确认已经取到物品或买齐商品，即将开始配送？"
        : "确认物品已交到收货人手中？确认后订单将完成。";
  const ok = await new Promise<boolean>((resolve) =>
    uni.showModal({
      title:
        kind === "accept"
          ? "接跑腿单"
          : kind === "pickup"
            ? "确认取件"
            : "确认送达",
      content,
      success: (r) => resolve(r.confirm),
      fail: () => resolve(false),
    }),
  );
  if (!ok) return;
  busy.value = true;
  try {
    order.value = await api.errandAction(id, kind);
    error.value = "";
  } catch (e) {
    await load();
    error.value = e instanceof Error ? e.message : "操作失败";
  } finally {
    busy.value = false;
  }
}
function call(phone?: string) {
  if (phone) uni.makePhoneCall({ phoneNumber: phone });
}
</script>
<template>
  <view class="errand-detail"
    ><view class="head"
      ><text class="strong">跑腿配送详情</text
      ><AppButton class="btn" :disabled="loading" @tap="load"
        >刷新</AppButton
      ></view
    ><view v-if="error" class="error">{{ error }}</view
    ><view v-if="!order" class="empty">{{
      loading ? "正在加载…" : "暂时无法查看此订单，请返回接单大厅刷新。"
    }}</view
    ><template v-else>
      <view class="card"
        ><view class="status">{{ status(order.status) }}</view
        ><view class="fee">跑腿服务费 {{ yuan(order.totalAmount) }}</view
        ><view class="muted">订单号 {{ order.orderNo }}</view></view
      >
      <view class="card"
        ><view
          v-for="(address, index) in [
            order.pickupAddressSnapshot,
            order.deliveryAddressSnapshot,
          ]"
          :key="index"
          class="stop"
          ><view class="label">{{
            index === 0
              ? order.serviceType === "BUY"
                ? "购买地点"
                : "取件地点"
              : "送达地点"
          }}</view
          ><view
            >{{ address.region }}
            {{ address.detail || "接单后显示详细地址" }}</view
          ><view v-if="address.name" class="muted"
            >{{ address.name }} {{ address.phone }}</view
          ><AppButton
            v-if="address.phone"
            class="btn"
            @tap="call(address.phone)"
            >{{ index === 0 ? "联系取件方" : "联系收货人" }}</AppButton
          ></view
        ></view
      >
      <view class="card"
        ><text class="strong">{{
          order.serviceType === "BUY" ? "购买清单" : "物品说明"
        }}</text
        ><view class="description">{{ order.itemNote }}</view
        ><view v-if="order.remark" class="muted">备注：{{ order.remark }}</view
        ><view v-if="order.serviceType === 'BUY'" class="notice"
          >商品预算
          {{
            yuan(order.goodsBudget || 0)
          }}，不包含跑腿费。购买前先与用户确认规格、缺货替代和商品款结算，不要擅自超出预算。</view
        ></view
      >
      <view class="card" v-if="order.statusLogs?.length"
        ><view v-for="event in order.statusLogs" :key="event.id" class="event"
          ><view>{{ event.note }}</view
          ><view class="muted">{{
            new Date(event.createdAt).toLocaleString()
          }}</view></view
        ></view
      >
      <AppButton
        v-if="order.status === 'PENDING_ASSIGN'"
        class="btn primary"
        :disabled="busy"
        @tap="action('accept')"
        >接这个跑腿单</AppButton
      ><AppButton
        v-else-if="order.status === 'RIDER_ACCEPTED'"
        class="btn primary"
        :disabled="busy"
        @tap="action('pickup')"
        >{{
          order.serviceType === "BUY" ? "商品已买齐，开始配送" : "确认已取件"
        }}</AppButton
      ><AppButton
        v-else-if="order.status === 'PICKED_UP'"
        class="btn primary"
        :disabled="busy"
        @tap="action('deliver')"
        >确认物品已送达</AppButton
      ></template
    ></view
  >
</template>
<style scoped>
.strong {
  font-weight: 600;
}
.errand-detail {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  box-sizing: border-box;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20px;
}
.btn {
  font-size: 14px;
  padding: 10px 15px;
  border-radius: 10px;
  border: 1px solid #d8dee7;
  color: #245d3f;
  background: #fff;
  min-height: 42px;
}
.card {
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.8;
}
.status {
  font-size: 20px;
  font-weight: 600;
  color: #245d3f;
}
.fee {
  font-size: 18px;
  margin: 10px 0;
}
.muted {
  font-size: 12px;
  color: #667085;
  overflow-wrap: anywhere;
}
.stop {
  padding: 12px 0;
  overflow-wrap: anywhere;
}
.stop + .stop {
  border-top: 1px solid #eef2f6;
}
.label {
  font-size: 12px;
  color: #667085;
  margin-bottom: 6px;
}
.stop .btn {
  margin-top: 10px;
}
.description {
  margin: 14px 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.notice {
  font-size: 12px;
  background: #edf3e8;
  padding: 12px;
  border-radius: 10px;
  margin-top: 14px;
}
.primary {
  width: 100%;
  background: #245d3f;
  color: #fff;
  margin-top: 20px;
  border: 0;
}
.error {
  color: #b42318;
  padding: 14px 0;
}
.empty {
  text-align: center;
  padding: 50px 0;
  color: #667085;
}
.event {
  padding: 10px 0;
  border-bottom: 1px solid #eef2f6;
}
.app-button:after {
  border: 0;
}
</style>
