import React, { useState, useMemo } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconArrowLeft, IconTag, IconCheck, IconSearch,
    IconGenderMale, IconGenderFemale, IconUsers,
    IconDeviceFloppy, IconAlertTriangle, IconCircleCheck,
    IconX, IconSquare, IconSquareCheckFilled, IconPencilCog,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// =============================================================================
// Atoms
// =============================================================================

const GENDER_CONFIG = {
    male:   { label: "Pria",   icon: <IconGenderMale   size={11} />, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    female: { label: "Wanita", icon: <IconGenderFemale size={11} />, cls: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300" },
    unisex: { label: "Unisex", icon: <IconUsers        size={11} />, cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

function GenderBadge({ gender }) {
    const cfg = GENDER_CONFIG[gender] ?? GENDER_CONFIG.unisex;
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.cls}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

// =============================================================================
// Variant Row
// =============================================================================

function VariantRow({ variant, checked, onToggle }) {
    return (
        <label
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all select-none group ${
                checked
                    ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-600"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-200 dark:hover:border-violet-900 hover:bg-violet-50/30 dark:hover:bg-violet-900/10"
            }`}
        >
            {/* Checkbox visual */}
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                checked
                    ? "border-violet-500 bg-violet-500"
                    : "border-slate-300 dark:border-slate-600 group-hover:border-violet-400"
            }`}>
                {checked && <IconCheck size={14} strokeWidth={3} className="text-white" />}
            </div>

            {/* Avatar */}
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                {variant.image ? (
                    <img
                        src={`/storage/${variant.image}`}
                        alt={variant.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-xs font-black text-slate-400 dark:text-slate-600">
                        {variant.code.substring(0, 2).toUpperCase()}
                    </span>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{variant.name}</p>
                    <GenderBadge gender={variant.gender} />
                </div>
                <code className="text-[10px] text-violet-600 dark:text-violet-400 font-mono">
                    {variant.code}
                </code>
            </div>

            {/* State label */}
            <div className="flex-shrink-0">
                {checked ? (
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                        <IconCircleCheck size={15} strokeWidth={2.5} /> Dipilih
                    </span>
                ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-600">Tidak dipilih</span>
                )}
            </div>

            <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
        </label>
    );
}

// =============================================================================
// Variants Page
// =============================================================================

export default function Variants({ category, variants }) {
    // Initialize selected set from existing whitelist
    const [selected, setSelected] = useState(
        () => new Set(variants.filter(v => v.whitelisted && v.wl_active).map(v => v.id))
    );
    const [search, setSearch]       = useState("");
    const [gender, setGender]       = useState("");
    const [isDirty, setIsDirty]     = useState(false);
    const [saving, setSaving]       = useState(false);

    // Filtered view
    const filtered = useMemo(() => variants.filter(v => {
        const q = search.toLowerCase();
        return (
            (!q || v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)) &&
            (!gender || v.gender === gender)
        );
    }), [variants, search, gender]);

    const allFilteredSelected = filtered.length > 0 && filtered.every(v => selected.has(v.id));

    const toggle = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        setIsDirty(true);
    };

    const toggleFiltered = () => {
        setSelected(prev => {
            const next = new Set(prev);
            if (allFilteredSelected) {
                filtered.forEach(v => next.delete(v.id));
            } else {
                filtered.forEach(v => next.add(v.id));
            }
            return next;
        });
        setIsDirty(true);
    };

    const resetChanges = () => {
        setSelected(new Set(variants.filter(v => v.whitelisted && v.wl_active).map(v => v.id)));
        setIsDirty(false);
    };

    const handleSave = () => {
        setSaving(true);
        router.post(
            route("store-categories.sync-variants", category.id),
            { variant_ids: [...selected] },  // UUID — kirim as-is, jangan parseInt
            {
                onSuccess: () => {
                    toast.success("Whitelist variant berhasil disimpan! ✅");
                    setIsDirty(false);
                },
                onError: (errors) => {
                    const msg = Object.values(errors)[0] ?? "Gagal menyimpan, coba lagi";
                    toast.error(msg);
                },
                onFinish: () => setSaving(false),
            }
        );
    };

    const selectedCount = selected.size;
    const totalCount    = variants.length;
    const pct           = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;

    return (
        <>
            <Head title={`Kelola Variant — ${category.code}`} />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* ── Nav ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <Link
                        href={route("store-categories.index")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors"
                    >
                        <IconArrowLeft size={18} strokeWidth={2} /> Kembali ke Daftar
                    </Link>
                    <div className="flex items-center gap-2">
                        <Link
                            href={route("store-categories.edit", category.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            <IconPencilCog size={15} strokeWidth={2} /> Edit Kategori
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={saving || !isDirty}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            <IconDeviceFloppy size={18} strokeWidth={2} />
                            {saving ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </div>

                {/* ── Header ── */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-black text-violet-600 dark:text-violet-400">
                            {category.code}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Kelola Variant — {category.name}
                        </h1>
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                            Pilih variant yang boleh dijual di toko berkategori{" "}
                            <strong className="text-violet-600 dark:text-violet-400">{category.code}</strong>
                        </p>
                    </div>
                </div>

                {/* ── Info Banner: allow_all_variants ── */}
                {category.allow_all_variants && (
                    <div className="mb-5 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start gap-3">
                        <IconCircleCheck size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-green-800 dark:text-green-200">
                                Mode: Semua Variant Diizinkan
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                                Kategori ini mengizinkan semua variant. Whitelist di bawah tidak berpengaruh sampai
                                mode diubah ke <strong>Whitelist</strong> di{" "}
                                <Link
                                    href={route("store-categories.edit", category.id)}
                                    className="underline font-bold"
                                >
                                    Edit Kategori
                                </Link>.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Stats & Toolbar ── */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-5 shadow-sm">
                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="text-center">
                                <p className="text-3xl font-black text-violet-600 dark:text-violet-400 leading-none">
                                    {selectedCount}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mt-0.5">
                                    Dipilih
                                </p>
                            </div>
                            <span className="text-2xl text-slate-200 dark:text-slate-700">/</span>
                            <div className="text-center">
                                <p className="text-3xl font-black text-slate-400 dark:text-slate-500 leading-none">
                                    {totalCount}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mt-0.5">
                                    Total
                                </p>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="flex-1 min-w-[100px]">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                                <div
                                    className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{pct}% dipilih</p>
                        </div>

                        {isDirty && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
                                <IconAlertTriangle size={13} /> Belum disimpan
                            </span>
                        )}

                        <button
                            onClick={toggleFiltered}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all ml-auto"
                        >
                            {allFilteredSelected
                                ? <><IconSquare size={14} /> Batalkan Semua</>
                                : <><IconSquareCheckFilled size={14} /> Pilih Semua</>
                            }
                        </button>
                    </div>

                    {/* Search + Gender filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari nama atau kode variant..."
                                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <IconX size={15} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                            {[
                                { key: "",       label: "Semua" },
                                { key: "male",   label: "Pria" },
                                { key: "female", label: "Wanita" },
                                { key: "unisex", label: "Unisex" },
                            ].map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setGender(key)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                        gender === key
                                            ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {(search || gender) && (
                        <p className="text-xs text-slate-400 mt-3">
                            Menampilkan {filtered.length} dari {totalCount} variant
                        </p>
                    )}
                </div>

                {/* ── Variant List ── */}
                {filtered.length > 0 ? (
                    <div className="space-y-2">
                        {filtered.map(variant => (
                            <VariantRow
                                key={variant.id}
                                variant={variant}
                                checked={selected.has(variant.id)}
                                onToggle={() => toggle(variant.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <IconTag size={40} className="text-slate-300 dark:text-slate-700 mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                            {search || gender ? "Tidak ada variant sesuai filter" : "Tidak ada variant tersedia"}
                        </p>
                        {(search || gender) && (
                            <button
                                onClick={() => { setSearch(""); setGender(""); }}
                                className="mt-2 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                            >
                                Hapus filter
                            </button>
                        )}
                    </div>
                )}

                {/* ── Sticky Save Bar ── */}
                {isDirty && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md">
                        <div className="flex items-center justify-between gap-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3.5 rounded-2xl shadow-2xl">
                            <div>
                                <p className="text-sm font-bold">{selectedCount} variant dipilih</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    Perubahan belum disimpan
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={resetChanges}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 dark:hover:text-slate-700 transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-4 py-1.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/40"
                                >
                                    {saving ? "Menyimpan..." : "Simpan Sekarang"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

Variants.layout = (page) => <DashboardLayout children={page} />;
