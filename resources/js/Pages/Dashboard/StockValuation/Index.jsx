import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconBuildingWarehouse, IconBuildingStore, IconChartPie,
    IconPackages, IconBottle, IconBox, IconAlertTriangle,
    IconSearch, IconTrendingUp, IconCurrencyDollar,
    IconChevronRight, IconMapPin, IconFilter,
    IconLayersLinked, IconCategory
} from "@tabler/icons-react";

const fmt = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);

const fmtNum = (n, d = 2) => parseFloat(n || 0).toLocaleString("id-ID", { minimumFractionDigits: d });

/* ── Badge ──────────────────────────────────────────────────────────── */
function Badge({ children, color = "slate" }) {
    const palette = {
        slate:   "bg-slate-100 text-slate-700 border-slate-200",
        emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
        violet:  "bg-violet-100 text-violet-700 border-violet-200",
        amber:   "bg-amber-100 text-amber-700 border-amber-200",
        rose:    "bg-rose-100 text-rose-700 border-rose-200",
    };
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${palette[color]}`}>
            {children}
        </span>
    );
}

/* ── Summary Card ────────────────────────────────────────────────────── */
function SumCard({ label, value, sub, icon, accent = "blue" }) {
    const accents = {
        blue:   "from-blue-500 to-blue-600",
        emerald:"from-emerald-500 to-emerald-600",
        violet: "from-violet-500 to-violet-600",
        amber:  "from-amber-500 to-amber-600",
    };
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-center gap-4">
            <div className={`bg-gradient-to-br ${accents[accent]} p-3 rounded-xl shadow-md`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider truncate">{label}</p>
                <p className="text-xl font-black text-slate-800 dark:text-white leading-tight">{value}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

/* ── Progress bar ─────────────────────────────────────────────────────── */
function ProgressBar({ pct, color = "emerald" }) {
    const cols = { emerald: "bg-emerald-500", violet: "bg-violet-500", amber: "bg-amber-500" };
    return (
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${cols[color]} transition-all duration-700`}
                 style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function Index({ viewBy, locType, search: initSearch,
    byLocation, byCategory, byItemType, summary }) {

    const [search, setSearch] = useState(initSearch || "");

    const go = (params) =>
        router.get(route("stock-valuation.index"),
            { view_by: viewBy, location_type: locType, search, ...params },
            { preserveState: true, replace: true });

    const handleSearch = (e) => {
        const val = e.target.value;
        setSearch(val);
        clearTimeout(window.__svSearch);
        window.__svSearch = setTimeout(() => go({ search: val }), 400);
    };

    const grandTotal = summary?.grand_total || 0;

    /* ── TABS ────────────────────────────────────────────────────────── */
    const tabs = [
        { key: "location",  label: "Berdasarkan Lokasi",    icon: <IconMapPin size={16} /> },
        { key: "category",  label: "Berdasarkan Kategori",  icon: <IconCategory size={16} /> },
        { key: "item_type", label: "Berdasarkan Tipe Item", icon: <IconLayersLinked size={16} /> },
    ];

    return (
        <>
            <Head title="Stock Valuation" />

            {/* ── PAGE HEADER ─────────────────────────────────────────── */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <IconChartPie size={28} className="text-primary-500" />
                        Stock Valuation
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Valuasi & histori pergerakan inventaris seluruh lokasi
                    </p>
                </div>
            </div>

            {/* ── SUMMARY CARDS ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <SumCard
                    label="Total Nilai Aset"
                    value={fmt(grandTotal)}
                    icon={<IconCurrencyDollar size={22} className="text-white" />}
                    accent="blue"
                />
                <SumCard
                    label="Low Stock Alert"
                    value={summary?.total_low_stock ?? 0}
                    sub="item di bawah minimum"
                    icon={<IconAlertTriangle size={22} className="text-white" />}
                    accent="amber"
                />
                <SumCard
                    label="Gudang Aktif"
                    value={summary?.wh_count ?? 0}
                    icon={<IconBuildingWarehouse size={22} className="text-white" />}
                    accent="emerald"
                />
                <SumCard
                    label="Toko Aktif"
                    value={summary?.store_count ?? 0}
                    icon={<IconBuildingStore size={22} className="text-white" />}
                    accent="violet"
                />
            </div>

            {/* ── TABS ────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                <div className="flex border-b border-slate-200 dark:border-slate-800">
                    {tabs.map(t => (
                        <button key={t.key}
                            onClick={() => go({ view_by: t.key })}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all border-b-2 -mb-px
                                ${viewBy === t.key
                                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                                    : "border-transparent text-slate-500 hover:text-slate-700"}`}
                        >
                            {t.icon}{t.label}
                        </button>
                    ))}
                </div>

                {/* ── FILTER BAR ─────────────────────────────────────── */}
                <div className="p-4 flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={handleSearch}
                            placeholder="Cari item, lokasi, atau kategori..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none" />
                    </div>

                    {viewBy === "location" && (
                        <div className="flex gap-2">
                            {["all", "warehouse", "store"].map(lt => (
                                <button key={lt}
                                    onClick={() => go({ location_type: lt })}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all
                                        ${locType === lt
                                            ? "bg-primary-500 text-white border-primary-500"
                                            : "bg-white dark:bg-slate-800 text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                                    {lt === "all" ? "Semua" : lt === "warehouse" ? "Gudang" : "Toko"}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── CONTENT ────────────────────────────────────────── */}
                <div className="p-4 pt-0">
                    {viewBy === "location" && <ByLocation data={byLocation} grandTotal={grandTotal} />}
                    {viewBy === "category" && <ByCategory data={byCategory} grandTotal={grandTotal} />}
                    {viewBy === "item_type" && <ByItemType data={byItemType} />}
                </div>
            </div>
        </>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   VIEW: BY LOCATION
══════════════════════════════════════════════════════════════════════ */
function ByLocation({ data, grandTotal }) {
    if (!data?.length) return <EmptyState />;

    return (
        <div className="space-y-3">
            {data.map(loc => {
                const pct = grandTotal > 0 ? (loc.total_value / grandTotal) * 100 : 0;
                const isWarehouse = loc.type === "warehouse";

                return (
                    <div key={loc.id}
                        className="group rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-primary-300 hover:shadow-md transition-all bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                            {/* Icon */}
                            <div className={`p-2.5 rounded-xl ${isWarehouse
                                ? "bg-blue-100 dark:bg-blue-900/30"
                                : "bg-violet-100 dark:bg-violet-900/30"}`}>
                                {isWarehouse
                                    ? <IconBuildingWarehouse size={20} className="text-blue-600 dark:text-blue-400" />
                                    : <IconBuildingStore size={20} className="text-violet-600 dark:text-violet-400" />
                                }
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800 dark:text-white truncate">
                                        {loc.name}
                                    </span>
                                    <Badge color={isWarehouse ? "slate" : "violet"}>
                                        {isWarehouse ? "Gudang" : "Toko"}
                                    </Badge>
                                    {loc.low_stock > 0 && (
                                        <Badge color="amber">
                                            <IconAlertTriangle size={10} />
                                            {loc.low_stock} Low Stock
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">{loc.code}</div>
                            </div>

                            {/* Value */}
                            <div className="text-right flex-shrink-0">
                                <div className="font-black text-slate-800 dark:text-white">{fmt(loc.total_value)}</div>
                                <div className="text-xs text-slate-400">{pct.toFixed(1)}% dari total</div>
                            </div>
                        </div>

                        {/* Progress + breakdown */}
                        <div className="mt-3">
                            <ProgressBar pct={pct} color={isWarehouse ? "emerald" : "violet"} />
                            <div className="flex gap-6 mt-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <IconBottle size={12} className="text-emerald-500" />
                                    <span className="font-semibold">{loc.ing_items} Ingredient</span>
                                    <span className="text-slate-400">· {fmt(loc.ing_value)}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <IconBox size={12} className="text-violet-500" />
                                    <span className="font-semibold">{loc.pkg_items} Packaging</span>
                                    <span className="text-slate-400">· {fmt(loc.pkg_value)}</span>
                                </span>
                            </div>
                        </div>

                        {/* View detail links */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <Link
                                href={`${route("stock-valuation.index")}?view_by=location&loc_detail=${loc.type}:${loc.id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-xs font-bold text-slate-600 hover:text-primary-600 transition-all">
                                <IconTrendingUp size={12} /> Lihat Semua Stok
                                <IconChevronRight size={12} />
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   VIEW: BY CATEGORY
══════════════════════════════════════════════════════════════════════ */
function ByCategory({ data, grandTotal }) {
    if (!data?.length) return <EmptyState />;

    const maxVal = Math.max(...data.map(c => c.total_value), 1);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</th>
                        <th className="text-center py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipe</th>
                        <th className="text-right py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah Item</th>
                        <th className="py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Distribusi</th>
                        <th className="text-right py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Nilai</th>
                        <th className="text-right py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">% Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((cat, i) => {
                        const pct = grandTotal > 0 ? (cat.total_value / grandTotal) * 100 : 0;
                        const barPct = (cat.total_value / maxVal) * 100;
                        const isIng = cat.item_type === "ingredient";

                        return (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 px-3 font-bold text-slate-800 dark:text-white">{cat.name}</td>
                                <td className="py-3 px-3 text-center">
                                    <Badge color={isIng ? "emerald" : "violet"}>
                                        {isIng ? <IconBottle size={10} /> : <IconBox size={10} />}
                                        {isIng ? "Ingredient" : "Packaging"}
                                    </Badge>
                                </td>
                                <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                                    {cat.item_count}
                                </td>
                                <td className="py-3 px-3 min-w-[120px]">
                                    <ProgressBar pct={barPct} color={isIng ? "emerald" : "violet"} />
                                </td>
                                <td className="py-3 px-3 text-right font-black text-slate-800 dark:text-white">
                                    {fmt(cat.total_value)}
                                </td>
                                <td className="py-3 px-3 text-right">
                                    <span className="text-xs font-bold text-slate-500">{pct.toFixed(1)}%</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   VIEW: BY ITEM TYPE
══════════════════════════════════════════════════════════════════════ */
function ByItemType({ data }) {
    if (!data?.summary) return <EmptyState />;

    const total = data.summary.reduce((s, t) => s + (t.total_value || 0), 0);

    return (
        <div className="space-y-6">
            {/* Donut-like summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.summary.map(t => {
                    const isIng = t.type === "ingredient";
                    return (
                        <div key={t.type} className={`rounded-xl p-5 border-2 ${
                            isIng ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800"
                                  : "border-violet-200 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-800"}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2.5 rounded-xl ${isIng ? "bg-emerald-500" : "bg-violet-500"}`}>
                                    {isIng ? <IconBottle size={20} className="text-white" />
                                           : <IconBox size={20} className="text-white" />}
                                </div>
                                <div>
                                    <div className="font-black text-slate-800 dark:text-white">{t.label}</div>
                                    <div className="text-xs text-slate-500">{t.item_count} jenis item</div>
                                </div>
                                <div className={`ml-auto text-2xl font-black ${isIng ? "text-emerald-600" : "text-violet-600"}`}>
                                    {t.percentage}%
                                </div>
                            </div>
                            <ProgressBar pct={t.percentage} color={isIng ? "emerald" : "violet"} />
                            <div className="mt-2 font-bold text-slate-700 dark:text-slate-200">{fmt(t.total_value)}</div>
                        </div>
                    );
                })}
            </div>

            {/* Top lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopList title="Top Ingredient" items={data.top_ingredients} color="emerald"
                         type="ingredient" icon={<IconBottle size={14} />} />
                <TopList title="Top Packaging" items={data.top_packaging} color="violet"
                         type="packaging" icon={<IconBox size={14} />} />
            </div>
        </div>
    );
}

function TopList({ title, items, color, type, icon }) {
    const cols = { emerald: "text-emerald-600", violet: "text-violet-600" };
    const bars = { emerald: "bg-emerald-500", violet: "bg-violet-500" };
    const max = Math.max(...(items || []).map(i => i.total_value), 1);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${cols[color]}`}>
                {icon} {title} by Nilai
            </h3>
            <div className="space-y-2.5">
                {(items || []).map((item, i) => (
                    <div key={item.id} className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 w-4 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                                <span className={`text-xs font-black flex-shrink-0 ml-2 ${cols[color]}`}>{fmt(item.total_value)}</span>
                            </div>
                            <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${bars[color]}`}
                                     style={{ width: `${(item.total_value / max) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <IconPackages size={48} className="mb-3 text-slate-300" />
            <p className="font-bold">Tidak ada data ditemukan</p>
            <p className="text-sm mt-1">Coba ubah filter atau tambahkan data stok terlebih dahulu</p>
        </div>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
