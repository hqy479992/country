import { FormEvent, ReactNode, useEffect, useState } from "react";
import { accessStorageKey, verifyAdminAccess } from "./api";
export function AccessGate({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const stored = sessionStorage.getItem(accessStorageKey);
    if (stored) {
      setBusy(true);
      verifyAdminAccess(stored)
        .then(() => {
          if (active) setAuthorized(true);
        })
        .catch(() => {
          if (active) setError("登录已失效，请重新输入运营访问凭证");
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }
    const expire = () => {
      setAuthorized(false);
      setKey("");
    };
    window.addEventListener("staff-auth-expired", expire);
    return () => {
      active = false;
      window.removeEventListener("staff-auth-expired", expire);
    };
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await verifyAdminAccess(key.trim());
      sessionStorage.setItem(accessStorageKey, key.trim());
      setKey("");
      setAuthorized(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  if (authorized) return <>{children}</>;
  return (
    <main className="staff-login">
      <p className="eyebrow">乡镇本地外卖</p>
      <h1>运营后台登录</h1>
      <p>请输入服务器配置的运营访问凭证。</p>
      <form onSubmit={login}>
        <label>
          运营访问凭证
          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "正在验证…" : "登录后台"}
        </button>
      </form>
    </main>
  );
}
