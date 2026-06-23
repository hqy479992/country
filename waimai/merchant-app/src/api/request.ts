import { API_BASE_URL, DEV_MERCHANT_ID } from "../config";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: UniApp.RequestOptions["data"];
};

export function request<T>(path: string, options: RequestOptions = {}) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method ?? "GET",
      data: options.data,
      header: {
        "Content-Type": "application/json",
        "x-actor-type": "MERCHANT",
        "x-actor-id": DEV_MERCHANT_ID
      },
      success: (response) => {
        const body = response.data as { data?: T; error?: { message?: string } };
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(body.data as T);
          return;
        }
        reject(new Error(body.error?.message ?? "请求失败"));
      },
      fail: () => reject(new Error("网络请求失败"))
    });
  });
}
