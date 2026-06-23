<script setup lang="ts">
import { reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { Product, ProductCategory } from "../../api/types";
import { centsToYuan, yuan, yuanToCents } from "../../utils/format";

const products = ref<Product[]>([]);
const editingId = ref("");
const productCategories: Array<{ key: ProductCategory; label: string }> = [
  { key: "FOOD", label: "美食" },
  { key: "DRINK", label: "甜品饮品" },
  { key: "FRUIT_VEGETABLE", label: "蔬菜水果" },
  { key: "CONVENIENCE", label: "超市便利" }
];
const form = reactive({
  name: "",
  description: "",
  category: "FOOD" as ProductCategory,
  price: "",
  stock: "9999"
});

async function loadProducts() {
  try {
    products.value = await api.getProducts();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
  }
}

function resetForm() {
  editingId.value = "";
  form.name = "";
  form.description = "";
  form.category = "FOOD";
  form.price = "";
  form.stock = "9999";
}

function editProduct(product: Product) {
  editingId.value = product.id;
  form.name = product.name;
  form.description = product.description || "";
  form.category = product.category;
  form.price = centsToYuan(product.price);
  form.stock = String(product.stock);
}

function categoryLabel(category: ProductCategory) {
  return productCategories.find((item) => item.key === category)?.label || "美食";
}

async function submitProduct() {
  if (!form.name || !form.price) {
    uni.showToast({ title: "请填写商品名称和价格", icon: "none" });
    return;
  }

  try {
    const payload = {
      name: form.name,
      description: form.description,
      category: form.category,
      price: yuanToCents(form.price),
      stock: Number(form.stock || 0)
    };
    if (editingId.value) {
      await api.updateProduct(editingId.value, payload);
      uni.showToast({ title: "商品已更新", icon: "success" });
    } else {
      await api.createProduct(payload);
      uni.showToast({ title: "商品已创建", icon: "success" });
    }
    resetForm();
    await loadProducts();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" });
  }
}

async function toggleSale(product: Product) {
  try {
    if (product.isOnSale) {
      await api.offSaleProduct(product.id);
    } else {
      await api.onSaleProduct(product.id);
    }
    await loadProducts();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
  }
}

async function markSoldOut(product: Product) {
  try {
    await api.updateStock(product.id, 0);
    await loadProducts();
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
  }
}

onShow(loadProducts);
</script>

<template>
  <view class="page">
    <view class="card form-card">
      <view class="block-title">{{ editingId ? "编辑商品" : "新增商品" }}</view>
      <input v-model="form.name" placeholder="商品名称" />
      <input v-model="form.description" placeholder="商品描述" />
      <view class="category-picker">
        <view class="field-label">商品分类</view>
        <view class="category-options">
          <view
            v-for="category in productCategories"
            :key="category.key"
            class="category-option"
            :class="{ active: form.category === category.key }"
            @tap="form.category = category.key"
          >
            {{ category.label }}
          </view>
        </view>
      </view>
      <input v-model="form.price" type="digit" placeholder="价格，单位元" />
      <input v-model="form.stock" type="number" placeholder="库存" />
      <view class="form-actions">
        <view class="secondary-btn" @tap="resetForm">清空</view>
        <view class="primary-btn" @tap="submitProduct">保存</view>
      </view>
    </view>

    <view class="section-title">商品列表</view>
    <view v-if="products.length === 0" class="empty">暂无商品</view>
    <view v-for="product in products" :key="product.id" class="product-card">
      <view class="product-main">
        <view class="product-name">{{ product.name }}</view>
        <view class="muted">{{ product.description || "暂无描述" }}</view>
        <view class="product-meta">
          <text class="price">{{ yuan(product.price) }}</text>
          <text>{{ categoryLabel(product.category) }}</text>
          <text>库存 {{ product.stock }}</text>
          <text>{{ product.isOnSale ? "上架中" : "已下架" }}</text>
        </view>
      </view>
      <view class="actions">
        <view class="mini-btn" @tap="editProduct(product)">编辑</view>
        <view class="mini-btn" @tap="toggleSale(product)">{{ product.isOnSale ? "下架" : "上架" }}</view>
        <view class="mini-btn danger" @tap="markSoldOut(product)">售罄</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.form-card {
  display: grid;
  gap: 14rpx;
}

.block-title,
.section-title {
  font-size: 32rpx;
  font-weight: 900;
}

.section-title {
  margin: 28rpx 0 16rpx;
}

input {
  height: 76rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  background: #f6f7f9;
}

.category-picker {
  display: grid;
  gap: 12rpx;
}

.field-label {
  color: #344054;
  font-size: 26rpx;
  font-weight: 800;
}

.category-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}

.category-option {
  padding: 18rpx 10rpx;
  border: 2rpx solid #e4e7ec;
  border-radius: 12rpx;
  background: #fff;
  color: #344054;
  text-align: center;
  font-size: 26rpx;
  font-weight: 800;
}

.category-option.active {
  border-color: #ffd21e;
  background: #fff8dc;
  color: #101828;
}

.form-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
}

.product-card {
  display: flex;
  gap: 16rpx;
  padding: 22rpx;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
  background: #fff;
}

.product-main {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: 30rpx;
  font-weight: 900;
  margin-bottom: 8rpx;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 14rpx;
  color: #667085;
}

.actions {
  display: grid;
  gap: 10rpx;
  align-content: start;
}

.mini-btn {
  min-width: 96rpx;
  padding: 10rpx 14rpx;
  border-radius: 10rpx;
  background: #eef4ff;
  color: #165dff;
  text-align: center;
  font-weight: 800;
  font-size: 24rpx;
}

.mini-btn.danger {
  background: #fff1f0;
  color: #d92d20;
}

.empty {
  padding: 70rpx 0;
  text-align: center;
  color: #667085;
}
</style>
