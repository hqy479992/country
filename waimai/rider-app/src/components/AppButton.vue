<script setup lang="ts">
withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
defineEmits<{ (event: "tap", value: unknown): void }>();
</script>
<template>
  <!-- #ifdef H5 -->
  <component
    :is="'button'"
    class="app-button"
    type="button"
    :disabled="disabled"
    @click="$emit('tap', $event)"
    ><slot
  /></component>
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <button class="app-button" :disabled="disabled" @tap="$emit('tap', $event)">
    <slot />
  </button>
  <!-- #endif -->
</template>
