<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import { ApiError } from "../../api/request";
import type { CartItem, Product, Shop, ProductCategory } from "../../api/types";
import AppIcon from "../../components/AppIcon.vue";
import PageHead from "../../components/PageHead.vue";
import DataState from "../../components/DataState.vue";
import { getToken, requireLogin } from "../../utils/session";
import { callPhone, confirm, message, toast } from "../../utils/ui";
import { yuan } from "../../utils/format";
const id = ref("");
const shop = ref<Shop | null>(null);
const cart = ref<CartItem[]>([]);
const loading = ref(true);
const error = ref("");
const cartError = ref("");
const busy = ref(false);
const tab = ref("menu");
const category = ref<ProductCategory | null>(null);
const labels: Record<ProductCategory, string> = {
  FOOD: "美食",
  DRINK: "饮品甜品",
  FRUIT_VEGETABLE: "果蔬",
  CONVENIENCE: "便利",
};
const categories = computed(() => [
  ...new Set((shop.value?.products || []).map((item) => item.category)),
]);
const products = computed(() =>
  (shop.value?.products || []).filter(
    (item) => !category.value || item.category === category.value,
  ),
);
const ownCart = computed(() =>
  cart.value.filter((item) => item.shopId === id.value),
);
const foreignCart = computed(() =>
  cart.value.find((item) => item.shopId !== id.value),
);
const goods = computed(() =>
  ownCart.value.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  ),
);
const count = computed(() =>
  ownCart.value.reduce((sum, item) => sum + item.quantity, 0),
);
const remaining = computed(() =>
  Math.max(0, (shop.value?.minOrderAmount || 0) - goods.value),
);
const returnUrl = () => `/pages/shop/detail?shopId=${id.value}`;
function quantity(productId: string) {
  return (
    ownCart.value.find((item) => item.productId === productId)?.quantity || 0
  );
}
async function loadCart() {
  cartError.value = "";
  cart.value = [];
  if (!getToken()) return;
  try {
    cart.value = await api.getCart();
  } catch (e) {
    cartError.value = message(e);
  }
}
async function loadShop() {
  loading.value = true;
  error.value = "";
  try {
    shop.value = await api.getShop(id.value);
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
async function reload() {
  await Promise.allSettled([loadShop(), loadCart()]);
}
async function add(product: Product) {
  if (busy.value || !requireLogin(returnUrl())) return;
  busy.value = true;
  try {
    if (cartError.value) {
      await loadCart();
      if (cartError.value) throw new Error(cartError.value);
    }
    let replace = false;
    if (foreignCart.value) {
      replace = await confirm(
        "换一家商家点餐",
        `购物车已有「${foreignCart.value.shop.name}」的商品，清空后加入当前商品？`,
      );
      if (!replace) return;
    }
    try {
      await api.addCartItem(product.id, 1, replace);
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.code === "CART_SHOP_CONFLICT" &&
        (await confirm(
          "购物车已更新",
          "购物车已有其他商家的商品，是否清空后换店？",
        ))
      ) {
        await api.addCartItem(product.id, 1, true);
      } else throw e;
    }
    await loadCart();
  } catch (e) {
    toast(e);
    if (e instanceof ApiError && e.status === 401) requireLogin(returnUrl());
  } finally {
    busy.value = false;
  }
}
async function decrease(product: Product) {
  const item = ownCart.value.find(
    (current) => current.productId === product.id,
  );
  if (!item || busy.value) return;
  busy.value = true;
  try {
    if (item.quantity === 1) await api.removeCartItem(item.id);
    else await api.updateCartItem(item.id, item.quantity - 1);
    await loadCart();
  } catch (e) {
    toast(e);
  } finally {
    busy.value = false;
  }
}
function checkout() {
  if (requireLogin(returnUrl())) uni.navigateTo({ url: "/pages/cart/cart" });
}
onLoad((query) => {
  id.value = String(query?.shopId || "");
});
onShow(reload);
</script>
<template>
  <view class="page with-footer"
    ><PageHead title="商家点餐" /><DataState
      v-if="loading && !shop"
      kind="loading"
      title="正在加载菜单"
    /><DataState
      v-else-if="error"
      kind="error"
      title="商家加载失败"
      :description="error"
      action="重新加载"
      @action="reload"
    /><template v-else-if="shop"
      ><view class="shop-heading card"
        ><image
          v-if="shop.logoUrl"
          class="shop-logo"
          :src="shop.logoUrl"
          mode="aspectFill"
        /><view v-else class="shop-logo monogram">{{
          shop.name.slice(0, 1)
        }}</view
        ><view class="shop-title"
          ><view class="title">{{ shop.name }}</view
          ><view class="small muted shop-fees"
            >{{ shop.status === "OPEN" ? "营业中" : "休息中" }} · 起送
            {{ yuan(shop.minOrderAmount) }} · 配送
            {{ yuan(shop.deliveryFee) }}</view
          ></view
        ><view v-if="shop.announcement" class="announcement">{{
          shop.announcement
        }}</view></view
      ><view class="chips tabs"
        ><AppButton
          class="chip"
          :class="{ active: tab === 'menu' }"
          @tap="tab = 'menu'"
          >点餐</AppButton
        ><AppButton
          class="chip"
          :class="{ active: tab === 'info' }"
          @tap="tab = 'info'"
          >商家信息</AppButton
        ></view
      ><template v-if="tab === 'menu'"
        ><view v-if="shop.status !== 'OPEN'" class="notice warning"
          >商家当前休息中，可以浏览菜单，暂时不能下单。</view
        ><view v-if="foreignCart" class="notice cart-notice"
          ><text>购物车中有「{{ foreignCart.shop.name }}」的商品</text
          ><AppButton class="text-btn small" @tap="checkout"
            >查看购物车</AppButton
          ></view
        ><view v-if="cartError" class="notice warning"
          ><text>{{ cartError }}</text
          ><AppButton class="text-btn small" @tap="loadCart"
            >重新加载购物车</AppButton
          ></view
        ><view v-if="categories.length > 1" class="chips category-row"
          ><AppButton
            class="chip"
            :class="{ active: !category }"
            @tap="category = null"
            >全部</AppButton
          ><AppButton
            v-for="item in categories"
            :key="item"
            class="chip"
            :class="{ active: category === item }"
            @tap="category = item"
            >{{ labels[item] }}</AppButton
          ></view
        ><view class="section-head"
          ><text class="section-title">本店菜单</text
          ><text class="small muted">{{ products.length }} 款商品</text></view
        ><DataState
          v-if="!products.length"
          title="菜单正在准备中"
          description="商家还没有上架商品，稍后再来看看" /><view
          v-else
          class="card product-list"
          ><view v-for="product in products" :key="product.id" class="product"
            ><image
              v-if="product.imageUrl"
              class="product-image"
              :src="product.imageUrl"
              mode="aspectFill" /><view
              v-else
              class="product-image product-placeholder"
              ><AppIcon
                :name="
                  product.category === 'DRINK'
                    ? 'drink'
                    : product.category === 'FOOD'
                      ? 'food'
                      : 'fresh'
                "
                :size="28" /></view
            ><view class="product-copy"
              ><view class="product-name">{{ product.name }}</view
              ><view
                v-if="product.description"
                class="small muted product-description"
                >{{ product.description }}</view
              ><view class="price product-price">{{
                yuan(product.price)
              }}</view></view
            ><view class="product-controls"
              ><text
                v-if="!product.stock || !product.isOnSale"
                class="pill muted"
                >已售罄</text
              ><view v-else class="stepper"
                ><AppButton
                  :disabled="busy || !quantity(product.id)"
                  :aria-label="`减少${product.name}`"
                  @tap="decrease(product)"
                  ><AppIcon name="minus" :size="14" /></AppButton
                ><text>{{ quantity(product.id) }}</text
                ><AppButton
                  class="add"
                  :disabled="
                    busy ||
                    shop.status !== 'OPEN' ||
                    quantity(product.id) >= product.stock ||
                    quantity(product.id) >= 99
                  "
                  :aria-label="`添加${product.name}`"
                  @tap="add(product)"
                  ><AppIcon
                    name="plus"
                    color="#fff"
                    :size="
                      15
                    " /></AppButton></view></view></view></view></template
      ><view v-else class="card stack"
        ><view
          ><view class="section-title">商家公告</view
          ><view class="muted info-line">{{
            shop.announcement || "暂无公告"
          }}</view></view
        ><view
          ><view class="section-title">营业时间</view
          ><view class="muted info-line">{{
            shop.businessHours || "请联系商家确认营业时间"
          }}</view></view
        ><view
          ><view class="section-title">门店地址</view
          ><view class="muted info-line">{{ shop.address }}</view></view
        ><AppButton
          v-if="shop.phone"
          class="secondary-btn"
          @tap="callPhone(shop.phone)"
          ><AppIcon name="phone" :size="17" />联系商家</AppButton
        ></view
      ><view class="fixed-footer"
        ><view
          ><view class="footer-amount">{{ yuan(goods) }}</view
          ><view class="small muted"
            >{{ count }} 件 · 配送费另计 {{ yuan(shop.deliveryFee) }}</view
          ></view
        ><AppButton
          class="primary-btn"
          :disabled="
            busy ||
            loading ||
            !!cartError ||
            shop.status !== 'OPEN' ||
            (remaining > 0 && count > 0)
          "
          @tap="checkout"
          >{{
            shop.status !== "OPEN"
              ? "商家休息中"
              : count === 0
                ? "查看购物车"
                : remaining > 0
                  ? `还差 ${yuan(remaining)} 起送`
                  : "去结算"
          }}</AppButton
        ></view
      ></template
    ></view
  >
</template>
<style scoped>
.shop-heading {
  display: flex;
  gap: 13px;
  flex-wrap: wrap;
}
.shop-logo {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  flex-shrink: 0;
}
.monogram {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e7f0dc;
  color: #245d3f;
  font-size: 27px;
}
.shop-title {
  flex: 1;
  min-width: 0;
}
.shop-fees {
  margin-top: 7px;
}
.announcement {
  width: 100%;
  font-size: 12px;
  color: #73816c;
  border-top: 1px solid #edf0e8;
  padding-top: 12px;
}
.tabs {
  margin: 18px 0;
}
.category-row {
  margin-top: 18px;
}
.product-list {
  padding-top: 0;
  padding-bottom: 0;
}
.product {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-wrap: wrap;
  padding: 18px 0;
  border-bottom: 1px solid #ecf0e7;
}
.product:last-child {
  border: 0;
}
.product-image {
  width: 67px;
  height: 72px;
  border-radius: 12px;
  flex-shrink: 0;
}
.product-placeholder {
  background: #edf3e7;
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-copy {
  flex: 1;
  min-width: 120px;
}
.product-name {
  font-size: 15px;
  font-weight: 600;
}
.product-description {
  margin-top: 5px;
  overflow-wrap: anywhere;
}
.product-price {
  font-size: 17px;
  margin-top: 8px;
}
.product-controls {
  margin-left: auto;
}
.info-line {
  margin-top: 8px;
  font-size: 13px;
}
.cart-notice {
  margin-top: 12px;
}
.cart-notice .text-btn {
  display: inline;
  font-size: 12px;
  margin-left: 8px;
}
@media (min-width: 420px) {
  .product-copy {
    min-width: 140px;
  }
}
</style>
