import DashboardLayout from '@/Layouts/DashboardLayout';
import { Head, router } from '@inertiajs/react';
import {
    IconShoppingCart, IconUsers, IconBuildingStore, IconChartBar, IconChartPie,
    IconTrendingUp, IconFilter, IconDownload, IconPackage, IconClock, IconReceipt,
    IconAlertTriangle, IconStar, IconUserCheck, IconCash, IconDiscount2,
    IconCalendar, IconArrowDownRight, IconMoodSmile, IconWalk,
} from '@tabler/icons-react';
import { useState, useCallback, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, ComposedChart, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line,
} from 'recharts';

// ── Tema ──────────────────────────────────────────────────────────────────────
const C = {
    primary: '#6366f1',
    success: '#10b981',
    danger:  '#f43f5e',
    warning: '#f59e0b',
    info:    '#3b82f6',
    pink:    '#ec4899',
};
const PALETTE = [
    '#6366f1','#3b82f6','#10b981','#f59e0b',
    '#ec4899','#8b5cf6','#06b6d4','#84cc16',
];
const GENDER_COLOR = { male: C.info, female: C.pink, unisex: C.success };

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
const num = (v) => new Intl.NumberFormat('id-ID').format(v ?? 0);
const pct = (v) => `${(v ?? 0).toFixed(1)}%`;

// ── Chart Tooltip ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 min-w-[160px]">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 text-xs mb-1 last:mb-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
                    </div>
                    <span className="font-bold" style={{ color: p.color }}>
                        {typeof p.value === 'number' && p.value > 1000 ? compact(p.value) : num(p.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ── Komponen dasar ────────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm ${className}`}>
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

function TH({ children }) {
    return (
        <th className="text-left py-2.5 pr-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-800">
            {children}
        </th>
    );
}

function TD({ children, className = '' }) {
    return (
        <td className={`py-2.5 pr-3 text-xs border-b border-slate-100 dark:border-slate-800 ${className}`}>
            {children}
        </td>
    );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent = C.primary, small, gradient }) {
    if (gradient) return (
        <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 bg-white" />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold opacity-80 mb-2">{label}</p>
                    <p className={`font-black leading-none ${small ? 'text-xl' : 'text-2xl'}`}>{value}</p>
                    {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
                </div>
                {Icon && <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Icon size={18} /></div>}
            </div>
        </div>
    );
    return (
        <Card>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-2">{label}</p>
                    <p className={`font-black text-slate-900 dark:text-white leading-none ${small ? 'text-lg' : 'text-xl'}`}>{value}</p>
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

// ── Badge helpers ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const cfg = {
        completed: { label: '✓ Selesai', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        cancelled: { label: '✕ Batal',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'                 },
        refunded:  { label: '↩ Refund',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'         },
    }[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
}

function TierBadge({ tier }) {
    if (!tier) return null;
    const cls = {
        platinum: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        gold:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        silver:   'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        bronze:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    }[tier] ?? 'bg-slate-100 text-slate-500';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold capitalize ${cls}`}>{tier}</span>;
}

