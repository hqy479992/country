<script setup lang="ts">
import AppButton from "./AppButton.vue";
import AppIcon from "./AppIcon.vue";
import { goBack } from "../utils/ui";
withDefaults(defineProps<{ title: string; back?: boolean }>(), { back: true });
</script>
<template>
  <view class="page-head"
    ><AppButton v-if="back" class="icon-button" aria-label="返回" @tap="goBack"
      ><AppIcon name="back" color="#263c2e" /></AppButton
    ><text class="head-title">{{ title }}</text
    ><slot
  /></view>
</template>
