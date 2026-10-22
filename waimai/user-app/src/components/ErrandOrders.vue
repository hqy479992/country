<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { api } from "../api";
import type { ErrandOrder } from "../api/types";
import { session, getToken, requireLogin } from "../utils/session";
import { message } from "../utils/ui";
import { errandFee, errandLabel, errandStatus } from "../utils/errands";
import { yuan, dateText } from "../utils/format";
import AppButton from "./AppButton.vue";
import DataState from "./DataState.vue";
const props = defineProps<{ active: boolean; filter: string }>();
const orders = ref<ErrandOrder[]>([]),
  loading = ref(false),
  error = ref("");
let timer: ReturnType<typeof setInterval> | undefined,
  generation = 0;
const filtered = computed(() =>
  orders.value.filter(
    (o) =>
      props.filter === "all" ||
      (props.filter === "pay" && o.status === "PENDING_PAYMENT") ||
      (props.filter === "active" &&
        [
          "PENDING_QUOTE",
          "PENDING_ASSIGN",
          "RIDER_ACCEPTED",
          "PICKED_UP",
        ].includes(o.status)) ||
      (props.filter === "done" &&
        ["COMPLETED", "DELIVERED"].includes(o.status)) ||
      (props.filter === "cancelled" && o.status === "CANCELLED"),
  ),
);
async function load() {
  if (loading.value || !props.active || !getToken()) return;
  const version = generation;
  loading.value = true;
  try {
    const rows = await api.getErrandOrders();
    if (version === generation) {
      orders.value = rows;
      error.value = "";
    }
  } catch (e) {
    if (version === generation) error.value = message(e);
  } finally {
    if (version === generation) loading.value = false;
  }
}
function stop() {
  if (timer) clearInterval(timer);
  timer = undefined;
  generation++;
  loading.value = false;
}
watch(
  () => [props.active, session.value?.token],
  () => {
    stop();
    orders.value = [];
    error.value = "";
    if (props.active && getToken()) {
      void load();
      timer = setInterval(load, 15000);
    }
  },
  { immediate: true },
);
onUnmounted(stop);
function open(id: string) {
  uni.navigateTo({ url: `/pages/errand/detail?orderId=${id}` });
}
function create() {
  if (requireLogin("/pages/errand/create"))
    uni.navigateTo({ url: "/pages/errand/create" });
}
</script>
<template>
  <view
    ><view class="row create-row"
      ><text class="muted small">帮送、帮取、帮买</text
      ><AppButton class="outline-btn" @tap="create">发布跑腿</AppButton
      ><AppButton class="text-btn small" :disabled="loading" @tap="load"
        >刷新</AppButton
      ></view
    >
    <DataState
      v-if="!session"
      title="登录后查看跑腿订单"
      action="去登录"
      @action="requireLogin('/pages/orders/index?type=errand')"
    />
    <DataState
      v-else-if="loading && !orders.length"
      kind="loading"
      title="正在加载跑腿订单"
    />
    <DataState
      v-else-if="error && !orders.length"
      kind="error"
      title="订单加载失败"
      :description="error"
      action="重新加载"
      @action="load"
    />
    <template v-else
      ><view v-if="error" class="notice warning">{{ error }}</view
      ><DataState
        v-if="!filtered.length"
        title="这里还没有跑腿订单"
        description="需要取件、送物或代买？发布一个需求吧"
        action="发布跑腿"
        @action="create"
      />
      <view class="stack"
        ><AppButton
          v-for="o in filtered"
          :key="o.id"
          class="card errand-row"
          @tap="open(o.id)"
          ><view class="row"
            ><text class="kind">{{ errandLabel(o) }}</text
            ><text class="status">{{ errandStatus(o.status) }}</text></view
          ><view class="route"
            >{{ o.pickupAddressSnapshot.region }}
            {{ o.pickupAddressSnapshot.detail
            }}<view class="route-arrow">↓</view
            >{{ o.deliveryAddressSnapshot.region }}
            {{ o.deliveryAddressSnapshot.detail }}</view
          ><view class="small muted ellipsis">{{ o.itemNote }}</view
          ><view class="row bottom"
            ><text class="muted small">{{ dateText(o.createdAt) }}</text
            ><text class="price">{{ errandFee(o) }}</text></view
          ></AppButton
        ></view
      ></template
    ></view
  >
</template>
<style scoped>
.create-row {
  gap: 10px;
  margin: 0 0 18px;
}
.create-row > text {
  flex: 1;
}
.errand-row {
  width: 100%;
  text-align: left;
  padding: 20px;
}
.kind {
  font-size: 16px;
  font-weight: 600;
}
.status {
  font-size: 12px;
  color: #245d3f;
}
.route {
  font-size: 14px;
  line-height: 1.6;
  margin: 16px 0 12px;
  overflow-wrap: anywhere;
}
.route-arrow {
  color: #9aa78e;
  margin: 2px 0;
}
.bottom {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #edf1e8;
}
.price {
  font-size: 18px;
  color: #245d3f;
  font-weight: 600;
}
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
