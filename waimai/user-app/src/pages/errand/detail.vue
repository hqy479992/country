<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { ErrandOrder } from "../../api/types";
import { getToken, requireLogin } from "../../utils/session";
import { confirm, message, callPhone } from "../../utils/ui";
import { yuan, dateText } from "../../utils/format";
import {
  errandFee,
  errandLabel,
  errandStatus,
  canCancelErrand,
} from "../../utils/errands";
import AppButton from "../../components/AppButton.vue";
import PageHead from "../../components/PageHead.vue";
import DataState from "../../components/DataState.vue";
const order = ref<ErrandOrder | null>(null),
  error = ref(""),
  busy = ref(false),
  loading = ref(false);
const paymentMode = ref("unavailable"),
  now = ref(Date.now());
let id = "",
  visible = false,
  timer: ReturnType<typeof setInterval> | undefined,
  ticks = 0;
onLoad((options) => {
  id = String(options?.orderId || "");
});
const minutes = computed(() => {
  const seconds = Math.max(
    0,
    Math.ceil(
      ((Date.parse(order.value?.expiresAt || "") || 0) - now.value) / 1000,
    ),
  );
  return `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, "0")}秒`;
});
const explanations: Record<string, string> = {
  PENDING_QUOTE:
    "需求已收到，平台会根据取送地点与物品报价。你确认前不会安排骑手，也不会扣款。",
  PENDING_PAYMENT: "平台已报价，请在有效期内确认。支付完成后进入骑手接单大厅。",
  PENDING_ASSIGN: "已进入接单大厅，等待骑手接单。接单前仍可取消。",
  RIDER_ACCEPTED: "骑手正在前往取件或购买地点，可通过下方按钮联系骑手。",
  PICKED_UP: "骑手已取到物品，正在送往你的收货地点。",
  COMPLETED: "物品已送达，本次跑腿已完成。",
  CANCELLED: "本次跑腿已关闭。如需重新发布，请提交新的需求。",
};
async function load() {
  if (!id) {
    error.value = "订单地址不完整";
    return;
  }
  if (!getToken()) {
    order.value = null;
    requireLogin(`/pages/errand/detail?orderId=${id}`);
    return;
  }
  if (loading.value) return;
  loading.value = true;
  try {
    const [row, caps] = await Promise.all([
      api.getErrandOrder(id),
      api.getCapabilities(),
    ]);
    if (visible) {
      order.value = row;
      paymentMode.value = caps.paymentMode;
      error.value = "";
    }
  } catch (e) {
    if (visible) {
      error.value = message(e);
      if (!getToken()) order.value = null;
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
  timer = setInterval(() => {
    now.value = Date.now();
    if (
      ++ticks % 15 === 0 &&
      order.value &&
      !["CANCELLED", "COMPLETED", "DELIVERED"].includes(order.value.status)
    )
      void load();
  }, 1000);
});
onHide(stop);
onUnload(stop);
async function cancel() {
  if (
    !order.value ||
    busy.value ||
    !(await confirm(
      "取消跑腿订单",
      "确认取消这次需求？已进行的测试支付会撤销，不涉及实际扣款。",
    ))
  )
    return;
  busy.value = true;
  try {
    order.value = await api.cancelErrandOrder(id);
    error.value = "";
  } catch (e) {
    error.value = message(e);
    await load();
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
async function pay() {
  if (
    !order.value ||
    busy.value ||
    !(await confirm(
      "确认报价并测试支付",
      `跑腿服务费 ${yuan(order.value.totalAmount)}，不包含商品款。当前为测试支付，不会扣款。确认后等待骑手接单。`,
    ))
  )
    return;
  busy.value = true;
  try {
    order.value = await api.payErrandMock(id, order.value.totalAmount);
    error.value = "";
  } catch (e) {
    error.value = message(e);
    await load();
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
function create() {
  uni.navigateTo({ url: "/pages/errand/create" });
}
function list() {
  uni.reLaunch({ url: "/pages/orders/index?type=errand" });
}
</script>
<template>
  <view class="page errand-detail"
    ><PageHead title="跑腿订单"
      ><AppButton class="text-btn small" :disabled="loading" @tap="load"
        >刷新</AppButton
      ></PageHead
    >
    <DataState v-if="!order && loading" kind="loading" title="正在加载订单" />
    <DataState
      v-else-if="!order"
      kind="error"
      title="暂时无法查看订单"
      :description="error"
      action="重试"
      @action="load"
    />
    <template v-else
      ><view class="status-card"
        ><text class="small">{{ errandLabel(order) }}</text
        ><view class="status-title">{{ errandStatus(order.status) }}</view
        ><view class="status-copy">{{ explanations[order.status] }}</view
        ><view v-if="order.status === 'PENDING_PAYMENT'" class="countdown"
          >报价剩余 {{ minutes }}</view
        ></view
      >
      <view v-if="error" class="notice warning">{{ error }}</view>
      <view class="card route"
        ><view
          v-for="(address, index) in [
            order.pickupAddressSnapshot,
            order.deliveryAddressSnapshot,
          ]"
          :key="index"
          class="route-stop"
          ><view class="stop-badge">{{
            index === 0 ? (order.serviceType === "BUY" ? "买" : "取") : "送"
          }}</view
          ><view
            ><view class="section-title"
              >{{ address.region }} {{ address.detail }}</view
            ><view class="muted small"
              >{{ address.name }} {{ address.phone }}</view
            ></view
          ></view
        ></view
      >
      <view v-if="order.rider" class="card row rider"
        ><view
          ><view class="section-title">骑手 {{ order.rider.name }}</view
          ><view class="muted small">接单后可联系确认取送细节</view></view
        ><AppButton
          v-if="order.rider.phone"
          class="outline-btn"
          @tap="callPhone(order.rider.phone)"
          >联系骑手</AppButton
        ></view
      >
      <view class="card summary"
        ><view class="section-title">{{
          order.serviceType === "BUY" ? "购买清单" : "物品说明"
        }}</view
        ><view class="description">{{ order.itemNote }}</view
        ><view v-if="order.remark" class="muted small"
          >备注：{{ order.remark }}</view
        ><view v-if="order.serviceType === 'BUY'" class="notice buy-note"
          >商品预算
          {{
            yuan(order.goodsBudget || 0)
          }}（不含跑腿费）。商品款由你与骑手确认后另行结算，本页面不代收商品款。</view
        ><view class="row fee"
          ><text>跑腿服务费</text
          ><text class="fee-value">{{ errandFee(order) }}</text></view
        ><view v-if="order.paymentMethod === 'MOCK'" class="muted small">{{
          order.paymentStatus === "REFUNDED"
            ? "测试支付已撤销，未扣款"
            : "测试支付，不涉及实际扣款"
        }}</view></view
      >
      <view v-if="order.statusLogs?.length" class="card timeline"
        ><view class="section-title">服务进度</view
        ><view v-for="log in order.statusLogs" :key="log.id" class="event"
          ><view>{{ log.note }}</view
          ><view class="small muted">{{ dateText(log.createdAt) }}</view></view
        ></view
      >
      <view class="metadata small muted"
        ><view>订单号 {{ order.orderNo }}</view
        ><view>提交时间 {{ dateText(order.createdAt) }}</view></view
      >
      <view class="actions"
        ><AppButton
          v-if="canCancelErrand(order)"
          class="outline-btn"
          :disabled="busy"
          @tap="cancel"
          >取消订单</AppButton
        ><AppButton
          v-if="order.status === 'PENDING_PAYMENT' && paymentMode === 'mock'"
          class="primary-btn"
          :disabled="busy || Date.parse(order.expiresAt || '') <= now"
          @tap="pay"
          >确认报价 · 测试支付</AppButton
        ><AppButton
          v-if="['CANCELLED', 'COMPLETED', 'DELIVERED'].includes(order.status)"
          class="primary-btn"
          @tap="create"
          >再发一单</AppButton
        ><AppButton class="text-btn" @tap="list">全部跑腿订单</AppButton></view
      >
      <view
        v-if="order.status === 'PENDING_PAYMENT' && paymentMode !== 'mock'"
        class="notice warning"
        >支付暂未开通，当前无法确认报价接单，请联系平台。</view
      >
    </template>
  </view>
</template>
<style scoped>
.errand-detail {
  padding-bottom: 32px;
}
.status-card {
  background: #e8efdf;
  border-radius: 20px;
  padding: 24px;
  margin: 8px 0 18px;
  color: #245d3f;
}
.status-title {
  font-size: 26px;
  font-weight: 600;
  margin: 8px 0 10px;
}
.status-copy {
  font-size: 13px;
  line-height: 1.8;
}
.countdown {
  font-size: 13px;
  margin-top: 14px;
}
.card {
  margin-top: 14px;
}
.route-stop {
  display: flex;
  gap: 14px;
  padding: 14px 0;
}
.stop-badge {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8efdf;
  color: #245d3f;
  flex-shrink: 0;
}
.route-stop:last-child .stop-badge {
  background: #f4e8cf;
  color: #8a632b;
}
.section-title {
  font-weight: 600;
  font-size: 15px;
  overflow-wrap: anywhere;
}
.small {
  line-height: 1.8;
}
.description {
  line-height: 1.8;
  margin: 12px 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.fee {
  border-top: 1px solid #edf1e8;
  margin-top: 16px;
  padding-top: 16px;
}
.fee .fee-value {
  font-weight: 600;
  font-size: 18px;
}
.buy-note {
  margin-top: 14px;
}
.event {
  border-left: 2px solid #e6eddc;
  padding: 0 0 20px 14px;
  margin: 16px 0 0 5px;
  font-size: 13px;
  line-height: 1.8;
}
.metadata {
  padding: 20px 4px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.actions .primary-btn {
  flex: 1;
}
.actions .text-btn {
  width: 100%;
  margin-top: 6px;
}
.rider {
  gap: 10px;
}
.rider > view {
  min-width: 0;
}
</style>
