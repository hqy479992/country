<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { computed, ref } from "vue";
import { onLoad, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Order } from "../../api/types";
import { getToken, requireLogin } from "../../utils/session";
import { callPhone, confirm, goHome, message, toast } from "../../utils/ui";
import {
  statusText,
  yuan,
  dateText,
  orderDescription,
  paymentRemaining,
} from "../../utils/format";
import PageHead from "../../components/PageHead.vue";
import AppIcon from "../../components/AppIcon.vue";
import DataState from "../../components/DataState.vue";
const id = ref("");
const order = ref<Order | null>(null);
const loading = ref(false);
const busy = ref(false);
const error = ref("");
const loggedIn = ref(false);
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
let visible = false;
let ticks = 0;
const stages = [
  { key: "PAID", label: "已支付" },
  { key: "MERCHANT_ACCEPTED", label: "商家备餐" },
  { key: "PICKED_UP", label: "骑手配送" },
  { key: "COMPLETED", label: "已送达" },
];
const progress = computed(() => {
  const status = order.value?.status;
  if (["COMPLETED", "DELIVERED"].includes(status || "")) return 3;
  if (status === "PICKED_UP") return 2;
  if (
    ["MERCHANT_ACCEPTED", "READY_FOR_PICKUP", "RIDER_ACCEPTED"].includes(
      status || "",
    )
  )
    return 1;
  if (status === "PAID") return 0;
  return -1;
});
const remaining = computed(() =>
  paymentRemaining(order.value?.expiresAt, now.value),
);
async function load(silent = false) {
  loggedIn.value = !!getToken();
  if (!loggedIn.value) {
    order.value = null;
    return;
  }
  if (!id.value || loading.value) return;
  loading.value = true;
  if (!silent) error.value = "";
  try {
    const result = await api.getOrder(id.value);
    if (visible) {
      order.value = result;
      error.value = "";
    }
  } catch (e) {
    if (visible) error.value = message(e);
    loggedIn.value = !!getToken();
  } finally {
    loading.value = false;
  }
}
async function cancel() {
  if (
    busy.value ||
    !order.value ||
    !(await confirm(
      "取消订单",
      "订单尚未支付，取消后将恢复商品库存。确定取消？",
    ))
  )
    return;
  busy.value = true;
  try {
    order.value = await api.cancelOrder(order.value.id);
    uni.showToast({ title: "订单已取消", icon: "success" });
  } catch (e) {
    toast(e);
    await load(true);
  } finally {
    busy.value = false;
  }
}
function pay() {
  if (order.value)
    uni.navigateTo({ url: `/pages/pay/pay?orderId=${order.value.id}` });
}
function shop() {
  if (order.value)
    uni.navigateTo({ url: `/pages/shop/detail?shopId=${order.value.shopId}` });
}
function stop() {
  visible = false;
  if (timer) clearInterval(timer);
  timer = undefined;
}
onLoad((query) => {
  id.value = String(query?.orderId || "");
});
onShow(() => {
  visible = true;
  ticks = 0;
  void load();
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    now.value = Date.now();
    ticks++;
    if (
      ticks % 10 === 0 &&
      order.value &&
      !["COMPLETED", "DELIVERED", "CANCELLED"].includes(order.value.status)
    )
      void load(true);
  }, 1000);
});
onHide(stop);
onUnload(stop);
</script>
<template>
  <view class="page"
    ><PageHead title="订单详情"
      ><AppButton class="text-btn small" :disabled="loading" @tap="load()">{{
        loading ? "刷新中" : "刷新"
      }}</AppButton></PageHead
    ><DataState
      v-if="!loggedIn"
      title="登录后查看订单"
      action="去登录"
      @action="requireLogin(`/pages/orders/detail?orderId=${id}`)"
    /><DataState
      v-else-if="loading && !order"
      kind="loading"
      title="正在加载订单"
    /><DataState
      v-else-if="error && !order"
      kind="error"
      title="订单加载失败"
      :description="error"
      action="重新加载"
      @action="load()"
    /><DataState
      v-else-if="!id"
      title="没有找到这个订单"
      action="回首页"
      @action="goHome"
    /><view v-else-if="order" class="stack"
      ><view
        class="status-panel"
        :class="{ cancelled: order.status === 'CANCELLED' }"
        ><view class="status-title">{{ statusText(order.status) }}</view
        ><view class="status-description">{{
          orderDescription(order.status)
        }}</view
        ><view
          v-if="order.status === 'PENDING_PAYMENT' && order.expiresAt"
          class="countdown"
          >{{
            remaining === "00:00"
              ? "支付已超时，正在关闭订单"
              : `剩余支付时间 ${remaining}`
          }}</view
        ><view v-if="order.status !== 'CANCELLED'" class="timeline"
          ><view
            v-for="(stage, index) in stages"
            :key="stage.key"
            class="timeline-step"
            :class="{ done: progress >= index, current: progress === index }"
            ><view class="timeline-dot"></view
            ><text>{{ stage.label }}</text></view
          ></view
        ></view
      ><view v-if="error" class="notice warning"
        >刷新失败，当前显示上次结果。{{ error }}</view
      ><view v-if="order.status === 'PENDING_PAYMENT'" class="payment-actions"
        ><AppButton
          class="primary-btn"
          :disabled="busy || remaining === '00:00'"
          @tap="pay"
          >继续支付</AppButton
        ><AppButton class="outline-btn" :disabled="busy" @tap="cancel">{{
          busy ? "正在取消…" : "取消订单"
        }}</AppButton></view
      ><view class="card"
        ><AppButton class="order-shop" @tap="shop"
          ><AppIcon name="store" :size="19" /><text>{{
            order.shop?.name || "商家"
          }}</text
          ><AppIcon name="arrow" :size="16" color="#829078" /></AppButton
        ><view
          v-for="item in order.items"
          :key="item.id"
          class="row row-start item-row"
          ><view
            ><view>{{ item.productName }}</view
            ><view class="small muted"
              >{{ yuan(item.unitPrice) }} × {{ item.quantity }}</view
            ></view
          ><text>{{ yuan(item.totalPrice) }}</text></view
        ><view class="divider"></view
        ><view class="row small"
          ><text class="muted">商品小计</text
          ><text>{{ yuan(order.goodsAmount) }}</text></view
        ><view class="row small"
          ><text class="muted">配送费</text
          ><text>{{ yuan(order.deliveryFee) }}</text></view
        ><view class="row"
          ><text>{{
            order.paymentStatus === "PAID" ? "订单金额" : "应付金额"
          }}</text
          ><text class="total">{{ yuan(order.totalAmount) }}</text></view
        ><AppButton
          v-if="order.shop?.phone"
          class="secondary-btn contact-button"
          @tap="callPhone(order.shop.phone)"
          ><AppIcon name="phone" :size="16" />联系商家</AppButton
        ></view
      ><view class="card"
        ><view class="section-title">配送信息</view
        ><view class="address-detail"
          >{{ order.addressSnapshot.region }}
          {{ order.addressSnapshot.detail }}</view
        ><view class="small muted"
          >{{ order.addressSnapshot.name }} ·
          {{ order.addressSnapshot.phone }}</view
        ><template v-if="order.deliveryOrder?.rider"
          ><view class="divider"></view
          ><view class="row"
            ><view
              ><view>骑手 {{ order.deliveryOrder.rider.name }}</view
              ><view class="small muted">{{
                statusText(order.deliveryOrder.status)
              }}</view></view
            ><AppButton
              v-if="order.deliveryOrder.rider.phone"
              class="outline-btn"
              @tap="callPhone(order.deliveryOrder.rider.phone)"
              >联系骑手</AppButton
            ></view
          ></template
        ><template v-if="order.remark"
          ><view class="divider"></view><view class="small muted">订单备注</view
          ><view class="remark">{{ order.remark }}</view></template
        ></view
      ><view class="card order-meta"
        ><view class="row small"
          ><text class="muted">订单编号</text
          ><text>{{ order.orderNo }}</text></view
        ><view class="row small"
          ><text class="muted">下单时间</text
          ><text>{{ dateText(order.createdAt) }}</text></view
        ><view v-if="order.paidAt" class="row small"
          ><text class="muted">支付时间</text
          ><text>{{ dateText(order.paidAt) }}</text></view
        ><view v-if="order.statusLogs?.length" class="latest-log small muted"
          >最新动态：{{
            order.statusLogs[order.statusLogs.length - 1].note ||
            statusText(order.status)
          }}</view
        ></view
      ><AppButton
        v-if="['CANCELLED', 'DELIVERED', 'COMPLETED'].includes(order.status)"
        class="primary-btn"
        @tap="shop"
        >再次点餐</AppButton
      ><AppButton class="text-btn" @tap="goHome">继续逛逛</AppButton></view
    ></view
  >
