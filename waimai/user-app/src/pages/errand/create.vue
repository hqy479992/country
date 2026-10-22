<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api } from "../../api";
import type { ErrandAddress, UserAddress, ErrandInput } from "../../api/types";
import { requireLogin, session } from "../../utils/session";
import { confirm, message, toast } from "../../utils/ui";
import AppButton from "../../components/AppButton.vue";
import PageHead from "../../components/PageHead.vue";
const mode = ref<"SEND" | "PICK" | "BUY">("SEND");
const modes = [
  { key: "SEND", label: "帮我送" },
  { key: "PICK", label: "帮我取" },
  { key: "BUY", label: "帮我买" },
] as const;
const empty = (): ErrandAddress => ({
  name: "",
  phone: "",
  region: "",
  detail: "",
});
const pickup = reactive(empty()),
  delivery = reactive(empty());
const itemNote = ref(""),
  remark = ref(""),
  budget = ref("");
const addresses = ref<UserAddress[]>([]),
  saving = ref(false),
  error = ref(""),
  ready = ref(false);
const isBuy = computed(() => mode.value === "BUY");
const sections = computed(() => [
  {
    key: "pickup",
    title: isBuy.value ? "去哪里买" : "从哪里取",
    address: pickup,
  },
  { key: "delivery", title: "送到哪里", address: delivery },
]);
let owner = "";
onShow(async () => {
  if (!requireLogin("/pages/errand/create")) return;
  const id = session.value!.user.id;
  if (owner !== id) {
    owner = id;
    Object.assign(pickup, empty());
    Object.assign(delivery, empty());
    itemNote.value = "";
    remark.value = "";
    budget.value = "";
  }
  try {
    error.value = "";
    const [caps, saved] = await Promise.all([
      api.getCapabilities(),
      api.getAddresses(),
    ]);
    if (owner !== session.value?.user.id) return;
    ready.value = !!caps.errands;
    if (!ready.value) error.value = "跑腿服务暂未就绪，请稍后重试";
    addresses.value = saved;
    const defaultAddress = saved.find((a) => a.isDefault) || saved[0];
    if (defaultAddress && !delivery.detail)
      Object.assign(delivery, {
        name: defaultAddress.name,
        phone: defaultAddress.phone,
        region: defaultAddress.region,
        detail: defaultAddress.detail,
      });
  } catch (e) {
    error.value = message(e);
  }
});
function choose(target: ErrandAddress) {
  if (!addresses.value.length) {
    uni.showToast({ title: "暂无常用地址，请直接填写", icon: "none" });
    return;
  }
  uni.showActionSheet({
    itemList: addresses.value
      .slice(0, 6)
      .map((a) => `${a.name} · ${a.region}${a.detail}`),
    success: (r) => {
      const a = addresses.value[r.tapIndex];
      Object.assign(target, {
        name: a.name,
        phone: a.phone,
        region: a.region,
        detail: a.detail,
      });
    },
  });
}
function swap() {
  const a = { ...pickup };
  Object.assign(pickup, delivery);
  Object.assign(delivery, a);
}
async function submit() {
  if (saving.value || !requireLogin("/pages/errand/create")) return;
  error.value = "";
  for (const part of sections.value) {
    if (
      !part.address.name.trim() ||
      !part.address.region.trim() ||
      !part.address.detail.trim()
    ) {
      error.value = `请补全“${part.title}”的名称和详细地址`;
      return;
    }
    const optional = isBuy.value && part.key === "pickup";
    if (
      (!optional || part.address.phone) &&
      !/^1[3-9]\d{9}$/.test(part.address.phone.trim())
    ) {
      error.value = `请检查“${part.title}”的手机号`;
      return;
    }
  }
  if (
    pickup.region.trim() === delivery.region.trim() &&
    pickup.detail.trim() === delivery.detail.trim()
  ) {
    error.value = "取送地点不能相同";
    return;
  }
  if (itemNote.value.trim().length < 2) {
    error.value = isBuy.value
      ? "请填写要买的商品和数量"
      : "请填写需要取送的物品";
    return;
  }
  if (
    isBuy.value &&
    (!/^\d+(\.\d{1,2})?$/.test(budget.value) ||
      Number(budget.value) <= 0 ||
      Number(budget.value) > 10000)
  ) {
    error.value = "请填写0.01至10000元的商品预算，最多两位小数";
    return;
  }
  if (
    !(await confirm(
      "提交跑腿需求",
      "平台会根据需求报价，你确认费用后才进入骑手接单。提交需求不会扣款。",
    ))
  )
    return;
  saving.value = true;
  const input = {
    serviceType: isBuy.value ? "BUY" : "DELIVERY",
    deliveryMode: mode.value === "PICK" ? "PICK" : "SEND",
    pickupAddress: { ...pickup },
    deliveryAddress: { ...delivery },
    itemNote: itemNote.value.trim(),
    remark: remark.value.trim(),
    ...(isBuy.value
      ? { goodsBudget: Math.round(Number(budget.value) * 100) }
      : {}),
  } as Omit<ErrandInput, "requestId">;
  const key = `town-errand-attempt:${session.value!.user.id}`;
  const fingerprint = JSON.stringify(input);
  const previous = uni.getStorageSync(key) as
    { fingerprint: string; requestId: string } | undefined;
  const requestId =
    previous?.fingerprint === fingerprint
      ? previous.requestId
      : `errand-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  uni.setStorageSync(key, { fingerprint, requestId });
  try {
    const order = await api.createErrandOrder({ ...input, requestId });
    uni.removeStorageSync(key);
    uni.redirectTo({ url: `/pages/errand/detail?orderId=${order.id}` });
  } catch (e) {
    error.value = message(e);
    toast(e);
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <view class="page errand-create"
    ><PageHead title="发布跑腿需求" />
    <view class="intro"
      ><view class="title">忙不过来的事，交给跑腿</view
      ><view class="muted small">填写需求 → 平台报价 → 你确认后接单</view></view
    >
    <view class="chips service-modes"
      ><AppButton
        v-for="m in modes"
        :key="m.key"
        class="chip"
        :class="{ active: mode === m.key }"
        :disabled="saving"
        @tap="mode = m.key"
        >{{ m.label }}</AppButton
      ></view
    >
    <view class="notice">{{
      isBuy
        ? "帮买需指定购买地点，填写商品、规格和数量。商品预算仅供参考，商品款需与你的骑手另行确认结算。"
        : "取送范围请与平台确认。请如实填写物品信息，贵重、易碎或大件物品请在备注中说明。"
    }}</view>
    <view class="stack address-stack"
      ><view v-for="part in sections" :key="part.key" class="card address-form">
        <view class="row"
          ><view class="section-title">{{ part.title }}</view
          ><AppButton
            class="text-btn small"
            :disabled="saving"
            @tap="choose(part.address)"
            >常用地址</AppButton
          ></view
        >
        <label class="field"
          ><text>{{
            isBuy && part.key === "pickup" ? "店铺名称" : "联系人"
          }}</text
          ><input
            v-model="part.address.name"
            :disabled="saving"
            maxlength="30"
            :placeholder="
              isBuy && part.key === 'pickup'
                ? '例如：镇口便利店'
                : '怎么称呼收取件人'
            "
        /></label>
        <label class="field"
          ><text
            >手机号{{ isBuy && part.key === "pickup" ? "（选填）" : "" }}</text
          ><input
            v-model="part.address.phone"
            :disabled="saving"
            type="number"
            maxlength="11"
            placeholder="便于骑手联系"
        /></label>
        <label class="field"
          ><text>乡镇 / 区域</text
          ><input
            v-model="part.address.region"
            :disabled="saving"
            maxlength="80"
            placeholder="例如：新安镇"
        /></label>
        <label class="field"
          ><text>详细地址</text
          ><input
            v-model="part.address.detail"
            :disabled="saving"
            maxlength="160"
            placeholder="街道、门牌号、楼层或地标"
        /></label> </view
    ></view>
    <AppButton
      v-if="!isBuy"
      class="outline-btn swap"
      :disabled="saving"
      @tap="swap"
      >交换取送地址</AppButton
    >
    <view class="card needs"
      ><label class="field"
        ><text>{{ isBuy ? "要买什么" : "取送什么" }}</text
        ><textarea
          v-model="itemNote"
          :disabled="saving"
          maxlength="200"
          :placeholder="
            isBuy
              ? '例如：纯牛奶2盒，250ml装；没有该品牌请先联系我'
              : '例如：一袋衣服，约2公斤，已打包'
          "
        />
      </label>
      <label v-if="isBuy" class="field"
        ><text>商品预算（元，不含跑腿费）</text
        ><input
          v-model="budget"
          :disabled="saving"
          type="digit"
          maxlength="8"
          placeholder="仅用于与骑手沟通，不在此代收"
      /></label>
      <label class="field"
        ><text>备注（选填）</text
        ><textarea
          v-model="remark"
          :disabled="saving"
          maxlength="300"
          placeholder="取件方式、联系时间或其他要求"
        />
      </label>
    </view>
    <view class="quote-note"
      ><view class="section-title">费用待平台报价</view
      ><view class="muted small"
        >报价只包含跑腿服务费，你确认后再支付。当前为测试支付，不会扣款。</view
      ></view
    >
    <view v-if="error" class="notice warning">{{ error }}</view>
    <AppButton
      class="primary-btn submit"
      :disabled="saving || !ready"
      @tap="submit"
      >{{ saving ? "正在提交…" : "提交需求，等待报价" }}</AppButton
    >
  </view>
</template>
<style scoped>
.intro {
  padding: 14px 0 22px;
}
.title {
  font-size: 23px;
  font-weight: 600;
  margin-bottom: 8px;
}
.service-modes {
  margin-bottom: 18px;
}
.address-stack {
  margin-top: 18px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
}
.field {
  display: block;
  margin-top: 18px;
}
.field > text {
  display: block;
  font-size: 13px;
  color: #53654d;
  margin-bottom: 9px;
}
.field input,
.field textarea {
  width: 100%;
  font-size: 14px;
  background: #f5f7f2;
  border-radius: 10px;
  padding: 12px;
  height: 46px;
  box-sizing: border-box;
}
.field textarea {
  height: 88px;
}
.swap {
  margin: 12px auto;
  display: block;
}
.needs {
  margin-top: 18px;
}
.quote-note {
  padding: 24px 0 15px;
}
.quote-note .small {
  margin-top: 8px;
  line-height: 1.8;
}
.submit {
  width: 100%;
  margin-top: 14px;
}
.errand-create {
  padding-bottom: 35px;
}
</style>
