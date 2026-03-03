import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus, IconDatabaseOff, IconPencilCog, IconTrash,
    IconLayoutGrid, IconList, IconBolt, IconCircleCheck, IconCircleX,
    IconFilter, IconRefresh, IconX, IconCheck, IconAlertTriangle,
    IconDropletFilled, IconFlask, IconBottle, IconRuler,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function StatusBadge({ isActive }) {
    return isActive ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-400 shadow-sm">
            <IconCircleCheck size={14} strokeWidth={2.5} /> Aktif
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shadow-sm">
            <IconCircleX size={14} strokeWidth={2.5} /> Tidak Aktif
        </span>
    );
}

function ConcentrationBadge({ level }) {
    const configs = {
        extreme:  { bg: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",       label: "Extrait",   ratio: "2:1" },
        strong:   { bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400", label: "EDP",  ratio: "1:1" },
        moderate: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",    label: "EDT",       ratio: "1:2" },
        light:    { bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",   label: "Body Mist", ratio: "1:4" },
    };
    const cfg = configs[level] ?? configs.light;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg}`}>
            <span>{cfg.label}</span>
            <span className="opacity-60 font-mono">({cfg.ratio})</span>
        </span>
    );
}

// ---------------------------------------------------------------------------
// SizeQuantityMiniTable — Preview tabel volume per ukuran di dalam card
// ---------------------------------------------------------------------------
function SizeQuantityMiniTable({ sizeQuantities }) {
    if (!sizeQuantities || sizeQuantities.length === 0) {
        return (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <IconAlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Belum ada konfigurasi volume
                </span>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-2 py-1.5 text-left font-bold text-slate-500 dark:text-slate-400">Ukuran</th>
                        <th className="px-2 py-1.5 text-center font-bold text-primary-600">
                            <span className="flex items-center justify-center gap-1">
                                <IconFlask size={11} /> Bibit
                            </span>
                        </th>
                        <th className="px-2 py-1.5 text-center font-bold text-blue-600">
                            <span className="flex items-center justify-center gap-1">
                                <IconBottle size={11} /> Alkohol
                            </span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sizeQuantities.map((q, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-2 py-1.5">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{q.volume_ml}ml</span>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                                <span className="font-bold text-primary-600 dark:text-primary-400">{q.oil_quantity}</span>
                                <span className="text-slate-400 ml-0.5">ml</span>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                                <span className="font-bold text-blue-600 dark:text-blue-400">{q.alcohol_quantity}</span>
                                <span className="text-slate-400 ml-0.5">ml</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// IntensityCard
// ---------------------------------------------------------------------------
function IntensityCard({ intensity, isSelected, onSelect }) {
    const [showQty, setShowQty] = useState(false);
    const hasQty = intensity.size_quantities && intensity.size_quantities.length > 0;

    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300">
            {/* Checkbox */}
            <div className="absolute top-3 left-3 z-10">
                <label className="flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelect(intensity.id, e.target.checked)}
                        className="w-5 h-5 rounded-md border-2 border-white shadow-lg text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all"
                    />
                </label>
            </div>

            {/* Card Header */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between mb-4">
                    <StatusBadge isActive={intensity.is_active} />
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                        #{intensity.sort_order}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                        <IconDropletFilled size={24} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">{intensity.name}</h3>
                        <code className="text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">{intensity.code}</code>
                    </div>
                </div>
            </div>

            {/* Card Body */}
            <div className="p-5">
                {/* Ratio visual */}
                <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Komposisi Ratio</p>
                    <div className="h-2.5 w-full rounded-full overflow-hidden flex mb-2">
                        <div className="h-full bg-primary-500" style={{ width: `${intensity.oil_ratio}%` }} />
                        <div className="h-full bg-blue-400 flex-1" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <IconFlask size={13} className="text-primary-600 dark:text-primary-400" />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Bibit</span>
                            </div>
                            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{intensity.oil_ratio}%</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <IconBottle size={13} className="text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Alkohol</span>
                            </div>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{intensity.alcohol_ratio}%</span>
                        </div>
                    </div>
                    <div className="mt-2 text-center">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                            {intensity.ratio_display}
                        </span>
                    </div>
                </div>

                {/* Concentration Level */}
                <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Level</span>
                    <ConcentrationBadge level={intensity.concentration_level} />
                </div>

                {/* Volume per size — collapsible */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setShowQty(!showQty)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2"
                    >
                        <span className="flex items-center gap-1.5">
                            <IconRuler size={13} />
                            Volume per Ukuran
                        </span>
                        <span className="flex items-center gap-1">
                            {hasQty ? (
                                <span className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold">
                                    {intensity.size_quantities.length} ukuran
                                </span>
                            ) : (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                                    Belum diisi
                                </span>
                            )}
                            <span className="text-slate-400">{showQty ? "▲" : "▼"}</span>
                        </span>
                    </button>

                    {showQty && (
                        <SizeQuantityMiniTable sizeQuantities={intensity.size_quantities} />
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                    <Link href={route("intensities.edit", intensity.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-warning-100 text-warning-700 hover:bg-warning-200 dark:bg-warning-900/50 dark:text-warning-400 dark:hover:bg-warning-900/70 transition-all font-semibold text-sm"
                    >
                        <IconPencilCog size={16} strokeWidth={2} /> Edit
                    </Link>
                    <Button
                        type="delete"
                        icon={<IconTrash size={16} strokeWidth={2} />}
                        className="px-3 py-2 rounded-lg bg-danger-100 text-danger-700 hover:bg-danger-200 dark:bg-danger-900/50 dark:text-danger-400 dark:hover:bg-danger-900/70 transition-all font-semibold text-sm"
                        url={route("intensities.destroy", intensity.id)}
                    />
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// FilterModal
// ---------------------------------------------------------------------------
function FilterModal({ show, onClose, filters, onApply }) {
    const [tempFilters, setTempFilters] = useState(filters);
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                            <IconFilter size={20} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Filter Intensitas</h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <IconX size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                        <select value={tempFilters.is_active}
                            onChange={(e) => setTempFilters({ ...tempFilters, is_active: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 transition-all"
                        >
                            <option value="">Semua Status</option>
                            <option value="1">✅ Aktif</option>
                            <option value="0">❌ Tidak Aktif</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tampilkan per halaman</label>
                        <select value={tempFilters.per_page}
                            onChange={(e) => setTempFilters({ ...tempFilters, per_page: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 transition-all"
                        >
                            {[12, 24, 48, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
                    <button onClick={() => { const r = { is_active: "", per_page: 12 }; setTempFilters(r); onApply(r); onClose(); }}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >Reset</button>
                    <button onClick={() => { onApply(tempFilters); onClose(); }}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30"
                    >Terapkan</button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// BulkDeleteModal
// ---------------------------------------------------------------------------
function BulkDeleteModal({ show, onClose, onConfirm, count }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800">
                <div className="p-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-4">
                        <IconAlertTriangle size={24} className="text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">Hapus {count} Intensitas?</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
                        Tindakan ini tidak dapat dibatalkan. Data volume per ukuran juga akan terhapus.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >Batal</button>
                        <button onClick={onConfirm}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-500/30"
                        >Hapus Sekarang</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Index Page
// ---------------------------------------------------------------------------
export default function Index({ intensities, filters }) {
    const [viewMode, setViewMode]               = useState(() => localStorage.getItem("intensityViewMode") || "grid");
    const [selectedIds, setSelectedIds]         = useState([]);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showBulkDelete, setShowBulkDelete]   = useState(false);
    const [currentFilters, setCurrentFilters]   = useState({
        is_active: filters?.is_active ?? "",
        per_page:  filters?.per_page  || 12,
    });

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem("intensityViewMode", mode);
    };

    const handleSelect = (id, checked) => {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(sid => sid !== id));
    };

    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? intensities.data.map(i => i.id) : []);
    };

    const handleApplyFilters = (newFilters) => {
        setCurrentFilters(newFilters);
        const clean = {};
        if (filters?.search)              clean.search    = filters.search;
        if (newFilters.is_active !== "")  clean.is_active = newFilters.is_active;
        if (newFilters.per_page)          clean.per_page  = newFilters.per_page;
        router.get(route("intensities.index"), clean, { preserveState: false, replace: true });
    };

    const handleBulkDelete = () => {
        router.post(route("intensities.bulk-delete"), { ids: selectedIds }, {
            onSuccess: () => { setSelectedIds([]); setShowBulkDelete(false); toast.success(`${selectedIds.length} intensitas berhasil dihapus!`); },
            onError:   () => toast.error("Terjadi kesalahan saat menghapus intensitas"),
        });
    };

    const hasActiveFilters = currentFilters.is_active !== "";

    return (
        <>
            <Head title="Level Intensitas" />

            {/* Page Header */}
            <div className="mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <IconBolt size={24} className="text-white" strokeWidth={2} />
                            </div>
                            Level Intensitas
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                                {intensities.total ?? intensities.data?.length ?? 0} Total Level
                            </span>
                            {selectedIds.length > 0 && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 text-xs font-semibold">
                                    {selectedIds.length} Dipilih
                                </span>
                            )}
                        </p>
                    </div>
                    <Button type="link" icon={<IconCirclePlus size={20} strokeWidth={2} />}
                        className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-lg shadow-primary-500/40 font-semibold"
                        label="Tambah Level" href={route("intensities.create")}
                    />
                </div>
            </div>

            {/* Toolbar */}
            <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="w-full sm:w-96">
                        <Search url={route("intensities.index")} placeholder="Cari nama atau kode..." />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.reload({ only: ["intensities"] })}
                            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Refresh"
                        >
                            <IconRefresh size={20} strokeWidth={2} />
                        </button>
                        <button onClick={() => setShowFilterModal(true)}
                            className={`p-2.5 rounded-xl transition-colors relative ${hasActiveFilters ? "bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                        >
                            <IconFilter size={20} strokeWidth={2} />
                            {hasActiveFilters && <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-600 rounded-full border-2 border-white dark:border-slate-900" />}
                        </button>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                            {[["grid", <IconLayoutGrid size={18} strokeWidth={2} />], ["list", <IconList size={18} strokeWidth={2} />]].map(([mode, icon]) => (
                                <button key={mode} onClick={() => handleViewModeChange(mode)}
                                    className={`p-2 rounded-lg transition-all ${viewMode === mode ? "bg-white dark:bg-slate-900 text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                        <div className="flex items-center gap-3">
                            <IconCheck size={20} className="text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                                {selectedIds.length} intensitas dipilih
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedIds([])}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all"
                            >Batal</button>
                            <button onClick={() => setShowBulkDelete(true)}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all flex items-center gap-2"
                            >
                                <IconTrash size={16} strokeWidth={2} /> Hapus {selectedIds.length} Item
                            </button>
                        </div>
                    </div>
                )}

                {/* Active Filter Tags */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filter Aktif:</span>
                        {currentFilters.is_active !== "" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-semibold">
                                Status: {currentFilters.is_active === "1" ? "Aktif" : "Tidak Aktif"}
                                <button onClick={() => handleApplyFilters({ ...currentFilters, is_active: "" })}
                                    className="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5"
                                >
                                    <IconX size={12} strokeWidth={3} />
                                </button>
                            </span>
                        )}
                        <button onClick={() => handleApplyFilters({ is_active: "", per_page: 12 })}
                            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                        >Reset Semua</button>
                    </div>
                )}
            </div>

            {/* Content */}
            {intensities.data.length > 0 ? (
                viewMode === "grid" ? (
                    <>
                        <div className="mb-4">
                            <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <input type="checkbox"
                                    checked={selectedIds.length === intensities.data.length && intensities.data.length > 0}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="w-4 h-4 rounded border-2 border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Pilih Semua ({intensities.data.length})
                                </span>
                            </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {intensities.data.map((intensity) => (
                                <IntensityCard key={intensity.id} intensity={intensity}
                                    isSelected={selectedIds.includes(intensity.id)}
                                    onSelect={handleSelect}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    /* ── List View ── */
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                        <th className="px-4 py-4 text-left">
                                            <input type="checkbox"
                                                checked={selectedIds.length === intensities.data.length && intensities.data.length > 0}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="w-4 h-4 rounded border-2 border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                                            />
                                        </th>
                                        {["No", "Level", "Ratio", "Level Konsentrasi", "Volume per Ukuran", "Status", "Urutan", "Aksi"].map(h => (
                                            <th key={h} className={`px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ${h === "Aksi" ? "text-right" : ["Status","Urutan","Level Konsentrasi"].includes(h) ? "text-center" : "text-left"}`}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {intensities.data.map((intensity, i) => (
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" key={intensity.id}>
                                            <td className="px-4 py-4">
                                                <input type="checkbox"
                                                    checked={selectedIds.includes(intensity.id)}
                                                    onChange={(e) => handleSelect(intensity.id, e.target.checked)}
                                                    className="w-4 h-4 rounded border-2 border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                                                />
                                            </td>
                                            <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                {i + 1 + (intensities.current_page - 1) * intensities.per_page}
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{intensity.name}</p>
                                                <code className="text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">{intensity.code}</code>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <IconFlask size={12} className="text-primary-600" />
                                                        <span className="text-xs text-slate-600 dark:text-slate-400">Bibit: <strong>{intensity.oil_ratio}%</strong></span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <IconBottle size={12} className="text-blue-600" />
                                                        <span className="text-xs text-slate-600 dark:text-slate-400">Alkohol: <strong>{intensity.alcohol_ratio}%</strong></span>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-slate-500">{intensity.ratio_display}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <ConcentrationBadge level={intensity.concentration_level} />
                                            </td>
                                            {/* Volume per size — mini inline */}
                                            <td className="px-4 py-4">
                                                {intensity.size_quantities && intensity.size_quantities.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {intensity.size_quantities.map((q, qi) => (
                                                            <div key={qi} className="flex items-center gap-2 text-xs">
                                                                <span className="font-bold text-slate-600 dark:text-slate-300 w-10">{q.volume_ml}ml</span>
                                                                <span className="text-primary-600 font-semibold">{q.oil_quantity}</span>
                                                                <span className="text-slate-300">+</span>
                                                                <span className="text-blue-600 font-semibold">{q.alcohol_quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                                        <IconAlertTriangle size={12} /> Belum diisi
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <StatusBadge isActive={intensity.is_active} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                                                    #{intensity.sort_order}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={route("intensities.edit", intensity.id)}
                                                        className="p-2 rounded-lg bg-warning-100 border border-warning-200 text-warning-600 hover:bg-warning-200 dark:bg-warning-900/50 dark:border-warning-800 dark:text-warning-400 transition-all"
                                                    >
                                                        <IconPencilCog size={16} strokeWidth={2} />
                                                    </Link>
                                                    <Button type="delete" icon={<IconTrash size={16} strokeWidth={2} />}
                                                        className="p-2 rounded-lg bg-danger-100 border border-danger-200 text-danger-600 hover:bg-danger-200 dark:bg-danger-900/50 dark:border-danger-800 dark:text-danger-400 transition-all"
                                                        url={route("intensities.destroy", intensity.id)}
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
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mb-5">
                        <IconDatabaseOff size={40} className="text-slate-400 dark:text-slate-600" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                        {filters?.search ? "Tidak Ada Hasil" : "Belum Ada Level Intensitas"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                        {filters?.search
                            ? `Tidak ditemukan dengan kata kunci "${filters.search}"`
                            : "Mulai dengan menambahkan level intensitas pertama"
                        }
                    </p>
                    {!filters?.search && (
                        <Button type="link" icon={<IconCirclePlus size={20} strokeWidth={2} />}
                            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/40 font-semibold"
                            label="Tambah Level Sekarang" href={route("intensities.create")}
                        />
                    )}
                </div>
            )}

            {intensities.last_page > 1 && (
                <div className="mt-6">
                    <Pagination links={intensities.links} />
                </div>
            )}

            <FilterModal show={showFilterModal} onClose={() => setShowFilterModal(false)} filters={currentFilters} onApply={handleApplyFilters} />
            <BulkDeleteModal show={showBulkDelete} onClose={() => setShowBulkDelete(false)} onConfirm={handleBulkDelete} count={selectedIds.length} />
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
