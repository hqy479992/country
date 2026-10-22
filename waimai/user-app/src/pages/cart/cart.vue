<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { CartItem, CartQuote, UserAddress } from "../../api/types";
import { ApiError } from "../../api/request";
import { getToken, requireLogin, selectedAddressId } from "../../utils/session";
import { confirm, goHome, message, toast } from "../../utils/ui";
import { yuan } from "../../utils/format";
import PageHead from "../../components/PageHead.vue";
import AppIcon from "../../components/AppIcon.vue";
import DataState from "../../components/DataState.vue";
const quote = ref<CartQuote | null>(null);
const addresses = ref<UserAddress[]>([]);
const remark = ref("");
const loading = ref(false);
const busy = ref(false);
const error = ref("");
const account = ref(false);
const address = computed(
  () =>
    addresses.value.find((item) => item.id === selectedAddressId()) ||
    addresses.value.find((item) => item.isDefault) ||
    addresses.value[0],
);
async function load() {
  account.value = !!getToken();
  if (!account.value) {
    quote.value = null;
    addresses.value = [];
    return;
  }
  if (loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    const [cart, nextAddresses] = await Promise.all([
      api.getQuote(),
      api.getAddresses(),
    ]);
    quote.value = cart;
    addresses.value = nextAddresses;
  } catch (e) {
    error.value = message(e);
    account.value = !!getToken();
  } finally {
    loading.value = false;
  }
}
async function change(item: CartItem, delta: number) {
  if (busy.value) return;
  busy.value = true;
  try {
    if (item.quantity + delta <= 0) await api.removeCartItem(item.id);
    else await api.updateCartItem(item.id, item.quantity + delta);
    quote.value = await api.getQuote();
  } catch (e) {
    toast(e);
  } finally {
    busy.value = false;
  }
}
async function clear() {
  if (busy.value || !(await confirm("清空购物车", "确定移除全部商品？")))
    return;
  busy.value = true;
  try {
    await api.clearCart();
    quote.value = await api.getQuote();
  } catch (e) {
    toast(e);
  } finally {
    busy.value = false;
  }
}
function chooseAddress() {
  if (requireLogin("/pages/cart/cart"))
    uni.navigateTo({ url: "/pages/address/index?select=1" });
}
async function submit() {
  if (busy.value || loading.value || !quote.value?.canOrder) return;
  if (!address.value) {
    chooseAddress();
    return;
  }
  busy.value = true;
  error.value = "";
  const signature = JSON.stringify([
    quote.value.version,
    address.value.id,
    remark.value.trim(),
  ]);
  const previous = uni.getStorageSync("town-order-attempt") as
    | { signature: string; requestId: string }
    | undefined;
  const requestId =
    previous?.signature === signature
      ? previous.requestId
      : `order-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  uni.setStorageSync("town-order-attempt", { signature, requestId });
  try {
    const order = await api.createOrder(
      address.value.id,
      remark.value.trim(),
      requestId,
      quote.value.version,
    );
    uni.removeStorageSync("town-order-attempt");
    uni.redirectTo({ url: `/pages/pay/pay?orderId=${order.id}` });
  } catch (e) {
    error.value = message(e);
    if (e instanceof ApiError && e.status === 401)
      requireLogin("/pages/cart/cart");
    else {
      try {
        quote.value = await api.getQuote();
        if (!quote.value.items.length) {
          uni.showToast({
            title: "请到订单页确认是否已创建订单",
            icon: "none",
          });
          uni.redirectTo({ url: "/pages/orders/index" });
        }
      } catch {
        /* Keep the retryable error and idempotency key. */
      }
    }
  } finally {
    busy.value = false;
  }
}
onShow(load);
</script>
<template>
  <view class="page with-footer"
    ><PageHead title="确认订单" /><DataState
      v-if="!account"
      title="登录后继续点餐"
      description="购物车与收货地址会保存在你的账户中"
      action="去登录"
      @action="requireLogin('/pages/cart/cart')"
    /><DataState
      v-else-if="loading && !quote"
      kind="loading"
      title="正在确认商品和费用"
    /><DataState
      v-else-if="error && !quote"
      kind="error"
      title="订单信息加载失败"
      :description="error"
      action="重新加载"
      @action="load"
    /><DataState
      v-else-if="quote && !quote.items.length"
      title="购物车还是空的"
      description="去附近商家挑点喜欢的吧"
      action="去逛逛"
      @action="goHome"
    /><template v-else-if="quote"
      ><view class="stack"
        ><AppButton class="card address-card" @tap="chooseAddress"
          ><AppIcon name="pin" :size="24" /><view class="address-copy"
            ><view class="small muted">送到这里</view
            ><template v-if="address"
              ><view class="address-line"
                >{{ address.region }} {{ address.detail }}</view
              ><view class="small muted"
                >{{ address.name }} · {{ address.phone }}</view
              ></template
            ><view v-else class="address-line">请选择收货地址</view></view
          ><AppIcon name="arrow" :size="17" color="#829078" /></AppButton
        ><view v-if="error" class="error-message" role="alert">{{ error }}</view
        ><view v-if="quote.issues.length" class="notice warning"
          ><view v-for="issue in quote.issues" :key="issue">{{
            issue
          }}</view></view
        ><view class="card"
          ><view class="section-head cart-head"
            ><text class="section-title">{{ quote.shop?.name }}</text
            ><AppButton class="text-btn small" :disabled="busy" @tap="clear"
              >清空</AppButton
            ></view
          ><view v-for="item in quote.items" :key="item.id" class="cart-item"
            ><view class="item-copy"
              ><view class="item-name">{{ item.product.name }}</view
              ><view class="small muted"
                >{{ yuan(item.product.price) }} / 份<text
                  v-if="!item.product.isOnSale || !item.product.stock"
                  class="danger"
                >
                  · 已下架或售罄</text
                ></view
              ></view
            ><view class="item-right"
              ><view class="item-total">{{
                yuan(item.product.price * item.quantity)
              }}</view
              ><view class="stepper"
                ><AppButton
                  :disabled="busy || loading"
                  :aria-label="`减少${item.product.name}`"
                  @tap="change(item, -1)"
                  ><AppIcon name="minus" :size="13" /></AppButton
                ><text>{{ item.quantity }}</text
                ><AppButton
                  class="add"
                  :disabled="
                    busy ||
                    loading ||
                    item.quantity >= item.product.stock ||
                    item.quantity >= 99 ||
                    !item.product.isOnSale
                  "
                  :aria-label="`添加${item.product.name}`"
                  @tap="change(item, 1)"
                  ><AppIcon
                    name="plus"
                    :size="14"
                    color="#fff" /></AppButton></view></view></view
          ><view class="divider"></view
          ><view class="row small"
            ><text class="muted">商品小计</text
            ><text>{{ yuan(quote.goodsAmount) }}</text></view
          ><view class="row small"
            ><text class="muted">配送费</text
            ><text>{{ yuan(quote.deliveryFee) }}</text></view
          ><view class="row"
            ><text>合计</text
            ><text class="bill-total">{{ yuan(quote.totalAmount) }}</text></view
          ></view
        ><view class="card"
          ><label class="form-field remark-field"
            ><text class="field-label">订单备注</text
            ><textarea
              v-model="remark"
              maxlength="200"
              placeholder="口味、餐具等要求（选填）"
              aria-label="订单备注"
              :disabled="busy"
            /></label></view
        ><view class="notice"
          >提交后请在15分钟内完成支付，超时将自动取消订单。</view
        ></view
      ><view class="fixed-footer"
        ><view
          ><view class="small muted">应付金额</view
          ><view class="footer-amount">{{
            yuan(quote.totalAmount)
          }}</view></view
        ><AppButton
          class="primary-btn"
          :disabled="busy || loading || !quote.canOrder"
          @tap="submit"
          >{{
            busy ? "正在提交…" : !address ? "选择收货地址" : "提交订单"
          }}</AppButton
        ></view
      ></template
    ></view
  >
</template>
<style scoped>
.address-card {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  width: 100%;
}
.address-copy {
  flex: 1;
  min-width: 0;
}
.address-line {
  font-size: 16px;
  font-weight: 600;
  margin: 5px 0;
  overflow-wrap: anywhere;
}
.cart-head {
  margin: 0 0 10px;
}
.cart-item {
  display: flex;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid #edf1e8;
}
.item-copy {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-size: 14px;
  margin-bottom: 5px;
}
.item-right {
  text-align: right;
}
.item-total {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 9px;
}
.bill-total {
  font-size: 21px;
  font-weight: 600;
}
.remark-field {
  margin: 0;
}
.remark-field textarea {
  height: 78px;
}
</style>
