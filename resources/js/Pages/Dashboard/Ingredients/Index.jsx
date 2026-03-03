import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router, useForm } from "@inertiajs/react";
import {
    IconCirclePlus, IconFlask, IconPencil, IconTrash,
    IconPhoto, IconCheck, IconX, IconLock, IconTag,
    IconSearch, IconFilter,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";
import Input from "@/Components/Dashboard/Input";
import toast from "react-hot-toast";

const fmt = (v = 0) => Number(v || 0).toLocaleString("id-ID");

const INGREDIENT_TYPE_CONFIG = {
    oil:     { label: "Fragrance Oil", color: "bg-purple-50 text-purple-700 border border-purple-200" },
    alcohol: { label: "Alkohol",       color: "bg-blue-50 text-blue-700 border border-blue-200" },
    other:   { label: "Lainnya",       color: "bg-slate-100 text-slate-600 border border-slate-200" },
};

// ─── Badge ────────────────────────────────────────────────────────────────────
function IngredientTypeBadge({ type }) {
    const cfg = INGREDIENT_TYPE_CONFIG[type] ?? INGREDIENT_TYPE_CONFIG.other;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

// ─── Modal Kategori ───────────────────────────────────────────────────────────
function CategoryModal({ show, onClose, category = null }) {
    const isEdit = !!category;
    const { data, setData, post, put, processing, reset, errors } = useForm({
        code:             category?.code             || "",
        name:             category?.name             || "",
        ingredient_type:  category?.ingredient_type  || "other",
        description:      category?.description      || "",
        sort_order:       category?.sort_order        ?? 0,
        is_active:        category?.is_active         ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = {
            onSuccess: () => {
                onClose();
                reset();
                toast.success(isEdit ? "Kategori diperbarui" : "Kategori ditambahkan");
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
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
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

                    {/* Ingredient Type */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">
                            Tipe Bahan <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(INGREDIENT_TYPE_CONFIG).map(([val, cfg]) => (
                                <label key={val}
                                    className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-all ${
                                        data.ingredient_type === val
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
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
                            Digunakan untuk mapping scaling resep ke IntensitySizeQuantity.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Deskripsi</label>
                        <textarea
                            rows={2}
                            value={data.description}
                            onChange={e => setData("description", e.target.value)}
                            className="w-full rounded-xl border-slate-300 dark:bg-slate-950 dark:border-slate-700 text-sm"
                            placeholder="Keterangan kategori..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="cat_is_active"
                            checked={data.is_active}
                            onChange={e => setData("is_active", e.target.checked)}
                            className="rounded text-emerald-600 w-4 h-4"
                        />
                        <label htmlFor="cat_is_active" className="text-sm dark:text-slate-300 cursor-pointer">
                            Status Aktif
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
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

    const handleDeleteCategory = (cat) => {
        if (!confirm(`Hapus kategori "${cat.name}"?`)) return;
        router.delete(route("ingredients.categories.destroy", cat.id), {
            onSuccess: () => toast.success("Kategori dihapus"),
            onError:   () => toast.error("Kategori masih memiliki bahan baku"),
        });
    };

    const handleDeleteIngredient = (item) => {
        if (!confirm(`Hapus bahan "${item.name}"?`)) return;
        router.delete(route("ingredients.destroy", item.id), {
            onSuccess: () => toast.success("Bahan dihapus"),
            onError:   () => toast.error("Bahan masih digunakan di formula/resep"),
        });
    };

    return (
        <>
            <Head title="Manajemen Bahan Baku" />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-emerald-600 rounded-lg text-white">
                            <IconFlask size={20} />
                        </div>
                        Bahan Baku
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola bahan baku parfum dan kategorisasinya
                    </p>
                </div>
                <div className="flex gap-2">
                    {activeTab === "items" ? (
                        <Link
                            href={route("ingredients.create")}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                        >
                            <IconCirclePlus size={18} /> Tambah Bahan
                        </Link>
                    ) : (
                        <button
                            onClick={() => setCatModal({ show: true, data: null })}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
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
                                ? "border-emerald-600 text-emerald-600"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            activeTab === tab.key
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── TAB: Items ─────────────────────────────────────────────────────── */}
            {activeTab === "items" && (
                <>
                    {/* Filter Bar */}
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
                            <select
                                className="rounded-xl border-slate-200 dark:border-slate-700 text-sm dark:bg-slate-900 h-10 px-3"
                                value={filters.category_id || ""}
                                onChange={e => router.get(
                                    route("ingredients.index"),
                                    { category_id: e.target.value, search: filters.search },
                                    { preserveState: true }
                                )}
                            >
                                <option value="">Semua Kategori</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
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
                                                <IconFlask size={40} className="mx-auto text-slate-200 mb-3" />
                                                <p className="text-slate-400 text-sm font-medium">Belum ada bahan baku</p>
                                                <Link
                                                    href={route("ingredients.create")}
                                                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
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
                                            {/* Bahan */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {item.image_url
                                                            ? <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                                                            : <IconPhoto size={18} className="text-slate-400" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-400">
                                                            {item.code}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Kategori */}
                                            <td className="px-5 py-3.5">
                                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 font-semibold">
                                                    {item.category?.name ?? "—"}
                                                </span>
                                            </td>

                                            {/* Tipe Scaling */}
                                            <td className="px-5 py-3.5">
                                                {item.category?.ingredient_type ? (
                                                    <IngredientTypeBadge type={item.category.ingredient_type} />
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Satuan */}
                                            <td className="px-5 py-3.5 text-xs text-slate-500 uppercase font-mono font-medium">
                                                {item.unit}
                                            </td>

                                            {/* HPP (WAC) — readonly */}
                                            <td className="px-5 py-3.5 text-right">
                                                {parseFloat(item.average_cost) > 0 ? (
                                                    <div>
                                                        <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                            Rp {fmt(Math.round(item.average_cost))}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 ml-1">
                                                            /{item.unit}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 italic">Belum ada PO</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3.5 text-center">
                                                {item.is_active
                                                    ? <IconCheck size={18} className="text-emerald-500 mx-auto" />
                                                    : <IconX size={18} className="text-slate-300 mx-auto" />
                                                }
                                            </td>

                                            {/* Aksi */}
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={route("ingredients.edit", item.id)}
                                                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <IconPencil size={15} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteIngredient(item)}
                                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
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

            {/* ── TAB: Categories ────────────────────────────────────────────────── */}
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
                                        <td className="px-6 py-4 font-mono text-xs text-emerald-600 font-bold">{cat.code}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-white">{cat.name}</td>
                                        <td className="px-6 py-4">
                                            <IngredientTypeBadge type={cat.ingredient_type} />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {cat.is_active
                                                ? <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full">Aktif</span>
                                                : <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-400 rounded-full">Nonaktif</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setCatModal({ show: true, data: cat })}
                                                    className="text-slate-400 hover:text-emerald-600 transition-colors"
                                                    title="Edit kategori"
                                                >
                                                    <IconPencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Hapus kategori"
                                                >
                                                    <IconTrash size={16} />
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
                                <IconTag size={16} className="text-emerald-600" />
                                Tentang Tipe Scaling
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(INGREDIENT_TYPE_CONFIG).map(([type, cfg]) => (
                                    <div key={type} className="flex items-start gap-2">
                                        <IngredientTypeBadge type={type} />
                                        <p className="text-xs text-slate-500 flex-1">
                                            {type === 'oil'     && "→ Di-scale ke oil_quantity dari IntensitySizeQuantity"}
                                            {type === 'alcohol' && "→ Di-scale ke alcohol_quantity dari IntensitySizeQuantity"}
                                            {type === 'other'   && "→ Di-scale ke other_quantity (air suling, fixative, dll)"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">Catatan</h3>
                            <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
                                <li>Kategori digunakan untuk mengelompokkan bahan saat pembuatan resep</li>
                                <li>Tipe Scaling menentukan cara bahan di-scale ke ukuran botol berbeda</li>
                                <li>Kategori yang memiliki bahan aktif tidak dapat dihapus</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            <CategoryModal
                show={catModal.show}
                onClose={() => setCatModal({ show: false, data: null })}
                category={catModal.data}
            />
        </>
    );
}

Index.layout = page => <DashboardLayout children={page} />;
