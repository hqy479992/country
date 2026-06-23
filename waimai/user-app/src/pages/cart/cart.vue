<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { CartItem, UserAddress } from "../../api/types";
import { yuan } from "../../utils/format";

const cartItems = ref<CartItem[]>([]);
const addresses = ref<UserAddress[]>([]);
const remark = ref("");
const submitting = ref(false);

const address = computed(() => addresses.value[0]);
const goodsAmount = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
);
const deliveryFee = computed(() => cartItems.value[0]?.shop.deliveryFee ?? 0);
const totalAmount = computed(() => goodsAmount.value + deliveryFee.value);
const cartCount = computed(() => cartItems.value.reduce((sum, item) => sum + item.quantity, 0));

async function loadData() {
  try {
    const [nextCart, nextAddresses] = await Promise.all([api.getCart(), api.getAddresses()]);
    cartItems.value = nextCart;
    addresses.value = nextAddresses;
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  }
}

async function changeQuantity(item: CartItem, quantity: number) {
  if (quantity <= 0) {
    await api.removeCartItem(item.id);
  } else {
    await api.updateCartItem(item.id, quantity);
  }
  await loadData();
}

async function removeItem(item: CartItem) {
  await api.removeCartItem(item.id);
  await loadData();
}

async function clearCart() {
  if (cartItems.value.length === 0) return;
  uni.showModal({
    title: "清空购物车",
    content: "确认删除购物车里的所有商品？",
    success: async (result) => {
      if (!result.confirm) return;
      await api.clearCart();
      await loadData();
    }
  });
}

async function submitOrder() {
  if (!address.value) {
    uni.showToast({ title: "请先添加收货地址", icon: "none" });
    return;
  }
  if (cartItems.value.length === 0) {
    uni.showToast({ title: "购物车为空", icon: "none" });
    return;
  }

  submitting.value = true;
  try {
    const order = await api.createOrder(address.value.id, remark.value);
    uni.redirectTo({ url: `/pages/pay/pay?orderId=${order.id}` });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "下单失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

function goAddress() {
  uni.navigateTo({ url: "/pages/address/index" });
}

function goHome() {
  uni.reLaunch({ url: "/pages/index/index" });
}

onShow(loadData);
</script>

<template>
  <view class="page">
    <view v-if="address" class="card address">
      <view class="address-row">
        <view>
          <view class="address-title">{{ address.name }} {{ address.phone }}</view>
          <view class="muted">{{ address.region }} {{ address.detail }}</view>
        </view>
        <view class="address-link" @tap="goAddress">更换</view>
      </view>
    </view>
    <view v-else class="card address-empty" @tap="goAddress">暂无地址，点击添加</view>

    <view class="cart-header">
      <view>
        <view class="cart-title">购物车列表</view>
        <view class="muted">{{ cartCount }} 件商品</view>
      </view>
      <view class="clear-link" @tap="clearCart">清空</view>
    </view>

    <view class="card items">
      <view class="shop-name">{{ cartItems[0]?.shop.name || "购物车" }}</view>
      <view v-if="cartItems.length === 0" class="empty">
        <view>购物车为空</view>
        <view class="secondary-btn back-btn" @tap="goHome">去逛逛</view>
      </view>
      <view v-for="item in cartItems" :key="item.id" class="item">
        <view class="item-main">
          <view class="item-name">{{ item.product.name }}</view>
          <view class="muted">单价 {{ yuan(item.product.price) }}</view>
          <view class="price">小计 {{ yuan(item.product.price * item.quantity) }}</view>
        </view>
        <view class="item-actions">
          <view class="counter">
            <view class="counter-btn" @tap="changeQuantity(item, item.quantity - 1)">-</view>
            <view>{{ item.quantity }}</view>
            <view class="counter-btn" @tap="changeQuantity(item, item.quantity + 1)">+</view>
          </view>
          <view class="remove-link" @tap="removeItem(item)">删除</view>
        </view>
      </view>
    </view>

    <view class="card">
      <input v-model="remark" class="remark" placeholder="订单备注，可不填" />
    </view>

    <view class="summary" v-if="cartItems.length > 0">
      <view class="row">
        <text>商品金额</text>
        <text>{{ yuan(goodsAmount) }}</text>
      </view>
      <view class="row">
        <text>配送费</text>
        <text>{{ yuan(deliveryFee) }}</text>
      </view>
      <view class="row total">
        <text>合计</text>
        <text>{{ yuan(totalAmount) }}</text>
      </view>
      <view class="primary-btn" @tap="submitOrder">{{ submitting ? "提交中..." : "提交订单" }}</view>
    </view>

    <view class="fixed-checkout" v-if="cartItems.length > 0">
      <view>
        <view class="muted">合计</view>
        <view class="checkout-price">{{ yuan(totalAmount) }}</view>
      </view>
      <view class="checkout-btn" @tap="submitOrder">{{ submitting ? "提交中..." : "提交订单" }}</view>
    </view>
  </view>
</template>

<style scoped>
.address {
  margin-bottom: 18rpx;
}

.address-title,
.shop-name {
  font-weight: 800;
  margin-bottom: 8rpx;
}

.address-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.address-link {
  color: #165dff;
  font-weight: 800;
  white-space: nowrap;
}

.address-empty {
  margin-bottom: 18rpx;
  color: #165dff;
  font-weight: 800;
}

.items {
  margin-bottom: 18rpx;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 22rpx 0 14rpx;
}

.cart-title {
  font-size: 34rpx;
  font-weight: 900;
}

.clear-link,
.remove-link {
  color: #d92d20;
  font-weight: 800;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 18rpx 0;
  border-top: 1rpx solid #eaecf0;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-actions {
  display: grid;
  justify-items: end;
  gap: 10rpx;
}

.item-name {
  font-weight: 700;
  margin-bottom: 8rpx;
}

.counter {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.counter-btn {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #eef4ff;
  color: #165dff;
  font-weight: 800;
}

.remark {
  height: 72rpx;
}

.summary {
  margin-top: 18rpx;
  margin-bottom: 130rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #fff;
}

.fixed-checkout {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 28rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #1f2329;
  color: #fff;
}

.checkout-price {
  color: #ffd666;
  font-size: 34rpx;
  font-weight: 900;
}

.checkout-btn {
  min-width: 190rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: #1677ff;
  font-weight: 900;
}

.back-btn {
  width: 240rpx;
  margin: 24rpx auto 0;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 18rpx;
  color: #667085;
}

.total {
  color: #1f2329;
  font-size: 34rpx;
  font-weight: 800;
}

.empty {
  padding: 40rpx 0;
  text-align: center;
  color: #667085;
}
</style>
