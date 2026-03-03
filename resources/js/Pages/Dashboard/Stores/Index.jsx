import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus, IconDatabaseOff, IconPencilCog, IconTrash,
    IconLayoutGrid, IconList, IconBuildingStore, IconMapPin,
    IconFilter, IconRefresh, IconUser, IconPhone, IconMail,
    IconCircleCheck, IconCircleX, IconX, IconCheck, IconAlertTriangle,
    IconTag,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Category Badge
// ---------------------------------------------------------------------------
function CategoryBadge({ category }) {
    if (!category) return <span className="text-xs text-slate-400 italic">—</span>;

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
            <IconTag size={10} strokeWidth={2.5} />
            {category.code}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Store Card (Grid Mode)
// ---------------------------------------------------------------------------
function StoreCard({ store, selected, onSelect }) {
    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all hover:shadow-lg ${
            selected ? "border-primary-400 dark:border-primary-600 ring-2 ring-primary-200 dark:ring-primary-800" : "border-slate-200 dark:border-slate-800"
        }`}>
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={selected} onChange={e => onSelect(store.id, e.target.checked)}
                            className="w-4 h-4 rounded border-2 border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                        />
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center">
                            <IconBuildingStore size={20} className="text-primary-600 dark:text-primary-400" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CategoryBadge category={store.store_category} />
                        <StatusBadge isActive={store.is_active} />
                    </div>
                </div>

                <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate mb-1">{store.name}</h3>
                <code className="inline-block text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-500 dark:text-slate-400 uppercase">
                    {store.code}
                </code>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                        <IconUser size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {store.manager_name || <span className="italic text-slate-400">Belum diisi</span>}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <IconPhone size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">{store.phone || "—"}</span>
                    </div>
                    {store.email && (
                        <div className="flex items-center gap-2">
                            <IconMail size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{store.email}</span>
                        </div>
                    )}
                    {store.address && (
                        <div className="flex items-start gap-2">
                            <IconMapPin size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{store.address}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-5 pb-4 flex gap-2">
                <Link href={route("stores.edit", store.id)}
                    className="flex-1 text-center py-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                >
                    <IconPencilCog size={14} className="inline mr-1" />Edit
                </Link>
                <Button type="delete" url={route("stores.destroy", store.id)}
                    className="flex-1 text-center py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    icon={<IconTrash size={14} className="inline mr-1" />}
                    label="Hapus"
                />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Filter Modal
// ---------------------------------------------------------------------------
function FilterModal({ show, onClose, filters, onApply, categories }) {
    const [temp, setTemp] = useState(filters);

    if (!show) return null;

    const selectCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 transition-all";

    const handleApply = () => { onApply(temp); onClose(); };
    const handleReset = () => {
        const reset = { is_active: "", store_category_id: "", per_page: 12 };
        setTemp(reset); onApply(reset); onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                            <IconFilter size={18} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Filter Toko</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <IconX size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Filter Kategori — BARU */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Kategori Toko</label>
                        <select value={temp.store_category_id ?? ""} onChange={e => setTemp({ ...temp, store_category_id: e.target.value })} className={selectCls}>
                            <option value="">Semua Kategori</option>
                            <option value="none">— Tanpa Kategori</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.code} — {cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                        <select value={temp.is_active} onChange={e => setTemp({ ...temp, is_active: e.target.value })} className={selectCls}>
                            <option value="">Semua Status</option>
                            <option value="1">✅ Aktif</option>
                            <option value="0">❌ Non-Aktif</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Per Halaman</label>
                        <select value={temp.per_page} onChange={e => setTemp({ ...temp, per_page: e.target.value })} className={selectCls}>
                            {["8", "12", "24", "48"].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
                    <button onClick={handleReset} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Reset</button>
                    <button onClick={handleApply} className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30">Terapkan</button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Bulk Delete Modal
// ---------------------------------------------------------------------------
function BulkDeleteModal({ show, onClose, onConfirm, count }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-4">
                    <IconAlertTriangle size={22} className="text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">Hapus {count} Toko?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                    Tindakan ini tidak dapat dibatalkan. Data toko yang dipilih akan dihapus permanen.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Batal</button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-500/30">Hapus Sekarang</button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Index Page
// ---------------------------------------------------------------------------
export default function Index({ stores, filters, categories }) {
    const [viewMode, setViewMode]             = useState("list");
    const [selectedIds, setSelectedIds]       = useState([]);
    const [showFilter, setShowFilter]         = useState(false);
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [currentFilters, setCurrentFilters] = useState({
        is_active:          filters?.is_active          ?? "",
        store_category_id:  filters?.store_category_id  ?? "",
        per_page:           filters?.per_page            || 12,
    });

    const handleSelect    = (id, checked) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(s => s !== id));
    const handleSelectAll = (checked)     => setSelectedIds(checked ? stores.data.map(s => s.id) : []);
    const allSelected     = stores.data.length > 0 && selectedIds.length === stores.data.length;

    const handleApplyFilters = (newFilters) => {
        setCurrentFilters(newFilters);
        const clean = {};
        if (filters?.search)                           clean.search             = filters.search;
        if (newFilters.is_active !== "")               clean.is_active          = newFilters.is_active;
        if (newFilters.store_category_id)              clean.store_category_id  = newFilters.store_category_id;
        if (newFilters.per_page)                       clean.per_page           = newFilters.per_page;
        router.get(route("stores.index"), clean, { preserveState: false, replace: true });
    };

    const handleBulkDelete = () => {
        router.post(route("stores.bulk-delete"), { ids: selectedIds }, {
            onSuccess: () => { setSelectedIds([]); setShowBulkDelete(false); toast.success(`${selectedIds.length} toko berhasil dihapus!`); },
            onError:   () => toast.error("Gagal menghapus, coba lagi"),
        });
    };

    const handleRefresh = () => { router.reload({ only: ["stores"] }); toast.success("Data diperbarui!"); };

    const hasActiveFilters = currentFilters.is_active !== "" || currentFilters.store_category_id !== "";

    // Label kategori untuk filter tag
    const categoryFilterLabel = (() => {
        if (!currentFilters.store_category_id) return null;
        if (currentFilters.store_category_id === "none") return "Tanpa Kategori";
        const cat = categories.find(c => c.id === currentFilters.store_category_id);
        return cat ? `${cat.code} — ${cat.name}` : null;
    })();

    return (
        <>
            <Head title="Data Toko" />

            {/* ── Header ── */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <IconBuildingStore size={22} className="text-white" />
                        </div>
                        Toko & Cabang
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                            {stores.total ?? stores.data?.length ?? 0} Toko Terdaftar
                        </span>
                        {selectedIds.length > 0 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 text-xs font-semibold">
                                {selectedIds.length} Dipilih
                            </span>
                        )}
                    </p>
                </div>
                <Button type="link" href={route("stores.create")}
                    icon={<IconCirclePlus size={20} strokeWidth={2} />}
                    className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-primary-500/40"
                    label="Tambah Toko"
                />
            </div>

            {/* ── Toolbar ── */}
            <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="w-full sm:w-80">
                        <Search url={route("stores.index")} placeholder="Cari nama, kode, manajer, email..." />
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleRefresh}
                            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Refresh"
                        >
                            <IconRefresh size={20} strokeWidth={2} />
                        </button>

                        <button onClick={() => setShowFilter(true)}
                            className={`p-2.5 rounded-xl transition-colors relative ${hasActiveFilters ? "bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                            title="Filter"
                        >
                            <IconFilter size={20} strokeWidth={2} />
                            {hasActiveFilters && <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-600 rounded-full border-2 border-white dark:border-slate-900" />}
                        </button>

                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button onClick={() => setViewMode("list")}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow text-primary-600 dark:text-primary-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                                title="List View"
                            >
                                <IconList size={18} />
                            </button>
                            <button onClick={() => setViewMode("grid")}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow text-primary-600 dark:text-primary-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                                title="Grid View"
                            >
                                <IconLayoutGrid size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                        <div className="flex items-center gap-3">
                            <IconCheck size={18} className="text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-semibold text-primary-900 dark:text-primary-100">{selectedIds.length} toko dipilih</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all">Batal</button>
                            <button onClick={() => setShowBulkDelete(true)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all flex items-center gap-1.5">
                                <IconTrash size={15} strokeWidth={2} /> Hapus {selectedIds.length} Item
                            </button>
                        </div>
                    </div>
                )}

                {/* Active Filter Tags */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filter Aktif:</span>

                        {currentFilters.store_category_id && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-semibold">
                                <IconTag size={11} /> Kategori: {categoryFilterLabel}
                                <button onClick={() => handleApplyFilters({ ...currentFilters, store_category_id: "" })} className="hover:bg-violet-200 dark:hover:bg-violet-800 rounded-full p-0.5">
                                    <IconX size={11} strokeWidth={3} />
                                </button>
                            </span>
                        )}

                        {currentFilters.is_active !== "" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-semibold">
                                Status: {currentFilters.is_active === "1" ? "Aktif" : "Non-Aktif"}
                                <button onClick={() => handleApplyFilters({ ...currentFilters, is_active: "" })} className="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5">
                                    <IconX size={11} strokeWidth={3} />
                                </button>
                            </span>
                        )}

                        <button onClick={() => handleApplyFilters({ is_active: "", store_category_id: "", per_page: 12 })} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">Reset Semua</button>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            {stores.data.length > 0 ? (
                viewMode === "list" ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-4 w-10">
                                            <input type="checkbox" checked={allSelected} onChange={e => handleSelectAll(e.target.checked)}
                                                className="w-4 h-4 rounded border-2 border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                                            />
                                        </th>
                                        {["Info Toko", "Kategori", "Manajer & Kontak", "Alamat", "Status", "Dibuat", "Aksi"].map(h => (
                                            <th key={h} className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {stores.data.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={e => handleSelect(item.id, e.target.checked)}
                                                    className="w-4 h-4 rounded border-2 border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                                                        <IconBuildingStore size={17} className="text-primary-600 dark:text-primary-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                                                        <code className="text-[10px] text-primary-600 dark:text-primary-400 font-mono uppercase">{item.code}</code>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Kolom Kategori — BARU */}
                                            <td className="px-4 py-4">
                                                <CategoryBadge category={item.store_category} />
                                                {item.store_category && (
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                        {item.store_category.allow_all_variants ? "Semua variant" : "Whitelist"}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-4 py-4">
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.manager_name || "—"}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{item.email || item.phone || "—"}</p>
                                            </td>
                                            <td className="px-4 py-4 max-w-[160px]">
                                                {item.address
                                                    ? <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.address}</p>
                                                    : <span className="text-xs text-slate-400 italic">—</span>
                                                }
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge isActive={item.is_active} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{item.created_at}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={route("stores.edit", item.id)}
                                                        className="p-2 rounded-lg bg-warning-100 border border-warning-200 text-warning-600 hover:bg-warning-200 dark:bg-warning-900/50 dark:border-warning-800 dark:text-warning-400 dark:hover:bg-warning-900/70 transition-all"
                                                        title="Edit"
                                                    >
                                                        <IconPencilCog size={16} strokeWidth={2} />
                                                    </Link>
                                                    <Button type="delete" url={route("stores.destroy", item.id)}
                                                        icon={<IconTrash size={16} strokeWidth={2} />}
                                                        className="p-2 rounded-lg bg-danger-100 border border-danger-200 text-danger-600 hover:bg-danger-200 dark:bg-danger-900/50 dark:border-danger-800 dark:text-danger-400 dark:hover:bg-danger-900/70 transition-all"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {stores.data.map(item => (
                            <StoreCard key={item.id} store={item} selected={selectedIds.includes(item.id)} onSelect={handleSelect} />
                        ))}
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mb-5">
                        <IconDatabaseOff size={38} className="text-slate-400 dark:text-slate-600" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                        {filters?.search ? "Tidak Ada Hasil" : "Belum Ada Toko"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                        {filters?.search
                            ? `Tidak ditemukan toko dengan kata kunci "${filters.search}"`
                            : "Mulai dengan mendaftarkan toko atau cabang pertama Anda"
                        }
                    </p>
                    {!filters?.search && (
                        <Button type="link" href={route("stores.create")}
                            icon={<IconCirclePlus size={20} strokeWidth={2} />}
                            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold shadow-lg shadow-primary-500/40"
                            label="Tambah Toko Sekarang"
                        />
                    )}
                </div>
            )}

            {stores.last_page > 1 && (
                <div className="mt-6"><Pagination links={stores.links} /></div>
            )}

            <FilterModal
                show={showFilter}
                onClose={() => setShowFilter(false)}
                filters={currentFilters}
                onApply={handleApplyFilters}
                categories={categories}
            />
            <BulkDeleteModal show={showBulkDelete} onClose={() => setShowBulkDelete(false)} onConfirm={handleBulkDelete} count={selectedIds.length} />
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
