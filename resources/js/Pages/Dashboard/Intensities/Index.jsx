import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus, IconDatabaseOff, IconPencilCog, IconTrash,
    IconLayoutGrid, IconList, IconBolt, IconCircleCheck, IconCircleX,
    IconFilter, IconRefresh, IconX, IconCheck, IconAlertTriangle,
    IconDropletFilled, IconFlask, IconBottle, IconRuler, IconChevronDown,
    IconChevronUp,
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400">
            <IconCircleCheck size={12} strokeWidth={2.5} /> Aktif
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <IconCircleX size={12} strokeWidth={2.5} /> Nonaktif
        </span>
    );
}

// Warna badge level berdasarkan preset ratio
const LEVEL_CONFIG = {
    extreme:  { label: "Extrait",   bg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" },
    strong:   { label: "EDP",       bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
    moderate: { label: "EDT",       bg: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400" },
    light:    { label: "Body Mist", bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

function LevelBadge({ level }) {
    const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.light;
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.bg}`}>
            {cfg.label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// SizeQuantityTable (collapsible inside card)
// ---------------------------------------------------------------------------
function SizeQuantityTable({ sizeQuantities }) {
    if (!sizeQuantities || sizeQuantities.length === 0) {
        return (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <IconAlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    Belum ada konfigurasi volume
                </span>
            </div>
        );
    }
    return (
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800">
                        <th className="px-3 py-2 text-left font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Ukuran</th>
                        <th className="px-3 py-2 text-center font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider text-[10px]">Bibit</th>
                        <th className="px-3 py-2 text-center font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider text-[10px]">Alkohol</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {sizeQuantities.map((q, i) => (
                        <tr key={i} className="bg-white dark:bg-slate-900">
                            <td className="px-3 py-2">
                                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{q.volume_ml}ml</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                                <span className="font-black text-teal-600 dark:text-teal-400">{q.oil_quantity}</span>
                                <span className="text-slate-400 text-[10px] ml-0.5">ml</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                                <span className="font-black text-blue-500 dark:text-blue-400">{q.alcohol_quantity}</span>
                                <span className="text-slate-400 text-[10px] ml-0.5">ml</span>
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
    const hasQty  = intensity.size_quantities?.length > 0;
    const lvlCfg  = LEVEL_CONFIG[intensity.concentration_level] ?? LEVEL_CONFIG.light;

    return (
        <div className={`group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
            isSelected
                ? "border-teal-400 shadow-lg shadow-teal-500/10"
                : "border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-lg hover:shadow-teal-500/5"
        }`}>

            {/* ── Top color stripe based on level ── */}
            <div className={`h-1 w-full ${
                intensity.concentration_level === "extreme" ? "bg-rose-400" :
                intensity.concentration_level === "strong"  ? "bg-orange-400" :
                intensity.concentration_level === "moderate"? "bg-teal-500" :
                "bg-slate-300"
            }`} />

            {/* ── Card Header ── */}
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    {/* Checkbox */}
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onSelect(intensity.id, e.target.checked)}
                            className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 transition-all accent-teal-600"
                        />
                    </label>
                    <div className="flex items-center gap-1.5">
                        <StatusBadge isActive={intensity.is_active} />
                        <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-600">#{intensity.sort_order}</span>
                    </div>
                </div>

                {/* Name + Code */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <IconDropletFilled size={20} className="text-teal-600 dark:text-teal-400" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate leading-tight">
                            {intensity.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <code className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">{intensity.code}</code>
                            <span className="text-slate-200 dark:text-slate-700">·</span>
                            <LevelBadge level={intensity.concentration_level} />
                        </div>
                    </div>
                </div>

                {/* ── Ratio display: angka langsung, tanpa bar ── */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                        {/* Bibit */}
                        <div className="px-3 py-2.5 flex flex-col items-center bg-teal-50/50 dark:bg-teal-900/10">
                            <div className="flex items-center gap-1 mb-1">
                                <IconFlask size={11} className="text-teal-500" />
                                <span className="text-[10px] font-bold text-teal-500 uppercase tracking-widest">Bibit</span>
                            </div>
                            <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono leading-none tabular-nums">
                                {intensity.oil_ratio?.split(":")[0]?.trim() ?? intensity.oil_ratio}
                            </span>
                        </div>
                        {/* Alkohol */}
                        <div className="px-3 py-2.5 flex flex-col items-center bg-blue-50/50 dark:bg-blue-900/10">
                            <div className="flex items-center gap-1 mb-1">
                                <IconBottle size={11} className="text-blue-400" />
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Alkohol</span>
                            </div>
                            <span className="text-2xl font-black text-blue-500 dark:text-blue-400 font-mono leading-none tabular-nums">
                                {intensity.alcohol_ratio?.split(":")[0]?.trim() ?? intensity.alcohol_ratio}
                            </span>
                        </div>
                    </div>
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 text-center">
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">
                            RATIO {intensity.oil_ratio} · {intensity.alcohol_ratio}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Volume per Ukuran (collapsible) ── */}
            <div className="border-t border-slate-100 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => setShowQty(!showQty)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-center gap-1.5">
                        <IconRuler size={13} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Volume per Ukuran</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {hasQty ? (
                            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">
                                {intensity.size_quantities.length} ukuran
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                Belum diisi
                            </span>
                        )}
                        {showQty
                            ? <IconChevronUp size={14} className="text-slate-400" />
                            : <IconChevronDown size={14} className="text-slate-400" />
                        }
                    </div>
                </button>
                {showQty && (
                    <div className="px-4 pb-3">
                        <SizeQuantityTable sizeQuantities={intensity.size_quantities} />
                    </div>
                )}
            </div>

            {/* ── Actions ── */}
            <div className="mt-auto border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                <Link
                    href={route("intensities.edit", intensity.id)}
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                >
                    <IconPencilCog size={14} strokeWidth={2} /> Edit
                </Link>
                <Button
                    type="delete"
                    icon={<IconTrash size={14} strokeWidth={2} />}
                    label="Hapus"
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
                    url={route("intensities.destroy", intensity.id)}
                />
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-teal-600 px-5 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-extrabold text-teal-200 uppercase tracking-widest mb-0.5">Intensitas</p>
                        <h3 className="text-base font-bold text-white">Filter & Tampilan</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg bg-teal-700/50 hover:bg-teal-700 transition-colors">
                        <IconX size={16} className="text-white" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">Status</label>
                        <select
                            value={tempFilters.is_active}
                            onChange={(e) => setTempFilters({ ...tempFilters, is_active: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        >
                            <option value="">Semua Status</option>
                            <option value="1">Aktif</option>
                            <option value="0">Tidak Aktif</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">Per Halaman</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[12, 24, 48, 100].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setTempFilters({ ...tempFilters, per_page: n })}
                                    className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                                        Number(tempFilters.per_page) === n
                                            ? "border-teal-500 bg-teal-600 text-white"
                                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300"
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-5 pb-5">
                    <button
                        onClick={() => { const r = { is_active: "", per_page: 12 }; setTempFilters(r); onApply(r); onClose(); }}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => { onApply(tempFilters); onClose(); }}
                        className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/20"
                    >
                        Terapkan
                    </button>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                        <IconTrash size={26} className="text-red-500" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Hapus {count} Data?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Tindakan ini permanen. Data volume per ukuran juga akan ikut terhapus.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 transition-all"
                        >
                            Batal
                        </button>
                        <button onClick={onConfirm}
                            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                        >
                            Ya, Hapus
                        </button>
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
    const [viewMode, setViewMode]               = useState("grid");
    const [selectedIds, setSelectedIds]         = useState([]);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showBulkDelete, setShowBulkDelete]   = useState(false);
    const [currentFilters, setCurrentFilters]   = useState({
        is_active: filters?.is_active ?? "",
        per_page:  filters?.per_page  || 12,
    });

    const handleSelect    = (id, checked) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(s => s !== id));
    const handleSelectAll = (checked)     => setSelectedIds(checked ? intensities.data.map(i => i.id) : []);

    const handleApplyFilters = (newFilters) => {
        setCurrentFilters(newFilters);
        const clean = {};
        if (filters?.search)             clean.search    = filters.search;
        if (newFilters.is_active !== "") clean.is_active = newFilters.is_active;
        if (newFilters.per_page)         clean.per_page  = newFilters.per_page;
        router.get(route("intensities.index"), clean, { preserveState: false, replace: true });
    };

    const handleBulkDelete = () => {
        router.post(route("intensities.bulk-delete"), { ids: selectedIds }, {
            onSuccess: () => { setSelectedIds([]); setShowBulkDelete(false); toast.success(`${selectedIds.length} intensitas dihapus!`); },
            onError:   () => toast.error("Terjadi kesalahan"),
        });
    };

    const hasActiveFilters = currentFilters.is_active !== "";
    const total            = intensities.total ?? intensities.data?.length ?? 0;

    return (
        <>
            <Head title="Level Intensitas" />

            {/* ── Page Header ── */}
            <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow-md shadow-teal-500/30">
                            <IconBolt size={18} className="text-white" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Level Intensitas</h1>
                    </div>
                    <div className="flex items-center gap-2 ml-12">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                            {total} level terdaftar
                        </span>
                        {selectedIds.length > 0 && (
                            <>
                                <span className="text-slate-300 dark:text-slate-700">·</span>
                                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                                    {selectedIds.length} dipilih
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <Button
                    type="link"
                    icon={<IconCirclePlus size={18} strokeWidth={2.5} />}
                    className="bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/30 font-bold text-sm px-5 py-2.5 rounded-xl transition-all"
                    label="Tambah Level"
                    href={route("intensities.create")}
                />
            </div>

            {/* ── Toolbar ── */}
            <div className="mb-5 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="w-full sm:w-80">
                        <Search url={route("intensities.index")} placeholder="Cari nama atau kode..." />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.reload({ only: ["intensities"] })}
                            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 transition-colors"
                            title="Refresh"
                        >
                            <IconRefresh size={18} strokeWidth={2} />
                        </button>
                        <button
                            onClick={() => setShowFilterModal(true)}
                            className={`p-2.5 rounded-xl transition-colors relative ${
                                hasActiveFilters
                                    ? "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600"
                            }`}
                        >
                            <IconFilter size={18} strokeWidth={2} />
                            {hasActiveFilters && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-600 rounded-full border-2 border-white dark:border-slate-900" />
                            )}
                        </button>
                        {/* View toggle */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
                            {[
                                ["grid", <IconLayoutGrid size={16} strokeWidth={2} />],
                                ["list", <IconList size={16} strokeWidth={2} />],
                            ].map(([mode, icon]) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`p-2 rounded-lg transition-all ${
                                        viewMode === mode
                                            ? "bg-white dark:bg-slate-900 text-teal-600 shadow-sm"
                                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bulk action bar */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-teal-600 flex items-center justify-center">
                                <IconCheck size={12} className="text-white" strokeWidth={3} />
                            </div>
                            <span className="text-sm font-bold text-teal-800 dark:text-teal-200">
                                {selectedIds.length} dipilih
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => setShowBulkDelete(true)}
                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <IconTrash size={13} strokeWidth={2} /> Hapus {selectedIds.length}
                            </button>
                        </div>
                    </div>
                )}

                {/* Active filter tag */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filter:</span>
                        {currentFilters.is_active !== "" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold">
                                {currentFilters.is_active === "1" ? "Aktif" : "Tidak Aktif"}
                                <button
                                    onClick={() => handleApplyFilters({ ...currentFilters, is_active: "" })}
                                    className="hover:text-teal-900 transition-colors"
                                >
                                    <IconX size={11} strokeWidth={3} />
                                </button>
                            </span>
                        )}
                        <button
                            onClick={() => handleApplyFilters({ is_active: "", per_page: 12 })}
                            className="text-[11px] font-bold text-red-500 hover:underline"
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            {intensities.data.length > 0 ? (
                viewMode === "grid" ? (
                    <>
                        {/* Select all */}
                        <div className="mb-3">
                            <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === intensities.data.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 accent-teal-600"
                                />
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    Pilih Semua ({intensities.data.length})
                                </span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {intensities.data.map((intensity) => (
                                <IntensityCard
                                    key={intensity.id}
                                    intensity={intensity}
                                    isSelected={selectedIds.includes(intensity.id)}
                                    onSelect={handleSelect}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    /* ── List / Table View ── */
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                                        <th className="px-4 py-3.5 text-left w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === intensities.data.length}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 accent-teal-600"
                                            />
                                        </th>
                                        {["No", "Level", "Ratio", "Konsentrasi", "Volume", "Status", "Urutan", "Aksi"].map(h => (
                                            <th key={h} className={`px-4 py-3.5 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest ${
                                                h === "Aksi" ? "text-right" :
                                                ["Status","Urutan","Konsentrasi"].includes(h) ? "text-center" : "text-left"
                                            }`}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {intensities.data.map((intensity, i) => (
                                        <tr key={intensity.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                                            <td className="px-4 py-3.5">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(intensity.id)}
                                                    onChange={(e) => handleSelect(intensity.id, e.target.checked)}
                                                    className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 accent-teal-600"
                                                />
                                            </td>
                                            <td className="px-4 py-3.5 text-xs font-bold text-slate-400 tabular-nums">
                                                {i + 1 + (intensities.current_page - 1) * intensities.per_page}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 flex items-center justify-center flex-shrink-0">
                                                        <IconDropletFilled size={14} className="text-teal-600 dark:text-teal-400" strokeWidth={1.5} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{intensity.name}</p>
                                                        <code className="text-[10px] font-bold text-slate-400 font-mono">{intensity.code}</code>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                                                        <IconFlask size={11} className="text-teal-500" />
                                                        <span className="text-sm font-black text-teal-600 dark:text-teal-400 font-mono tabular-nums">
                                                            {intensity.oil_ratio?.split(":")[0]?.trim()}
                                                        </span>
                                                    </div>
                                                    <span className="text-slate-300 dark:text-slate-700 font-bold">:</span>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                                        <IconBottle size={11} className="text-blue-400" />
                                                        <span className="text-sm font-black text-blue-500 dark:text-blue-400 font-mono tabular-nums">
                                                            {intensity.alcohol_ratio?.split(":")[0]?.trim()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <LevelBadge level={intensity.concentration_level} />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {intensity.size_quantities?.length > 0 ? (
                                                    <div className="space-y-0.5">
                                                        {intensity.size_quantities.map((q, qi) => (
                                                            <div key={qi} className="flex items-center gap-1.5 text-xs">
                                                                <span className="font-bold text-slate-500 dark:text-slate-400 w-9 font-mono">{q.volume_ml}ml</span>
                                                                <span className="font-black text-teal-600 dark:text-teal-400">{q.oil_quantity}</span>
                                                                <span className="text-slate-300 dark:text-slate-700">+</span>
                                                                <span className="font-black text-blue-500 dark:text-blue-400">{q.alcohol_quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-amber-500 font-bold flex items-center gap-1">
                                                        <IconAlertTriangle size={11} /> Belum diisi
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <StatusBadge isActive={intensity.is_active} />
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="text-xs font-black text-slate-400 font-mono">#{intensity.sort_order}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex justify-end gap-1.5">
                                                    <Link
                                                        href={route("intensities.edit", intensity.id)}
                                                        className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-100 dark:border-teal-800 transition-all"
                                                    >
                                                        <IconPencilCog size={15} strokeWidth={2} />
                                                    </Link>
                                                    <Button
                                                        type="delete"
                                                        icon={<IconTrash size={15} strokeWidth={2} />}
                                                        className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-800 transition-all"
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
                /* ── Empty State ── */
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 flex items-center justify-center mb-4">
                        <IconDatabaseOff size={28} className="text-teal-400 dark:text-teal-600" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-1">
                        {filters?.search ? "Tidak Ada Hasil" : "Belum Ada Level"}
                    </h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 text-center max-w-xs">
                        {filters?.search
                            ? `Tidak ditemukan untuk "${filters.search}"`
                            : "Mulai dengan menambahkan level intensitas pertama"
                        }
                    </p>
                    {!filters?.search && (
                        <Button
                            type="link"
                            icon={<IconCirclePlus size={16} strokeWidth={2.5} />}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-teal-500/20 transition-all"
                            label="Tambah Level"
                            href={route("intensities.create")}
                        />
                    )}
                </div>
            )}

            {/* Pagination */}
            {intensities.last_page > 1 && (
                <div className="mt-5">
                    <Pagination links={intensities.links} />
                </div>
            )}

            <FilterModal
                show={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                filters={currentFilters}
                onApply={handleApplyFilters}
            />
            <BulkDeleteModal
                show={showBulkDelete}
                onClose={() => setShowBulkDelete(false)}
                onConfirm={handleBulkDelete}
                count={selectedIds.length}
            />
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
