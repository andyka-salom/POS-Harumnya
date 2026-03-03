import React, { useState, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus, IconUser, IconDownload,
    IconSearch, IconTrash,
} from "@tabler/icons-react";
import Pagination from "@/Components/Dashboard/Pagination";

const TIER_CONFIG = {
    bronze:   { label: "Bronze",   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" },
    silver:   { label: "Silver",   color: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
    gold:     { label: "Gold",     color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
    platinum: { label: "Platinum", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400" },
};

const SEGMENTS = [
    { key: "",       label: "Semua" },
    { key: "vip",    label: "VIP" },
    { key: "new",    label: "Baru" },
    { key: "loyal",  label: "Loyal" },
];

export default function Index({ customers, filters, tiers = [] }) {
    const [search, setSearch] = useState(filters.search || "");

    useEffect(() => {
        const timer = setTimeout(() => {
            router.get(route("customers.index"), { ...filters, search }, {
                preserveState: true,
                replace: true,
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const handleFilter = (key, value) => {
        router.get(route("customers.index"), { ...filters, [key]: value }, {
            preserveState: true,
            replace: true,
        });
    };

    const deleteCustomer = (id, name) => {
        if (confirm(`Hapus pelanggan "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
            router.delete(route("customers.destroy", id), { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Pelanggan" />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Database Pelanggan</h1>
                    <p className="text-sm text-slate-500 mt-1">Total {customers.total.toLocaleString()} pelanggan terdaftar</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <a
                        href={route("customers.export")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                    >
                        <IconDownload size={18} /> Export
                    </a>
                    <Link
                        href={route("customers.create")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-700 transition-all"
                    >
                        <IconCirclePlus size={18} /> Tambah
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama, telepon, atau kode..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-primary-500 focus:outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Segment tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    {SEGMENTS.map((s) => (
                        <button
                            key={s.key}
                            onClick={() => handleFilter("segment", s.key)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                                (filters.segment || "") === s.key
                                    ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Tier filter */}
                <select
                    className="rounded-xl border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white py-2.5 px-3"
                    value={filters.tier || ""}
                    onChange={(e) => handleFilter("tier", e.target.value)}
                >
                    <option value="">Semua Tier</option>
                    {(tiers.length ? tiers : ["bronze", "silver", "gold", "platinum"]).map((t) => (
                        <option key={t} value={t}>{TIER_CONFIG[t]?.label ?? t}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="p-4">Pelanggan</th>
                                <th className="p-4">Tier</th>
                                <th className="p-4 text-center">Poin Aktif</th>
                                <th className="p-4 text-center">Transaksi</th>
                                <th className="p-4">Total Belanja</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {customers.data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-slate-400">
                                        <IconUser size={40} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                                        <p className="font-semibold">Tidak ada pelanggan ditemukan</p>
                                        <p className="text-xs mt-1">Coba ubah filter atau tambah pelanggan baru</p>
                                    </td>
                                </tr>
                            ) : (
                                customers.data.map((c) => {
                                    const tierCfg = TIER_CONFIG[c.tier] ?? TIER_CONFIG.bronze;
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-bold text-primary-600 text-sm flex-shrink-0">
                                                        {c.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold dark:text-white">{c.name}</p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {c.code} • {c.phone || "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${tierCfg.color}`}>
                                                    {tierCfg.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center font-bold dark:text-slate-300">
                                                {(c.points ?? 0).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-center text-slate-500 dark:text-slate-400">
                                                {(c.total_transactions ?? 0).toLocaleString()}
                                            </td>
                                            <td className="p-4 font-bold text-emerald-600">
                                                Rp {Math.floor(parseFloat(c.lifetime_spending ?? 0)).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link
                                                        href={route("customers.show", c.id)}
                                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all"
                                                        title="Lihat Detail"
                                                    >
                                                        <IconUser size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => deleteCustomer(c.id, c.name)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                        title="Hapus"
                                                    >
                                                        <IconTrash size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6">
                <Pagination links={customers.links} />
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
