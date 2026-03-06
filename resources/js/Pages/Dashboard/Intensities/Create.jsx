import React, { useState, useCallback } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconAlertCircle,
    IconFlask,
    IconBottle,
    IconRuler,
    IconCheck,
    IconAlertTriangle,
    IconDropletFilled,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const RATIO_PRESETS = [
    { label: "Body Mist", oil: 1, alcohol: 4, display: "1 : 4" },
    { label: "EDT",       oil: 1, alcohol: 2, display: "1 : 2" },
    { label: "EDP",       oil: 1, alcohol: 1, display: "1 : 1" },
    { label: "Extrait",   oil: 2, alcohol: 1, display: "2 : 1" },
];

/**
 * Hitung qty default berdasarkan ratio & volume (integer, no decimal).
 * Contoh: oil=1, alcohol=2, volume=30 → oil=10, alcohol=20
 */
function calcDefaultQty(oilParts, alcoholParts, volumeMl) {
    const total = oilParts + alcoholParts;
    if (total === 0) return { oil: 0, alcohol: volumeMl };
    const oil     = Math.round((oilParts / total) * volumeMl);
    const alcohol = volumeMl - oil;
    return { oil, alcohol };
}

function getPresetFromRatio(oil, alcohol) {
    return RATIO_PRESETS.find(p => p.oil === oil && p.alcohol === alcohol) ?? null;
}

