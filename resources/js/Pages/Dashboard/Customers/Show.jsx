import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link } from "@inertiajs/react";
import {
    IconArrowLeft,
    IconReceipt2,
    IconTrophy,
    IconPhone,
    IconMail,
    IconMapPin,
    IconPencil,
    IconCalendar,
    IconShoppingBag,
    IconStar,
} from "@tabler/icons-react";

const TIER_CONFIG = {
    bronze:   { label: "Bronze",   color: "bg-orange-100 text-orange-700" },
    silver:   { label: "Silver",   color: "bg-slate-200 text-slate-700" },
    gold:     { label: "Gold",     color: "bg-amber-100 text-amber-700" },
    platinum: { label: "Platinum", color: "bg-purple-100 text-purple-700" },
};

const STATUS_CONFIG = {
    completed:  { label: "Selesai",   color: "bg-emerald-100 text-emerald-700" },
    draft:      { label: "Draft",     color: "bg-slate-100 text-slate-600" },
    cancelled:  { label: "Dibatalkan", color: "bg-red-100 text-red-600" },
    refunded:   { label: "Direfund",  color: "bg-amber-100 text-amber-700" },
};

function formatRp(value) {
    return "Rp " + Math.floor(parseFloat(value ?? 0)).toLocaleString("id-ID");
}

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function Show({ customer, stats }) {
    const tierCfg = TIER_CONFIG[customer.tier] ?? TIER_CONFIG.bronze;

    return (
        <>
            <Head title={`Profil ${customer.name}`} />

            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href={route("customers.index")}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <IconArrowLeft size={22} className="text-slate-500" />
                    </Link>
                    <h1 className="text-2xl font-bold dark:text-white">Profil Pelanggan</h1>
                </div>
                <Link
                    href={route("customers.edit", customer.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-all"
                >
                    <IconPencil size={16} /> Edit
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Sidebar ── */}
                <div className="space-y-5">
                    {/* Profil Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center">
                        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-4">
                            {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-bold dark:text-white">{customer.name}</h2>
                        <p className="text-slate-400 text-sm mb-4 font-mono">{customer.code}</p>
                        <div className="flex justify-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${tierCfg.color}`}>
                                {tierCfg.label}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                customer.is_active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-600"
                            }`}>
                                {customer.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                        </div>
                        {customer.registered_at && (
                            <p className="text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                                <IconCalendar size={12} />
                                Member sejak {formatDate(customer.registered_at)}
                            </p>
                        )}
                    </div>

                    {/* Kontak */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Kontak</h3>
                        <div className="flex items-start gap-3">
                            <IconPhone className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                            <span className="text-sm dark:text-slate-300">{customer.phone || "—"}</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <IconMail className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                            <span className="text-sm dark:text-slate-300 break-all">{customer.email || "—"}</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <IconMapPin className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                            <span className="text-sm dark:text-slate-300">{customer.address || "—"}</span>
                        </div>
                        {customer.birth_date && (
                            <div className="flex items-start gap-3">
                                <IconCalendar className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                                <span className="text-sm dark:text-slate-300">{formatDate(customer.birth_date)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-primary-600 rounded-3xl p-5 text-white shadow-lg shadow-primary-500/20 flex flex-col justify-between">
                            <IconTrophy size={24} className="opacity-60 mb-2" />
                            <div>
                                <p className="text-primary-200 text-[10px] font-bold uppercase tracking-widest mb-1">Poin Aktif</p>
                                <p className="text-3xl font-black">{(customer.points ?? 0).toLocaleString("id-ID")}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                            <IconShoppingBag size={24} className="text-slate-300 dark:text-slate-600 mb-2" />
                            <div>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Transaksi</p>
                                <p className="text-3xl font-black dark:text-white">{(customer.total_transactions ?? 0).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between col-span-2">
                            <IconStar size={24} className="text-slate-300 dark:text-slate-600 mb-2" />
                            <div>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Belanja Sepanjang Masa</p>
                                <p className="text-3xl font-black text-emerald-600">{formatRp(customer.lifetime_spending)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Loyalty detail */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Total Poin Diperoleh</p>
                            <p className="text-2xl font-black text-primary-600">{(customer.lifetime_points_earned ?? 0).toLocaleString("id-ID")}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Gender</p>
                            <p className="text-lg font-bold dark:text-white capitalize">
                                {customer.gender === "male" ? "Laki-laki" : customer.gender === "female" ? "Perempuan" : "Lainnya"}
                            </p>
                        </div>
                    </div>

                    {/* Riwayat Transaksi */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <IconReceipt2 className="text-primary-500" size={20} />
                            <h3 className="font-bold dark:text-white">Riwayat Transaksi Terakhir</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="p-4 text-left">No. Transaksi</th>
                                    <th className="p-4 text-left">Tanggal</th>
                                    <th className="p-4 text-left">Status</th>
                                    <th className="p-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {stats.recent_sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-slate-400">
                                            Belum ada transaksi
                                        </td>
                                    </tr>
                                ) : (
                                    stats.recent_sales.map((sale) => {
                                        const statusCfg = STATUS_CONFIG[sale.status] ?? STATUS_CONFIG.completed;
                                        return (
                                            <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-mono font-bold text-primary-600 text-xs">
                                                    {sale.sale_number}
                                                </td>
                                                <td className="p-4 text-slate-500 text-xs">
                                                    {formatDate(sale.sold_at)}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusCfg.color}`}>
                                                        {statusCfg.label}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-bold dark:text-white">
                                                    {formatRp(sale.total)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Produk Favorit */}
                    {stats.favorite_products?.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                                <IconStar size={18} className="text-amber-500" />
                                Produk Sering Dibeli
                            </h3>
                            <div className="space-y-3">
                                {stats.favorite_products.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-xs font-black flex items-center justify-center">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm font-semibold dark:text-white">{p.product_name}</span>
                                        </div>
                                        <span className="text-xs text-slate-400">{p.total}x</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

Show.layout = (page) => <DashboardLayout children={page} />;
