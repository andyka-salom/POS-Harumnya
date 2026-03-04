import React, { useState, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router, useForm } from "@inertiajs/react";
import {
    IconCirclePlus, IconFlask, IconPencil, IconTrash,
    IconPhoto, IconCheck, IconX, IconLock, IconTag,
    IconFilter, IconAlertTriangle,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Input from "@/Components/Dashboard/Input";
import toast from "react-hot-toast";

const fmt = (v = 0) => Number(v || 0).toLocaleString("id-ID");

const TYPE_CFG = {
    oil:     { label: "Fragrance Oil", color: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800" },
    alcohol: { label: "Alkohol",       color: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800" },
    other:   { label: "Lainnya",       color: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
};

// ─── Reusable custom select ────────────────────────────────────────────────────
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

function TypeBadge({ type }) {
    const cfg = TYPE_CFG[type] ?? TYPE_CFG.other;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ show, title, message, onConfirm, onClose, loading }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl border dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                        <IconAlertTriangle size={20} className="text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{message}</p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end mt-6">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                        {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Category Modal ────────────────────────────────────────────────────────────
function CategoryModal({ show, onClose, category = null }) {
    const isEdit = !!category;

    const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
        code:            "",
        name:            "",
        ingredient_type: "other",
        description:     "",
        sort_order:      0,
        is_active:       true,
    });

    // Re-populate form whenever category prop changes (fix: existing data tidak muncul)
    useEffect(() => {
        if (show) {
            if (category) {
                setData({
                    code:            category.code            || "",
                    name:            category.name            || "",
                    ingredient_type: category.ingredient_type || "other",
                    description:     category.description     || "",
                    sort_order:      category.sort_order      ?? 0,
                    is_active:       category.is_active       ?? true,
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
                toast.success(isEdit ? "Kategori berhasil diperbarui" : "Kategori berhasil ditambahkan");
            },
            onError: () => toast.error("Periksa kembali input"),
        };
        isEdit
            ? put(route("ingredients.categories.update", category.id), opts)
            : post(route("ingredients.categories.store"), opts);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl border dark:border-slate-800">
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
                            placeholder="OIL"
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
                        placeholder="Fragrance Oil"
                    />

                    {/* Ingredient Type — otomatis dari pilihan ini, tidak perlu field terpisah di bahan */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">
                            Tipe Scaling <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(TYPE_CFG).map(([val, cfg]) => (
                                <label key={val}
                                    className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-all ${
                                        data.ingredient_type === val
                                            ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="ingredient_type"
                                        value={val}
                                        checked={data.ingredient_type === val}
                                        onChange={() => setData("ingredient_type", val)}
                                        className="sr-only"
                                    />
                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{cfg.label}</div>
                                    <div className="text-[10px] text-slate-400 capitalize mt-0.5">{val}</div>
                                </label>
                            ))}
                        </div>
                        {errors.ingredient_type && (
                            <p className="text-red-500 text-xs mt-1">{errors.ingredient_type}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1.5">
                            Tipe ini otomatis berlaku ke semua bahan dalam kategori ini.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Deskripsi</label>
                        <textarea
                            rows={2}
                            value={data.description}
                            onChange={e => setData("description", e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                            placeholder="Keterangan kategori..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="cat_is_active"
                            checked={data.is_active}
                            onChange={e => setData("is_active", e.target.checked)}
                            className="rounded text-teal-600 w-4 h-4 accent-teal-600"
                        />
                        <label htmlFor="cat_is_active" className="text-sm dark:text-slate-300 cursor-pointer">
                            Status Aktif
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
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
                            {processing && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index({ ingredients, categories, filters }) {
    const [activeTab, setActiveTab] = useState("items");
    const [catModal,  setCatModal]  = useState({ show: false, data: null });
    const [deleteModal, setDeleteModal] = useState({ show: false, type: null, item: null, loading: false });

    const confirmDelete = (type, item) => setDeleteModal({ show: true, type, item, loading: false });
    const closeDelete   = () => setDeleteModal({ show: false, type: null, item: null, loading: false });

    const handleDelete = () => {
        const { type, item } = deleteModal;
        setDeleteModal(prev => ({ ...prev, loading: true }));

        const routeName = type === "category"
            ? "ingredients.categories.destroy"
            : "ingredients.destroy";

        router.delete(route(routeName, item.id), {
            onSuccess: () => {
                closeDelete();
                toast.success(type === "category" ? "Kategori dihapus" : "Bahan dihapus");
            },
            onError: () => {
                closeDelete();
                toast.error(
                    type === "category"
                        ? "Kategori masih memiliki bahan baku"
                        : "Bahan masih digunakan di formula/resep"
                );
            },
        });
    };

    return (
        <>
            <Head title="Manajemen Bahan Baku" />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-teal-600 rounded-lg text-white shadow-lg shadow-teal-500/30">
                            <IconFlask size={20} />
                        </div>
                        Bahan Baku
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 ml-11">
                        Kelola bahan baku parfum dan kategorisasinya
                    </p>
                </div>
                <div className="flex gap-2">
                    {activeTab === "items" ? (
                        <Link
                            href={route("ingredients.create")}
                            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-teal-500/30"
                        >
                            <IconCirclePlus size={18} /> Tambah Bahan
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
                    { key: "items",      label: "Daftar Bahan Baku", count: ingredients.total },
                    { key: "categories", label: "Kategori Bahan",    count: categories.length },
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

            {/* ── TAB: Items ─────────────────────────────────────────────────── */}
            {activeTab === "items" && (
                <>
                    <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="w-full sm:w-96">
                            <Search
                                url={route("ingredients.index")}
                                placeholder="Cari kode atau nama bahan..."
                                defaultValue={filters.search}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <IconFilter size={15} className="text-slate-400" />
                            <Select
                                value={filters.category_id || ""}
                                onChange={e => router.get(
                                    route("ingredients.index"),
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
                                        <th className="px-5 py-3.5">Bahan Baku</th>
                                        <th className="px-5 py-3.5">Kategori</th>
                                        <th className="px-5 py-3.5">Tipe Scaling</th>
                                        <th className="px-5 py-3.5">Satuan</th>
                                        <th className="px-5 py-3.5 text-right">
                                            <span className="flex items-center justify-end gap-1">
                                                <IconLock size={11} /> HPP (WAC)
                                            </span>
                                        </th>
                                        <th className="px-5 py-3.5 text-center">Aktif</th>
                                        <th className="px-5 py-3.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {ingredients.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <IconFlask size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                                                <p className="text-slate-400 text-sm font-medium">Belum ada bahan baku</p>
                                                <Link
                                                    href={route("ingredients.create")}
                                                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-teal-600 hover:text-teal-700 font-semibold"
                                                >
                                                    <IconCirclePlus size={16} /> Tambah Bahan Baku
                                                </Link>
                                            </td>
                                        </tr>
                                    ) : ingredients.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                        >
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
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 font-semibold">
                                                    {item.category?.name ?? "—"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {item.category?.ingredient_type
                                                    ? <TypeBadge type={item.category.ingredient_type} />
                                                    : <span className="text-slate-300 text-xs">—</span>
                                                }
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500 uppercase font-mono font-medium">
                                                {item.unit}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {parseFloat(item.average_cost) > 0 ? (
                                                    <div>
                                                        <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                            Rp {fmt(Math.round(item.average_cost))}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 ml-1">/{item.unit}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 dark:text-slate-600 italic">Belum ada PO</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                {item.is_active
                                                    ? <IconCheck size={18} className="text-teal-500 mx-auto" />
                                                    : <IconX size={18} className="text-slate-300 dark:text-slate-600 mx-auto" />
                                                }
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={route("ingredients.edit", item.id)}
                                                        className="p-1.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-600 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <IconPencil size={15} />
                                                    </Link>
                                                    <button
                                                        onClick={() => confirmDelete("ingredient", item)}
                                                        className="p-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 rounded-lg transition-colors"
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
                        <Pagination links={ingredients.links} />
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
                                    <th className="px-6 py-4">Nama Kategori</th>
                                    <th className="px-6 py-4">Tipe Scaling</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                                            Belum ada kategori.
                                        </td>
                                    </tr>
                                ) : categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">{cat.sort_order}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-teal-600 dark:text-teal-400 font-bold">{cat.code}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-white">{cat.name}</td>
                                        <td className="px-6 py-4"><TypeBadge type={cat.ingredient_type} /></td>
                                        <td className="px-6 py-4 text-center">
                                            {cat.is_active
                                                ? <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-full">Aktif</span>
                                                : <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full">Nonaktif</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setCatModal({ show: true, data: cat })}
                                                    className="p-1.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                                                    title="Edit kategori"
                                                >
                                                    <IconPencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete("category", cat)}
                                                    className="p-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                                    title="Hapus kategori"
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

                    {/* Info Panel */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <IconTag size={16} className="text-teal-600" />
                                Tentang Tipe Scaling
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(TYPE_CFG).map(([type, cfg]) => (
                                    <div key={type} className="flex items-start gap-2">
                                        <TypeBadge type={type} />
                                        <p className="text-xs text-slate-500 flex-1">
                                            {type === 'oil'     && "→ Di-scale ke oil_quantity"}
                                            {type === 'alcohol' && "→ Di-scale ke alcohol_quantity"}
                                            {type === 'other'   && "→ Di-scale ke other_quantity"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-teal-50 dark:bg-teal-950/20 rounded-xl border border-teal-100 dark:border-teal-900 p-5">
                            <h3 className="font-bold text-sm text-teal-800 dark:text-teal-300 mb-2">💡 Tipe Scaling Otomatis</h3>
                            <p className="text-xs text-teal-700 dark:text-teal-400">
                                Tipe scaling diatur di level <strong>kategori</strong>, bukan per bahan.
                                Semua bahan dalam satu kategori otomatis mengikuti tipe kategorinya.
                            </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">Catatan</h3>
                            <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
                                <li>Kategori yang memiliki bahan aktif tidak dapat dihapus</li>
                                <li>Ubah tipe kategori akan mempengaruhi semua bahan di dalamnya</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <CategoryModal
                show={catModal.show}
                onClose={() => setCatModal({ show: false, data: null })}
                category={catModal.data}
            />

            <DeleteModal
                show={deleteModal.show}
                loading={deleteModal.loading}
                title={deleteModal.type === "category" ? `Hapus Kategori "${deleteModal.item?.name}"?` : `Hapus Bahan "${deleteModal.item?.name}"?`}
                message={deleteModal.type === "category"
                    ? "Kategori yang memiliki bahan baku tidak dapat dihapus."
                    : "Bahan yang masih digunakan di formula tidak dapat dihapus."
                }
                onConfirm={handleDelete}
                onClose={closeDelete}
            />
        </>
    );
}

Index.layout = page => <DashboardLayout children={page} />;
