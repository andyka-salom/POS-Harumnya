import React, { useState, useCallback } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconAlertCircle,
    IconDropletFilled,
    IconFlask,
    IconBottle,
    IconRuler,
    IconCheck,
    IconAlertTriangle,
    IconEqual,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Preset Konsentrasi
// ---------------------------------------------------------------------------
const CONCENTRATION_PRESETS = [
    { label: "Body Mist", oilNum: 1, alcNum: 4 },
    { label: "EDT",       oilNum: 1, alcNum: 2 },
    { label: "EDP",       oilNum: 1, alcNum: 1 },
    { label: "Extrait",   oilNum: 2, alcNum: 1 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildRatioString(oil, alc) {
    return `${oil} : ${alc}`;
}

function calcDefaultQty(oilNum, alcNum, volumeMl) {
    const total = oilNum + alcNum;
    if (total === 0) return { oil: 0, alcohol: volumeMl };
    const oil     = Math.round((oilNum / total) * volumeMl);
    const alcohol = volumeMl - oil;
    return { oil, alcohol };
}

function getRatioFromString(str) {
    const parts = (str || "1 : 2").split(/\s*:\s*/);
    return {
        oilNum: parseInt(parts[0]) || 1,
        alcNum: parseInt(parts[1]) || 2,
    };
}

function getPresetLabel(oilNum, alcNum) {
    const found = CONCENTRATION_PRESETS.find(p => p.oilNum === oilNum && p.alcNum === alcNum);
    return found?.label ?? null;
}

// ---------------------------------------------------------------------------
// SizeQuantityRow
// ---------------------------------------------------------------------------
function SizeQuantityRow({ item, oilNum, alcNum, onChange }) {
    const isValid = (item.oil_quantity + item.alcohol_quantity) === item.total_volume;
    const sum     = item.oil_quantity + item.alcohol_quantity;

    const handleAutoFill = () => {
        const { oil, alcohol } = calcDefaultQty(oilNum, alcNum, item.total_volume);
        onChange({ ...item, oil_quantity: oil, alcohol_quantity: alcohol });
    };

    return (
        <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
            isValid
                ? "border-teal-200 dark:border-teal-800"
                : "border-red-200 dark:border-red-800"
        }`}>
            {/* Header baris */}
            <div className={`px-4 py-3 flex items-center justify-between ${
                isValid
                    ? "bg-teal-50 dark:bg-teal-900/20"
                    : "bg-red-50 dark:bg-red-900/20"
            }`}>
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                        <IconRuler size={14} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.size_name}</span>
                    <span className="text-xs text-slate-400 font-medium bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {item.total_volume} ml
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isValid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 rounded-lg">
                            <IconCheck size={12} strokeWidth={3} /> Sesuai
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-lg">
                            <IconAlertTriangle size={12} /> {sum}/{item.total_volume}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleAutoFill}
                        className="text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all shadow-sm"
                    >
                        Auto
                    </button>
                </div>
            </div>

            {/* Input fields */}
            <div className="p-4 bg-white dark:bg-slate-900">
                <div className="flex items-end gap-3">
                    {/* Bibit */}
                    <div className="flex-1">
                        <label className="block text-[11px] font-bold text-teal-600 dark:text-teal-400 mb-1.5 uppercase tracking-widest flex items-center gap-1">
                            <IconFlask size={11} /> Bibit (ml)
                        </label>
                        <input
                            type="number" min="0" max={item.total_volume}
                            value={item.oil_quantity}
                            onChange={e => {
                                const oil     = Math.max(0, parseInt(e.target.value) || 0);
                                const alcohol = Math.max(0, item.total_volume - oil);
                                onChange({ ...item, oil_quantity: oil, alcohol_quantity: alcohol });
                            }}
                            className="w-full rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xl font-black text-center px-3 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        />
                    </div>

                    {/* Separator */}
                    <div className="pb-3">
                        <span className="text-2xl font-black text-slate-300 dark:text-slate-600">+</span>
                    </div>

                    {/* Alkohol */}
                    <div className="flex-1">
                        <label className="block text-[11px] font-bold text-blue-500 dark:text-blue-400 mb-1.5 uppercase tracking-widest flex items-center gap-1">
                            <IconBottle size={11} /> Alkohol (ml)
                        </label>
                        <input
                            type="number" min="0" max={item.total_volume}
                            value={item.alcohol_quantity}
                            onChange={e => {
                                const alcohol = Math.max(0, parseInt(e.target.value) || 0);
                                const oil     = Math.max(0, item.total_volume - alcohol);
                                onChange({ ...item, alcohol_quantity: alcohol, oil_quantity: oil });
                            }}
                            className="w-full rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xl font-black text-center px-3 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Separator */}
                    <div className="pb-3">
                        <IconEqual size={20} className="text-slate-300 dark:text-slate-600" />
                    </div>

                    {/* Total (readonly) */}
                    <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                            Total
                        </label>
                        <div className={`w-full rounded-xl border-2 px-3 py-3 text-xl font-black text-center transition-all ${
                            isValid
                                ? "border-teal-300 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                                : "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        }`}>
                            {item.total_volume}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// IntensityForm (shared Create & Edit)
// ---------------------------------------------------------------------------
export function IntensityForm({ mode = "create", intensity = null, sizes = [], sizeQuantities = [], routeName }) {
    const initRatio = getRatioFromString(intensity?.oil_ratio ?? "1 : 2");
    const [oilNum, setOilNum] = useState(initRatio.oilNum);
    const [alcNum, setAlcNum] = useState(initRatio.alcNum);

    const initSizeQty = sizes.map(size => {
        const existing = sizeQuantities.find(q => q.size_id === size.id);
        return existing ?? {
            size_id:          size.id,
            size_name:        size.name,
            volume_ml:        size.volume_ml,
            oil_quantity:     0,
            alcohol_quantity: 0,
            total_volume:     size.volume_ml,
        };
    });

    const { data, setData, post, processing, errors, reset } = useForm({
        ...(mode === "edit" ? { _method: "PUT" } : {}),
        code:            intensity?.code          ?? "",
        name:            intensity?.name          ?? "",
        oil_ratio:       intensity?.oil_ratio     ?? "1 : 2",
        alcohol_ratio:   intensity?.alcohol_ratio ?? "2 : 1",
        sort_order:      intensity?.sort_order    ?? 0,
        is_active:       intensity?.is_active     ?? true,
        size_quantities: initSizeQty,
    });

    const handleRatioChange = useCallback((newOil, newAlc) => {
        setOilNum(newOil);
        setAlcNum(newAlc);
        setData(prev => ({
            ...prev,
            oil_ratio:     buildRatioString(newOil, newAlc),
            alcohol_ratio: buildRatioString(newAlc, newOil),
        }));
    }, []);

    const updateSizeQty = (sizeId, updated) => {
        setData("size_quantities", data.size_quantities.map(q =>
            q.size_id === sizeId ? updated : q
        ));
    };

    const handleAutoFillAll = () => {
        setData("size_quantities", data.size_quantities.map(q => {
            const { oil, alcohol } = calcDefaultQty(oilNum, alcNum, q.total_volume);
            return { ...q, oil_quantity: oil, alcohol_quantity: alcohol };
        }));
        toast.success("Semua ukuran diisi otomatis berdasarkan ratio");
    };

    const allValid = data.size_quantities.every(q =>
        (q.oil_quantity + q.alcohol_quantity) === q.total_volume
    );

    const submit = (e) => {
        e.preventDefault();
        if (!allValid) {
            toast.error("Periksa konfigurasi volume per ukuran botol");
            return;
        }
        post(route(routeName, intensity?.id), {
            onSuccess: () => {
                toast.success(mode === "create"
                    ? "Level Intensitas berhasil ditambahkan! 🔥"
                    : "Intensitas berhasil diperbarui! 🚀"
                );
                if (mode === "create") reset();
            },
            onError: () => toast.error("Terjadi kesalahan, periksa form Anda"),
        });
    };

    const presetLabel = getPresetLabel(oilNum, alcNum);

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Sidebar: Ratio Panel ── */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm sticky top-6">
                        {/* Teal header — sama dengan sidebar */}
                        <div className="bg-teal-600 px-5 py-4">
                            <p className="text-[10px] font-extrabold text-teal-200 uppercase tracking-widest mb-0.5">Konfigurasi</p>
                            <p className="text-base font-bold text-white">Ratio Bibit : Alkohol</p>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Big ratio display */}
                            <div className="text-center py-5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                {presetLabel ? (
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[11px] font-extrabold uppercase tracking-widest mb-3">
                                        {presetLabel}
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 text-[11px] font-extrabold uppercase tracking-widest mb-3">
                                        Custom
                                    </div>
                                )}
                                <div className="flex items-center justify-center gap-4">
                                    <span className="text-5xl font-black text-teal-600 dark:text-teal-400 font-mono tabular-nums leading-none">
                                        {oilNum}
                                    </span>
                                    <span className="text-3xl font-black text-slate-300 dark:text-slate-600">:</span>
                                    <span className="text-5xl font-black text-blue-500 dark:text-blue-400 font-mono tabular-nums leading-none">
                                        {alcNum}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-3 font-medium tracking-wide">bibit : alkohol</p>
                            </div>

                            {/* Input angka langsung */}
                            <div>
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Input Ratio</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-teal-600 dark:text-teal-400 mb-1.5 uppercase tracking-widest">
                                            Bibit
                                        </label>
                                        <input
                                            type="number" min="1" max="99"
                                            value={oilNum}
                                            onChange={e => handleRatioChange(Math.max(1, parseInt(e.target.value) || 1), alcNum)}
                                            className="w-full rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-3xl font-black text-center px-2 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-blue-500 dark:text-blue-400 mb-1.5 uppercase tracking-widest">
                                            Alkohol
                                        </label>
                                        <input
                                            type="number" min="1" max="99"
                                            value={alcNum}
                                            onChange={e => handleRatioChange(oilNum, Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-3xl font-black text-center px-2 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Preset chips */}
                            <div>
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">Preset Cepat</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {CONCENTRATION_PRESETS.map((preset) => {
                                        const active = oilNum === preset.oilNum && alcNum === preset.alcNum;
                                        return (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => handleRatioChange(preset.oilNum, preset.alcNum)}
                                                className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-0.5 ${
                                                    active
                                                        ? "border-teal-500 bg-teal-600 text-white shadow-md shadow-teal-500/20"
                                                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                                }`}
                                            >
                                                <span>{preset.label}</span>
                                                <span className={`font-mono text-[10px] ${active ? "text-teal-100" : "text-slate-400"}`}>
                                                    {preset.oilNum}:{preset.alcNum}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {(errors?.oil_ratio || errors?.alcohol_ratio) && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <IconAlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                        {errors.oil_ratio || errors.alcohol_ratio}
                                    </p>
                                </div>
                            )}

                            {/* Status Toggle */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">Status Aktif</span>
                                        <span className="text-xs text-slate-400">Intensitas bisa digunakan</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={e => setData("is_active", e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Informasi Intensitas */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                            <div className="w-1 h-5 bg-teal-600 rounded-full" />
                            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Informasi Intensitas</h2>
                        </div>
                        <div className="p-6 space-y-5">
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
                            <Input
                                type="number"
                                label="Urutan Tampilan"
                                value={data.sort_order}
                                onChange={e => setData("sort_order", parseInt(e.target.value) || 0)}
                                errors={errors.sort_order}
                                placeholder="0"
                                required
                                helperText="Urutan dari kecil ke besar"
                            />
                        </div>
                    </div>

                    {/* Volume per Ukuran Botol */}
                    {sizes.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-5 bg-teal-600 rounded-full" />
                                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Volume per Ukuran Botol</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAutoFillAll}
                                    className="text-xs px-4 py-2 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <IconFlask size={13} /> Auto-fill Semua
                                </button>
                            </div>

                            <div className="p-6">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    Masukkan jumlah ml bibit dan alkohol untuk setiap ukuran botol.
                                    Total keduanya harus sama dengan volume botol.
                                </p>

                                <div className={`mb-5 p-3 rounded-xl border-2 flex items-center gap-2 text-sm font-bold ${
                                    allValid
                                        ? "border-teal-200 bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400"
                                        : "border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400"
                                }`}>
                                    {allValid
                                        ? <><IconCheck size={16} strokeWidth={2.5} /> Semua ukuran sudah dikonfigurasi dengan benar</>
                                        : <><IconAlertTriangle size={16} /> Beberapa ukuran belum sesuai — bibit + alkohol harus = total volume</>
                                    }
                                </div>

                                <div className="space-y-4">
                                    {data.size_quantities.map(item => (
                                        <SizeQuantityRow
                                            key={item.size_id}
                                            item={item}
                                            oilNum={oilNum}
                                            alcNum={alcNum}
                                            onChange={(updated) => updateSizeQty(item.size_id, updated)}
                                        />
                                    ))}
                                </div>

                                {/* Referensi */}
                                <div className="mt-5 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl">
                                    <div className="flex gap-3">
                                        <IconDropletFilled size={16} className="text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-teal-800 dark:text-teal-200 mb-2.5">Referensi Standar</p>
                                            <div className="grid grid-cols-4 gap-2 text-xs">
                                                <span className="font-bold text-teal-600 dark:text-teal-400">Tipe</span>
                                                <span className="text-center font-bold text-teal-600 dark:text-teal-400">30ml</span>
                                                <span className="text-center font-bold text-teal-600 dark:text-teal-400">50ml</span>
                                                <span className="text-center font-bold text-teal-600 dark:text-teal-400">100ml</span>
                                                {[
                                                    { label: "EDT (1:2)", vals: ["10+20", "17+33", "33+67"] },
                                                    { label: "EDP (1:1)", vals: ["15+15", "25+25", "50+50"] },
                                                    { label: "EXT (2:1)", vals: ["20+10", "33+17", "67+33"] },
                                                ].map(row => (
                                                    <React.Fragment key={row.label}>
                                                        <span className="font-semibold text-teal-700 dark:text-teal-300 border-t border-teal-100 dark:border-teal-800 pt-1.5">{row.label}</span>
                                                        {row.vals.map((v, i) => (
                                                            <span key={i} className="text-center font-mono text-teal-600 dark:text-teal-400 border-t border-teal-100 dark:border-teal-800 pt-1.5">{v}</span>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </div>
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
                            className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center text-sm"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={processing || !allValid}
                            className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/30 text-sm"
                        >
                            <IconDeviceFloppy size={18} strokeWidth={2} />
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
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors mb-4"
                    >
                        <IconArrowLeft size={16} strokeWidth={2} />
                        Kembali ke daftar intensitas
                    </Link>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">Tambah Level Intensitas</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Tentukan kekuatan aroma dan volume bibit/alkohol per ukuran botol
                    </p>
                </div>

                <IntensityForm
                    mode="create"
                    sizes={sizes}
                    routeName="intensities.store"
                />
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
