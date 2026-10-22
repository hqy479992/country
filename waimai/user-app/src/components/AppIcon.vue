<script setup lang="ts">
import { computed } from "vue";
const props = withDefaults(
  defineProps<{ name: string; color?: string; size?: number }>(),
  { color: "#245d3f", size: 20 },
);
const paths: Record<string, string> = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  order:
    '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  food: '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 3c-4 4-4 9 0 9V3Zm0 9v9"/>',
  drink: '<path d="M6 7h12l-2 14H8L6 7ZM5 7h14M12 7l2-5h4"/>',
  fresh: '<path d="M5 9h14l-2 12H7L5 9ZM3 9h18M8 9l4-6 4 6M10 13v4M14 13v4"/>',
  store:
    '<path d="M4 10v11h16V10M3 10l2-7h14l2 7M8 21v-7h8v7M3 10c2 3 4 3 6 0 2 3 4 3 6 0 2 3 4 3 6 0"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  cart: '<path d="M2 3h3l3 13h11l3-10H6M9 21h.01M18 21h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  phone:
    '<path d="m5 3 4 1 1 5-3 2a14 14 0 0 0 6 6l2-3 5 1 1 4c-1 4-7 1-11-2S1 7 5 3Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bike: '<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-9 5 9h4l-5-12h3M9 8h5"/>',
  exit: '<path d="M10 3H4v18h6M9 12h12m-5-5 5 5-5 5"/>',
  alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  bag: '<path d="M4 7h16l-1 14H5L4 7Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
};
const src = computed(
  () =>
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${props.color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[props.name] || paths.store}</svg>`,
    ),
);
</script>
<template>
  <image
    :src="src"
    :style="{ width: `${size}px`, height: `${size}px` }"
    class="app-icon"
    mode="aspectFit"
    aria-hidden="true"
  />
</template>
<style scoped>
.app-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
