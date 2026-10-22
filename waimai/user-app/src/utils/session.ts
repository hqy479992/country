import { ref } from "vue";
import type { UserProfile } from "../api/types";
const key = "town-user-session-v1";
export type Session = { token: string; expiresAt: string; user: UserProfile };
function read(): Session | null {
  const value = uni.getStorageSync(key) as Session | undefined;
  return value?.token && Date.parse(value.expiresAt) > Date.now()
    ? value
    : null;
}
export const session = ref<Session | null>(read());
export function saveSession(value: Session) {
  uni.setStorageSync(key, value);
  session.value = value;
}
export function clearSession() {
  if (session.value)
    uni.removeStorageSync(`town-errand-attempt:${session.value.user.id}`);
  uni.removeStorageSync(key);
  uni.removeStorageSync("town-selected-address");
  uni.removeStorageSync("town-order-attempt");
  session.value = null;
}
export function getToken() {
  if (session.value && Date.parse(session.value.expiresAt) <= Date.now())
    clearSession();
  return session.value?.token || "";
}
export function safeUserRoute(value: string) {
  return /^\/pages\/(index\/index|shop\/detail|cart\/cart|address\/(index|edit)|orders\/(index|detail)|mine\/index|pay\/pay|errand\/(create|detail))(\?|$)/.test(
    value,
  )
    ? value
    : "/pages/index/index";
}
export function requireLogin(returnUrl: string) {
  if (getToken()) return true;
  uni.navigateTo({
    url: `/pages/auth/login?redirect=${encodeURIComponent(safeUserRoute(returnUrl))}`,
  });
  return false;
}
export function selectedAddressId() {
  return String(uni.getStorageSync("town-selected-address") || "");
}
export function selectAddress(id: string) {
  uni.setStorageSync("town-selected-address", id);
}
