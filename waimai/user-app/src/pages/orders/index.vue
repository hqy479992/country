<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { computed, ref } from "vue";
import { onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Order } from "../../api/types";
import { getToken, requireLogin } from "../../utils/session";
import { message } from "../../utils/ui";
import { statusText, statusClass, yuan, dateText } from "../../utils/format";
import PageHead from "../../components/PageHead.vue";
import BottomNav from "../../components/BottomNav.vue";
import DataState from "../../components/DataState.vue";
import AppIcon from "../../components/AppIcon.vue";
const orders = ref<Order[]>([]);
const loading = ref(false);
const error = ref("");
const active = ref("all");
const loggedIn = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
let visible = false;
const filters = [
  { key: "all", label: "全部" },
  { key: "pay", label: "待支付" },
  { key: "active", label: "进行中" },
  { key: "done", label: "已完成" },
  { key: "cancelled", label: "已取消" },
];
const filtered = computed(() =>
  orders.value.filter(
    (order) =>
      active.value === "all" ||
      (active.value === "pay" && order.status === "PENDING_PAYMENT") ||
      (active.value === "active" &&
        [
          "PAID",
          "MERCHANT_ACCEPTED",
          "READY_FOR_PICKUP",
          "RIDER_ACCEPTED",
          "PICKED_UP",
        ].includes(order.status)) ||
      (active.value === "done" &&
        ["DELIVERED", "COMPLETED"].includes(order.status)) ||
      (active.value === "cancelled" && order.status === "CANCELLED"),
  ),
);
async function load(silent = false) {
  loggedIn.value = !!getToken();
  if (!loggedIn.value) {
    orders.value = [];
    return;
  }
  if (loading.value) return;
  loading.value = true;
  if (!silent) error.value = "";
  try {
    const result = await api.getOrders();
    if (visible) {
      orders.value = result;
      error.value = "";
    }
  } catch (e) {
    if (visible) error.value = message(e);
    loggedIn.value = !!getToken();
  } finally {
    loading.value = false;
  }
}
function open(order: Order) {
  uni.navigateTo({ url: `/pages/orders/detail?orderId=${order.id}` });
}
function pay(order: Order) {
  uni.navigateTo({ url: `/pages/pay/pay?orderId=${order.id}` });
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
    if (
      orders.value.some(
        (order) =>
          !["COMPLETED", "DELIVERED", "CANCELLED"].includes(order.status),
      )
    )
      void load(true);
  }, 15000);
});
onHide(stop);
onUnload(stop);
</script>
<template>
  <view class="page with-nav"
    ><PageHead title="我的订单" :back="false"
      ><AppButton class="text-btn small" :disabled="loading" @tap="load()"
        >刷新</AppButton
      ></PageHead
    ><DataState
      v-if="!loggedIn"
      title="登录后查看订单"
      description="在这里查看备餐、配送和历史订单"
      action="去登录"
      @action="requireLogin('/pages/orders/index')" /><template v-else
      ><view class="chips order-filters"
        ><AppButton
          v-for="filter in filters"
          :key="filter.key"
          class="chip"
          :class="{ active: active === filter.key }"
          @tap="active = filter.key"
          >{{ filter.label }}</AppButton
        ></view
      ><DataState
        v-if="loading && !orders.length"
        kind="loading"
        title="正在加载订单"
      /><DataState
        v-else-if="error && !orders.length"
        kind="error"
        title="订单加载失败"
        :description="error"
        action="重新加载"
        @action="load()"
      /><template v-else
        ><view v-if="error" class="notice warning refresh-notice"
          >刷新失败，当前显示上次结果。{{ error }}</view
        ><DataState
          v-if="!filtered.length"
          title="这里还没有订单"
          :description="
            active === 'all' ? '去附近商家挑点喜欢的吧' : '换个订单分类看看'
          "
        /><view v-else class="stack"
          ><view
            v-for="order in filtered"
            :key="order.id"
            class="card order-card"
            ><AppButton class="order-main" @tap="open(order)"
              ><view class="row order-header"
                ><view class="order-shop"
                  ><AppIcon name="store" :size="18" /><text>{{
                    order.shop?.name || "商家"
                  }}</text
                  ><AppIcon name="arrow" :size="14" color="#829177" /></view
                ><text
                  class="order-status"
                  :class="statusClass(order.status)"
                  >{{ statusText(order.status) }}</text
                ></view
              ><view class="order-products"
                ><text>{{
                  order.items.map((item) => item.productName).join("、")
                }}</text></view
              ><view class="row small"
                ><text class="muted">{{ dateText(order.createdAt) }}</text
                ><text class="order-price">{{
                  yuan(order.totalAmount)
                }}</text></view
              ></AppButton
            ><view class="order-actions"
              ><text class="small muted"
                >共
                {{ order.items.reduce((sum, item) => sum + item.quantity, 0) }}
                件商品</text
              ><AppButton
                v-if="order.status === 'PENDING_PAYMENT'"
                class="pay-button"
                @tap="pay(order)"
                >继续支付</AppButton
              ><AppButton v-else class="outline-btn" @tap="open(order)"
                >查看详情</AppButton
              ></view
            ></view
          ></view
        ></template
      ></template
    ><BottomNav active="orders"
  /></view>
</template>
<style scoped>
.order-filters {
  gap: 6px;
  margin: 4px 0 20px;
}
.order-filters .chip {
  font-size: 12px;
  padding-left: 11px;
  padding-right: 11px;
}
.order-main {
  width: 100%;
  text-align: left;
}
.order-header {
  padding-top: 0;
}
.order-shop {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-weight: 600;
}
.order-shop text {
  overflow-wrap: anywhere;
}
.order-status {
  font-size: 12px;
  color: #245d3f;
  flex-shrink: 0;
}
.order-status.paying {
  color: #a56524;
}
.order-status.cancelled {
  color: #8a9481;
}
.order-products {
  font-size: 14px;
  margin: 11px 0;
  color: #53654d;
}
.order-price {
  font-size: 18px;
  font-weight: 600;
  color: #263c2e;
}
.order-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #edf1e8;
}
.pay-button {
  background: #245d3f;
  color: #fff;
  border-radius: 10px;
  min-height: 42px;
  padding: 10px 15px;
  font-size: 13px;
}
.refresh-notice {
  margin-bottom: 12px;
}
</style>