</template>
<style scoped>
.status-panel {
  background: #e8f0dc;
  border-radius: 19px;
  padding: 24px 20px;
  color: #245d3f;
}
.status-panel.cancelled {
  background: #e9ede4;
  color: #75816c;
}
.status-title {
  font-size: 25px;
  font-weight: 600;
}
.status-description {
  font-size: 13px;
  margin-top: 7px;
}
.countdown {
  font-size: 12px;
  margin-top: 12px;
}
.timeline {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 26px;
}
.timeline-step {
  font-size: 10px;
  text-align: center;
  color: #88967b;
}
.timeline-dot {
  width: 8px;
  height: 8px;
  background: #becbb0;
  border-radius: 50%;
  margin: 0 auto 8px;
}
.timeline-step.done {
  color: #245d3f;
}
.done .timeline-dot {
  background: #245d3f;
}
.current .timeline-dot {
  box-shadow: 0 0 0 4px #cbdcba;
}
.payment-actions {
  display: flex;
  gap: 10px;
}
.payment-actions .primary-btn {
  flex: 1;
}
.order-shop {
  display: flex;
  gap: 8px;
  align-items: center;
  text-align: left;
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  min-height: 32px;
}
.order-shop text {
  flex: 1;
}
.item-row {
  font-size: 13px;
}
.item-row .small {
  margin-top: 4px;
}
.total {
  font-size: 22px;
  font-weight: 600;
}
.contact-button {
  margin-top: 12px;
  min-height: 42px;
  font-size: 13px;
}
.address-detail {
  margin: 14px 0 7px;
  overflow-wrap: anywhere;
}
.remark {
  font-size: 13px;
  margin-top: 6px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.order-meta .row {
  align-items: flex-start;
}
.order-meta .row text:last-child {
  text-align: right;
  overflow-wrap: anywhere;
}
.latest-log {
  border-top: 1px solid #edf1e8;
  padding-top: 12px;
  margin-top: 8px;
}
</style>
