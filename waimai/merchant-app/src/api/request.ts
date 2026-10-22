import { API_BASE_URL } from "../config";
let opening = false;
function login() {
  if (
    opening ||
    getCurrentPages().some((page) => page.route === "pages/access/index")
  )
    return;
  opening = true;
  uni.navigateTo({
    url: "/pages/access/index",
    complete: () => {
      opening = false;
    },
  });
}
type Options = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: UniApp.RequestOptions["data"];
};
export function request<T>(path: string, options: Options = {}) {
  const access = uni.getStorageSync("town-merchant-access") as
    | { id: string; key: string }
    | undefined;
  if (!access?.key) {
    login();
    return Promise.reject<T>(new Error("请先登录工作人员账户"));
  }
  return new Promise<T>((resolve, reject) =>
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || "GET",
      data: options.data,
      timeout: 12000,
      header: {
        "Content-Type": "application/json",
        "x-actor-type": "MERCHANT",
        "x-actor-id": access.id,
        "x-access-key": access.key,
      },
      success: (response) => {
        const body = (response.data || {}) as {
          data?: T;
          error?: { message?: string };
        };
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(body.data as T);
          return;
        }
        if (response.statusCode === 401) {
          uni.removeStorageSync("town-merchant-access");
          login();
        }
        reject(new Error(body.error?.message || "请求失败，请重试"));
      },
      fail: () => reject(new Error("网络连接失败，请重试")),
    }),
  );
}
