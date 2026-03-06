import React, { useEffect, useState } from "react";
import { Head, router, Link } from "@inertiajs/react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import Pagination from "@/Components/Dashboard/Pagination";
import {
    IconDatabaseOff, IconSearch, IconHistory, IconReceipt,
    IconPrinter, IconFilter, IconX, IconTrendingUp, IconCalendar,
    IconRefresh,
} from "@tabler/icons-react";

const defaultFilters = { q: "", date_from: "", date_to: "", status: "" };

const fmt = (v = 0) =>
    Number(v || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });

// Format sold_at (timestamp) menjadi tanggal & waktu
const fmtSoldAt = (soldAt) => {
    if (!soldAt) return { date: "-", time: "" };
    const d = new Date(soldAt);
    return {
        date: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };
};

const STATUS_BADGE = {
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    cancelled:  "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    refunded:   "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    pending:    "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    draft:      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const STATUS_LABEL = {
    completed: "Selesai", cancelled: "Dibatalkan",
    refunded: "Refund", pending: "Pending", draft: "Draft",
};

export default function History({ sales, filters, summary = {} }) {
    const [filterData,   setFilterData]   = useState({ ...defaultFilters, ...filters });
    const [showFilters,  setShowFilters]  = useState(false);

    useEffect(() => { setFilterData({ ...defaultFilters, ...filters }); }, [filters]);

    const change = (f, v) => setFilterData(p => ({ ...p, [f]: v }));

    const applyFilters = (e) => {
        e.preventDefault();
        router.get(route("transactions.history"), filterData, { preserveScroll: true, preserveState: true });
        setShowFilters(false);
    };

    const resetFilters = () => {
        setFilterData(defaultFilters);
        router.get(route("transactions.history"), defaultFilters, { preserveScroll: true, preserveState: true, replace: true });
    };

    const rows        = sales?.data         ?? [];
    const links       = sales?.links        ?? [];
    const currentPage = sales?.current_page ?? 1;
    const perPage     = Number(sales?.per_page || 20);
    const hasFilter   = filterData.q || filterData.date_from || filterData.date_to || filterData.status;

    // Summary dari controller — gunakan kolom decimal langsung
    const sumStats = summary && typeof summary === "object" ? summary : {};

    return (
        <>
            <Head title="Riwayat Transaksi"/>
            <div className="space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <IconHistory size={28} className="text-primary-500"/>
                            Riwayat Transaksi
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{sales?.total ?? 0} transaksi tercatat</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                showFilters || hasFilter
                                    ? "bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-950/50 dark:border-primary-800 dark:text-primary-400"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}>
                            <IconFilter size={18}/>
                            Filter
                            {hasFilter && <span className="w-2 h-2 rounded-full bg-primary-500"/>}
                        </button>
                        <Link href={route("transactions.index")}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors shadow-lg shadow-primary-500/30">
                            <IconReceipt size={18}/> Transaksi Baru
                        </Link>
                    </div>
                </div>

                {/* Summary Cards */}
                {Object.keys(sumStats).length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {[
                            {
                                label: "Total Transaksi",
                                value: sumStats.total_transactions ?? 0,
                                display: v => Number(v).toLocaleString("id-ID"),
                                suffix: "trx",
                                color: "text-slate-700 dark:text-slate-200",
                            },
                            {
                                label: "Total Revenue",
                                value: sumStats.total_revenue ?? 0,
                                display: fmt,
                                color: "text-primary-600 dark:text-primary-400",
                            },
                            {
                                label: "Total HPP",
                                value: sumStats.total_cogs ?? 0,
                                display: fmt,
                                color: "text-slate-500",
                            },
                            {
                                label: "Gross Profit",
                                value: sumStats.total_gross_profit ?? 0,
                                display: fmt,
                                color: "text-emerald-600 dark:text-emerald-400",
                            },
                            {
                                label: "Avg Margin",
                                value: sumStats.avg_margin ?? 0,
                                display: v => `${parseFloat(v).toFixed(1)}%`,
                                color: "text-blue-600 dark:text-blue-400",
                            },
                        ].map(card => (
                            <div key={card.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{card.label}</p>
                                <p className={`text-base font-black ${card.color}`}>{card.display(card.value)}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                        <form onSubmit={applyFilters}>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                                {/* Search: sale_number atau customer_name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        No. Transaksi / Pelanggan
                                    </label>
                                    <input type="text" placeholder="INV/... atau nama pelanggan"
                                        value={filterData.q}
                                        onChange={e => change("q", e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tanggal Mulai</label>
                                    <input type="date" value={filterData.date_from}
                                        onChange={e => change("date_from", e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tanggal Akhir</label>
                                    <input type="date" value={filterData.date_to}
                                        onChange={e => change("date_to", e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                                    <select value={filterData.status} onChange={e => change("status", e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all">
                                        <option value="">Semua Status</option>
                                        <option value="completed">Selesai</option>
                                        <option value="pending">Pending</option>
                                        <option value="cancelled">Dibatalkan</option>
                                        <option value="refunded">Refund</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>

                                <div className="flex items-end gap-2">
                                    <button type="submit"
                                        className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors">
                                        <IconSearch size={18}/> Cari
                                    </button>
                                    {hasFilter && (
                                        <button type="button" onClick={resetFilters}
                                            className="h-11 px-4 inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <IconRefresh size={18}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Table */}
                {rows.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        {[
                                            { label: "No",             cls: "text-left" },
                                            { label: "No. Transaksi",  cls: "text-left" },
                                            { label: "Tanggal",        cls: "text-left" },
                                            { label: "Kasir",          cls: "text-left" },
                                            { label: "Pelanggan",      cls: "text-left" },
                                            { label: "Item",           cls: "text-center" },
                                            { label: "Subtotal",       cls: "text-right" },
                                            { label: "Diskon",         cls: "text-right" },
                                            { label: "Total",          cls: "text-right" },
                                            { label: "Profit",         cls: "text-right" },
                                            { label: "Margin",         cls: "text-right" },
                                            { label: "Status",         cls: "text-center" },
                                            { label: "",               cls: "text-center" },
                                        ].map(h => (
                                            <th key={h.label} className={`px-4 py-4 ${h.cls} text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap`}>
                                                {h.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {rows.map((sale, index) => {
                                        // sold_at adalah timestamp; parse untuk tampil tanggal & waktu
                                        const { date, time } = fmtSoldAt(sale.sold_at);

                                        // items_count dari withCount('items') di controller
                                        const itemCount = sale.items_count ?? sale.sale_items_count ?? 0;

                                        return (
                                            <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-4 text-sm text-slate-500">
                                                    {index + 1 + (currentPage - 1) * perPage}
                                                </td>

                                                {/* sale_number */}
                                                <td className="px-4 py-4">
                                                    <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white">
                                                        {sale.sale_number}
                                                    </span>
                                                </td>

                                                {/* sold_at → date + time */}
                                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <IconCalendar size={12} className="text-slate-400 flex-shrink-0"/>
                                                        <span>{date}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 ml-4">{time}</div>
                                                </td>

                                                {/* cashier (User) — dari relasi eager-loaded */}
                                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                    {sale.cashier?.name ?? sale.cashier_name ?? "-"}
                                                </td>

                                                {/* customer — dari relasi atau snapshot */}
                                                <td className="px-4 py-4">
                                                    <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                                                        {sale.customer?.name ?? sale.customer_name ?? "Umum"}
                                                    </span>
                                                </td>

                                                {/* item count */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className="px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 rounded-full">
                                                        {itemCount}
                                                    </span>
                                                </td>

                                                {/* subtotal = subtotal_perfume + subtotal_packaging */}
                                                <td className="px-4 py-4 text-right text-sm text-slate-500">
                                                    {fmt(sale.subtotal)}
                                                </td>

                                                {/* discount_amount */}
                                                <td className="px-4 py-4 text-right text-sm text-red-500">
                                                    {Number(sale.discount_amount) > 0
                                                        ? `- ${fmt(sale.discount_amount)}`
                                                        : "—"
                                                    }
                                                </td>

                                                {/* total */}
                                                <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                                                    {fmt(sale.total)}
                                                </td>

                                                {/* gross_profit — bisa negatif */}
                                                <td className="px-4 py-4 text-right text-sm font-semibold">
                                                    <span className={Number(sale.gross_profit) >= 0
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-red-500"}>
                                                        {fmt(sale.gross_profit)}
                                                    </span>
                                                </td>

                                                {/* gross_margin_pct */}
                                                <td className="px-4 py-4 text-right">
                                                    <span className={`flex items-center justify-end gap-1 text-xs font-bold ${
                                                        Number(sale.gross_margin_pct) >= 0
                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                            : "text-red-500"
                                                    }`}>
                                                        <IconTrendingUp size={12}/>
                                                        {parseFloat(sale.gross_margin_pct ?? 0).toFixed(1)}%
                                                    </span>
                                                </td>

                                                {/* status */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${STATUS_BADGE[sale.status] ?? "bg-slate-100 text-slate-500"}`}>
                                                        {STATUS_LABEL[sale.status] ?? sale.status}
                                                    </span>
                                                </td>

                                                {/* Print link */}
                                                <td className="px-4 py-4 text-center">
                                                    <Link
                                                        href={route("transactions.print", sale.sale_number)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                                                        title="Cetak Struk">
                                                        <IconPrinter size={18}/>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <IconDatabaseOff size={32} className="text-slate-400" strokeWidth={1.5}/>
                        </div>
                        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">Belum Ada Transaksi</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {hasFilter ? "Tidak ada transaksi sesuai filter." : "Transaksi akan muncul di sini."}
                        </p>
                        {hasFilter && (
                            <button onClick={resetFilters}
                                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <IconRefresh size={16}/> Reset Filter
                            </button>
                        )}
                    </div>
                )}

                {links.length > 3 && <Pagination links={links}/>}
            </div>
        </>
    );
}

History.layout = page => <DashboardLayout children={page}/>;
