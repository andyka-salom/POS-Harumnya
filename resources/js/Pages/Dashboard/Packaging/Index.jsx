import React, { useState, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router, useForm } from "@inertiajs/react";
import {
    IconCirclePlus, IconPencil, IconTrash, IconPackage,
    IconPhoto, IconCheck, IconX, IconLock,
    IconTrendingUp, IconTrendingDown, IconAlertTriangle, IconFilter, IconGift,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Input from "@/Components/Dashboard/Input";
import toast from "react-hot-toast";

const fmt = (v = 0) => Number(v || 0).toLocaleString("id-ID");

function Select({ value, onChange, children, className = "" }) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                className={`appearance-none w-full h-10 pl-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all ${className}`}
            >
                {children}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}

function DeleteModal({ show, title, message, onConfirm, onClose, loading }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconAlertTriangle size={22} className="text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{message}</p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-5 py-2.5 text-sm font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                        {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    );
}

function CategoryModal({ show, onClose, category = null }) {
    const isEdit = !!category;

    const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
        code:        "",
        name:        "",
        description: "",
        sort_order:  0,
        is_active:   true,
    });

    useEffect(() => {
        if (show) {
            if (category) {
                setData({
                    code:        category.code        || "",
                    name:        category.name        || "",
                    description: category.description || "",
                    sort_order:  category.sort_order  ?? 0,
                    is_active:   category.is_active   ?? true,
                });
            } else {
                reset();
                clearErrors();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, category?.id]);

    const submit = (e) => {
        e.preventDefault();
        const opts = {
            onSuccess: () => {
                onClose();
                toast.success(isEdit ? "Kategori berhasil diperbarui" : "Kategori berhasil dibuat");
            },
            onError: () => toast.error("Periksa kembali input Anda"),
        };
        isEdit
            ? put(route("packaging.categories.update", category.id), opts)
            : post(route("packaging.categories.store"), opts);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold dark:text-white">
                        {isEdit ? "Edit Kategori" : "Tambah Kategori"}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <IconX size={20} />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Kode"
                            value={data.code}
                            onChange={e => setData("code", e.target.value.toUpperCase())}
                            errors={errors.code}
                            required
                            placeholder="BTL"
                        />
                        <Input
                            label="Urutan"
                            type="number"
                            min="0"
                            value={data.sort_order}
                            onChange={e => setData("sort_order", Number(e.target.value))}
                            errors={errors.sort_order}
                        />
                    </div>

                    <Input
                        label="Nama Kategori"
                        value={data.name}
                        onChange={e => setData("name", e.target.value)}
                        errors={errors.name}
                        required
                        placeholder="Botol, Tutup, Box, dll"
                    />

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Deskripsi</label>
                        <textarea
                            rows={2}
                            value={data.description}
                            onChange={e => setData("description", e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                            placeholder="Keterangan kategori..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="pkg_cat_active"
                            checked={data.is_active}
                            onChange={e => setData("is_active", e.target.checked)}
                            className="rounded accent-teal-600 w-4 h-4"
                        />
                        <label htmlFor="pkg_cat_active" className="text-sm dark:text-slate-300 cursor-pointer">
                            Status Aktif
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
                        >
                            {processing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Harga Jual Cell ───────────────────────────────────────────────────────────
function SellingPriceCell({ item }) {
    if (item.is_free) {
        return (
            <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                    <IconGift size={11} /> Gratis
                </span>
                {item.free_condition_note && (
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={item.free_condition_note}>
                        {item.free_condition_note}
                    </p>
                )}
            </div>
        );
    }
    return (
        <span className="text-sm font-semibold text-slate-800 dark:text-white">
            {item.selling_price > 0 ? `Rp ${fmt(item.selling_price)}` : "—"}
        </span>
    );
}

// ─── Margin Badge ──────────────────────────────────────────────────────────────
function MarginBadge({ item }) {
    const avgCost = parseFloat(item.average_cost || 0);

    // Kemasan gratis → tampilkan biaya subsidi
    if (item.is_free) {
        if (avgCost <= 0) return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>;
        return (
            <div className="text-right">
                <span className="text-sm font-bold flex items-center justify-end gap-1 text-amber-500">
                    <IconGift size={13} /> subsidi
                </span>
                <span className="text-[10px] text-amber-400">
                    −{fmt(Math.round(avgCost))}/unit
                </span>
            </div>
        );
    }

    if (!item.selling_price || !avgCost) return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>;

    const margin = ((item.selling_price - avgCost) / item.selling_price) * 100;
    const profit = item.selling_price - Math.round(avgCost);
    const isGood = margin >= 0;

    return (
        <div className="text-right">
            <span className={`text-sm font-bold flex items-center justify-end gap-1 ${isGood ? "text-teal-600" : "text-red-500"}`}>
                {isGood ? <IconTrendingUp size={13} /> : <IconTrendingDown size={13} />}
                {margin.toFixed(1)}%
            </span>
            <span className={`text-[10px] ${isGood ? "text-teal-500" : "text-red-400"}`}>
                {isGood ? "+" : ""}{fmt(profit)}/unit
            </span>
        </div>
    );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Index({ materials, categories, filters }) {
    const [activeTab,   setActiveTab]   = useState(filters.tab || "materials");
    const [catModal,    setCatModal]    = useState({ show: false, data: null });
    const [deleteModal, setDeleteModal] = useState({ show: false, type: null, item: null, loading: false });

    const confirmDelete = (type, item) => setDeleteModal({ show: true, type, item, loading: false });
    const closeDelete   = () => setDeleteModal({ show: false, type: null, item: null, loading: false });

    const handleDelete = () => {
        const { type, item } = deleteModal;
        setDeleteModal(prev => ({ ...prev, loading: true }));

        router.delete(
            route(type === "category" ? "packaging.categories.destroy" : "packaging.destroy", item.id),
            {
                onSuccess: () => {
                    closeDelete();
                    toast.success(type === "category" ? "Kategori berhasil dihapus" : "Kemasan berhasil dihapus");
                },
                onError: () => {
                    closeDelete();
                    toast.error(
                        type === "category"
                            ? "Kategori masih memiliki material, tidak bisa dihapus"
                            : "Gagal menghapus kemasan"
                    );
                },
            }
        );
    };

    return (
        <>
            <Head title="Manajemen Kemasan" />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-teal-600 rounded-lg text-white shadow-lg shadow-teal-500/30">
                            <IconPackage size={20} />
                        </div>
                        Kemasan & Packaging
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 ml-11">Kelola material kemasan dan kategorisasinya</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === "materials" ? (
                        <Link
                            href={route("packaging.create")}
                            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-teal-500/30"
                        >
                            <IconCirclePlus size={18} /> Tambah Kemasan
                        </Link>
                    ) : (
                        <button
                            onClick={() => setCatModal({ show: true, data: null })}
                            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-teal-500/30"
                        >
                            <IconCirclePlus size={18} /> Tambah Kategori
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 mb-6 border-b border-slate-200 dark:border-slate-800">
                {[
                    { key: "materials",  label: "Daftar Kemasan", count: materials.total },
                    { key: "categories", label: "Kategori",        count: categories.length },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
                            activeTab === tab.key
                                ? "border-teal-600 text-teal-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                    >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            activeTab === tab.key
                                ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── TAB: Materials ─────────────────────────────────────────────── */}
            {activeTab === "materials" && (
                <>
                    <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="w-full sm:w-96">
                            <Search
                                url={route("packaging.index")}
                                placeholder="Cari nama atau kode kemasan..."
                                defaultValue={filters.search}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <IconFilter size={15} className="text-slate-400" />
                            <Select
                                value={filters.category_id || ""}
                                onChange={e => router.get(
                                    route("packaging.index"),
                                    { category_id: e.target.value || undefined, search: filters.search },
                                    { preserveState: true }
                                )}
                                className="w-52"
                            >
                                <option value="">Semua Kategori</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-5 py-3.5">Produk Kemasan</th>
                                        <th className="px-5 py-3.5">Kategori</th>
                                        <th className="px-5 py-3.5">Satuan</th>
                                        <th className="px-5 py-3.5 text-right">Harga Beli</th>
                                        <th className="px-5 py-3.5">Harga Jual</th>
                                        <th className="px-5 py-3.5 text-right">
                                            <span className="flex items-center justify-end gap-1">
                                                <IconLock size={11} /> HPP (WAC)
                                            </span>
                                        </th>
                                        <th className="px-5 py-3.5 text-right">Margin / Subsidi</th>
                                        <th className="px-5 py-3.5 text-center">Addon</th>
                                        <th className="px-5 py-3.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {materials.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-5 py-16 text-center">
                                                <IconPackage size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                                                <p className="text-slate-400 text-sm font-medium">Belum ada material kemasan</p>
                                                <Link
                                                    href={route("packaging.create")}
                                                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-teal-600 hover:text-teal-700 font-semibold"
                                                >
                                                    <IconCirclePlus size={16} /> Tambah Kemasan
                                                </Link>
                                            </td>
                                        </tr>
                                    ) : materials.data.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {item.image_url
                                                            ? <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                                                            : <IconPhoto size={18} className="text-slate-400" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name}</div>
                                                        <div className="text-[10px] font-mono text-slate-400">{item.code}</div>
                                                        {item.size && (
                                                            <div className="text-[10px] text-teal-500 font-medium">{item.size.name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 font-semibold">
                                                    {item.category?.name ?? "—"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500 uppercase font-medium">
                                                {item.unit}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                    {item.purchase_price > 0 ? `Rp ${fmt(item.purchase_price)}` : "—"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <SellingPriceCell item={item} />
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {parseFloat(item.average_cost) > 0 ? (
                                                    <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                                                        Rp {fmt(Math.round(item.average_cost))}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300 dark:text-slate-600 italic">Belum ada PO</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <MarginBadge item={item} />
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                {item.is_available_as_addon
                                                    ? <IconCheck size={18} className="text-teal-500 mx-auto" />
                                                    : <IconX    size={18} className="text-slate-300 dark:text-slate-600 mx-auto" />
                                                }
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={route("packaging.edit", item.id)}
                                                        className="p-1.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <IconPencil size={15} />
                                                    </Link>
                                                    <button
                                                        onClick={() => confirmDelete("material", item)}
                                                        className="p-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <IconTrash size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Pagination links={materials.links} />
                    </div>
                </>
            )}

            {/* ── TAB: Categories ────────────────────────────────────────────── */}
            {activeTab === "categories" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Urutan</th>
                                    <th className="px-6 py-4">Kode</th>
                                    <th className="px-6 py-4">Kategori</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                                            Belum ada kategori.
                                        </td>
                                    </tr>
                                ) : categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">{cat.sort_order}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-teal-600 dark:text-teal-400 font-bold">{cat.code}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-white">{cat.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            {cat.is_active
                                                ? <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-full">Aktif</span>
                                                : <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full">Nonaktif</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setCatModal({ show: true, data: cat })}
                                                    className="p-1.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                                                >
                                                    <IconPencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete("category", cat)}
                                                    className="p-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                                >
                                                    <IconTrash size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-teal-50 dark:bg-teal-950/20 rounded-xl border border-teal-100 dark:border-teal-900 p-5">
                            <h3 className="font-bold text-sm text-teal-800 dark:text-teal-300 mb-2">💡 Tips Kategori</h3>
                            <p className="text-xs text-teal-700 dark:text-teal-400">
                                Gunakan kategori untuk mengelompokkan kemasan sejenis.
                                Urutan menentukan tampilan di dropdown POS.
                            </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">Catatan</h3>
                            <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
                                <li>Kategori yang memiliki material tidak dapat dihapus</li>
                                <li>Nonaktifkan kategori agar tidak muncul di POS</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <CategoryModal
                show={catModal.show}
                onClose={() => setCatModal({ show: false, data: null })}
                category={catModal.data}
            />

            <DeleteModal
                show={deleteModal.show}
                loading={deleteModal.loading}
                title={
                    deleteModal.type === "category"
                        ? `Hapus Kategori "${deleteModal.item?.name}"?`
                        : `Hapus Kemasan "${deleteModal.item?.name}"?`
                }
                message={
                    deleteModal.type === "category"
                        ? "Kategori yang masih memiliki material tidak dapat dihapus. Pastikan semua material sudah dipindahkan."
                        : "Kemasan akan dihapus dari sistem. Aksi ini tidak dapat dibatalkan."
                }
                onConfirm={handleDelete}
                onClose={closeDelete}
            />
        </>
    );
}

Index.layout = page => <DashboardLayout children={page} />;
