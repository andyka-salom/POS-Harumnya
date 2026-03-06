import DashboardLayout from '@/Layouts/DashboardLayout';
import { Head, router } from '@inertiajs/react';
import {
    IconTrendingUp, IconMoneybag, IconReceipt, IconChartPie, IconChartBar,
    IconBuildingStore, IconFilter, IconDownload, IconArrowUpRight, IconArrowDownRight,
    IconCash, IconDiscount2, IconPackage, IconPercentage, IconCircleDot,
    IconAlertTriangle, IconRefresh, IconUsers, IconShoppingBag, IconStar,
    IconChevronRight, IconCalendar, IconInfoCircle,
} from '@tabler/icons-react';
import { useState, useCallback, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
    PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ReferenceLine,
} from 'recharts';

// ── Tema & Konstanta ──────────────────────────────────────────────────────────
const C = {
    primary: '#6366f1',
    success: '#10b981',
    danger:  '#f43f5e',
    warning: '#f59e0b',
    info:    '#3b82f6',
    muted:   '#94a3b8',
};
const PALETTE = [
    '#6366f1','#3b82f6','#10b981','#f59e0b',
    '#f43f5e','#8b5cf6','#06b6d4','#84cc16',
];

// ── Format helpers ────────────────────────────────────────────────────────────
const idr = (v) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v ?? 0);

const compact = (v) => {
    v = v ?? 0;
    if (v < 0) return `-${compact(-v)}`;
    if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
    if (v >= 1_000)         return `Rp ${(v / 1_000).toFixed(0)}Rb`;
    return `Rp ${v}`;
};

const num  = (v) => new Intl.NumberFormat('id-ID').format(v ?? 0);
const pct  = (v) => `${(v ?? 0).toFixed(1)}%`;

const marginColor = (m) =>
    m >= 50 ? C.success : m >= 30 ? C.warning : C.danger;

const marginBadge = (m) => {
    const color = m >= 50
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : m >= 30
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{pct(m)}</span>;
};

// ── Tooltip Chart ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 min-w-[170px]">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 text-xs mb-1 last:mb-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
                    </div>
                    <span className="font-bold" style={{ color: p.color }}>
                        {typeof p.value === 'number' && p.value > 1000
                            ? compact(p.value)
                            : `${num(p.value)}${p.name?.includes('%') ? '%' : ''}`}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ── Komponen Kecil ────────────────────────────────────────────────────────────
function Card({ children, className = '', onClick }) {
    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
        >
            {children}
        </div>
    );
}

