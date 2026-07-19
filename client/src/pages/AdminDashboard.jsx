import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetOrders, adminGetProducts, adminGetCustomers } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";

const LOW_STOCK_THRESHOLD = 5;

function timeAgo(iso) {
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const isToday = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

const egp = (n) => `${Number(n || 0).toLocaleString()} EGP`;

/* ── Mini Sparkline inside KPI Cards ── */
function Sparkline({ data, color = "var(--gold)" }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1) || 1;
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 120;
  const height = 24;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="stat-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ opacity: 0.85 }}>
      <polyline fill="none" stroke={color} strokeWidth="1.8" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Interactive SVG Area Chart ── */
function AreaChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  if (!data || data.length === 0) return null;

  const revenues = data.map((d) => d.revenue);
  const maxRev = Math.max(...revenues, 1000) * 1.15; // 15% headroom
  const minRev = 0;

  // chart dimensions
  const width = 600;
  const height = 180;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.revenue / maxRev) * chartHeight;
    return { x, y, revenue: d.revenue, label: d.dateStr, orders: d.ordersCount };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = linePath ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z` : "";

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xMouse = e.clientX - rect.left;
    
    // Map mouse coordinates to SVG scale
    const svgX = (xMouse / rect.width) * width;

    let closestIdx = 0;
    let minDistance = Infinity;
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoveredIdx(closestIdx);
    setTooltipPos({
      x: (points[closestIdx].x / width) * rect.width,
      y: (points[closestIdx].y / height) * rect.height - 50,
    });
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  const yTicks = [0, maxRev * 0.25, maxRev * 0.5, maxRev * 0.75, maxRev];

  return (
    <div className="chart-card" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={{ position: "relative" }}>
      <h3 className="chart-card__title">Revenue Trend (Last 7 Days)</h3>
      <div className="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + chartHeight - (tick / maxRev) * chartHeight;
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="9" fontFamily="var(--font-body)">
                  {Math.round(tick).toLocaleString()} EGP
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {points.map((p, i) => (
            <text key={i} x={p.x} y={height - 5} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="var(--font-body)">
              {p.label}
            </text>
          ))}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}

          {/* Line stroke */}
          {linePath && <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Hover highlight circle */}
          {hoveredIdx !== null && (
            <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].y} r="5" fill="var(--surface)" stroke="var(--gold)" strokeWidth="2.5" />
          )}
        </svg>

        {/* Hover Tooltip HTML overlay */}
        {hoveredIdx !== null && (
          <div
            className="chart-tooltip is-visible"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <strong style={{ fontSize: "10px", color: "var(--ink)", marginBottom: "1px" }}>{points[hoveredIdx].label}</strong>
            <span style={{ color: "var(--gold)", fontWeight: "bold" }}>
              {points[hoveredIdx].revenue.toLocaleString()} EGP
            </span>
            <span style={{ fontSize: "9px", color: "var(--muted)" }}>
              {points[hoveredIdx].orders} order{points[hoveredIdx].orders === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Interactive SVG Donut Chart ── */
function DonutChart({ orders }) {
  const counts = useMemo(() => {
    const list = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
    orders.forEach((o) => {
      if (list[o.status] !== undefined) list[o.status]++;
    });
    return list;
  }, [orders]);

  const total = orders.length || 1;
  const segments = [
    { label: "Pending", count: counts.pending, color: "var(--warning)" },
    { label: "Confirmed", count: counts.confirmed, color: "var(--info)" },
    { label: "Shipped", count: counts.shipped, color: "var(--gold)" },
    { label: "Delivered", count: counts.delivered, color: "var(--success)" },
    { label: "Cancelled", count: counts.cancelled, color: "var(--danger)" },
  ].filter((s) => s.count > 0);

  const size = 130;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 10;

  let currentOffset = 0;

  return (
    <div className="chart-card">
      <h3 className="chart-card__title">Orders Breakdown</h3>
      <div className="donut-chart-container">
        {orders.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>No orders data yet</p>
        ) : (
          <>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
              {/* Background circle */}
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth={strokeWidth} />
              
              {/* Segments */}
              {segments.map((seg, i) => {
                const pct = (seg.count / total) * 100;
                const strokeDashOffset = circumference - (pct / 100) * circumference;
                const offset = currentOffset;
                currentOffset += (pct / 100) * circumference;
                
                return (
                  <circle
                    key={i}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashOffset - offset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                );
              })}
            </svg>
            <div className="donut-center-text">
              <span className="donut-value">{orders.length}</span>
              <span className="donut-label">Total</span>
            </div>
          </>
        )}
      </div>
      
      {/* Legend list */}
      <div style={{ marginTop: "var(--sp-3)", display: "flex", flexDirection: "column", gap: "6px" }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: seg.color, display: "inline-block" }} />
              <span style={{ color: "var(--ink-2)" }}>{seg.label}</span>
            </div>
            <strong style={{ color: "var(--ink)", marginInlineStart: "auto" }}>
              {seg.count} ({Math.round((seg.count / total) * 100)}%)
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders", token],
    queryFn: () => adminGetOrders(token),
    enabled: !!token,
  });
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products", token],
    queryFn: () => adminGetProducts(token),
    enabled: !!token,
  });
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["admin-customers", token],
    queryFn: () => adminGetCustomers(token),
    enabled: !!token,
  });

  const orders = ordersData?.data ?? [];
  const products = productsData?.data ?? [];
  const customers = customersData?.data ?? [];

  const countedOrders = orders.filter((o) => o.status !== "cancelled");
  const revenue = countedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const revenueToday = countedOrders
    .filter((o) => isToday(o.created_at))
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const ordersToday = orders.filter((o) => isToday(o.created_at)).length;

  const pendingOrders = orders
    .filter((o) => o.status === "pending")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const stockOf = (p) => p.variants?.reduce((sum, v) => sum + (v.quantity || 0), 0) ?? 0;
  const lowStock = products
    .filter((p) => p.status === "active" && stockOf(p) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => stockOf(a) - stockOf(b))
    .slice(0, 6);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  const registered = customers.filter((c) => c.is_registered).length;
  const loading = ordersLoading || productsLoading || customersLoading;

  /* ── Calculations for 7-Day Sparkline Trends ── */
  const last7Days = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d);
    }
    return list;
  }, []);

  const chartData = useMemo(() => {
    if (loading || !orders.length) return [];
    return last7Days.map((day) => {
      const dateStr = day.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const dayOrders = orders.filter((o) => {
        const oDate = new Date(o.created_at);
        return (
          oDate.getDate() === day.getDate() &&
          oDate.getMonth() === day.getMonth() &&
          oDate.getFullYear() === day.getFullYear()
        );
      });
      const dayRevenue = dayOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + Number(o.total || 0), 0);
      return {
        dateStr,
        revenue: dayRevenue,
        ordersCount: dayOrders.length,
      };
    });
  }, [orders, last7Days, loading]);

  const trends = useMemo(() => {
    if (loading || !chartData.length) return { revenue: [], orders: [], pending: [], customers: [] };

    const revenueTrend = chartData.map((d) => d.revenue);
    const ordersTrend = chartData.map((d) => d.ordersCount);
    
    const pendingTrend = last7Days.map((day) => {
      return orders.filter((o) => {
        const oDate = new Date(o.created_at);
        return (
          o.status === "pending" &&
          oDate.getDate() === day.getDate() &&
          oDate.getMonth() === day.getMonth() &&
          oDate.getFullYear() === day.getFullYear()
        );
      }).length;
    });

    const customersTrend = last7Days.map((day) => {
      // Unique checkout customers per day
      const dayOrders = orders.filter((o) => {
        const oDate = new Date(o.created_at);
        return (
          oDate.getDate() === day.getDate() &&
          oDate.getMonth() === day.getMonth() &&
          oDate.getFullYear() === day.getFullYear()
        );
      });
      return new Set(dayOrders.map((o) => o.customer_phone || o.id)).size;
    });

    return {
      revenue: revenueTrend,
      orders: ordersTrend,
      pending: pendingTrend,
      customers: customersTrend,
    };
  }, [chartData, orders, last7Days, loading]);

  const stats = [
    { label: "Revenue", value: egp(revenue), hint: revenueToday ? `${egp(revenueToday)} today` : "Excludes cancelled orders", trend: trends.revenue },
    { label: "Orders", value: orders.length, hint: ordersToday ? `${ordersToday} today` : "No orders today yet", trend: trends.orders },
    { label: "Pending", value: pendingOrders.length, hint: pendingOrders.length ? "Awaiting confirmation" : "All caught up", trend: trends.pending, color: "var(--warning)" },
    { label: "Customers", value: customers.length, hint: `${registered} registered`, trend: trends.customers, color: "var(--info)" },
  ];

  return (
    <div className="admin-content">
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Overview</h1>
        <p className="admin-dash-date">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </header>

      {/* KPI stats cards with mini Sparklines */}
      <div className="admin-stats">
        {stats.map((s) => (
          <div className="stat" key={s.label} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "135px" }}>
            {loading ? (
              <>
                <div>
                  <span className="skel skel--price" style={{ display: "block", blockSize: "1.6rem" }} />
                  <p className="stat__label">{s.label}</p>
                </div>
                <div className="skel" style={{ inlineSize: "100%", blockSize: "20px", marginTop: "var(--sp-2)" }} />
              </>
            ) : (
              <>
                <div>
                  <p className="stat__value">{s.value}</p>
                  <p className="stat__label">{s.label}</p>
                  <p className="stat__hint">{s.hint}</p>
                </div>
                <Sparkline data={s.trend} color={s.color} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Analytical Charts Grid */}
      {!loading && chartData.length > 0 && (
        <div className="charts-grid">
          <AreaChart data={chartData} />
          <DonutChart orders={orders} />
        </div>
      )}

      {/* Lists Grid */}
      <div className="admin-dash-grid">
        <section className="admin-card" aria-labelledby="dash-pending-title">
          <div className="admin-card__head">
            <h2 className="admin-card__title" id="dash-pending-title">Needs attention</h2>
            {pendingOrders.length > 0 && (
              <Link className="admin-card__link" to="/admin/orders?status=pending">
                Review all →
              </Link>
            )}
          </div>
          {ordersLoading ? (
            <div className="admin-dash-list" aria-hidden="true">
              {[...Array(3)].map((_, i) => (
                <div className="admin-dash-row" key={i}>
                  <span className="skel skel--name" />
                  <span className="skel skel--price" style={{ marginInlineStart: "auto" }} />
                </div>
              ))}
            </div>
          ) : pendingOrders.length === 0 ? (
            <p className="admin-dash-empty">No pending orders — everything has been handled.</p>
          ) : (
            <div className="admin-dash-list">
              {pendingOrders.slice(0, 5).map((o) => (
                <div className="admin-dash-row" key={o.id}>
                  <div className="admin-dash-row__main">
                    <span className="admin-dash-row__title">{o.customer_name || "Guest"}</span>
                    <span className="admin-dash-row__meta">
                      {[
                        o.order_items?.map((i) => i.name_snapshot).filter(Boolean).join(", "),
                        timeAgo(o.created_at),
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <span className="admin-dash-row__val">{o.total ? egp(o.total) : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-card" aria-labelledby="dash-stock-title">
          <div className="admin-card__head">
            <h2 className="admin-card__title" id="dash-stock-title">Low stock</h2>
            <Link className="admin-card__link" to="/admin/products">All products →</Link>
          </div>
          {productsLoading ? (
            <div className="admin-dash-list" aria-hidden="true">
              {[...Array(3)].map((_, i) => (
                <div className="admin-dash-row" key={i}>
                  <span className="skel skel--badge" style={{ inlineSize: "2.25rem", blockSize: "2.25rem" }} />
                  <span className="skel skel--name" />
                </div>
              ))}
            </div>
          ) : lowStock.length === 0 ? (
            <p className="admin-dash-empty">Every active product is stocked above {LOW_STOCK_THRESHOLD} units.</p>
          ) : (
            <div className="admin-dash-list">
              {lowStock.map((p) => {
                const stock = stockOf(p);
                return (
                  <div className="admin-dash-row" key={p.id}>
                    {p.image ? (
                      <img className="admin-dash-thumb" src={p.image} alt="" />
                    ) : (
                      <div className="admin-dash-thumb admin-dash-thumb--empty" />
                    )}
                    <div className="admin-dash-row__main">
                      <span className="admin-dash-row__title">{p.en_name}</span>
                      <span className={`admin-dash-row__meta${stock === 0 ? " admin-dash-row__meta--danger" : ""}`}>
                        {stock === 0 ? "Out of stock" : `${stock} unit${stock === 1 ? "" : "s"} left`}
                      </span>
                    </div>
                    <Link className="btn btn--secondary btn--sm" to={`/admin/product?id=${p.id}`}>
                      Restock
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Recent Orders table */}
      <section className="admin-card" aria-labelledby="dash-recent-title">
        <div className="admin-card__head">
          <h2 className="admin-card__title" id="dash-recent-title">Recent orders</h2>
          <Link className="admin-card__link" to="/admin/orders">View all →</Link>
        </div>
        {ordersLoading ? (
          <div className="table-wrap">
            <table className="table" aria-label="Recent orders loading">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={i} className="skel-row">
                    <td><span className="skel skel--id" /></td>
                    <td><span className="skel skel--name" /></td>
                    <td><span className="skel skel--badge" /></td>
                    <td><span className="skel skel--price" /></td>
                    <td><span className="skel skel--date" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="admin-dash-empty">Orders will appear here once customers check out.</p>
        ) : (
          <div className="table-wrap">
            <table className="table" aria-label="Recent orders">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td><span className="order-id">{o.id?.slice(0, 8)}</span></td>
                    <td>
                      <div className="order-cell">
                        <span className="order-cell__primary">{o.customer_name || "Guest"}</span>
                        {o.order_items?.length > 0 && (
                          <span className="order-cell__secondary">
                            {o.order_items.map((i) => i.name_snapshot).join(", ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td><StatusBadge orderId={o.id} current={o.status} token={token} /></td>
                    <td className="num order-total-cell">{o.total ? egp(o.total) : "—"}</td>
                    <td className="order-date-cell">{timeAgo(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
