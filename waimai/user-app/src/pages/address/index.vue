<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { UserAddress } from "../../api/types";
import {
  getToken,
  requireLogin,
  selectedAddressId,
  selectAddress,
} from "../../utils/session";
import { confirm, goBack, message, toast } from "../../utils/ui";
import PageHead from "../../components/PageHead.vue";
import AppIcon from "../../components/AppIcon.vue";
import DataState from "../../components/DataState.vue";
const addresses = ref<UserAddress[]>([]);
const selecting = ref(false);
const loading = ref(false);
const error = ref("");
const busy = ref(false);
const selected = ref("");
const loggedIn = ref(false);
async function load() {
  loggedIn.value = !!getToken();
  if (!loggedIn.value) {
    addresses.value = [];
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    addresses.value = await api.getAddresses();
    selected.value = selectedAddressId();
  } catch (e) {
    error.value = message(e);
    loggedIn.value = !!getToken();
  } finally {
    loading.value = false;
  }
}
function edit(address?: UserAddress) {
  uni.navigateTo({
    url: `/pages/address/edit?select=${selecting.value ? "1" : "0"}${address ? `&addressId=${address.id}` : ""}`,
  });
}
function choose(address: UserAddress) {
  if (selecting.value) {
    selectAddress(address.id);
    goBack();
  } else edit(address);
}
async function setDefault(address: UserAddress) {
  if (busy.value) return;
  busy.value = true;
  try {
    await api.setDefaultAddress(address.id);
    await load();
  } catch (e) {
    toast(e);
  } finally {
    busy.value = false;
  }
}
async function remove(address: UserAddress) {
  if (
    busy.value ||
    !(await confirm("删除收货地址", "删除后可重新添加，确认删除这个地址？"))
  )
    return;
  busy.value = true;
  try {
    await api.deleteAddress(address.id);
    if (selectedAddressId() === address.id)
      uni.removeStorageSync("town-selected-address");
    await load();
  } catch (e) {
    toast(e);
  } finally {
    busy.value = false;
  }
}
onLoad((query) => {
  selecting.value = query?.select === "1";
});
onShow(load);
</script>
<template>
  <view class="page with-footer"
    ><PageHead :title="selecting ? '选择收货地址' : '收货地址'" /><DataState
      v-if="!loggedIn"
      title="登录后管理收货地址"
      action="去登录"
      @action="requireLogin('/pages/address/index')"
    /><DataState
      v-else-if="loading && !addresses.length"
      kind="loading"
      title="正在加载地址"
    /><DataState
      v-else-if="error"
      kind="error"
      title="地址加载失败"
      :description="error"
      action="重新加载"
      @action="load"
    /><DataState
      v-else-if="!addresses.length"
      title="添加一个收货地址吧"
      description="写清村镇、小区和门牌，方便骑手送达"
    /><view v-else class="stack"
      ><view
        v-for="address in addresses"
        :key="address.id"
        class="card address-card"
        :class="{ selected: selecting && selected === address.id }"
        ><AppButton class="address-main" @tap="choose(address)"
          ><view class="address-line"
            ><text v-if="address.isDefault" class="pill">默认</text
            ><text>{{ address.region }} {{ address.detail }}</text></view
          ><view class="small muted"
            >{{ address.name }} · {{ address.phone }}</view
          ><view v-if="selecting" class="select-hint"
            >{{ selected === address.id ? "当前选择" : "使用此地址"
            }}<AppIcon
              :name="selected === address.id ? 'check' : 'arrow'"
              :size="16" /></view></AppButton
        ><view class="address-actions"
          ><AppButton
            class="text-btn small"
            :disabled="busy"
            @tap="edit(address)"
            >编辑</AppButton
          ><AppButton
            v-if="!address.isDefault"
            class="text-btn small"
            :disabled="busy"
            @tap="setDefault(address)"
            >设为默认</AppButton
          ><AppButton
            class="text-btn small danger"
            :disabled="busy"
            @tap="remove(address)"
            >删除</AppButton
          ></view
        ></view
      ></view
    ><view v-if="loggedIn" class="fixed-footer"
      ><AppButton class="primary-btn add-address" :disabled="busy" @tap="edit()"
        ><AppIcon name="plus" color="#fff" :size="18" />新增收货地址</AppButton
      ></view
    ></view
  >
</template>
<style scoped>
.address-card {
  border: 1px solid transparent;
}
.address-card.selected {
  border-color: #5e8e56;
}
.address-main {
  text-align: left;
  width: 100%;
}
.address-line {
  display: flex;
  gap: 7px;
  font-weight: 600;
  margin-bottom: 8px;
  align-items: flex-start;
}
.address-line text:last-child {
  flex: 1;
  overflow-wrap: anywhere;
}
.select-hint {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  font-size: 12px;
  color: #245d3f;
  margin-top: 13px;
}
.address-actions {
  display: flex;
  gap: 18px;
  margin-top: 10px;
  border-top: 1px solid #edf1e8;
}
.address-actions .app-button:last-child,
.address-actions .app-button:last-child {
  margin-left: auto;
}
.add-address {
  width: 100%;
}
</style>
