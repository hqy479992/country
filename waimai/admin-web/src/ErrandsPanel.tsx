import { useEffect, useState } from "react";
import { api, yuan } from "./api";
import type { ErrandOrder } from "./api";
const labels: Record<string, string> = {
  PENDING_QUOTE: "待报价",
  PENDING_PAYMENT: "待用户确认",
  PENDING_ASSIGN: "待骑手接单",
  RIDER_ACCEPTED: "骑手已接单",
  PICKED_UP: "配送中",
  COMPLETED: "已完成",
  DELIVERED: "已送达",
  CANCELLED: "已取消",
};
export default function ErrandsPanel() {
  const [orders, setOrders] = useState<ErrandOrder[]>([]),
    [filter, setFilter] = useState("pending"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState("");
  const [review, setReview] = useState<{
    id: string;
    action: "quote" | "reject";
    amount: number;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [fees, setFees] = useState<Record<string, string>>({});
  async function load() {
    setLoading(true);
    try {
      setOrders(await api.getErrands());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function quote(o: ErrandOrder) {
    const value = fees[o.id] || "";
    if (
      !/^\d+(\.\d{1,2})?$/.test(value) ||
      Number(value) <= 0 ||
      Number(value) > 1000
    ) {
      setError("跑腿费需为0.01至1000元，最多两位小数");
      return;
    }
    setError("");
    setReview({
      id: o.id,
      action: "quote",
      amount: Math.round(Number(value) * 100),
    });
  }
  async function confirmReview() {
    if (!review || busy) return;
    if (review.action === "reject" && reason.trim().length < 2) {
      setError("请填写至少两字的原因");
      return;
    }
    setBusy(review.id);
    try {
      if (review.action === "quote")
        await api.quoteErrand(review.id, review.amount);
      else await api.rejectErrand(review.id, reason.trim());
      setReview(null);
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy("");
    }
  }
  const rows = orders.filter(
    (o) =>
      filter === "all" ||
      (filter === "pending" && o.status === "PENDING_QUOTE") ||
      (filter === "active" &&
        [
          "PENDING_PAYMENT",
          "PENDING_ASSIGN",
          "RIDER_ACCEPTED",
          "PICKED_UP",
        ].includes(o.status)),
  );
  return (
    <section className="panel">
      <div className="errands-heading">
        <div>
          <h2>跑腿报价与订单</h2>
          <p>
            先核实取送范围和物品需求，再报跑腿服务费。帮买的商品款不在此代收。
          </p>
        </div>
        <button className="secondary" disabled={loading} onClick={load}>
          {loading ? "刷新中…" : "刷新跑腿"}
        </button>
      </div>
      <div className="tabs">
        {[
          { key: "pending", name: "待报价" },
          { key: "active", name: "进行中" },
          { key: "all", name: "全部" },
        ].map((t) => (
          <button
            key={t.key}
            className={filter === t.key ? "active" : ""}
            onClick={() => {
              setFilter(t.key);
              setReview(null);
            }}
          >
            {t.name}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="errands-error">
          {error}
        </p>
      )}
      {!rows.length && <p>{loading ? "加载中…" : "暂无此类跑腿需求"}</p>}
      <div className="errands-grid">
        {rows.map((o) => (
          <article key={o.id} className="errands-card">
            <div className="errands-heading">
              <h3>
                {o.serviceType === "BUY"
                  ? "帮我买"
                  : o.deliveryMode === "PICK"
                    ? "帮我取"
                    : "帮我送"}
              </h3>
              <span className="pill">{labels[o.status] || o.status}</span>
            </div>
            <small>
              {o.orderNo} · {new Date(o.createdAt).toLocaleString()}
            </small>
            <p>用户：{o.user.nickname || o.user.account || o.user.id}</p>
            {[o.pickupAddressSnapshot, o.deliveryAddressSnapshot].map(
              (a, i) => (
                <div key={i} className="errands-stop">
                  <strong>
                    {i === 0
                      ? o.serviceType === "BUY"
                        ? "购买地点"
                        : "取件地点"
                      : "送达地点"}
                  </strong>
                  <div>
                    {a.region} {a.detail}
                  </div>
                  <div>
                    {a.name} {a.phone}
                  </div>
                </div>
              ),
            )}
            <p className="errands-description">{o.itemNote}</p>
            {o.remark && <p>备注：{o.remark}</p>}
            {o.serviceType === "BUY" && (
              <p>商品预算：{yuan(o.goodsBudget || 0)}（商品款另行确认结算）</p>
            )}
            <p>
              骑手：
              {o.rider ? `${o.rider.name} ${o.rider.phone || ""}` : "未接单"}
            </p>
            {review?.id === o.id && o.status === "PENDING_QUOTE" && (
              <div
                className="errands-review"
                role="group"
                aria-label="确认跑腿操作"
              >
                {review.action === "quote" ? (
                  <p>
                    确认报价：<strong>跑腿服务费 {yuan(review.amount)}</strong>
                    ，不含商品款。发送后用户需在15分钟内确认。
                  </p>
                ) : (
                  <label>
                    无法承接的原因（将展示给用户）
                    <textarea
                      aria-label="无法承接原因"
                      maxLength={200}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                )}
                <div className="errands-review-actions">
                  <button
                    disabled={
                      !!busy ||
                      (review.action === "reject" && reason.trim().length < 2)
                    }
                    onClick={confirmReview}
                  >
                    {review.action === "quote"
                      ? "确认发送报价"
                      : "确认无法承接"}
                  </button>
                  <button
                    className="secondary"
                    disabled={!!busy}
                    onClick={() => setReview(null)}
                  >
                    返回修改
                  </button>
                </div>
              </div>
            )}
            {o.status === "PENDING_QUOTE" ? (
              <div className="errands-quote">
                <label>
                  跑腿服务费（元）
                  <input
                    aria-label={`跑腿服务费 ${o.orderNo}`}
                    inputMode="decimal"
                    value={fees[o.id] || ""}
                    onChange={(e) =>
                      setFees({ ...fees, [o.id]: e.target.value })
                    }
                    placeholder="不含商品款"
                  />
                </label>
                <button disabled={!!busy} onClick={() => quote(o)}>
                  {busy === o.id ? "处理中…" : "发送报价"}
                </button>
                <button
                  className="secondary"
                  disabled={!!busy}
                  onClick={() => {
                    setReason("");
                    setReview({ id: o.id, action: "reject", amount: 0 });
                  }}
                >
                  无法承接
                </button>
              </div>
            ) : (
              <p>
                <strong>
                  跑腿费{" "}
                  {o.quotedAt || o.paymentStatus === "PAID"
                    ? yuan(o.totalAmount)
                    : "未报价"}
                </strong>
                {o.paymentMethod === "MOCK" ? " · 测试支付，未扣款" : ""}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
