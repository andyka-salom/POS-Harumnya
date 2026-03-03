import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconArrowLeft, IconBottle, IconBox, IconBuildingWarehouse,
    IconBuildingStore, IconTrendingUp, IconTrendingDown,
    IconArrowUp, IconArrowDown, IconAdjustments, IconRepeat,
    IconShoppingCart, IconPackages, IconAlertTriangle,
    IconSearch, IconFilter, IconClock, IconUser, IconHash,
    IconCircleCheck, IconCircleX, IconRefresh, IconChartLine,
    IconCurrencyDollar, IconLayersLinked
} from "@tabler/icons-react";
import Pagination from "@/Components/Dashboard/Pagination";

/* ── Helpers ─────────────────────────────────────────────────────────── */
const fmt = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);

const fmtNum = (n, d = 4) =>
    parseFloat(n || 0).toLocaleString("id-ID", { minimumFractionDigits: d > 2 ? 2 : d });

const fmtDate = (d, withTime = true) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
};

/* ── Movement type config ────────────────────────────────────────────── */
const MOV_CONFIG = {
    purchase_in:    { label: "Pembelian Masuk",     color: "emerald", dir: "in",  icon: <IconShoppingCart size={14} /> },
    transfer_in:    { label: "Transfer Masuk",      color: "blue",    dir: "in",  icon: <IconArrowDown size={14} /> },
    transfer_out:   { label: "Transfer Keluar",     color: "orange",  dir: "out", icon: <IconArrowUp size={14} /> },
    repack_in:      { label: "Repack Masuk",        color: "teal",    dir: "in",  icon: <IconRepeat size={14} /> },
    repack_out:     { label: "Repack Keluar",       color: "cyan",    dir: "out", icon: <IconRepeat size={14} /> },
    production_in:  { label: "Produksi Masuk",      color: "green",   dir: "in",  icon: <IconLayersLinked size={14} /> },
    production_out: { label: "Produksi Keluar",     color: "lime",    dir: "out", icon: <IconLayersLinked size={14} /> },
    sales_out:      { label: "Penjualan (POS)",     color: "rose",    dir: "out", icon: <IconTrendingDown size={14} /> },
    adjustment_in:  { label: "Penyesuaian (+)",     color: "sky",     dir: "in",  icon: <IconAdjustments size={14} /> },
    adjustment_out: { label: "Penyesuaian (-)",     color: "amber",   dir: "out", icon: <IconAdjustments size={14} /> },
    waste:          { label: "Waste / Rusak",       color: "red",     dir: "out", icon: <IconCircleX size={14} /> },
    return_in:      { label: "Retur Masuk",         color: "indigo",  dir: "in",  icon: <IconRefresh size={14} /> },
    return_out:     { label: "Retur ke Supplier",   color: "purple",  dir: "out", icon: <IconRefresh size={14} /> },
};

const DirPalette = {
    in: {
        row:    "bg-emerald-50/50 dark:bg-emerald-900/10",
        badge:  "bg-emerald-100 text-emerald-700 border-emerald-200",
        qty:    "text-emerald-600 dark:text-emerald-400",
        icon:   "text-emerald-500",
    },
    out: {
        row:    "bg-rose-50/50 dark:bg-rose-900/10",
        badge:  "bg-rose-100 text-rose-700 border-rose-200",
        qty:    "text-rose-600 dark:text-rose-400",
        icon:   "text-rose-500",
    },
};

