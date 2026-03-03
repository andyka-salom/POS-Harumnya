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
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CONCENTRATION_PRESETS = [
    { label: "Body Mist", ratio: "1 : 4", oil: 20,   color: "text-slate-500 dark:text-slate-400",   badge: "bg-slate-100 text-slate-700" },
    { label: "EDT",       ratio: "1 : 2", oil: 33.3, color: "text-blue-600 dark:text-blue-400",     badge: "bg-blue-100 text-blue-700" },
    { label: "EDP",       ratio: "1 : 1", oil: 50,   color: "text-orange-600 dark:text-orange-400", badge: "bg-orange-100 text-orange-700" },
    { label: "Extrait",   ratio: "2 : 1", oil: 66.7, color: "text-red-600 dark:text-red-400",       badge: "bg-red-100 text-red-700" },
];

function getConcentrationInfo(oilRatio) {
    if (oilRatio >= 60) return CONCENTRATION_PRESETS[3];
    if (oilRatio >= 42) return CONCENTRATION_PRESETS[2];
    if (oilRatio >= 25) return CONCENTRATION_PRESETS[1];
    return CONCENTRATION_PRESETS[0];
}

function getRatioString(oil) {
    if (Math.abs(oil - 66.7) < 1) return "2 : 1";
    if (Math.abs(oil - 50)   < 1) return "1 : 1";
    if (Math.abs(oil - 33.3) < 1) return "1 : 2";
    if (Math.abs(oil - 20)   < 1) return "1 : 4";
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const o = Math.round(oil * 10);
    const a = Math.round((100 - oil) * 10);
    const g = gcd(o, a);
    return `${o / g} : ${a / g}`;
}

/**
 * Hitung default oil/alcohol qty berdasarkan ratio & volume
 * Menghasilkan integer yang pas (tidak desimal)
 */
function calcDefaultQty(oilRatio, volumeMl) {
    const oil     = Math.round((oilRatio / 100) * volumeMl);
    const alcohol = volumeMl - oil;
    return { oil, alcohol };
}

