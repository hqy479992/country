<script setup lang="ts">
import AppButton from "../../components/AppButton.vue";
import { reactive, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { api } from "../../api";
import { requireLogin, selectAddress } from "../../utils/session";
import { goBack, message } from "../../utils/ui";
import PageHead from "../../components/PageHead.vue";
import DataState from "../../components/DataState.vue";
const id = ref("");
const selecting = ref(false);
const loading = ref(false);
const busy = ref(false);
const error = ref("");
const loadError = ref("");
const form = reactive({
  name: "",
  phone: "",
  region: "",
  detail: "",
  isDefault: false,
});
function toggleDefault(event: unknown) {
  form.isDefault = (event as { detail: { value: boolean } }).detail.value;
}
async function load() {
  if (!id.value) return;
  loading.value = true;
  loadError.value = "";
  try {
    const addresses = await api.getAddresses();
    const found = addresses.find((item) => item.id === id.value);
    if (!found) throw new Error("地址不存在或已被删除");
    Object.assign(form, {
      name: found.name,
      phone: found.phone,
      region: found.region,
      detail: found.detail,
      isDefault: found.isDefault,
    });
  } catch (e) {
    loadError.value = message(e);
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (busy.value || loading.value) return;
  if (!requireLogin("/pages/address/index")) return;
  error.value = "";
  const input = {
    name: form.name.trim(),
    phone: form.phone.trim(),
    region: form.region.trim(),
    detail: form.detail.trim(),
    isDefault: form.isDefault,
  };
  if (!input.name || !input.region || !input.detail) {
    error.value = "请填写完整的收货人、所在区域和详细地址";
    return;
  }
  if (!/^1[3-9]\d{9}$/.test(input.phone)) {
    error.value = "请输入正确的11位手机号";
    return;
  }
  busy.value = true;
  try {
    const address = id.value
      ? await api.updateAddress(id.value, input)
      : await api.createAddress(input);
    if (selecting.value) {
      selectAddress(address.id);
      uni.navigateBack({
        delta: 2,
        fail: () => uni.redirectTo({ url: "/pages/address/index" }),
      });
    } else goBack();
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
onLoad((query) => {
  id.value = String(query?.addressId || "");
  selecting.value = query?.select === "1";
  void load();
});
</script>
<template>
  <view class="page"
    ><PageHead :title="id ? '编辑收货地址' : '新增收货地址'" /><DataState
      v-if="loading"
      kind="loading"
      title="正在加载地址"
    /><DataState
      v-else-if="loadError"
      kind="error"
      title="地址加载失败"
      :description="loadError"
      action="重新加载"
      @action="load"
    /><template v-else
      ><view class="card"
        ><label class="form-field"
          ><text class="field-label">收货人</text
          ><input
            v-model="form.name"
            maxlength="30"
            placeholder="请输入收货人姓名"
            aria-label="收货人"
            :disabled="busy" /></label
        ><label class="form-field"
          ><text class="field-label">联系电话</text
          ><input
            v-model="form.phone"
            type="tel"
            maxlength="11"
            placeholder="11位手机号"
            aria-label="联系电话"
            :disabled="busy" /></label
        ><label class="form-field"
          ><text class="field-label">所在区域</text
          ><input
            v-model="form.region"
            maxlength="80"
            placeholder="镇 / 村 / 社区"
            aria-label="所在区域"
            :disabled="busy" /></label
        ><label class="form-field"
          ><text class="field-label">详细地址</text
          ><textarea
            v-model="form.detail"
            maxlength="160"
            placeholder="街道、小区、楼栋及门牌号"
            aria-label="详细地址"
            :disabled="busy"
          /></label
        ><view class="row"
          ><text>设为默认地址</text
          ><switch
            :checked="form.isDefault"
            :disabled="busy"
            color="#245d3f"
            aria-label="设为默认地址"
            @change="toggleDefault" /></view></view
      ><view v-if="error" class="error-message form-error" role="alert">{{
        error
      }}</view
      ><AppButton
        class="primary-btn save-address"
        :disabled="busy"
        @tap="save"
        >{{ busy ? "正在保存…" : "保存地址" }}</AppButton
      ></template
    ></view
  >
</template>
<style scoped>
.save-address {
  width: 100%;
  margin-top: 22px;
}
.form-error {
  margin-top: 14px;
}
</style>