// ---------------------------------------------------------------------------
// SizeQuantityRow
// ---------------------------------------------------------------------------
function SizeQuantityRow({ item, oilParts, alcoholParts, onChange }) {
    const isValid = (item.oil_quantity + item.alcohol_quantity) === item.total_volume;
    const sum     = item.oil_quantity + item.alcohol_quantity;

    const handleAutoFill = () => {
        const { oil, alcohol } = calcDefaultQty(oilParts, alcoholParts, item.total_volume);
        onChange({ ...item, oil_quantity: oil, alcohol_quantity: alcohol });
    };

    return (
        <div className={`p-4 rounded-xl border-2 transition-all ${
            isValid
                ? "border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-900/10"
                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
        }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                        <IconRuler size={15} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.size_name}</span>
                        <span className="text-xs text-slate-400 ml-2">({item.total_volume} ml)</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isValid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400">
                            <IconCheck size={13} strokeWidth={2.5} /> OK
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <IconAlertTriangle size={13} /> {sum}/{item.total_volume}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleAutoFill}
                        className="text-xs px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold hover:bg-teal-200 dark:hover:bg-teal-900/70 transition-all"
                    >
                        Auto
                    </button>
                </div>
            </div>

            {/* Inputs — 3 kolom */}
            <div className="grid grid-cols-3 gap-3">
                {/* Bibit */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <IconFlask size={11} className="text-teal-600" /> Bibit (ml)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={item.total_volume}
                        value={item.oil_quantity === 0 ? "" : item.oil_quantity}
                        placeholder="0"
                        onChange={e => {
                            const oil     = Math.max(0, Math.min(item.total_volume, parseInt(e.target.value) || 0));
                            const alcohol = item.total_volume - oil;
                            onChange({ ...item, oil_quantity: oil, alcohol_quantity: alcohol });
                        }}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                    />
                </div>

                {/* Alkohol */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <IconBottle size={11} className="text-cyan-600" /> Alkohol (ml)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={item.total_volume}
                        value={item.alcohol_quantity === 0 ? "" : item.alcohol_quantity}
                        placeholder="0"
                        onChange={e => {
                            const alcohol = Math.max(0, Math.min(item.total_volume, parseInt(e.target.value) || 0));
                            const oil     = item.total_volume - alcohol;
                            onChange({ ...item, alcohol_quantity: alcohol, oil_quantity: oil });
                        }}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                    />
                </div>

                {/* Total readonly */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Total (ml)</label>
                    <div className={`w-full rounded-lg border-2 px-3 py-2 text-sm font-bold text-center ${
                        isValid
                            ? "border-teal-300 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                            : "border-slate-200 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}>
                        {item.total_volume} ml
                    </div>
                </div>
            </div>

            {/* Visual bar — hanya angka ml, zero persentase */}
            {isValid && item.total_volume > 0 && (
                <div className="mt-3">
                    <div className="h-2 w-full rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-teal-500 transition-all duration-300"
                            style={{ width: `${(item.oil_quantity / item.total_volume) * 100}%` }}
                        />
                        <div className="h-full bg-cyan-300 dark:bg-cyan-600 flex-1" />
                    </div>
                    <div className="flex justify-between text-[10px] mt-1">
                        <span className="text-teal-600 font-semibold">Bibit {item.oil_quantity} ml</span>
                        <span className="text-cyan-600 font-semibold">Alkohol {item.alcohol_quantity} ml</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// IntensityForm (shared by Create & Edit)
// ---------------------------------------------------------------------------
export function IntensityForm({ mode = "create", intensity = null, sizes = [], sizeQuantities = [] }) {

    /**
     * oil_ratio & alcohol_ratio disimpan di DB sebagai angka string:
     *   oil_ratio = "1", alcohol_ratio = "2"  (untuk EDT)
     *   oil_ratio = "2", alcohol_ratio = "1"  (untuk Extrait)
     *
     * Dikirim ke server HANYA angka parts-nya:
     *   { oil_ratio: "1", alcohol_ratio: "2" }
     */
    const initOil     = intensity ? (parseInt(intensity.oil_ratio)     || 1) : 1;
    const initAlcohol = intensity ? (parseInt(intensity.alcohol_ratio)  || 2) : 2;

    const buildInitSizeQty = () => sizes.map(size => {
        const existing = sizeQuantities.find(q => q.size_id === size.id);
        return {
            size_id:          size.id,
            size_name:        size.name,      // hanya untuk display, tidak dikirim ke server
            volume_ml:        size.volume_ml, // hanya untuk display
            oil_quantity:     existing?.oil_quantity     ?? 0,
            alcohol_quantity: existing?.alcohol_quantity ?? 0,
            total_volume:     existing?.total_volume     ?? size.volume_ml,
        };
    });

    const [oilParts,     setOilParts]     = useState(initOil);
    const [alcoholParts, setAlcoholParts] = useState(initAlcohol);

    const { data, setData, post, processing, errors, reset } = useForm({
        ...(mode === "edit" ? { _method: "PUT" } : {}),
        code:            intensity?.code     ?? "",
        name:            intensity?.name     ?? "",
        // Simpan sebagai angka string saja: "1", "2", bukan "1 : 2"
        oil_ratio:       String(initOil),
        alcohol_ratio:   String(initAlcohol),
        sort_order:      intensity?.sort_order ?? 0,
        is_active:       intensity?.is_active  ?? true,
        size_quantities: buildInitSizeQty(),
    });

    // Apply ratio — update state lokal + form
    const applyRatio = useCallback((oil, alcohol) => {
        setOilParts(oil);
        setAlcoholParts(alcohol);
        setData(prev => ({
            ...prev,
            oil_ratio:     String(oil),
            alcohol_ratio: String(alcohol),
        }));
    }, [setData]);

    const handleCustomRatio = (field, value) => {
        const num        = Math.max(1, parseInt(value) || 1);
        const newOil     = field === "oil"     ? num : oilParts;
        const newAlcohol = field === "alcohol" ? num : alcoholParts;
        applyRatio(newOil, newAlcohol);
    };

    // Gunakan functional setData agar tidak stale closure
    const updateSizeQty = useCallback((sizeId, updated) => {
        setData(prev => ({
            ...prev,
            size_quantities: prev.size_quantities.map(q =>
                q.size_id === sizeId ? updated : q
            ),
        }));
    }, [setData]);

    const handleAutoFillAll = () => {
        setData(prev => ({
            ...prev,
            size_quantities: prev.size_quantities.map(q => {
                const { oil, alcohol } = calcDefaultQty(oilParts, alcoholParts, q.total_volume);
                return { ...q, oil_quantity: oil, alcohol_quantity: alcohol };
            }),
        }));
        toast.success("Semua ukuran telah diisi otomatis");
    };

    const allValid = data.size_quantities.every(q =>
        (q.oil_quantity + q.alcohol_quantity) === q.total_volume
    );

    const activePreset  = getPresetFromRatio(oilParts, alcoholParts);
    const barOilWidth   = oilParts + alcoholParts > 0
        ? (oilParts / (oilParts + alcoholParts)) * 100
        : 0;

    const routeName = mode === "create" ? "intensities.store" : "intensities.update";

    const submit = (e) => {
        e.preventDefault();
        if (sizes.length > 0 && !allValid) {
            toast.error("Periksa konfigurasi volume per ukuran botol");
            return;
        }
        post(route(routeName, intensity?.id), {
            onSuccess: () => {
                toast.success(
                    mode === "create"
                        ? "Level Intensitas berhasil ditambahkan! 🔥"
                        : "Intensitas berhasil diperbarui! 🚀"
                );
                if (mode === "create") {
                    reset();
                    setOilParts(1);
                    setAlcoholParts(2);
                }
            },
            onError: (errs) => {
                console.error(errs);
                toast.error("Terjadi kesalahan, periksa form Anda");
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Sidebar Ratio ── */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sticky top-6 shadow-sm">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                            Ratio Bibit : Alkohol <span className="text-red-500">*</span>
                        </p>

                        {/* Big ratio display */}
                        <div className="mb-4 p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 text-center">
                            {activePreset && (
                                <div className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-1">
                                    {activePreset.label}
                                </div>
                            )}
                            <div className="text-4xl font-extrabold text-teal-700 dark:text-teal-300 tracking-tight font-mono">
                                {oilParts} : {alcoholParts}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">bibit : alkohol</div>
                        </div>

                        {/* Preset buttons */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {RATIO_PRESETS.map(preset => {
                                const isActive = activePreset?.label === preset.label;
                                return (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => applyRatio(preset.oil, preset.alcohol)}
                                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                                            isActive
                                                ? "border-teal-500 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                                                : "border-slate-200 dark:border-slate-700 hover:border-teal-300 text-slate-600 dark:text-slate-400"
                                        }`}
                                    >
                                        <div>{preset.label}</div>
                                        <div className="text-[10px] font-mono opacity-70 mt-0.5">{preset.display}</div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom ratio input */}
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Custom Ratio</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] text-teal-600 font-bold block mb-1">Bibit</label>
                                    <input
                                        type="number" min="1" max="99"
                                        value={oilParts}
                                        onChange={e => handleCustomRatio("oil", e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-teal-700 dark:text-teal-300 text-center text-lg font-extrabold px-2 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                                <span className="text-slate-400 text-xl font-bold mt-4">:</span>
                                <div className="flex-1">
                                    <label className="text-[10px] text-cyan-600 font-bold block mb-1">Alkohol</label>
                                    <input
                                        type="number" min="1" max="99"
                                        value={alcoholParts}
                                        onChange={e => handleCustomRatio("alcohol", e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-cyan-700 dark:text-cyan-300 text-center text-lg font-extrabold px-2 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Visual bar — angka parts, bukan % */}
                        <div className="h-2.5 w-full rounded-full overflow-hidden flex mb-2">
                            <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${barOilWidth}%` }} />
                            <div className="h-full bg-cyan-300 dark:bg-cyan-600 flex-1" />
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-teal-600 font-semibold">Bibit {oilParts}</span>
                            <span className="text-cyan-600 font-semibold">Alkohol {alcoholParts}</span>
                        </div>

                        {(errors.oil_ratio || errors.alcohol_ratio) && (
                            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <IconAlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                    {errors.oil_ratio || errors.alcohol_ratio}
                                </p>
                            </div>
                        )}

                        {/* Status Toggle */}
                        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">Status Aktif</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Intensitas bisa digunakan</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={e => setData("is_active", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Informasi Intensitas */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                            <div className="w-1 h-5 bg-teal-500 rounded-full" />
                            Informasi Intensitas
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Input
                                label="Kode Intensitas"
                                value={data.code}
                                onChange={e => setData("code", e.target.value.toUpperCase())}
                                errors={errors.code}
                                placeholder="EDT"
                                required
                                helperText="Contoh: EDT, EDP, EXT"
                            />
                            <Input
                                label="Nama Intensitas"
                                value={data.name}
                                onChange={e => setData("name", e.target.value)}
                                errors={errors.name}
                                placeholder="Eau De Toilette"
                                required
                            />
                        </div>

                        {/* Ratio display cards — satu card saja menampilkan "bibit : alkohol" */}
                        <div className="mt-5">
                            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <IconFlask size={15} className="text-teal-600" />
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Ratio</span>
                                    </div>
                                    <div className="text-2xl font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                                        {oilParts} : {alcoholParts}
                                    </div>
                                    <span className="text-xs text-slate-400">bibit : alkohol</span>
                                    {activePreset && (
                                        <span className="ml-auto text-xs font-bold px-2 py-1 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                                            {activePreset.label}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5">
                            <Input
                                type="number"
                                label="Urutan Tampilan"
                                value={data.sort_order}
                                onChange={e => setData("sort_order", parseInt(e.target.value) || 0)}
                                errors={errors.sort_order}
                                placeholder="0"
                                required
                                helperText="Urutan tampil dari kecil ke besar"
                            />
                        </div>
                    </div>

                    {/* Volume per Ukuran Botol */}
                    {sizes.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-cyan-500 rounded-full" />
                                    Volume per Ukuran Botol
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleAutoFillAll}
                                    className="text-sm px-4 py-2 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-200 dark:hover:bg-teal-900/70 transition-all flex items-center gap-2"
                                >
                                    <IconFlask size={15} /> Auto-fill Semua
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                Masukkan volume bibit & alkohol (ml). Jumlah harus sama dengan total volume botol.
                            </p>

                            {/* Status summary */}
                            <div className={`mb-4 p-3 rounded-xl border flex items-center gap-2 text-sm font-semibold ${
                                allValid
                                    ? "border-teal-200 bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400"
                                    : "border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400"
                            }`}>
                                {allValid
                                    ? <><IconCheck size={15} strokeWidth={2.5} /> Semua ukuran sudah dikonfigurasi dengan benar</>
                                    : <><IconAlertTriangle size={15} /> Bibit + alkohol harus sama dengan total volume botol</>
                                }
                            </div>

                            <div className="space-y-4">
                                {data.size_quantities.map(item => (
                                    <SizeQuantityRow
                                        key={item.size_id}
                                        item={item}
                                        oilParts={oilParts}
                                        alcoholParts={alcoholParts}
                                        onChange={updated => updateSizeQty(item.size_id, updated)}
                                    />
                                ))}
                            </div>

                            {/* Referensi */}
                            <div className="mt-5 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl">
                                <div className="flex gap-3">
                                    <IconDropletFilled size={17} className="text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-teal-900 dark:text-teal-100 mb-2">
                                            Referensi Standar (bibit ml + alkohol ml)
                                        </p>
                                        <div className="text-xs text-teal-700 dark:text-teal-300">
                                            <div className="grid grid-cols-4 gap-x-4 font-bold mb-1 text-teal-500">
                                                <span>Tipe</span>
                                                <span className="text-center">30ml</span>
                                                <span className="text-center">50ml</span>
                                                <span className="text-center">100ml</span>
                                            </div>
                                            {[
                                                { label: "EDT (1:2)", vals: ["10+20", "17+33", "33+67"] },
                                                { label: "EDP (1:1)", vals: ["15+15", "25+25", "50+50"] },
                                                { label: "EXT (2:1)", vals: ["20+10", "33+17", "67+33"] },
                                            ].map(row => (
                                                <div key={row.label} className="grid grid-cols-4 gap-x-4 py-1 border-t border-teal-100 dark:border-teal-800">
                                                    <span className="font-semibold">{row.label}</span>
                                                    {row.vals.map((v, i) => (
                                                        <span key={i} className="text-center font-mono">{v}</span>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <Link
                            href={route("intensities.index")}
                            className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={processing || (sizes.length > 0 && !allValid)}
                            className="px-6 py-2.5 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/25"
                        >
                            <IconDeviceFloppy size={19} strokeWidth={2} />
                            <span>
                                {processing
                                    ? "Menyimpan..."
                                    : mode === "create" ? "Simpan Intensitas" : "Update Intensitas"
                                }
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}

// ---------------------------------------------------------------------------
// Create Page
// ---------------------------------------------------------------------------
export default function Create({ sizes }) {
    return (
        <>
            <Head title="Tambah Intensitas" />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-6">
                    <Link
                        href={route("intensities.index")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors mb-4"
                    >
                        <IconArrowLeft size={17} strokeWidth={2} />
                        Kembali ke daftar intensitas
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tambah Level Intensitas Baru</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Tentukan perbandingan bibit : alkohol dan volume per ukuran botol
                    </p>
                </div>

                <IntensityForm mode="create" sizes={sizes} />
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
