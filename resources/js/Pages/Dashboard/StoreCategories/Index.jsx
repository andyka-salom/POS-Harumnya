import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus, IconDatabaseOff, IconPencilCog, IconTrash,
    IconFilter, IconRefresh, IconX, IconTag, IconBuildingStore,
    IconCircleCheck, IconCircleX, IconListCheck, IconLayoutGrid,
    IconList, IconToggleRight, IconToggleLeft,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";
import toast from "react-hot-toast";

// =============================================================================
// Atoms
// =============================================================================

function StatusBadge({ isActive }) {
    return isActive ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-400">
            <IconCircleCheck size={13} strokeWidth={2.5} /> Aktif
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <IconCircleX size={13} strokeWidth={2.5} /> Non-Aktif
        </span>
    );
}

function ModeBadge({ allowAll }) {
    return allowAll ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
            Semua Variant
        </span>
    ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
            Whitelist
        </span>
    );
}

// =============================================================================
// Category Card — Grid Mode
// =============================================================================

function CategoryCard({ category, onToggle }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all flex flex-col">
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center">
                        <span className="text-xl font-black text-violet-600 dark:text-violet-400 tracking-tight">
                            {category.code}
                        </span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge isActive={category.is_active} />
                        <ModeBadge allowAll={category.allow_all_variants} />
                    </div>
                </div>

                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
                    {category.name}
                </h3>
                {category.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {category.description}
                    </p>
                )}

                <div className="flex items-center gap-4 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-center flex-1">
                        <p className="text-2xl font-black text-violet-600 dark:text-violet-400">
                            {category.variant_count}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                            Variant
                        </p>
                    </div>
                    <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center flex-1">
                        <p className="text-2xl font-black text-primary-600 dark:text-primary-400">
                            {category.stores_count}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                            Toko
                        </p>
                    </div>
                    <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center flex-1">
                        <p className="text-2xl font-black text-slate-500 dark:text-slate-400">
                            {category.sort_order}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                            Urutan
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-5 pb-4 flex gap-2">
                <Link
                    href={route("store-categories.variants", category.id)}
                    className="flex-1 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors flex items-center justify-center gap-1"
                >
                    <IconListCheck size={14} /> Variant
                </Link>
                <Link
                    href={route("store-categories.edit", category.id)}
                    className="flex-1 py-2 rounded-xl bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 text-xs font-bold hover:bg-warning-100 dark:hover:bg-warning-900/50 transition-colors flex items-center justify-center gap-1"
                >
                    <IconPencilCog size={14} /> Edit
                </Link>
                <button
                    onClick={() => onToggle(category)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title={category.is_active ? "Nonaktifkan" : "Aktifkan"}
                >
                    {category.is_active
                        ? <IconToggleRight size={16} className="text-success-500" />
                        : <IconToggleLeft size={16} className="text-slate-400" />
                    }
                </button>
                <Button
                    type="delete"
                    url={route("store-categories.destroy", category.id)}
                    icon={<IconTrash size={14} />}
                    className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                />
            </div>
        </div>
    );
}

// =============================================================================
// Filter Modal
// =============================================================================