/* ── Mini inline chart (SVG sparkline) ──────────────────────────────── */
function Sparkline({ data, width = 200, height = 48 }) {
    if (!data || data.length < 2) return null;

    const vals   = data.map(d => parseFloat(d.avg_cost_after || 0));
    const minV   = Math.min(...vals);
    const maxV   = Math.max(...vals);
    const range  = maxV - minV || 1;
    const step   = width / (vals.length - 1);

    const pts = vals.map((v, i) => {
        const x = i * step;
        const y = height - ((v - minV) / range) * (height - 8) - 4;
        return `${x},${y}`;
    }).join(" ");

    const last  = vals[vals.length - 1];
    const first = vals[0];
    const up    = last >= first;

    return (
        <div className="relative">
            <svg width={width} height={height} className="overflow-visible">
                <defs>
                    <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={up ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={up ? "#10b981" : "#ef4444"} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Fill area */}
                <polygon
                    points={`0,${height} ${pts} ${width},${height}`}
                    fill="url(#spGrad)" />
                {/* Line */}
                <polyline
                    points={pts}
                    fill="none"
                    stroke={up ? "#10b981" : "#ef4444"}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round" />
                {/* Last dot */}
                <circle
                    cx={(vals.length - 1) * step}
                    cy={height - ((last - minV) / range) * (height - 8) - 4}
                    r="3.5"
                    fill={up ? "#10b981" : "#ef4444"} />
            </svg>
            <div className={`absolute top-0 right-0 text-xs font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>
                {up ? "▲" : "▼"} {fmt(last)}
            </div>
        </div>
    );
}

/* ── Stock level visual gauge ──────────────────────────────────────── */
function StockGauge({ qty, min, max, unit }) {
    const safeMax = max || (min ? min * 3 : qty * 2 || 100);
    const pct     = Math.min((qty / safeMax) * 100, 100);

    let color = "bg-emerald-500";
    let label = "Normal";
    if (qty <= 0)         { color = "bg-slate-400"; label = "Habis"; }
    else if (min && qty < min) { color = "bg-red-500";    label = "Low Stock"; }
    else if (max && qty > max) { color = "bg-amber-500";  label = "Overstock"; }

    return (
        <div>
            <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                    {fmtNum(qty)} {unit}
                </span>
                <span className={`font-bold px-1.5 py-0.5 rounded-md text-white text-[10px] ${color}`}>
                    {label}
                </span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`}
                     style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0</span>
                {min && <span className="text-red-400">Min: {fmtNum(min, 2)}</span>}
                {max && <span className="text-amber-400">Max: {fmtNum(max, 2)}</span>}
                <span>{fmtNum(safeMax, 2)}</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function Show({ stock, item, location, movements, stats, costHistory, filters }) {
    const [movType, setMovType]   = useState(filters.movType || "");
    const [dateFrom, setDateFrom] = useState(filters.dateFrom || "");
    const [dateTo, setDateTo]     = useState(filters.dateTo || "");

    const applyFilters = (overrides = {}) => {
        router.get(
            route("stock-valuation.show", {
                locationType: location.type,
                locationId:   location.id,
                itemType:     item.type,
                itemId:       item.id,
            }),
            { mov_type: movType, date_from: dateFrom, date_to: dateTo, ...overrides },
            { preserveState: true, replace: true }
        );
    };

    const isIng = item.type === "ingredient";
    const currentQty = stock.quantity;
    const pctChange = stats?.total_in > 0
        ? (((stats.total_in - stats.total_out) / stats.total_in) * 100).toFixed(1)
        : 0;

    return (
        <>
            <Head title={`Detail Stok — ${item.name}`} />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* ── BACK ──────────────────────────────────────────── */}
                <Link href={route("stock-valuation.index")}
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-all text-sm font-medium">
                    <IconArrowLeft size={18} /> Kembali ke Stock Valuation
                </Link>

                {/* ── HERO HEADER ───────────────────────────────────── */}
                <div className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden
                    ${isIng
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600"
                        : "bg-gradient-to-r from-violet-600 to-purple-600"}`}>
                    {/* decorative circles */}
                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                    <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />

                    <div className="relative flex flex-col md:flex-row md:items-center gap-4">
                        <div className={`p-3 rounded-xl ${isIng ? "bg-emerald-500/40" : "bg-violet-500/40"} w-fit`}>
                            {isIng
                                ? <IconBottle size={36} className="text-white" />
                                : <IconBox size={36} className="text-white" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h1 className="text-2xl font-black">{item.name}</h1>
                                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                                    {item.code}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                                <span className="flex items-center gap-1">
                                    {location.type === "warehouse"
                                        ? <IconBuildingWarehouse size={14} />
                                        : <IconBuildingStore size={14} />}
                                    {location.name}
                                </span>
                                <span>·</span>
                                <span>{item.category}</span>
                                <span>·</span>
                                <span>{isIng ? "Ingredient" : "Packaging Material"}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-white/70 mb-0.5">Total Nilai Inventaris</div>
                            <div className="text-3xl font-black">{fmt(stock.total_value)}</div>
                            <div className="text-sm text-white/70 mt-0.5">
                                {fmtNum(stock.quantity)} {item.unit} × {fmt(stock.average_cost)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── STATS ROW ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            label: "Stok Saat Ini",
                            value: `${fmtNum(stock.quantity)} ${item.unit}`,
                            sub: `Min: ${stock.min_stock ? fmtNum(stock.min_stock, 2) : "—"} · Max: ${stock.max_stock ? fmtNum(stock.max_stock, 2) : "—"}`,
                            icon: <IconPackages size={20} className="text-white" />,
                            accent: "bg-gradient-to-br from-blue-500 to-blue-600",
                        },
                        {
                            label: "Avg Harga / Unit",
                            value: fmt(stock.average_cost),
                            sub: `Total nilai: ${fmt(stock.total_value)}`,
                            icon: <IconCurrencyDollar size={20} className="text-white" />,
                            accent: "bg-gradient-to-br from-emerald-500 to-emerald-600",
                        },
                        {
                            label: "Total Masuk",
                            value: `+${fmtNum(stats?.total_in, 2)} ${item.unit}`,
                            sub: `${stats?.total_movements || 0} pergerakan total`,
                            icon: <IconArrowDown size={20} className="text-white" />,
                            accent: "bg-gradient-to-br from-teal-500 to-teal-600",
                        },
                        {
                            label: "Total Keluar",
                            value: `-${fmtNum(stats?.total_out, 2)} ${item.unit}`,
                            sub: `Pertama: ${fmtDate(stats?.first_movement, false)}`,
                            icon: <IconArrowUp size={20} className="text-white" />,
                            accent: "bg-gradient-to-br from-rose-500 to-rose-600",
                        },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center gap-3">
                            <div className={`${s.accent} p-2.5 rounded-xl shadow-md flex-shrink-0`}>
                                {s.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{s.label}</p>
                                <p className="font-black text-slate-800 dark:text-white leading-tight text-sm">{s.value}</p>
                                <p className="text-[11px] text-slate-400 truncate">{s.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── TWO COLUMNS: Gauge + Sparkline ────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stock Gauge */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                            <IconChartLine size={16} className="text-primary-500" />
                            Level Stok Saat Ini
                        </h3>
                        <StockGauge
                            qty={parseFloat(stock.quantity || 0)}
                            min={parseFloat(stock.min_stock || 0)}
                            max={parseFloat(stock.max_stock || 0)}
                            unit={item.unit}
                        />

                        {/* Last in / last out */}
                        <div className="grid grid-cols-2 gap-3 mt-5">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                <div className="text-xs text-emerald-600 font-bold mb-0.5 flex items-center gap-1">
                                    <IconArrowDown size={12} /> Terakhir Masuk
                                </div>
                                <div className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                                    +{fmtNum(stock.last_in_qty, 2)} {item.unit}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                    {fmtDate(stock.last_in_at)}
                                </div>
                            </div>
                            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                                <div className="text-xs text-rose-600 font-bold mb-0.5 flex items-center gap-1">
                                    <IconArrowUp size={12} /> Terakhir Keluar
                                </div>
                                <div className="font-black text-rose-700 dark:text-rose-400 text-sm">
                                    -{fmtNum(stock.last_out_qty, 2)} {item.unit}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                    {fmtDate(stock.last_out_at)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cost Sparkline */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                            <IconTrendingUp size={16} className="text-primary-500" />
                            Histori Rata-rata Harga (WAC)
                        </h3>
                        {costHistory?.length > 1 ? (
                            <div className="mt-2">
                                <Sparkline data={costHistory} width={340} height={80} />
                                <p className="text-xs text-slate-400 mt-3 text-center">
                                    Menampilkan {costHistory.length} titik data terakhir
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
                                Belum cukup data untuk menampilkan grafik
                            </div>
                        )}
                    </div>
                </div>

                {/* ── MOVEMENT HISTORY ──────────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <IconLayersLinked size={18} className="text-primary-500" />
                            Histori Pergerakan Stok
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Semua aktivitas masuk & keluar dengan detail siapa & kapan
                        </p>
                    </div>

                    {/* Filter bar */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
                        <select
                            value={movType}
                            onChange={e => { setMovType(e.target.value); applyFilters({ mov_type: e.target.value }); }}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-950 text-xs font-semibold px-3 py-2 focus:ring-2 focus:ring-primary-300 outline-none"
                        >
                            <option value="">Semua Tipe</option>
                            {Object.entries(MOV_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">Dari:</span>
                            <input type="date" value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-950 text-xs px-3 py-2 focus:ring-2 focus:ring-primary-300 outline-none" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">Sampai:</span>
                            <input type="date" value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-950 text-xs px-3 py-2 focus:ring-2 focus:ring-primary-300 outline-none" />
                        </div>
                        <button
                            onClick={() => applyFilters()}
                            className="px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-bold hover:bg-primary-600 transition-all flex items-center gap-1.5">
                            <IconFilter size={13} /> Terapkan
                        </button>
                        <button
                            onClick={() => {
                                setMovType(""); setDateFrom(""); setDateTo("");
                                applyFilters({ mov_type: "", date_from: "", date_to: "" });
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">
                            Reset
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[900px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    {["Tanggal", "Tipe Gerakan", "Qty", "Harga Unit", "Stok Sebelum → Sesudah",
                                      "Avg Cost Sebelum → Sesudah", "Referensi", "Oleh"].map(h => (
                                        <th key={h} className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {movements?.data?.length > 0 ? (
                                    movements.data.map(mov => {
                                        const cfg  = MOV_CONFIG[mov.movement_type] || { label: mov.movement_type, color: "slate", dir: "in" };
                                        const pal  = DirPalette[cfg.dir];
                                        const isIn = cfg.dir === "in";

                                        return (
                                            <tr key={mov.id}
                                                className={`border-b border-slate-100 dark:border-slate-800 hover:opacity-90 transition-opacity ${pal.row}`}>
                                                {/* Date */}
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                                                        {fmtDate(mov.movement_date, false)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {fmtDate(mov.created_at)}
                                                    </div>
                                                </td>

                                                {/* Type badge */}
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide ${pal.badge}`}>
                                                        {cfg.icon}
                                                        {cfg.label}
                                                    </span>
                                                </td>

                                                {/* Qty */}
                                                <td className={`py-3 px-4 font-black ${pal.qty}`}>
                                                    {isIn ? "+" : ""}{fmtNum(mov.quantity)} {item.unit}
                                                </td>

                                                {/* Unit cost */}
                                                <td className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                    {fmt(mov.unit_cost)}
                                                </td>

                                                {/* Stock before → after */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                                                        <span className="text-slate-500">{fmtNum(mov.stock_before)}</span>
                                                        <span className="text-slate-300">→</span>
                                                        <span className={`font-bold ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
                                                            {fmtNum(mov.stock_after)}
                                                        </span>
                                                        <span className="text-slate-400 text-[10px]">{item.unit}</span>
                                                    </div>
                                                </td>

                                                {/* Avg cost before → after */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <span className="text-slate-500">{fmt(mov.avg_cost_before)}</span>
                                                        <span className="text-slate-300">→</span>
                                                        <span className={`font-bold ${
                                                            parseFloat(mov.avg_cost_after) > parseFloat(mov.avg_cost_before)
                                                                ? "text-rose-600"
                                                                : parseFloat(mov.avg_cost_after) < parseFloat(mov.avg_cost_before)
                                                                    ? "text-emerald-600"
                                                                    : "text-slate-600"
                                                        }`}>
                                                            {fmt(mov.avg_cost_after)}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Reference */}
                                                <td className="py-3 px-4">
                                                    {mov.reference_number ? (
                                                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                                                            <IconHash size={11} />
                                                            {mov.reference_number}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                    {mov.notes && (
                                                        <div className="text-[10px] text-slate-400 italic mt-0.5 max-w-[140px] truncate" title={mov.notes}>
                                                            {mov.notes}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Created by */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                        <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                                                            <IconUser size={12} className="text-primary-600" />
                                                        </div>
                                                        <span className="font-semibold truncate max-w-[80px]">
                                                            {mov.creator?.name || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-slate-400">
                                            <IconPackages size={40} className="mx-auto mb-2 text-slate-300" />
                                            <p className="font-semibold">Tidak ada data pergerakan</p>
                                            <p className="text-xs mt-1">Coba ubah filter tanggal atau tipe pergerakan</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <Pagination links={movements?.links || []} />
                    </div>
                </div>
            </div>
        </>
    );
}

Show.layout = (page) => <DashboardLayout children={page} />;
