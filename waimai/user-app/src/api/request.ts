import { API_BASE_URL } from "../config";
import { clearSession, getToken } from "../utils/session";
export class ApiError extends Error {
  constructor(
    message: string,
    public code = "REQUEST_FAILED",
    public status = 0,
  ) {
    super(message);
  }
}
type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: UniApp.RequestOptions["data"];
  auth?: boolean;
};
export function request<T>(path: string, options: RequestOptions = {}) {
  const token = options.auth === false ? "" : getToken();
  if (options.auth !== false && !token)
    return Promise.reject<T>(
      new ApiError("请先登录后再操作", "UNAUTHORIZED", 401),
    );
  return new Promise<T>((resolve, reject) =>
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || "GET",
      data: options.data,
      timeout: 12000,
      header: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (response) => {
        const body = (
          typeof response.data === "object" && response.data
            ? response.data
            : {}
        ) as { data?: T; error?: { message?: string; code?: string } };
        if (token && getToken() !== token) {
          reject(
            new ApiError("登录状态已变化，请重新加载", "SESSION_CHANGED", 401),
          );
          return;
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(body.data as T);
          return;
        }
        if (
          response.statusCode === 401 &&
          token &&
          getToken() === token &&
          body.error?.code !== "LOGIN_FAILED"
        )
          clearSession();
        reject(
          new ApiError(
            body.error?.message ||
              (response.statusCode === 404
                ? "服务暂未就绪，请稍后再试"
                : "请求失败，请重试"),
            body.error?.code,
            response.statusCode,
          ),
        );
      },
      fail: () =>
        reject(new ApiError("网络连接失败，请检查网络后重试", "NETWORK_ERROR")),
    }),
  );
}
