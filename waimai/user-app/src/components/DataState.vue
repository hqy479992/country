<script setup lang="ts">
import AppButton from "./AppButton.vue";
import AppIcon from "./AppIcon.vue";
withDefaults(
  defineProps<{
    kind?: string;
    title: string;
    description?: string;
    action?: string;
  }>(),
  { kind: "empty", description: "", action: "" },
);
defineEmits<{ (event: "action"): void }>();
</script>
<template>
  <view class="data-state" :role="kind === 'error' ? 'alert' : 'status'"
    ><view class="state-icon"
      ><AppIcon
        :name="
          kind === 'error' ? 'alert' : kind === 'loading' ? 'clock' : 'bag'
        "
        :size="30" /></view
    ><view class="state-title">{{ title }}</view
    ><view v-if="description" class="muted state-description">{{
      description
    }}</view
    ><AppButton
      v-if="action"
      class="secondary-btn state-action"
      @tap="$emit('action')"
      >{{ action }}</AppButton
    ></view
  >
</template>
