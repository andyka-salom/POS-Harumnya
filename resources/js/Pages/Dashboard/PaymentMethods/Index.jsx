import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus,
    IconTrash,
    IconPencil,
    IconCreditCard,
    IconAlertTriangle,
    IconX,
    IconToggleLeft,
    IconToggleRight,
    IconSearch,
    IconReceipt,
    IconArrowsExchange,
} from "@tabler/icons-react";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";
import toast from "react-hot-toast";

// ─── Type Config ──────────────────────────────────────────────────────────────
const TYPE_STYLES = {
    cash:     { label: "Tunai",              color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800" },
    card:     { label: "Kartu Debit/Kredit", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    transfer: { label: "Transfer Bank",      color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
    qris:     { label: "QRIS",              color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
    ewallet:  { label: "E-Wallet",          color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800" },
    other:    { label: "Lainnya",           color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ item, onConfirm, onCancel, processing }) {
    if (!item) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
                <button onClick={onCancel} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                    <IconX size={20} />
                </button>
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600">
                        <IconAlertTriangle size={28} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Hapus Metode</h3>
                        <p className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
                    </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                    Hapus metode pembayaran{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>?
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} disabled={processing} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Batal
                    </button>
                    <button onClick={onConfirm} disabled={processing} className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        <IconTrash size={16} />
                        {processing ? "Menghapus..." : "Ya, Hapus"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Index({ paymentMethods, types, filters }) {
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [search, setSearch] = useState(filters.search ?? "");

    const handleFilterChange = (key, value) => {
        router.get(route("payment-methods.index"), { ...filters, [key]: value }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        handleFilterChange("search", search);
    };

    const handleToggle = (item) => {
        router.patch(route("payment-methods.toggle", item.id), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(`${item.name} berhasil ${item.is_active ? "dinonaktifkan" : "diaktifkan"}.`),
            onError: () => toast.error("Gagal mengubah status."),
        });
    };

    const handleDelete = () => {
        if (!itemToDelete) return;
        setDeleteProcessing(true);
        router.delete(route("payment-methods.destroy", itemToDelete.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Metode pembayaran berhasil dihapus.");
                setItemToDelete(null);
            },
            onError: () => toast.error("Gagal menghapus. Mungkin sedang digunakan dalam transaksi."),
            onFinish: () => setDeleteProcessing(false),
        });
    };

    return (
        <>
            <Head title="Metode Pembayaran" />

            <DeleteModal
                item={itemToDelete}
                onConfirm={handleDelete}
                onCancel={() => setItemToDelete(null)}
                processing={deleteProcessing}
            />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-primary-600 rounded-lg text-white">
                            <IconCreditCard size={20} strokeWidth={2} />
                        </div>
                        Metode Pembayaran
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 ml-10">
                        Total {paymentMethods.total} metode terdaftar
                    </p>
                </div>
                <Button
                    type="link"
                    href={route("payment-methods.create")}
                    icon={<IconCirclePlus size={18} />}
                    className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
                    label="Tambah Metode"
                />
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <form onSubmit={handleSearch} className="relative">
                    <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari kode/nama..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onBlur={() => handleFilterChange("search", search)}
                    />
                </form>

                <select
                    className="rounded-xl border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    value={filters.type ?? ""}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                >
                    <option value="">Semua Tipe</option>
                    {Object.entries(types).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>

                <select
                    className="rounded-xl border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    value={filters.is_active ?? ""}
                    onChange={(e) => handleFilterChange("is_active", e.target.value)}
                >
                    <option value="">Semua Status</option>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Urutan</th>
                                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kode</th>
                                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama</th>
                                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tipe</th>
                                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Biaya Admin</th>
                                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kembalian</th>
                                <th className="text-left px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="text-right px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paymentMethods.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                                        <IconCreditCard size={40} strokeWidth={1} className="mx-auto mb-3 opacity-50" />
                                        <p className="font-semibold">Tidak ada metode pembayaran ditemukan</p>
                                        <p className="text-xs mt-1">Coba ubah filter atau tambah metode baru</p>
                                    </td>
                                </tr>
                            ) : (
                                paymentMethods.data.map((item) => {
                                    const typeStyle = TYPE_STYLES[item.type] ?? TYPE_STYLES.other;
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            {/* Sort Order */}
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    {item.sort_order}
                                                </span>
                                            </td>

                                            {/* Code */}
                                            <td className="px-6 py-4">
                                                <code className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg font-mono font-bold">
                                                    {item.code}
                                                </code>
                                            </td>

                                            {/* Name */}
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-slate-800 dark:text-white">
                                                    {item.name}
                                                </span>
                                            </td>

                                            {/* Type Badge */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${typeStyle.color}`}>
                                                    {typeStyle.label}
                                                </span>
                                            </td>

                                            {/* Admin Fee */}
                                            <td className="px-6 py-4">
                                                {item.has_admin_fee ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                                        <IconReceipt size={12} />
                                                        {parseFloat(item.admin_fee_pct)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Can Give Change */}
                                            <td className="px-6 py-4">
                                                {item.can_give_change ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800">
                                                        <IconArrowsExchange size={12} />
                                                        Ya
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Active Toggle */}
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggle(item)}
                                                    title={item.is_active ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan"}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-105 ${
                                                        item.is_active
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                                            : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                                    }`}
                                                >
                                                    {item.is_active
                                                        ? <><IconToggleRight size={14} /> Aktif</>
                                                        : <><IconToggleLeft size={14} /> Nonaktif</>
                                                    }
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={route("payment-methods.edit", item.id)}
                                                        className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <IconPencil size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setItemToDelete(item)}
                                                        className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <IconTrash size={16} />
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

            {/* Pagination */}
            {paymentMethods.last_page > 1 && (
                <div className="mt-8">
                    <Pagination links={paymentMethods.links} />
                </div>
            )}
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