function FilterModal({ show, onClose, filters, onApply }) {
    const [temp, setTemp] = useState({ ...filters });

    if (!show) return null;

    const selectCls =
        "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 transition-all";

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                            <IconFilter size={18} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Filter Kategori
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <IconX size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Status
                        </label>
                        <select
                            value={temp.is_active ?? ""}
                            onChange={e => setTemp({ ...temp, is_active: e.target.value })}
                            className={selectCls}
                        >
                            <option value="">Semua Status</option>
                            <option value="1">✅ Aktif</option>
                            <option value="0">❌ Non-Aktif</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Per Halaman
                        </label>
                        <select
                            value={temp.per_page ?? 12}
                            onChange={e => setTemp({ ...temp, per_page: e.target.value })}
                            className={selectCls}
                        >
                            {["8", "12", "24", "48"].map(v => (
                                <option key={v} value={v}>{v} item</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => {
                            const reset = { is_active: "", per_page: 12 };
                            setTemp(reset);
                            onApply(reset);
                            onClose();
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => { onApply(temp); onClose(); }}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/30"
                    >
                        Terapkan
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Index Page
// =============================================================================

export default function Index({ categories, filters }) {
    const [viewMode, setViewMode]     = useState("grid");
    const [showFilter, setShowFilter] = useState(false);
    const [currentFilters, setCurrentFilters] = useState({
        is_active: filters?.is_active ?? "",
        per_page:  filters?.per_page  ?? 12,
    });

    const hasActiveFilters = currentFilters.is_active !== "";

    const applyFilters = (newFilters) => {
        setCurrentFilters(newFilters);
        const params = {};
        if (filters?.search)             params.search    = filters.search;
        if (newFilters.is_active !== "") params.is_active = newFilters.is_active;
        if (newFilters.per_page)         params.per_page  = newFilters.per_page;
        router.get(route("store-categories.index"), params, {
            preserveState: false,
            replace: true,
        });
    };

    const handleToggle = (category) => {
        router.patch(route("store-categories.toggle", category.id), {}, {
            onSuccess: () =>
                toast.success(
                    `Kategori ${category.code} berhasil ${category.is_active ? "dinonaktifkan" : "diaktifkan"}`
                ),
            onError: () => toast.error("Gagal mengubah status"),
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Kategori Toko" />

            {/* ── Page Header ── */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                            <IconTag size={22} className="text-white" />
                        </div>
                        Kategori Toko
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {categories.total ?? 0} Kategori
                        </span>
                    </p>
                </div>
                <Link
                    href={route("store-categories.create")}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/40 transition-all"
                >
                    <IconCirclePlus size={20} strokeWidth={2} /> Tambah Kategori
                </Link>
            </div>

            {/* ── Toolbar ── */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="w-full sm:w-80">
                    <Search
                        url={route("store-categories.index")}
                        placeholder="Cari kode atau nama kategori..."
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.reload({ only: ["categories"] })}
                        className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Refresh"
                    >
                        <IconRefresh size={20} strokeWidth={2} />
                    </button>
                    <button
                        onClick={() => setShowFilter(true)}
                        className={`relative p-2.5 rounded-xl transition-colors ${
                            hasActiveFilters
                                ? "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400"
                                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        title="Filter"
                    >
                        <IconFilter size={20} strokeWidth={2} />
                        {hasActiveFilters && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-violet-600 rounded-full border-2 border-white dark:border-slate-900" />
                        )}
                    </button>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {[["grid", <IconLayoutGrid size={18} />], ["list", <IconList size={18} />]].map(([mode, icon]) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`p-1.5 rounded-lg transition-all ${
                                    viewMode === mode
                                        ? "bg-white dark:bg-slate-700 shadow text-violet-600 dark:text-violet-400"
                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                }`}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Active Filter Tags ── */}
            {hasActiveFilters && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500">Filter aktif:</span>
                    {currentFilters.is_active !== "" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-semibold">
                            Status: {currentFilters.is_active === "1" ? "Aktif" : "Non-Aktif"}
                            <button
                                onClick={() => applyFilters({ ...currentFilters, is_active: "" })}
                                className="hover:text-violet-900 dark:hover:text-violet-100"
                            >
                                <IconX size={11} strokeWidth={3} />
                            </button>
                        </span>
                    )}
                    <button
                        onClick={() => applyFilters({ is_active: "", per_page: 12 })}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                        Reset semua
                    </button>
                </div>
            )}

            {/* ── Content ── */}
            {categories.data.length > 0 ? (
                viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {categories.data.map(cat => (
                            <CategoryCard key={cat.id} category={cat} onToggle={handleToggle} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        {["Kategori", "Deskripsi", "Mode", "Variant", "Toko", "Status", "Aksi"].map(h => (
                                            <th key={h} className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {categories.data.map(cat => (
                                        <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm font-black text-violet-600 dark:text-violet-400">
                                                            {cat.code}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                            {cat.name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-mono">
                                                            Urutan: {cat.sort_order}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 max-w-[180px]">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                    {cat.description || "—"}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <ModeBadge allowAll={cat.allow_all_variants} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                                                    {cat.variant_count}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <IconBuildingStore size={13} className="text-slate-400" />
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                        {cat.stores_count}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge isActive={cat.is_active} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link
                                                        href={route("store-categories.variants", cat.id)}
                                                        className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all"
                                                        title="Kelola Variant"
                                                    >
                                                        <IconListCheck size={16} strokeWidth={2} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleToggle(cat)}
                                                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                                        title={cat.is_active ? "Nonaktifkan" : "Aktifkan"}
                                                    >
                                                        {cat.is_active
                                                            ? <IconToggleRight size={16} className="text-success-500" />
                                                            : <IconToggleLeft size={16} />
                                                        }
                                                    </button>
                                                    <Link
                                                        href={route("store-categories.edit", cat.id)}
                                                        className="p-2 rounded-lg bg-warning-50 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-900/50 transition-all"
                                                        title="Edit"
                                                    >
                                                        <IconPencilCog size={16} strokeWidth={2} />
                                                    </Link>
                                                    <Button
                                                        type="delete"
                                                        url={route("store-categories.destroy", cat.id)}
                                                        icon={<IconTrash size={16} strokeWidth={2} />}
                                                        className="p-2 rounded-lg bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 hover:bg-danger-100 dark:hover:bg-danger-900/50 transition-all"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-5">
                        <IconDatabaseOff size={38} className="text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                        {filters?.search ? "Tidak ada hasil" : "Belum ada kategori"}
                    </h3>
                    <p className="text-sm text-slate-400 mb-6 text-center max-w-sm">
                        {filters?.search
                            ? `Tidak ditemukan kategori dengan kata kunci "${filters.search}"`
                            : "Mulai dengan membuat kategori toko seperti L, M, atau S"}
                    </p>
                    {!filters?.search && (
                        <Link
                            href={route("store-categories.create")}
                            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/30 transition-all"
                        >
                            <IconCirclePlus size={20} strokeWidth={2} /> Tambah Kategori
                        </Link>
                    )}
                </div>
            )}

            {/* ── Pagination ── */}
            {(categories.last_page ?? 1) > 1 && (
                <div className="mt-6">
                    <Pagination links={categories.links} />
                </div>
            )}

            <FilterModal
                show={showFilter}
                onClose={() => setShowFilter(false)}
                filters={currentFilters}
                onApply={applyFilters}
            />
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