// ---------------------------------------------------------------------------
// SizeQuantityRow — 1 baris per ukuran botol
// ---------------------------------------------------------------------------
function SizeQuantityRow({ item, oilRatio, onChange, errors }) {
    const isValid = (item.oil_quantity + item.alcohol_quantity) === item.total_volume;
    const sum     = item.oil_quantity + item.alcohol_quantity;

    const handleAutoFill = () => {
        const { oil, alcohol } = calcDefaultQty(oilRatio, item.total_volume);
        onChange({ ...item, oil_quantity: oil, alcohol_quantity: alcohol });
    };

    return (
        <div className={`p-4 rounded-xl border-2 transition-all ${isValid ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"}`}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                        <IconRuler size={16} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {item.size_name}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">({item.total_volume} ml)</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Status indicator */}
                    {isValid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
                            <IconCheck size={14} strokeWidth={2.5} /> OK
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                            <IconAlertTriangle size={14} /> {sum} / {item.total_volume}
                        </span>
                    )}

                    {/* Auto-fill button */}
                    <button
                        type="button"
                        onClick={handleAutoFill}
                        className="text-xs px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold hover:bg-primary-200 dark:hover:bg-primary-900/70 transition-all"
                    >
                        Auto
                    </button>
                </div>
            </div>

            {/* Input fields */}
            <div className="grid grid-cols-3 gap-3">
                {/* Oil */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <IconFlask size={12} className="text-primary-600" />
                        Bibit (ml)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={item.total_volume}
                        value={item.oil_quantity}
                        onChange={e => {
                            const oil     = Math.max(0, parseInt(e.target.value) || 0);
                            const alcohol = item.total_volume - oil;
                            onChange({ ...item, oil_quantity: oil, alcohol_quantity: Math.max(0, alcohol) });
                        }}
                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                {/* Alcohol */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <IconBottle size={12} className="text-blue-600" />
                        Alkohol (ml)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={item.total_volume}
                        value={item.alcohol_quantity}
                        onChange={e => {
                            const alcohol = Math.max(0, parseInt(e.target.value) || 0);
                            const oil     = item.total_volume - alcohol;
                            onChange({ ...item, alcohol_quantity: alcohol, oil_quantity: Math.max(0, oil) });
                        }}
                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm font-bold focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                {/* Total (readonly) */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                        Total (ml)
                    </label>
                    <div className={`w-full rounded-lg border-2 px-3 py-2 text-sm font-bold text-center ${isValid ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600"}`}>
                        {item.total_volume} ml
                    </div>
                </div>
            </div>

            {/* Visual bar */}
            {isValid && item.total_volume > 0 && (
                <div className="mt-3">
                    <div className="h-2 w-full rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-primary-500 transition-all duration-300"
                            style={{ width: `${(item.oil_quantity / item.total_volume) * 100}%` }}
                        />
                        <div className="h-full bg-blue-400 flex-1" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>Bibit {((item.oil_quantity / item.total_volume) * 100).toFixed(0)}%</span>
                        <span>Alkohol {((item.alcohol_quantity / item.total_volume) * 100).toFixed(0)}%</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Form Component (dipakai di Create & Edit)
// ---------------------------------------------------------------------------
export function IntensityForm({ mode = "create", intensity = null, sizes = [], sizeQuantities = [], routeName, redirectRoute }) {
    const [ratioError, setRatioError] = useState("");

    // Inisialisasi size_quantities dari prop atau default kosong
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

    const defaultOil = intensity?.oil_ratio ?? 33.3;

    const { data, setData, post, processing, errors, reset } = useForm({
        ...(mode === "edit" ? { _method: "PUT" } : {}),
        code:                     intensity?.code ?? "",
        name:                     intensity?.name ?? "",
        oil_ratio:                defaultOil,
        alcohol_ratio:            intensity?.alcohol_ratio ?? 66.7,
        concentration_percentage: intensity?.concentration_percentage ?? defaultOil,
        sort_order:               intensity?.sort_order ?? 0,
        is_active:                intensity?.is_active ?? true,
        size_quantities:          initSizeQty,
    });

    const updateOil = useCallback((oilValue) => {
        const oil   = Math.min(99, Math.max(1, parseFloat(oilValue) || 0));
        const alkoh = parseFloat((100 - oil).toFixed(4));
        setData(prev => ({
            ...prev,
            oil_ratio:                oil,
            alcohol_ratio:            alkoh,
            concentration_percentage: oil,
        }));
        setRatioError("");
    }, []);

    const updateSizeQty = (sizeId, updated) => {
        setData("size_quantities", data.size_quantities.map(q =>
            q.size_id === sizeId ? updated : q
        ));
    };

    // Auto-fill semua size berdasarkan ratio saat ini
    const handleAutoFillAll = () => {
        setData("size_quantities", data.size_quantities.map(q => {
            const { oil, alcohol } = calcDefaultQty(data.oil_ratio, q.total_volume);
            return { ...q, oil_quantity: oil, alcohol_quantity: alcohol };
        }));
        toast.success("Semua ukuran telah diisi otomatis berdasarkan ratio");
    };

    const allValid = data.size_quantities.every(q =>
        (q.oil_quantity + q.alcohol_quantity) === q.total_volume
    );

    const submit = (e) => {
        e.preventDefault();
        const total = data.oil_ratio + data.alcohol_ratio;
        if (Math.abs(total - 100) > 0.1) {
            setRatioError(`Total ratio harus 100% (saat ini: ${total.toFixed(2)}%)`);
            toast.error("Periksa ratio bibit dan alkohol");
            return;
        }
        if (!allValid) {
            toast.error("Periksa konfigurasi volume per ukuran botol");
            return;
        }

        post(route(routeName, intensity?.id), {
            onSuccess: () => {
                toast.success(mode === "create" ? "Level Intensitas berhasil ditambahkan! 🔥" : "Intensitas berhasil diperbarui! 🚀");
                if (mode === "create") reset();
            },
            onError: () => toast.error("Terjadi kesalahan, periksa form Anda"),
        });
    };

    const info = getConcentrationInfo(data.oil_ratio);

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Sidebar: Ratio Panel ── */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sticky top-6 shadow-sm">
                        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                            Ratio Bibit : Alkohol <span className="text-red-500">*</span>
                        </label>

                        {/* Current ratio display */}
                        <div className="mb-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                            <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${info.color}`}>
                                {info.label}
                            </div>
                            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                                {getRatioString(data.oil_ratio)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">bibit : alkohol</div>
                        </div>

                        {/* Preset Buttons */}
                        <div className="grid grid-cols-2 gap-2 mb-5">
                            {CONCENTRATION_PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => updateOil(preset.oil)}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                                        info.label === preset.label
                                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                                            : "border-slate-200 dark:border-slate-700 hover:border-primary-300 text-slate-600 dark:text-slate-400"
                                    }`}
                                >
                                    <div>{preset.label}</div>
                                    <div className="text-[10px] font-medium opacity-70 mt-0.5">{preset.ratio}</div>
                                </button>
                            ))}
                        </div>

                        {/* Slider */}
                        <div className="mb-2">
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                <span>Bibit: <strong className="text-primary-600">{data.oil_ratio}%</strong></span>
                                <span>Alkohol: <strong className="text-blue-600">{parseFloat(data.alcohol_ratio.toFixed(1))}%</strong></span>
                            </div>
                            <input
                                type="range" min="1" max="99" step="0.1"
                                value={data.oil_ratio}
                                onChange={e => updateOil(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="h-3 w-full rounded-full overflow-hidden mt-2 flex">
                                <div className="h-full bg-primary-500 transition-all duration-200" style={{ width: `${data.oil_ratio}%` }} />
                                <div className="h-full bg-blue-400 flex-1" />
                            </div>
                        </div>

                        {/* Ratio Box */}
                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <IconFlask size={14} className="text-primary-600" />
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bibit Parfum</span>
                                </div>
                                <span className="text-sm font-bold text-primary-600">{data.oil_ratio}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <IconBottle size={14} className="text-blue-600" />
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Alkohol</span>
                                </div>
                                <span className="text-sm font-bold text-blue-600">{parseFloat(data.alcohol_ratio.toFixed(1))}%</span>
                            </div>
                        </div>

                        {(ratioError || errors.oil_ratio) && (
                            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <IconAlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                    {ratioError || errors.oil_ratio}
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
                                    <input type="checkbox" checked={data.is_active}
                                        onChange={e => setData("is_active", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Informasi Intensitas */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                            <div className="w-1 h-5 bg-primary-600 rounded-full" />
                            Informasi Intensitas
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Input label="Kode Intensitas"
                                value={data.code}
                                onChange={e => setData("code", e.target.value.toUpperCase())}
                                errors={errors.code}
                                placeholder="EDT"
                                required
                                helperText="Contoh: EDT, EDP, EXT"
                            />
                            <Input label="Nama Intensitas"
                                value={data.name}
                                onChange={e => setData("name", e.target.value)}
                                errors={errors.name}
                                placeholder="Eau De Toilette"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                            <Input type="number" label="Ratio Bibit (%)"
                                value={data.oil_ratio}
                                onChange={e => updateOil(e.target.value)}
                                errors={errors.oil_ratio}
                                placeholder="33.3"
                                required step="0.1" min="1" max="99"
                                helperText="Persentase bibit parfum (1–99%)"
                            />
                            <Input type="number" label="Ratio Alkohol (%)"
                                value={parseFloat(data.alcohol_ratio.toFixed(1))}
                                onChange={e => updateOil(100 - parseFloat(e.target.value || 0))}
                                errors={errors.alcohol_ratio}
                                placeholder="66.7"
                                required step="0.1" min="1" max="99"
                                helperText="Dihitung otomatis (100 − bibit)"
                            />
                        </div>

                        <div className="mt-5">
                            <Input type="number" label="Urutan Tampilan"
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
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-purple-600 rounded-full" />
                                    Volume per Ukuran Botol
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleAutoFillAll}
                                    className="text-sm px-4 py-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-200 dark:hover:bg-purple-900/70 transition-all flex items-center gap-2"
                                >
                                    <IconFlask size={16} /> Auto-fill Semua
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                                Tentukan volume bibit & alkohol (integer/ml) untuk setiap ukuran botol.
                                Jumlah harus tepat sama dengan total volume botol.
                            </p>

                            {/* Status summary */}
                            <div className={`mb-4 p-3 rounded-xl border flex items-center gap-2 text-sm font-semibold ${allValid ? "border-green-200 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400" : "border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400"}`}>
                                {allValid
                                    ? <><IconCheck size={16} strokeWidth={2.5} /> Semua ukuran sudah dikonfigurasi dengan benar</>
                                    : <><IconAlertTriangle size={16} /> Beberapa ukuran belum sesuai — oil + alcohol harus = total volume</>
                                }
                            </div>

                            <div className="space-y-4">
                                {data.size_quantities.map(item => (
                                    <SizeQuantityRow
                                        key={item.size_id}
                                        item={item}
                                        oilRatio={data.oil_ratio}
                                        onChange={(updated) => updateSizeQty(item.size_id, updated)}
                                        errors={errors}
                                    />
                                ))}
                            </div>

                            {/* Referensi standar */}
                            <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                <div className="flex gap-3">
                                    <IconDropletFilled size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-2">
                                            Referensi Standar (oil ml : alcohol ml)
                                        </p>
                                        <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs text-blue-700 dark:text-blue-300">
                                            <div className="font-bold text-blue-500 col-span-3 grid grid-cols-4 mb-1">
                                                <span>Tipe</span><span className="text-center">30ml</span><span className="text-center">50ml</span><span className="text-center">100ml</span>
                                            </div>
                                            {[
                                                { label: "EDT (1:2)", vals: ["10+20", "15+35", "35+65"] },
                                                { label: "EDP (1:1)", vals: ["15+15", "25+25", "50+50"] },
                                                { label: "EXT (2:1)", vals: ["20+10", "35+15", "65+35"] },
                                            ].map(row => (
                                                <div key={row.label} className="col-span-3 grid grid-cols-4 py-0.5 border-t border-blue-100 dark:border-blue-800">
                                                    <span className="font-semibold">{row.label}</span>
                                                    {row.vals.map((v, i) => <span key={i} className="text-center font-mono">{v}</span>)}
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
                        <Link href={route("intensities.index")}
                            className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={processing || !!ratioError || !allValid}
                            className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
                        >
                            <IconDeviceFloppy size={20} strokeWidth={2} />
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
                    <Link href={route("intensities.index")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors mb-4"
                    >
                        <IconArrowLeft size={18} strokeWidth={2} />
                        Kembali ke daftar intensitas
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tambah Level Intensitas Baru</h1>
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
