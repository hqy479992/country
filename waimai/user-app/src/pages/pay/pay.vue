<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { computed, ref } from "vue";
import { onLoad, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Order, Capabilities } from "../../api/types";
import { getToken, requireLogin } from "../../utils/session";
import { confirm, message } from "../../utils/ui";
import { yuan, statusText, paymentRemaining } from "../../utils/format";
import PageHead from "../../components/PageHead.vue";
import DataState from "../../components/DataState.vue";
const id = ref("");
const order = ref<Order | null>(null);
const capabilities = ref<Capabilities | null>(null);
const loading = ref(false);
const paying = ref(false);
const error = ref("");
const loggedIn = ref(false);
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
let ticks = 0;
let visible = false;
const remaining = computed(() =>
  paymentRemaining(order.value?.expiresAt, now.value),
);
async function load() {
  loggedIn.value = !!getToken();
  if (!loggedIn.value) {
    order.value = null;
    return;
  }
  if (!id.value || loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    const [result, cap] = await Promise.all([
      api.getOrder(id.value),
      api.getCapabilities(),
    ]);
    if (visible) {
      order.value = result;
      capabilities.value = cap;
    }
  } catch (e) {
    if (visible) error.value = message(e);
    loggedIn.value = !!getToken();
  } finally {
    loading.value = false;
  }
}
function detail() {
  uni.redirectTo({ url: `/pages/orders/detail?orderId=${id.value}` });
}
async function pay() {
  if (
    paying.value ||
    !order.value ||
    capabilities.value?.paymentMode !== "mock"
  )
    return;
  if (
    !(await confirm(
      "测试支付，不会扣款",
      "此操作仅用于体验订单流程，不会通过微信或银行卡扣款。继续测试？",
    ))
  )
    return;
  paying.value = true;
  error.value = "";
  try {
    await api.payMock(order.value.id);
    uni.showToast({ title: "测试支付成功，未扣款", icon: "none" });
    detail();
  } catch (e) {
    const failure = message(e);
    await load();
    error.value = failure;
  } finally {
    paying.value = false;
  }
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
      order.value?.status === "PENDING_PAYMENT" &&
      !paying.value
    )
      void load();
  }, 1000);
});
onHide(stop);
onUnload(stop);
</script>
<template>
  <view class="page"
    ><PageHead title="支付订单" /><DataState
      v-if="!loggedIn"
      title="登录后继续支付"
      action="去登录"
      @action="requireLogin(`/pages/pay/pay?orderId=${id}`)" /><DataState
      v-else-if="loading && !order"
      kind="loading"
      title="正在查询订单" /><DataState
      v-else-if="error && !order"
      kind="error"
      title="支付信息加载失败"
      :description="error"
      action="重新加载"
      @action="load" /><template v-else-if="order"
      ><view class="pay-heading"
        ><view class="small muted">{{ order.shop?.name || "订单金额" }}</view
        ><view class="pay-amount">{{ yuan(order.totalAmount) }}</view
        ><view class="small muted">{{ statusText(order.status) }}</view
        ><view
          v-if="order.status === 'PENDING_PAYMENT' && order.expiresAt"
          class="pay-countdown"
          >{{
            remaining === "00:00"
              ? "支付已超时，请查看订单状态"
              : `请在 ${remaining} 内完成支付`
          }}</view
        ></view
      ><view class="card"
        ><view v-for="item in order.items" :key="item.id" class="row small"
          ><text>{{ item.productName }} × {{ item.quantity }}</text
          ><text>{{ yuan(item.totalPrice) }}</text></view
        ><view class="divider"></view
        ><view class="row small"
          ><text class="muted">商品小计</text
          ><text>{{ yuan(order.goodsAmount) }}</text></view
        ><view class="row small"
          ><text class="muted">配送费</text
          ><text>{{ yuan(order.deliveryFee) }}</text></view
        ></view
      ><view v-if="error" class="error-message pay-notice" role="alert">{{
        error
      }}</view
      ><template v-if="order.status === 'PENDING_PAYMENT'"
        ><view
          v-if="capabilities?.paymentMode === 'mock'"
          class="notice warning pay-notice"
          >当前为测试支付，不会产生真实扣款。</view
        ><view v-else class="notice pay-notice"
          >正式支付暂未开放。你可以查看或取消这笔未支付订单。</view
        ><AppButton
          v-if="capabilities?.paymentMode === 'mock'"
          class="primary-btn pay-button"
          :disabled="paying || loading || remaining === '00:00'"
          @tap="pay"
          >{{ paying ? "正在处理…" : "测试支付 · 不扣款" }}</AppButton
        ></template
      ><AppButton class="secondary-btn pay-button" @tap="detail"
        >查看订单</AppButton
      ></template
    ><DataState v-else-if="!id" title="没有找到这个订单"
  /></view>
</template>
<style scoped>
.pay-heading {
  text-align: center;
  padding: 31px 0 28px;
}
.pay-amount {
  font-size: 42px;
  font-weight: 600;
  letter-spacing: -1px;
  margin: 9px 0;
}
.pay-countdown {
  margin-top: 14px;
  font-size: 12px;
  color: #9e6b2c;
}
.pay-notice {
  margin-top: 18px;
}
.pay-button {
  margin-top: 16px;
  width: 100%;
}
</style>