function SectionTitle({ icon: Icon, children, sub, accent = C.primary }) {
    return (
        <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accent}18` }}>
                <Icon size={15} style={{ color: accent }} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">{children}</h3>
                {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">{sub}</p>}
            </div>
        </div>
    );
}

function TH({ children, right }) {
    return (
        <th className={`py-2.5 pr-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-800 ${right ? 'text-right' : 'text-left'}`}>
            {children}
        </th>
    );
}

function TD({ children, right, mono, className = '' }) {
    return (
        <td className={`py-2.5 pr-3 text-xs ${right ? 'text-right' : ''} ${mono ? 'font-mono' : ''} ${className}`}>
            {children}
        </td>
    );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent = C.primary, gradient, negative, small }) {
    if (gradient) return (
        <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 bg-white" />
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest font-semibold opacity-80 mb-2">{label}</p>
                    <p className={`font-black leading-none ${small ? 'text-xl' : 'text-2xl'}`}>{value}</p>
                    {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
                </div>
                {Icon && (
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} />
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <Card>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-2">{label}</p>
                    <p className={`font-black leading-none ${negative ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'} ${small ? 'text-lg' : 'text-xl'}`}>
                        {value}
                    </p>
                    {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
                </div>
                {Icon && (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}15` }}>
                        <Icon size={16} style={{ color: accent }} strokeWidth={1.8} />
                    </div>
                )}
            </div>
        </Card>
    );
}

// ── Margin Gauge ──────────────────────────────────────────────────────────────
function MarginGauge({ value }) {
    const color  = marginColor(value);
    const filled = Math.min(Math.max(value, 0), 100);
    return (
        <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>0%</span><span>100%</span></div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${filled}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
                />
            </div>
            <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-slate-400">Gross Margin</span>
                <span className="text-sm font-black" style={{ color }}>{value.toFixed(1)}%</span>
            </div>
        </div>
    );
}

// ── P&L Row ───────────────────────────────────────────────────────────────────
function PLRow({ label, sub, value, color, sign, indent, bold, separator, note }) {
    return (
        <div className={`${separator ? 'border-t border-slate-200 dark:border-slate-800 pt-3 mt-1' : ''}`}>
            <div className={`flex items-center justify-between py-2 ${indent ? 'pl-5' : ''} ${bold ? 'bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3' : 'px-1'}`}>
                <div className="flex items-center gap-2">
                    {sign && (
                        <span className={`text-xs font-black w-3 ${sign === '+' ? 'text-emerald-500' : 'text-red-500'}`}>{sign}</span>
                    )}
                    <div>
                        <span className={`text-sm ${bold ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{label}</span>
                        {note && <span className="text-[10px] text-slate-400 ml-2">{note}</span>}
                        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
                    </div>
                </div>
                <span className={`font-bold ${bold ? 'text-base' : 'text-sm'}`} style={{ color }}>{idr(value)}</span>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function LaporanKeuangan({
    filters = {},
    stores = [],
    isSuperAdmin = false,
    summary = {},
    trendData = [],
    dailyMargin = [],
    byIntensity = [],
    bySize = [],
    byVariant = [],
    byPackaging = [],
    byPayment = [],
    byStore = [],
    discountAnalysis = [],
    discountByCategory = [],
    detailTransactions = [],
}) {
    const [activeTab, setActiveTab] = useState('ringkasan');
    const [lf, setLf] = useState({
        store_id:  filters.store_id  ?? '',
        date_from: filters.date_from ?? '',
        date_to:   filters.date_to   ?? '',
        group_by:  filters.group_by  ?? 'day',
    });

    const setF = (k, v) => setLf(p => ({ ...p, [k]: v }));

    const applyFilter = useCallback(() => {
        router.get(
            route('laporan.keuangan'),
            {
                store_id:  lf.store_id  || undefined,
                date_from: lf.date_from || undefined,
                date_to:   lf.date_to   || undefined,
                group_by:  lf.group_by,
            },
            { preserveState: true, preserveScroll: true }
        );
    }, [lf]);

    const setPreset = (days, type) => {
        const to   = new Date();
        const from = new Date();
        if (type === 'month') {
            from.setDate(1);
        } else if (type === 'year') {
            from.setMonth(0); from.setDate(1);
        } else {
            from.setDate(from.getDate() - days);
        }
        setLf(p => ({
            ...p,
            date_from: from.toISOString().slice(0, 10),
            date_to:   to.toISOString().slice(0, 10),
        }));
    };

    const TABS = [
        { key: 'ringkasan', label: 'Ringkasan' },
        { key: 'tren',      label: 'Tren & Grafik' },
        { key: 'produk',    label: 'Produk' },
        { key: 'toko',      label: 'Per Toko', hide: !isSuperAdmin },
        { key: 'diskon',    label: 'Diskon' },
        { key: 'detail',    label: 'Detail Transaksi' },
    ].filter(t => !t.hide);

    const totalPaymentAmt = useMemo(
        () => byPayment.reduce((a, b) => a + (b.amount ?? 0), 0),
        [byPayment]
    );

    const groupLabel = lf.group_by === 'day' ? 'Hari' : lf.group_by === 'week' ? 'Minggu' : 'Bulan';

    const storeName = stores.find(s => s.id === filters.store_id)?.name ?? 'Semua Toko';

    return (
        <>
            <Head title="Laporan Keuangan" />
            <div className="space-y-5">

                {/* ── HEADER ───────────────────────────────────────────────── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Laporan Keuangan</h1>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <IconCalendar size={12} />
                            {filters.date_from} — {filters.date_to}
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <IconBuildingStore size={12} />
                            {storeName}
                        </p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <IconDownload size={13} /> Export
                    </button>
                </div>

                {/* ── FILTER ───────────────────────────────────────────────── */}
                <Card>
                    <div className="flex flex-wrap items-end gap-3">
                        {isSuperAdmin && (
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Toko</label>
                                <select value={lf.store_id} onChange={e => setF('store_id', e.target.value)}
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="">Semua Toko</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="flex-1 min-w-[130px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Dari Tanggal</label>
                            <input type="date" value={lf.date_from} onChange={e => setF('date_from', e.target.value)}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-[130px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sampai Tanggal</label>
                            <input type="date" value={lf.date_to} onChange={e => setF('date_to', e.target.value)}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="min-w-[110px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Kelompokkan</label>
                            <select value={lf.group_by} onChange={e => setF('group_by', e.target.value)}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="day">Per Hari</option>
                                <option value="week">Per Minggu</option>
                                <option value="month">Per Bulan</option>
                            </select>
                        </div>
                        {/* Presets */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Preset</label>
                            <div className="flex gap-1">
                                {[
                                    { label: 'Bln Ini', type: 'month' },
                                    { label: '7H',  days: 7 },
                                    { label: '30H', days: 30 },
                                    { label: '90H', days: 90 },
                                ].map(({ label, days, type }) => (
                                    <button key={label} onClick={() => setPreset(days, type)}
                                        className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap">
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={applyFilter}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900">
                            <IconFilter size={14} /> Terapkan
                        </button>
                    </div>
                </Card>

                {/* ── TABS ─────────────────────────────────────────────────── */}
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit flex-wrap">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                activeTab === t.key
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: RINGKASAN                                              */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'ringkasan' && (
                    <div className="space-y-5">
                        {/* KPI Utama — P&L Waterfall */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <KpiCard label="Gross Sales"   value={compact(summary.grossSales)}
                                sub={idr(summary.grossSales)} icon={IconMoneybag} accent={C.info} />
                            <KpiCard label="Total Diskon"  value={compact(summary.totalDiscount)}
                                sub={`Rate ${pct(summary.discountRatePct)}`} icon={IconDiscount2} accent={C.warning} />
                            <KpiCard gradient label="Net Revenue" value={compact(summary.totalRevenue)}
                                sub={idr(summary.totalRevenue)} icon={IconCash} accent={C.primary} />
                            <KpiCard label="Total COGS"    value={compact(summary.totalCogs)}
                                sub="Bahan + Packaging" icon={IconPackage} accent={C.danger} negative />
                            <KpiCard gradient label="Gross Profit" value={compact(summary.grossProfit)}
                                sub={idr(summary.grossProfit)} icon={IconTrendingUp} accent={C.success} />
                            <KpiCard label="Gross Margin"  value={pct(summary.grossMarginPct)}
                                sub={`Markup ${pct(summary.markupPct)}`} icon={IconPercentage}
                                accent={marginColor(summary.grossMarginPct)} />
                        </div>

                        {/* KPI Operasional */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <KpiCard small label="Total Transaksi"   value={num(summary.totalTransactions)}
                                icon={IconReceipt}     accent={C.primary} />
                            <KpiCard small label="Avg Order Value"   value={compact(summary.avgOrderValue)}
                                icon={IconChartBar}    accent={C.info} />
                            <KpiCard small label="Avg Profit/Tx"     value={compact(summary.avgProfitPerTx)}
                                icon={IconTrendingUp}  accent={C.success} />
                            <KpiCard small label="Pelanggan Unik"    value={num(summary.uniqueCustomers)}
                                icon={IconUsers}       accent={C.warning} />
                            <KpiCard small label="Retur/Refund"      value={`${num(summary.totalReturns)} tx`}
                                sub={`-${compact(summary.totalRefundAmount)}`}
                                icon={IconRefresh}     accent={C.danger} />
                        </div>

                        {/* P&L Statement + Breakdown COGS */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* P&L */}
                            <div className="lg:col-span-2">
                                <Card>
                                    <SectionTitle icon={IconChartBar} sub="Profit & Loss Statement">Laporan Laba Rugi Kotor</SectionTitle>
                                    <div className="space-y-0.5">
                                        <PLRow label="Gross Sales (Penjualan Kotor)"
                                            value={summary.grossSales} color={C.info} sign="+" />
                                        <PLRow label="(-) Total Diskon"
                                            sub={`Rate: ${pct(summary.discountRatePct)}`}
                                            value={-summary.totalDiscount} color={C.warning} sign="-" indent />
                                        <PLRow label="= Net Revenue (Pendapatan Bersih)"
                                            value={summary.totalRevenue} color={C.primary} bold separator />
                                        <PLRow label="(-) HPP Parfum (Bahan Baku)"
                                            value={-summary.cogsPerfume} color={C.danger} sign="-" indent />
                                        <PLRow label="(-) HPP Packaging"
                                            value={-summary.cogsPackaging} color={C.danger} sign="-" indent />
                                        <PLRow label="= Gross Profit"
                                            value={summary.grossProfit} color={C.success} bold separator />
                                    </div>
                                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <MarginGauge value={summary.grossMarginPct ?? 0} />
                                    </div>
                                    {/* Loyalty summary */}
                                    {summary.totalPointsEarned > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <IconStar size={13} className="text-amber-400" />
                                                <span>Poin Diberikan</span>
                                            </div>
                                            <span className="font-bold text-amber-600">{num(summary.totalPointsEarned)} poin</span>
                                        </div>
                                    )}
                                    {summary.totalRedemptionValue > 0 && (
                                        <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                                            <span className="pl-5">Nilai Redeem Poin</span>
                                            <span className="font-bold text-indigo-500">-{compact(summary.totalRedemptionValue)}</span>
                                        </div>
                                    )}
                                </Card>
                            </div>

                            {/* COGS Breakdown */}
                            <Card>
                                <SectionTitle icon={IconPackage} sub="Harga Pokok Penjualan" accent={C.danger}>Breakdown COGS</SectionTitle>
                                <div className="space-y-4">
                                    {[
                                        { label: 'HPP Parfum',    value: summary.cogsPerfume,    color: C.danger, rev: summary.subtotalPerfume },
                                        { label: 'HPP Packaging', value: summary.cogsPackaging,  color: '#f97316', rev: summary.subtotalPackaging },
                                    ].map((item, i) => {
                                        const margin = item.rev > 0 ? ((item.rev - item.value) / item.rev) * 100 : 0;
                                        return (
                                            <div key={i}>
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                                                        <p className="text-[11px] text-slate-400">Rev: {compact(item.rev)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold" style={{ color: item.color }}>{compact(item.value)}</p>
                                                        <p className="text-[11px] text-slate-400">Margin {pct(margin)}</p>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{
                                                        width: `${Math.min(item.rev > 0 ? (item.value / item.rev) * 100 : 0, 100)}%`,
                                                        background: item.color,
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total COGS</span>
                                            <span className="text-sm font-black text-red-600 dark:text-red-400">{compact(summary.totalCogs)}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-0.5 text-right">
                                            {pct(summary.totalRevenue > 0 ? (summary.totalCogs / summary.totalRevenue) * 100 : 0)} dari Revenue
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Pembayaran + Diskon */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Metode Pembayaran */}
                            <Card>
                                <SectionTitle icon={IconCash} sub="Snapshot dari sale_payments">Breakdown Pembayaran</SectionTitle>
                                {byPayment.length > 0 ? (
                                    <>
                                        <div className="space-y-3 mb-5">
                                            {byPayment.map((p, i) => {
                                                const share = totalPaymentAmt > 0
                                                    ? ((p.amount / totalPaymentAmt) * 100).toFixed(1) : 0;
                                                return (
                                                    <div key={i}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PALETTE[i] }} />
                                                                <span className="text-sm font-bold text-slate-800 dark:text-white">{p.name}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">{p.type}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{compact(p.amount)}</p>
                                                                <p className="text-[10px] text-slate-400">{p.transactions} tx · {share}%</p>
                                                            </div>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${share}%`, background: PALETTE[i] }} />
                                                        </div>
                                                        {p.admin_fee > 0 && (
                                                            <p className="text-[10px] text-slate-400 text-right mt-0.5">
                                                                Admin fee: {compact(p.admin_fee)} · Net: {compact(p.net_amount)}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <ResponsiveContainer width="100%" height={120}>
                                            <PieChart>
                                                <Pie data={byPayment} dataKey="amount" nameKey="name"
                                                    cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                                                    {byPayment.map((_, i) => <Cell key={i} fill={PALETTE[i]} stroke="none" />)}
                                                </Pie>
                                                <Tooltip content={<ChartTip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </>
                                ) : <EmptyState icon={IconCash} text="Belum ada data pembayaran" />}
                            </Card>

                            {/* Diskon Ringkasan */}
                            <Card>
                                <SectionTitle icon={IconDiscount2} sub="Dari sale_discounts.discount_category" accent={C.warning}>Analisis Diskon</SectionTitle>
                                {discountByCategory.length > 0 ? (
                                    <div className="space-y-3">
                                        {discountByCategory.map((d, i) => {
                                            const totalD = discountByCategory.reduce((a, b) => a + b.total_amount, 0);
                                            const share  = totalD > 0 ? ((d.total_amount / totalD) * 100).toFixed(1) : 0;
                                            return (
                                                <div key={i}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white capitalize">{d.category}</p>
                                                            <p className="text-[10px] text-slate-400">{d.usage_count} transaksi · {share}%</p>
                                                        </div>
                                                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">{compact(d.total_amount)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${share}%`, background: PALETTE[i] }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total Diskon</span>
                                            <span className="text-base font-black text-amber-600 dark:text-amber-400">{compact(summary.totalDiscount)}</span>
                                        </div>
                                    </div>
                                ) : <EmptyState icon={IconDiscount2} text="Tidak ada diskon dalam periode ini" />}
                            </Card>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: TREN & GRAFIK                                          */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'tren' && (
                    <div className="space-y-5">
                        {/* Revenue + Profit + COGS */}
                        <Card>
                            <SectionTitle icon={IconTrendingUp} sub={`Dikelompokkan per ${groupLabel}`}>Tren Revenue, Profit & COGS</SectionTitle>
                            <ResponsiveContainer width="100%" height={270}>
                                <ComposedChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        {[['gRev', C.primary], ['gPro', C.success]].map(([id, color]) => (
                                            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left"  tickFormatter={v => compact(v).replace('Rp ', '')} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                                    <Area yAxisId="left"  type="monotone" dataKey="revenue"      name="Revenue"      stroke={C.primary} strokeWidth={2.5} fill="url(#gRev)" dot={false} />
                                    <Area yAxisId="left"  type="monotone" dataKey="gross_profit" name="Gross Profit" stroke={C.success} strokeWidth={2}   fill="url(#gPro)" dot={false} />
                                    <Line yAxisId="left"  type="monotone" dataKey="cogs"         name="COGS"         stroke={C.danger}  strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                                    <Line yAxisId="right" type="monotone" dataKey="margin_pct"   name="Margin %"     stroke={C.warning} strokeWidth={2}   dot={false} strokeDasharray="2 2" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Margin Harian + Volume Transaksi */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <SectionTitle icon={IconPercentage} sub="Fluktuasi margin harian" accent={C.warning}>Tren Margin (%)</SectionTitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={dailyMargin}>
                                        <defs>
                                            <linearGradient id="gMargin" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={C.warning} stopOpacity={0.2} />
                                                <stop offset="95%" stopColor={C.warning} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis domain={[0, 80]} tickFormatter={v => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<ChartTip />} />
                                        <ReferenceLine y={summary.grossMarginPct}
                                            stroke={C.primary} strokeDasharray="4 4"
                                            label={{ value: `Avg ${pct(summary.grossMarginPct)}`, fill: C.primary, fontSize: 10, position: 'right' }} />
                                        <Area type="monotone" dataKey="margin_pct" name="Margin %" stroke={C.warning} strokeWidth={2} fill="url(#gMargin)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Card>

                            <Card>
                                <SectionTitle icon={IconChartBar} sub="Volume & avg order value" accent={C.info}>Volume Transaksi</SectionTitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <ComposedChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="bar"  tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="line" orientation="right" tickFormatter={v => compact(v).replace('Rp ', '')} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<ChartTip />} />
                                        <Legend formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                                        <Bar  yAxisId="bar"  dataKey="transactions" name="Transaksi" fill={C.info}    radius={[3, 3, 0, 0]} fillOpacity={0.75} />
                                        <Line yAxisId="line" type="monotone" dataKey="avg_order" name="Avg Order" stroke={C.primary} strokeWidth={2} dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>

                        {/* Diskon vs Revenue */}
                        <Card>
                            <SectionTitle icon={IconDiscount2} sub="Perbandingan gross sales vs diskon per periode" accent={C.warning}>Tren Gross Sales vs Diskon</SectionTitle>
                            <ResponsiveContainer width="100%" height={190}>
                                <BarChart data={trendData} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={v => compact(v).replace('Rp ', '')} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                                    <Bar dataKey="gross_sales" name="Gross Sales" fill={C.primary} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="discount"    name="Diskon"      fill={C.warning} fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: PRODUK                                                 */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'produk' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* By Intensity */}
                            <Card>
                                <SectionTitle icon={IconChartPie} sub="Dari snapshot intensity_id — termasuk made-to-order">Keuangan by Intensity</SectionTitle>
                                <ProductTable data={byIntensity} />
                                {byIntensity.length > 0 && (
                                    <ResponsiveContainer width="100%" height={130} className="mt-4">
                                        <BarChart data={byIntensity} barSize={32}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <Tooltip content={<ChartTip />} />
                                            <Bar dataKey="revenue"      name="Revenue"      radius={[4, 4, 0, 0]}>
                                                {byIntensity.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                                            </Bar>
                                            <Bar dataKey="gross_profit" name="Gross Profit" radius={[4, 4, 0, 0]}>
                                                {byIntensity.map((_, i) => <Cell key={i} fill={C.success} fillOpacity={0.65} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Card>

                            {/* By Size */}
                            <Card>
                                <SectionTitle icon={IconChartBar} sub="Dari snapshot size_id & size_ml" accent={C.info}>Keuangan by Ukuran Botol</SectionTitle>
                                <ProductTable data={bySize} labelKey="name" />
                            </Card>
                        </div>

                        {/* Top Variants */}
                        <Card>
                            <SectionTitle icon={IconTrendingUp} sub="10 varian gross profit tertinggi — dari snapshot variant_id" accent={C.success}>Top Varian by Gross Profit</SectionTitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr>
                                            {['#', 'Varian', 'Gender', 'Qty', 'Revenue', 'COGS', 'Gross Profit', 'Margin'].map(h => <TH key={h}>{h}</TH>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {byVariant.length > 0 ? byVariant.map((r, i) => (
                                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <TD mono className="text-slate-400">{i + 1}</TD>
                                                <TD><span className="font-bold text-slate-900 dark:text-white">{r.name}</span></TD>
                                                <TD><GenderBadge gender={r.gender} /></TD>
                                                <TD className="text-slate-600 dark:text-slate-400">{num(r.qty)}</TD>
                                                <TD className="font-semibold text-slate-900 dark:text-white">{compact(r.revenue)}</TD>
                                                <TD className="text-red-600 dark:text-red-400">{compact(r.cogs)}</TD>
                                                <TD><span className="font-black text-emerald-600 dark:text-emerald-400">{compact(r.gross_profit)}</span></TD>
                                                <TD>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-10 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${Math.min(r.margin_pct, 100)}%`, background: marginColor(r.margin_pct) }} />
                                                        </div>
                                                        {marginBadge(r.margin_pct)}
                                                    </div>
                                                </TD>
                                            </tr>
                                        )) : <EmptyRow colSpan={8} />}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* By Packaging */}
                        {byPackaging.length > 0 && (
                            <Card>
                                <SectionTitle icon={IconPackage} sub="Kontribusi packaging — dari sale_item_packagings" accent={C.warning}>Keuangan Packaging (Top 10)</SectionTitle>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead><tr>{['Packaging', 'Qty', 'Revenue', 'COGS', 'Gross Profit', 'Margin'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                                        <tbody>
                                            {byPackaging.map((r, i) => (
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <TD><span className="font-bold text-slate-800 dark:text-white">{r.name}</span></TD>
                                                    <TD className="text-slate-500">{num(r.qty)}</TD>
                                                    <TD className="font-semibold text-slate-900 dark:text-white">{compact(r.revenue)}</TD>
                                                    <TD className="text-red-600 dark:text-red-400">{compact(r.cogs)}</TD>
                                                    <TD><span className="font-black text-emerald-600 dark:text-emerald-400">{compact(r.gross_profit)}</span></TD>
                                                    <TD>{marginBadge(r.margin_pct)}</TD>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: PER TOKO (super admin)                                 */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'toko' && isSuperAdmin && (
                    <div className="space-y-5">
                        {/* Store cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {byStore.map((s, i) => (
                                <Card key={i} className="relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: PALETTE[i % PALETTE.length] }} />
                                    <div className="flex items-center justify-between mt-1 mb-2">
                                        <IconBuildingStore size={14} className="text-slate-400" />
                                        <RankBadge rank={i} />
                                    </div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate mb-1">{s.name}</p>
                                    <p className="text-lg font-black mb-0.5" style={{ color: PALETTE[i % PALETTE.length] }}>{compact(s.gross_profit)}</p>
                                    <p className="text-[10px] text-slate-400">Profit · Margin {pct(s.margin_pct)}</p>
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] text-slate-400">
                                        <span>{compact(s.revenue)}</span>
                                        <span>{num(s.transactions)} tx</span>
                                        <span>{num(s.unique_customers)} pelanggan</span>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Bar chart perbandingan */}
                        <Card>
                            <SectionTitle icon={IconBuildingStore} sub="Revenue, COGS & Profit per toko">Perbandingan Keuangan Toko</SectionTitle>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={byStore} barGap={4} barCategoryGap="28%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={v => compact(v).replace('Rp ', '')} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                                    <Bar dataKey="revenue"      name="Revenue"      fill={C.primary} radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                                    <Bar dataKey="cogs"         name="COGS"         fill={C.danger}  radius={[4, 4, 0, 0]} fillOpacity={0.75} />
                                    <Bar dataKey="gross_profit" name="Gross Profit" fill={C.success} radius={[4, 4, 0, 0]} fillOpacity={0.9} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Tabel detail per toko */}
                        <Card>
                            <SectionTitle icon={IconChartBar} sub="Tabel lengkap semua toko">Detail Keuangan per Toko</SectionTitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr>
                                            {['#', 'Toko', 'Kode', 'Tx', 'Gross Sales', 'Diskon', 'Revenue', 'COGS', 'Gross Profit', 'Margin', 'AOV', 'Cust'].map(h => <TH key={h}>{h}</TH>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {byStore.map((s, i) => (
                                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <TD className="text-lg">{['🥇','🥈','🥉'][i] ?? '🏅'}</TD>
                                                <TD><span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{s.name}</span></TD>
                                                <TD mono className="text-slate-400">{s.code}</TD>
                                                <TD className="text-slate-600 dark:text-slate-400">{num(s.transactions)}</TD>
                                                <TD className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{compact(s.gross_sales)}</TD>
                                                <TD className="text-amber-600 dark:text-amber-400 whitespace-nowrap">{compact(s.discount)}</TD>
                                                <TD className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">{compact(s.revenue)}</TD>
                                                <TD className="text-red-600 dark:text-red-400 whitespace-nowrap">{compact(s.cogs)}</TD>
                                                <TD><span className="font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{compact(s.gross_profit)}</span></TD>
                                                <TD>{marginBadge(s.margin_pct)}</TD>
                                                <TD className="text-slate-500 whitespace-nowrap">{compact(s.avg_order)}</TD>
                                                <TD className="text-slate-500">{num(s.unique_customers)}</TD>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {byStore.length > 1 && (
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={3} className="py-3 pr-3 text-xs font-black text-slate-700 dark:text-slate-300">TOTAL</td>
                                                <TD className="font-black text-slate-900 dark:text-white">{num(byStore.reduce((a, b) => a + b.transactions, 0))}</TD>
                                                <TD className="font-black text-slate-900 dark:text-white whitespace-nowrap">{compact(byStore.reduce((a, b) => a + b.gross_sales, 0))}</TD>
                                                <TD className="font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">{compact(byStore.reduce((a, b) => a + b.discount, 0))}</TD>
                                                <TD className="font-black text-slate-900 dark:text-white whitespace-nowrap">{compact(byStore.reduce((a, b) => a + b.revenue, 0))}</TD>
                                                <TD className="font-black text-red-600 dark:text-red-400 whitespace-nowrap">{compact(byStore.reduce((a, b) => a + b.cogs, 0))}</TD>
                                                <TD><span className="font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{compact(byStore.reduce((a, b) => a + b.gross_profit, 0))}</span></TD>
                                                <TD>{marginBadge(summary.grossMarginPct)}</TD>
                                                <td colSpan={2} />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: DISKON                                                 */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'diskon' && (
                    <div className="space-y-5">
                        {/* KPI Diskon */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <KpiCard small label="Total Diskon"       value={compact(summary.totalDiscount)}    icon={IconDiscount2} accent={C.warning} />
                            <KpiCard small label="Discount Rate"      value={pct(summary.discountRatePct)}      icon={IconPercentage} accent={C.info} />
                            <KpiCard small label="Redeem Poin"        value={compact(summary.totalRedemptionValue)} icon={IconStar} accent={C.primary} />
                            <KpiCard small label="Total Diskon Tx"    value={num(discountAnalysis.reduce((a, b) => a + b.usage_count, 0))} icon={IconReceipt} accent={C.success} />
                        </div>

                        {/* Detail diskon */}
                        <Card>
                            <SectionTitle icon={IconDiscount2} sub="Dari sale_discounts — discount_category & discount_name" accent={C.warning}>Detail Penggunaan Diskon</SectionTitle>
                            {discountAnalysis.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead><tr>{['Kategori', 'Nama Diskon', 'Tx Digunakan', 'Total Potongan'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                                        <tbody>
                                            {discountAnalysis.map((d, i) => (
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <TD>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 capitalize">
                                                            {d.category}
                                                        </span>
                                                    </TD>
                                                    <TD className="font-semibold text-slate-800 dark:text-white">{d.name}</TD>
                                                    <TD className="text-slate-500">{num(d.usage_count)}</TD>
                                                    <TD><span className="font-black text-amber-600 dark:text-amber-400">{compact(d.total_amount)}</span></TD>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <EmptyState icon={IconDiscount2} text="Tidak ada diskon dalam periode ini" />}
                        </Card>

                        {/* Donut chart diskon per kategori */}
                        {discountByCategory.length > 0 && (
                            <Card>
                                <SectionTitle icon={IconChartPie} sub="Distribusi potongan per kategori" accent={C.warning}>Distribusi Diskon per Kategori</SectionTitle>
                                <div className="flex flex-wrap items-center gap-8">
                                    <ResponsiveContainer width={220} height={180}>
                                        <PieChart>
                                            <Pie data={discountByCategory} dataKey="total_amount" nameKey="category"
                                                cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                                                {discountByCategory.map((_, i) => <Cell key={i} fill={PALETTE[i]} stroke="none" />)}
                                            </Pie>
                                            <Tooltip content={<ChartTip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex-1 space-y-2">
                                        {discountByCategory.map((d, i) => {
                                            const total = discountByCategory.reduce((a, b) => a + b.total_amount, 0);
                                            const share = total > 0 ? ((d.total_amount / total) * 100).toFixed(1) : 0;
                                            return (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PALETTE[i] }} />
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">{d.category}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">{compact(d.total_amount)}</span>
                                                        <span className="text-[10px] text-slate-400 ml-1">({share}%)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: DETAIL TRANSAKSI                                       */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'detail' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <KpiCard small label="Ditampilkan"    value={`${detailTransactions.length} transaksi`} icon={IconReceipt}    accent={C.info} />
                            <KpiCard small label="Total Revenue"  value={compact(detailTransactions.reduce((a, b) => a + (b.revenue ?? 0), 0))}      icon={IconCash}       accent={C.primary} />
                            <KpiCard small label="Gross Profit"   value={compact(detailTransactions.reduce((a, b) => a + (b.gross_profit ?? 0), 0))} icon={IconTrendingUp} accent={C.success} />
                            <KpiCard small label="Total Diskon"   value={compact(detailTransactions.reduce((a, b) => a + (b.discount ?? 0), 0))}     icon={IconDiscount2}  accent={C.warning} />
                        </div>

                        {detailTransactions.length > 0 ? (
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <SectionTitle icon={IconReceipt} sub="Snapshot dari sales table — 50 transaksi terbaru">Detail Transaksi</SectionTitle>
                                    {detailTransactions.length >= 50 && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <IconAlertTriangle size={12} /> Menampilkan 50 teratas
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr>
                                                {['Invoice', 'Tanggal', 'Waktu', 'Toko', 'Customer', 'Kasir', 'Sales', 'Gross Sales', 'Diskon', 'Pajak', 'Revenue', 'COGS', 'Gross Profit', 'Margin', 'Poin'].map(h => <TH key={h}>{h}</TH>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailTransactions.map((tx, i) => (
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <TD mono className="text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">{tx.invoice}</TD>
                                                    <TD className="text-slate-500 whitespace-nowrap">{tx.date}</TD>
                                                    <TD className="text-slate-400">{tx.time}</TD>
                                                    <TD className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{tx.store}</TD>
                                                    <TD className="font-semibold text-slate-900 dark:text-white">{tx.customer}</TD>
                                                    <TD className="text-slate-500">{tx.cashier}</TD>
                                                    <TD className="text-slate-400">{tx.sales_person}</TD>
                                                    <TD className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{compact(tx.gross_sales)}</TD>
                                                    <TD className="text-amber-600 dark:text-amber-400 whitespace-nowrap">{tx.discount > 0 ? `-${compact(tx.discount)}` : '—'}</TD>
                                                    <TD className="text-slate-400 whitespace-nowrap">{tx.tax > 0 ? compact(tx.tax) : '—'}</TD>
                                                    <TD className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">{compact(tx.revenue)}</TD>
                                                    <TD className="text-red-600 dark:text-red-400 whitespace-nowrap">{compact(tx.cogs)}</TD>
                                                    <TD><span className="font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{compact(tx.gross_profit)}</span></TD>
                                                    <TD>{marginBadge(tx.margin_pct)}</TD>
                                                    <TD className="text-amber-500">{tx.points_earned > 0 ? `+${num(tx.points_earned)}` : '—'}</TD>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={7} className="py-3 pr-3 text-xs font-black text-slate-600 dark:text-slate-400">
                                                    SUBTOTAL ({detailTransactions.length} transaksi)
                                                </td>
                                                <TD className="font-black text-slate-900 dark:text-white whitespace-nowrap">{compact(detailTransactions.reduce((a, b) => a + (b.gross_sales ?? 0), 0))}</TD>
                                                <TD className="font-black text-amber-600 whitespace-nowrap">-{compact(detailTransactions.reduce((a, b) => a + (b.discount ?? 0), 0))}</TD>
                                                <TD className="font-black text-slate-500 whitespace-nowrap">{compact(detailTransactions.reduce((a, b) => a + (b.tax ?? 0), 0))}</TD>
                                                <TD className="font-black text-slate-900 dark:text-white whitespace-nowrap">{compact(detailTransactions.reduce((a, b) => a + (b.revenue ?? 0), 0))}</TD>
                                                <TD className="font-black text-red-600 whitespace-nowrap">{compact(detailTransactions.reduce((a, b) => a + (b.cogs ?? 0), 0))}</TD>
                                                <TD><span className="font-black text-emerald-600 whitespace-nowrap">{compact(detailTransactions.reduce((a, b) => a + (b.gross_profit ?? 0), 0))}</span></TD>
                                                <TD>{marginBadge(summary.grossMarginPct)}</TD>
                                                <TD className="font-black text-amber-500">{num(detailTransactions.reduce((a, b) => a + (b.points_earned ?? 0), 0))}</TD>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </Card>
                        ) : (
                            <Card>
                                <EmptyState icon={IconReceipt} text="Tidak ada transaksi dalam periode dan filter yang dipilih" />
                            </Card>
                        )}
                    </div>
                )}

            </div>
        </>
    );
}

LaporanKeuangan.layout = (page) => <DashboardLayout children={page} />;

// ── Sub-komponen utilitas ─────────────────────────────────────────────────────

function ProductTable({ data = [], labelKey = 'name' }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr>{['Nama', 'Qty', 'Revenue', 'COGS', 'Gross Profit', 'Margin'].map(h => <TH key={h}>{h}</TH>)}</tr>
                </thead>
                <tbody>
                    {data.length > 0 ? data.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TD>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: PALETTE[i] }} />
                                    <span className="font-bold text-slate-900 dark:text-white">{r[labelKey]}</span>
                                </div>
                            </TD>
                            <TD className="text-slate-500">{num(r.qty)}</TD>
                            <TD className="font-semibold text-slate-900 dark:text-white">{compact(r.revenue)}</TD>
                            <TD className="text-red-600 dark:text-red-400">{compact(r.cogs)}</TD>
                            <TD><span className="font-black text-emerald-600 dark:text-emerald-400">{compact(r.gross_profit)}</span></TD>
                            <TD>{marginBadge(r.margin_pct)}</TD>
                        </tr>
                    )) : <EmptyRow colSpan={6} />}
                </tbody>
            </table>
        </div>
    );
}

function EmptyState({ icon: Icon, text }) {
    return (
        <div className="text-center py-12">
            <Icon size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">{text}</p>
        </div>
    );
}

function EmptyRow({ colSpan }) {
    return (
        <tr><td colSpan={colSpan} className="py-8 text-center text-xs text-slate-400">Belum ada data</td></tr>
    );
}

function GenderBadge({ gender }) {
    const map = {
        male:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        female: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
        unisex: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    };
    return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${map[gender] ?? map.unisex}`}>{gender}</span>;
}

function RankBadge({ rank }) {
    const labels = ['🥇 #1', '🥈 #2', '🥉 #3'];
    const cls    = rank < 3
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${cls}`}>{labels[rank] ?? `#${rank + 1}`}</span>;
}
