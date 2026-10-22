export function message(error: unknown, fallback = "操作失败，请重试") {
  return error instanceof Error ? error.message : fallback;
}
export function toast(error: unknown) {
  uni.showToast({ title: message(error), icon: "none", duration: 2500 });
}
export function confirm(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) =>
    uni.showModal({
      title,
      content,
      confirmColor: "#245d3f",
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    }),
  );
}
export function goHome() {
  uni.reLaunch({ url: "/pages/index/index" });
}
export function goBack() {
  uni.navigateBack({ fail: goHome });
}
export function callPhone(phone?: string | null) {
  if (phone) uni.makePhoneCall({ phoneNumber: phone });
}