function GenderBadge({ gender }) {
    const map = {
        male:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        female: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
        unisex: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    };
    return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${map[gender] ?? map.unisex}`}>{gender}</span>;
}

function EmptyState({ icon: Icon, text }) {
    return (
        <div className="text-center py-12">
            <Icon size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">{text}</p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function LaporanPenjualan({
    filters = {},
    stores = [],
    isSuperAdmin = false,
    summary = {},
    trendData = [],
    byIntensity = [],
    bySize = [],
    byGender = [],
    byVariant = [],
    topCustomers = [],
    byCashier = [],
    byStore = [],
    bySalesPerson = [],
    topPackaging = [],
    hourlyData = [],
    memberTrend = [],
    recentTransactions = [],
}) {
    const [activeTab, setActiveTab] = useState('ringkasan');
    const [lf, setLf] = useState({
        store_id:  filters.store_id  ?? '',
        date_from: filters.date_from ?? '',
        date_to:   filters.date_to   ?? '',
        group_by:  filters.group_by  ?? 'day',
        status:    filters.status    ?? 'completed',
    });

    const setF = (k, v) => setLf(p => ({ ...p, [k]: v }));

    const apply = useCallback(() => {
        router.get(
            route('laporan.penjualan'),
            {
                store_id:  lf.store_id  || undefined,
                date_from: lf.date_from || undefined,
                date_to:   lf.date_to   || undefined,
                group_by:  lf.group_by,
                status:    lf.status,
            },
            { preserveState: true, preserveScroll: true }
        );
    }, [lf]);

    const setPreset = (days, type) => {
        const to = new Date(), from = new Date();
        type === 'month' ? from.setDate(1) : from.setDate(from.getDate() - days);
        setLf(p => ({ ...p, date_from: from.toISOString().slice(0, 10), date_to: to.toISOString().slice(0, 10) }));
    };

    const TABS = [
        { key: 'ringkasan', label: 'Ringkasan' },
        { key: 'tren',      label: 'Tren Penjualan' },
        { key: 'produk',    label: 'Produk' },
        { key: 'pelanggan', label: 'Pelanggan' },
        { key: 'tim',       label: 'Tim & Kasir' },
        { key: 'toko',      label: 'Per Toko', hide: !isSuperAdmin },
        { key: 'detail',    label: 'Detail Transaksi' },
    ].filter(t => !t.hide);

    const peakHour    = useMemo(() => hourlyData.reduce((a, b) => b.transactions > a.transactions ? b : a, hourlyData[0] ?? {}), [hourlyData]);
    const maxHourTx   = useMemo(() => Math.max(...hourlyData.map(h => h.transactions), 1), [hourlyData]);
    const groupLabel  = lf.group_by === 'day' ? 'Hari' : lf.group_by === 'week' ? 'Minggu' : 'Bulan';
    const storeName   = stores.find(s => String(s.id) === String(filters.store_id))?.name ?? 'Semua Toko';
    const maxVariantQty = byVariant[0]?.qty ?? 1;

    return (
        <>
            <Head title="Laporan Penjualan" />
            <div className="space-y-5">

                {/* ── HEADER ───────────────────────────────────────────────── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Laporan Penjualan</h1>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <IconCalendar size={12} />
                            {filters.date_from} — {filters.date_to}
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <IconBuildingStore size={12} />
                            {storeName}
                        </p>
                    </div>
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Dari</label>
                            <input type="date" value={lf.date_from} onChange={e => setF('date_from', e.target.value)}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-[130px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sampai</label>
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
                        <div className="min-w-[100px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                            <select value={lf.status} onChange={e => setF('status', e.target.value)}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="completed">Selesai</option>
                                <option value="cancelled">Batal</option>
                                <option value="refunded">Refund</option>
                                <option value="all">Semua</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Preset</label>
                            <div className="flex gap-1">
                                {[{ label: 'Bln', type: 'month' }, { label: '7H', days: 7 }, { label: '30H', days: 30 }, { label: '90H', days: 90 }].map(({ label, days, type }) => (
                                    <button key={label} onClick={() => setPreset(days, type)}
                                        className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap">
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={apply}
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
                        {/* KPI utama */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <KpiCard label="Total Transaksi" value={num(summary.totalTransactions)}
                                sub={`${pct(summary.completionRate)} selesai`}    icon={IconReceipt}    accent={C.primary} />
                            <KpiCard gradient label="Total Revenue"    value={compact(summary.totalRevenue)}
                                sub={idr(summary.totalRevenue)}                   icon={IconCash}       accent={C.primary} />
                            <KpiCard label="Item Terjual"    value={num(summary.totalItemsSold)}
                                sub="Total unit"                                  icon={IconPackage}    accent={C.info} />
                            <KpiCard label="Avg Order Value" value={compact(summary.avgOrderValue)}
                                sub="Per transaksi"                               icon={IconChartBar}   accent={C.success} />
                            <KpiCard label="Total Diskon"    value={compact(summary.totalDiscount)}
                                sub={`Dari ${compact(summary.grossSales)}`}       icon={IconDiscount2}  accent={C.warning} />
                            <KpiCard label="Pelanggan Unik"  value={num(summary.uniqueCustomers)}
                                sub={`${pct(summary.memberRate)} member`}         icon={IconUsers}      accent={C.pink} />
                        </div>

                        {/* Status transaksi */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <KpiCard small label="Selesai"    value={num(summary.completedCount)}
                                sub={pct(summary.completionRate)}     icon={IconReceipt}      accent={C.success} />
                            <KpiCard small label="Dibatalkan" value={num(summary.cancelledCount)}
                                sub="Dari total transaksi"            icon={IconAlertTriangle} accent={C.danger} />
                            <KpiCard small label="Refund"     value={num(summary.refundedCount)}
                                sub="Dari total transaksi"            icon={IconArrowDownRight} accent={C.warning} />
                        </div>

                        {/* Member + Intensity + Gender */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Member vs Walk-in */}
                            <Card>
                                <SectionTitle icon={IconUserCheck} sub="Tipe pelanggan">Member vs Walk-in</SectionTitle>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Member',  v: summary.memberTx,  pct_: summary.memberRate ?? 0,             color: C.primary, icon: IconMoodSmile },
                                        { label: 'Walk-in', v: summary.walkinTx,  pct_: 100 - (summary.memberRate ?? 0),     color: C.info,    icon: IconWalk },
                                    ].map(({ label, v, pct_, color, icon: Ic }) => (
                                        <div key={label}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Ic size={13} style={{ color }} />
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black" style={{ color }}>{num(v)}</span>
                                                    <span className="text-[11px] text-slate-400 ml-1.5">{pct(pct_)}</span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct_ ?? 0}%`, background: color }} />
                                            </div>
                                        </div>
                                    ))}
                                    <ResponsiveContainer width="100%" height={100} className="mt-2">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Member',  value: summary.memberTx ?? 0 },
                                                    { name: 'Walk-in', value: summary.walkinTx ?? 0 },
                                                ]}
                                                dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={45} paddingAngle={3}>
                                                <Cell fill={C.primary} stroke="none" />
                                                <Cell fill={C.info}    stroke="none" />
                                            </Pie>
                                            <Tooltip content={<ChartTip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* By Intensity */}
                            <Card>
                                <SectionTitle icon={IconChartPie} sub="Distribusi konsentrasi — dari snapshot">By Intensity</SectionTitle>
                                {byIntensity.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={110}>
                                            <PieChart>
                                                <Pie data={byIntensity} dataKey="qty" nameKey="name"
                                                    cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={3}>
                                                    {byIntensity.map((_, i) => <Cell key={i} fill={PALETTE[i]} stroke="none" />)}
                                                </Pie>
                                                <Tooltip content={<ChartTip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="space-y-2 mt-2">
                                            {byIntensity.map((r, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PALETTE[i] }} />
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{r.name}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-black" style={{ color: PALETTE[i] }}>{num(r.qty)}</span>
                                                        <span className="text-[11px] text-slate-400 ml-1.5">{r.pct}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : <EmptyState icon={IconChartPie} text="Belum ada data" />}
                            </Card>

                            {/* By Gender */}
                            <Card>
                                <SectionTitle icon={IconUsers} sub="Per gender — dari snapshot variant" accent={C.pink}>By Gender</SectionTitle>
                                {byGender.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={110}>
                                            <PieChart>
                                                <Pie data={byGender} dataKey="qty" nameKey="gender"
                                                    cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={3}>
                                                    {byGender.map((r, i) => (
                                                        <Cell key={i} fill={GENDER_COLOR[r.gender] ?? PALETTE[i]} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<ChartTip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="space-y-2 mt-2">
                                            {byGender.map((r, i) => {
                                                const totalQty = byGender.reduce((a, b) => a + b.qty, 0);
                                                const gPct = totalQty > 0 ? ((r.qty / totalQty) * 100).toFixed(1) : 0;
                                                const color  = GENDER_COLOR[r.gender] ?? PALETTE[i];
                                                return (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">{r.gender}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-black" style={{ color }}>{num(r.qty)}</span>
                                                            <span className="text-[11px] text-slate-400 ml-1.5">{gPct}%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : <EmptyState icon={IconUsers} text="Belum ada data" />}
                            </Card>
                        </div>

                        {/* Hourly heatmap */}
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <SectionTitle icon={IconClock} sub="Distribusi jam transaksi">Penjualan per Jam</SectionTitle>
                                {peakHour?.label && (
                                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                        <span className="text-xs text-amber-700 dark:text-amber-400 font-bold">
                                            Peak: {peakHour.label}
                                        </span>
                                        <span className="text-[11px] text-slate-400">({peakHour.transactions} tx)</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-end gap-0.5 h-24">
                                {hourlyData.map((h, i) => {
                                    const hPct   = maxHourTx > 0 ? (h.transactions / maxHourTx) * 100 : 0;
                                    const isActive = h.transactions > 0;
                                    const isPeak   = h.hour === peakHour?.hour;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div className="w-full flex items-end" style={{ height: 72 }}>
                                                <div
                                                    title={`${h.label}: ${h.transactions} tx`}
                                                    className="w-full rounded-t transition-all cursor-default"
                                                    style={{
                                                        height: `${Math.max(hPct, isActive ? 6 : 2)}%`,
                                                        background: isPeak ? C.warning : isActive ? C.primary : '#e2e8f0',
                                                        opacity: isActive ? 1 : 0.4,
                                                    }}
                                                />
                                            </div>
                                            <span className={`text-[9px] ${i % 3 === 0 ? 'text-slate-400' : 'text-transparent'}`}>
                                                {h.label?.slice(0, 5)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: C.primary }} /> Aktif</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: C.warning }} /> Peak</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700" /> Tidak ada</div>
                            </div>
                        </Card>

                        {/* By Size */}
                        <Card>
                            <SectionTitle icon={IconPackage} sub="Per ukuran botol — dari snapshot size_ml" accent={C.info}>Breakdown Ukuran</SectionTitle>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    {bySize.map((r, i) => {
                                        const maxQty = Math.max(...bySize.map(s => s.qty), 1);
                                        return (
                                            <div key={i}>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PALETTE[i] }} />
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{r.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-black" style={{ color: PALETTE[i] }}>{num(r.qty)} unit</span>
                                                        <span className="text-[11px] text-slate-400 ml-2">{compact(r.revenue)}</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${(r.qty / maxQty) * 100}%`, background: PALETTE[i] }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <ResponsiveContainer width="100%" height={170}>
                                    <BarChart data={bySize} barSize={30}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis hide />
                                        <Tooltip content={<ChartTip />} />
                                        <Bar dataKey="qty" name="Qty" radius={[4, 4, 0, 0]}>
                                            {bySize.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: TREN PENJUALAN                                         */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'tren' && (
                    <div className="space-y-5">
                        <Card>
                            <SectionTitle icon={IconTrendingUp} sub={`Dikelompokkan per ${groupLabel}`}>Tren Transaksi & Revenue</SectionTitle>
                            <ResponsiveContainer width="100%" height={270}>
                                <ComposedChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={C.primary} stopOpacity={0.15} />
                                            <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="rev" tickFormatter={v => compact(v).replace('Rp ', '')} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="tx"  orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                                    <Area  yAxisId="rev" type="monotone" dataKey="revenue"      name="Revenue"    stroke={C.primary} strokeWidth={2.5} fill="url(#gRev)" dot={false} />
                                    <Bar   yAxisId="tx"  dataKey="transactions" name="Transaksi" fill={C.info}    radius={[3, 3, 0, 0]} fillOpacity={0.6} />
                                    <Line  yAxisId="rev" type="monotone" dataKey="avg_order"    name="Avg Order"  stroke={C.warning} strokeWidth={2} dot={false} strokeDasharray="4 3" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <SectionTitle icon={IconUserCheck} sub="Member vs Walk-in per periode" accent={C.pink}>Tren Member vs Walk-in</SectionTitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={memberTrend} barGap={2} barCategoryGap="22%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<ChartTip />} />
                                        <Legend formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                                        <Bar dataKey="member" name="Member"  fill={C.primary} radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                                        <Bar dataKey="walkin" name="Walk-in" fill={C.info}    radius={[3, 3, 0, 0]} fillOpacity={0.7} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>

                            <Card>
                                <SectionTitle icon={IconDiscount2} sub="Gross sales vs diskon per periode" accent={C.warning}>Tren Diskon</SectionTitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <ComposedChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={v => compact(v).replace('Rp ', '')} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<ChartTip />} />
                                        <Legend formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                                        <Bar  dataKey="gross_sales" name="Gross Sales" fill={C.primary} radius={[3, 3, 0, 0]} fillOpacity={0.7} />
                                        <Line dataKey="discount"    name="Diskon"      stroke={C.warning} strokeWidth={2} dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: PRODUK                                                 */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'produk' && (
                    <div className="space-y-5">
                        {/* Top Variants */}
                        <Card>
                            <SectionTitle icon={IconChartBar} sub="15 varian terlaris — dari snapshot variant_id">Top Varian by Qty</SectionTitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr>{['#', 'Varian', 'Gender', 'Qty', 'Revenue', 'Avg Harga', 'Transaksi'].map(h => <TH key={h}>{h}</TH>)}</tr>
                                    </thead>
                                    <tbody>
                                        {byVariant.length > 0 ? byVariant.map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <TD className="text-slate-400 font-mono">{i + 1}</TD>
                                                <TD><span className="font-bold text-slate-900 dark:text-white">{r.name}</span></TD>
                                                <TD><GenderBadge gender={r.gender} /></TD>
                                                <TD>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${(r.qty / maxVariantQty) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                                                        </div>
                                                        <span className="font-black" style={{ color: PALETTE[i % PALETTE.length] }}>{num(r.qty)}</span>
                                                    </div>
                                                </TD>
                                                <TD><span className="font-semibold text-slate-900 dark:text-white">{compact(r.revenue)}</span></TD>
                                                <TD className="text-slate-500">{compact(r.avg_price)}</TD>
                                                <TD className="text-slate-500">{num(r.tx_count)}</TD>
                                            </tr>
                                        )) : <tr><td colSpan={7} className="py-8 text-center text-xs text-slate-400">Belum ada data</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            {byVariant.length > 0 && (
                                <ResponsiveContainer width="100%" height={180} className="mt-4">
                                    <BarChart data={byVariant.slice(0, 10)} layout="vertical" barSize={12}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} className="dark:stroke-slate-800" />
                                        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                                        <Tooltip content={<ChartTip />} />
                                        <Bar dataKey="qty" name="Qty" radius={[0, 4, 4, 0]}>
                                            {byVariant.slice(0, 10).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* By Intensity table */}
                            <Card>
                                <SectionTitle icon={IconChartPie} sub="Per intensitas — dari snapshot intensity_id">By Intensity</SectionTitle>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead><tr>{['Intensity', 'Qty', 'Revenue', 'Transaksi', 'Share'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                                        <tbody>
                                            {byIntensity.length > 0 ? byIntensity.map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <TD>
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PALETTE[i] }} />
                                                            <span className="font-bold text-slate-900 dark:text-white">{r.name}</span>
                                                        </div>
                                                    </TD>
                                                    <TD><span className="font-black" style={{ color: PALETTE[i] }}>{num(r.qty)}</span></TD>
                                                    <TD className="text-slate-700 dark:text-slate-300">{compact(r.revenue)}</TD>
                                                    <TD className="text-slate-500">{num(r.tx_count)}</TD>
                                                    <TD>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: PALETTE[i] }} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-500">{r.pct}%</span>
                                                        </div>
                                                    </TD>
                                                </tr>
                                            )) : <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-400">Belum ada data</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            {/* Packaging terlaris */}
                            <Card>
                                <SectionTitle icon={IconPackage} sub="Top 10 — dari snapshot packaging_name" accent={C.info}>Packaging Add-on Terlaris</SectionTitle>
                                {topPackaging.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead><tr>{['#', 'Packaging', 'Kode', 'Qty', 'Revenue'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                                            <tbody>
                                                {topPackaging.map((p, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <TD className="text-slate-400 font-mono">{i + 1}</TD>
                                                        <TD><span className="font-semibold text-slate-900 dark:text-white">{p.name}</span></TD>
                                                        <TD className="font-mono text-slate-400">{p.code ?? '—'}</TD>
                                                        <TD><span className="font-black" style={{ color: PALETTE[i % PALETTE.length] }}>{num(p.qty)}</span></TD>
                                                        <TD><span className="font-semibold text-slate-900 dark:text-white">{compact(p.revenue)}</span></TD>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <EmptyState icon={IconPackage} text="Belum ada data packaging" />}
                            </Card>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: PELANGGAN                                              */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'pelanggan' && (
                    <div className="space-y-5">
                        <Card>
                            <SectionTitle icon={IconStar} sub="10 pelanggan total belanja tertinggi dalam periode">Top 10 Pelanggan</SectionTitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr>{['#', 'Nama', 'Tier', 'Telp', 'Order', 'Total Belanja', 'Avg Order', 'Poin Aktif', 'Terakhir Beli'].map(h => <TH key={h}>{h}</TH>)}</tr>
                                    </thead>
                                    <tbody>
                                        {topCustomers.length > 0 ? topCustomers.map((c, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <TD className="text-lg">{['🥇', '🥈', '🥉'][i] ?? '🏅'}</TD>
                                                <TD><span className="font-bold text-slate-900 dark:text-white">{c.name}</span></TD>
                                                <TD><TierBadge tier={c.tier} /></TD>
                                                <TD className="font-mono text-slate-400">{c.phone ?? '-'}</TD>
                                                <TD><span className="font-black text-indigo-600 dark:text-indigo-400">{num(c.total_orders)}</span></TD>
                                                <TD><span className="font-black text-slate-900 dark:text-white">{compact(c.total_spending)}</span></TD>
                                                <TD className="text-slate-500">{compact(c.avg_order)}</TD>
                                                <TD>
                                                    <div className="flex items-center gap-1">
                                                        <IconStar size={11} className="text-yellow-500" />
                                                        <span className="text-slate-600 dark:text-slate-400">{num(c.current_points)}</span>
                                                    </div>
                                                </TD>
                                                <TD className="text-slate-400 whitespace-nowrap">{c.last_purchase}</TD>
                                            </tr>
                                        )) : <tr><td colSpan={9} className="py-8 text-center text-xs text-slate-400">Belum ada data pelanggan</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: TIM & KASIR                                            */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'tim' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Kasir */}
                            <Card>
                                <SectionTitle icon={IconUserCheck} sub="Snapshot cashier_name dari sales">Penjualan per Kasir</SectionTitle>
                                {byCashier.length > 0 ? (
                                    <div className="space-y-2">
                                        {byCashier.map((c, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base">{['🥇', '🥈', '🥉'][i] ?? '🏅'}</span>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                                                        <p className="text-[11px] text-slate-400">{num(c.total_transactions)} tx · {num(c.unique_customers)} pelanggan</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{compact(c.total_revenue)}</p>
                                                    <p className="text-[11px] text-slate-400">AOV {compact(c.avg_order)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <EmptyState icon={IconUserCheck} text="Belum ada data kasir" />}
                            </Card>

                            {/* Sales Person */}
                            <Card>
                                <SectionTitle icon={IconTrendingUp} sub="Snapshot sales_person_name dari sales" accent={C.success}>Penjualan per Sales Person</SectionTitle>
                                {bySalesPerson.length > 0 ? (
                                    <div className="space-y-2">
                                        {bySalesPerson.map((sp, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base">{['🥇', '🥈', '🥉'][i] ?? '🏅'}</span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{sp.name}</p>
                                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{sp.code}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400">{num(sp.transactions)} tx · {num(sp.unique_customers)} pelanggan</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{compact(sp.revenue)}</p>
                                                    <p className="text-[11px] text-slate-400">AOV {compact(sp.avg_order)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <EmptyState icon={IconTrendingUp} text="Belum ada data sales person" />}
                            </Card>
                        </div>

                        {/* Bar chart kasir */}
                        {byCashier.length > 0 && (
                            <Card>
                                <SectionTitle icon={IconChartBar} sub="Revenue per kasir">Perbandingan Kasir</SectionTitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={byCashier} layout="vertical" barSize={14}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} className="dark:stroke-slate-800" />
                                        <XAxis type="number" tickFormatter={v => compact(v).replace('Rp ', '')} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                                        <Tooltip content={<ChartTip />} />
                                        <Bar dataKey="total_revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                                            {byCashier.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: PER TOKO (super admin)                                 */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'toko' && isSuperAdmin && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {byStore.map((s, i) => (
                                <Card key={i} className="relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: PALETTE[i % PALETTE.length] }} />
                                    <div className="flex items-center justify-between mt-1 mb-2">
                                        <IconBuildingStore size={14} className="text-slate-400" />
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                            i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                        }`}>#{i + 1}</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate mb-1">{s.name}</p>
                                    <p className="text-lg font-black mb-0.5" style={{ color: PALETTE[i % PALETTE.length] }}>{compact(s.revenue)}</p>
                                    <p className="text-[10px] text-slate-400">{num(s.transactions)} transaksi</p>
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] text-slate-400">
                                        <span>Share {s.share_pct}%</span>
                                        <span>{num(s.unique_customers)} cust</span>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <Card>
                            <SectionTitle icon={IconBuildingStore} sub="Revenue & Transaksi per outlet">Perbandingan Toko</SectionTitle>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={byStore} barGap={4} barCategoryGap="26%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-800" />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="rev" tickFormatter={v => compact(v).replace('Rp ', '')} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="tx"  orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                                    <Bar yAxisId="rev" dataKey="revenue"      name="Revenue"    radius={[4, 4, 0, 0]} fillOpacity={0.85}>
                                        {byStore.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                                    </Bar>
                                    <Bar yAxisId="tx"  dataKey="transactions" name="Transaksi"  fill={C.info} radius={[4, 4, 0, 0]} fillOpacity={0.5} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <SectionTitle icon={IconChartBar} sub="Detail per outlet">Detail Penjualan per Toko</SectionTitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr>{['Toko', 'Kode', 'Transaksi', 'Revenue', 'Avg Order', 'Pelanggan', 'Member Tx', 'Share'].map(h => <TH key={h}>{h}</TH>)}</tr>
                                    </thead>
                                    <tbody>
                                        {byStore.map((s, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <TD><span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{['🥇', '🥈', '🥉'][i] ?? '🏅'} {s.name}</span></TD>
                                                <TD className="font-mono text-slate-400">{s.code}</TD>
                                                <TD className="text-slate-700 dark:text-slate-300">{num(s.transactions)}</TD>
                                                <TD><span className="font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{compact(s.revenue)}</span></TD>
                                                <TD className="text-slate-500 whitespace-nowrap">{compact(s.avg_order)}</TD>
                                                <TD className="text-slate-500">{num(s.unique_customers)}</TD>
                                                <TD className="text-slate-500">{num(s.member_tx)}</TD>
                                                <TD>
                                                    <div className="flex items-center gap-2 min-w-[70px]">
                                                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${s.share_pct}%`, background: PALETTE[i % PALETTE.length] }} />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500">{s.share_pct}%</span>
                                                    </div>
                                                </TD>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {byStore.length > 1 && (
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={2} className="py-3 pr-3 text-xs font-black text-slate-700 dark:text-slate-300">TOTAL</td>
                                                <TD className="font-black text-slate-900 dark:text-white">{num(byStore.reduce((a, b) => a + b.transactions, 0))}</TD>
                                                <TD><span className="font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{compact(byStore.reduce((a, b) => a + b.revenue, 0))}</span></TD>
                                                <td colSpan={4} />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB: DETAIL TRANSAKSI                                       */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'detail' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <KpiCard small label="Ditampilkan"    value={`${recentTransactions.length} tx`}                                  icon={IconReceipt}   accent={C.info} />
                            <KpiCard small label="Total Revenue"  value={compact(recentTransactions.reduce((a, b) => a + (b.total ?? 0), 0))}    icon={IconCash}      accent={C.primary} />
                            <KpiCard small label="Total Item"     value={num(recentTransactions.reduce((a, b) => a + (b.total_items ?? 0), 0))}  icon={IconPackage}   accent={C.success} />
                            <KpiCard small label="Total Diskon"   value={compact(recentTransactions.reduce((a, b) => a + (b.discount ?? 0), 0))} icon={IconDiscount2} accent={C.warning} />
                        </div>

                        {recentTransactions.length > 0 ? (
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <SectionTitle icon={IconReceipt} sub="50 transaksi terbaru — snapshot dari sales table">Daftar Transaksi</SectionTitle>
                                    {recentTransactions.length >= 50 && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <IconAlertTriangle size={12} /> Menampilkan 50 teratas
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr>{['Invoice', 'Tgl', 'Jam', 'Status', 'Toko', 'Pelanggan', 'Tier', 'Kasir', 'Sales', 'Item', 'Gross Sales', 'Diskon', 'Total'].map(h => <TH key={h}>{h}</TH>)}</tr>
                                        </thead>
                                        <tbody>
                                            {recentTransactions.map((tx, i) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <TD className="font-mono font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{tx.invoice}</TD>
                                                    <TD className="text-slate-500 whitespace-nowrap">{tx.date}</TD>
                                                    <TD className="text-slate-400">{tx.time}</TD>
                                                    <TD><StatusBadge status={tx.status} /></TD>
                                                    <TD className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{tx.store}</TD>
                                                    <TD className="font-semibold text-slate-900 dark:text-white">{tx.customer}</TD>
                                                    <TD><TierBadge tier={tx.customer_tier} /></TD>
                                                    <TD className="text-slate-500">{tx.cashier}</TD>
                                                    <TD className="text-slate-500">{tx.sales_person}</TD>
                                                    <TD className="text-slate-500">{num(tx.total_items)}</TD>
                                                    <TD className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{compact(tx.gross_sales)}</TD>
                                                    <TD className="text-amber-600 dark:text-amber-400 whitespace-nowrap">{tx.discount > 0 ? `-${compact(tx.discount)}` : '—'}</TD>
                                                    <TD><span className="font-black text-slate-900 dark:text-white whitespace-nowrap">{compact(tx.total)}</span></TD>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={9} className="py-3 pr-3 text-xs font-black text-slate-600 dark:text-slate-400">
                                                    SUBTOTAL ({recentTransactions.length} transaksi)
                                                </td>
                                                <TD className="font-black text-slate-900 dark:text-white">{num(recentTransactions.reduce((a, b) => a + (b.total_items ?? 0), 0))}</TD>
                                                <TD className="font-black text-slate-900 dark:text-white whitespace-nowrap">{compact(recentTransactions.reduce((a, b) => a + (b.gross_sales ?? 0), 0))}</TD>
                                                <TD className="font-black text-amber-600 whitespace-nowrap">-{compact(recentTransactions.reduce((a, b) => a + (b.discount ?? 0), 0))}</TD>
                                                <TD><span className="font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{compact(recentTransactions.reduce((a, b) => a + (b.total ?? 0), 0))}</span></TD>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </Card>
                        ) : (
                            <Card>
                                <EmptyState icon={IconReceipt} text="Tidak ada transaksi dalam periode yang dipilih" />
                            </Card>
                        )}
                    </div>
                )}

            </div>
        </>
    );
}

LaporanPenjualan.layout = (page) => <DashboardLayout children={page} />;
