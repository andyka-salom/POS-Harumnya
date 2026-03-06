import React, { useState, useMemo } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import {
    IconArrowLeft, IconDeviceFloppy, IconPlus, IconTrash,
    IconInfoCircle, IconFlask,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ─── Ingredient type badge ────────────────────────────────────────────────────
function TypeBadge({ type }) {
    const map = {
        oil:     { label: "Oil",     cls: "bg-teal-100 text-teal-700 border-teal-200" },
        alcohol: { label: "Alcohol", cls: "bg-blue-100 text-blue-700 border-blue-200" },
        other:   { label: "Other",   cls: "bg-slate-100 text-slate-600 border-slate-200" },
    };
    const t = map[type] ?? map.other;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${t.cls}`}>
            {t.label}
        </span>
    );
}

// ─── LRM scaling (frontend mirror dari VariantRecipe::scaleCollection) ────────
function lrmScale(items, ingredients, intensityQty) {
    if (!intensityQty) return items.map(() => null);
    const targetByType = {
        oil:     intensityQty.oil_quantity     ?? 0,
        alcohol: intensityQty.alcohol_quantity ?? 0,
        other:   intensityQty.other_quantity   ?? 0,
    };
    const groups = {};
    items.forEach((item, idx) => {
        const ing  = ingredients.find(i => String(i.id) === String(item.ingredient_id));
        const type = ing?.category?.ingredient_type ?? "other";
        if (!groups[type]) groups[type] = [];
        groups[type].push({ idx, qty: parseFloat(item.base_quantity) || 0 });
    });
    const result = Array(items.length).fill(null);
    Object.entries(groups).forEach(([type, entries]) => {
        const target  = targetByType[type] ?? 0;
        const baseSum = entries.reduce((s, e) => s + e.qty, 0);
        if (baseSum <= 0 || target <= 0) { entries.forEach(e => { result[e.idx] = 0; }); return; }
        const raws       = entries.map(e => ({ idx: e.idx, raw: (e.qty / baseSum) * target }));
        const floors     = raws.map(r => Math.floor(r.raw));
        const totalFloor = floors.reduce((s, f) => s + f, 0);
        const remainder  = target - totalFloor;
        const sorted     = raws.map((r, i) => ({ idx: r.idx, floor: floors[i], rem: r.raw - floors[i] })).sort((a, b) => b.rem - a.rem);
        sorted.forEach((entry, i) => { result[entry.idx] = entry.floor + (i < remainder ? 1 : 0); });
    });
    return result;
}

function fallbackScale(items, ingredients, targetVol) {
    const baseSum = items.reduce((s, i) => s + (parseFloat(i.base_quantity) || 0), 0);
    if (baseSum <= 0) return items.map(() => null);
    return items.map(item => Math.round(((parseFloat(item.base_quantity) || 0) / baseSum) * targetVol));
}

// ─── Scaling Preview Panel ────────────────────────────────────────────────────
function ScalingPreview({ items, ingredients, intensitySizeQuantities }) {
    const hasItems = items.some(i => i.ingredient_id && i.base_quantity);
    if (!hasItems) return null;

    const sizes = intensitySizeQuantities && intensitySizeQuantities.length > 0
        ? intensitySizeQuantities
        : [
            { size: { volume_ml: 30, name: "30ml" }, oil_quantity: null, alcohol_quantity: null, other_quantity: null, total_volume: 30 },
            { size: { volume_ml: 50, name: "50ml" }, oil_quantity: null, alcohol_quantity: null, other_quantity: null, total_volume: 50 },
            { size: { volume_ml: 100, name: "100ml" }, oil_quantity: null, alcohol_quantity: null, other_quantity: null, total_volume: 100 },
          ];

    return (
        <div className="bg-teal-50 dark:bg-teal-950/20 p-6 rounded-2xl border border-teal-200 dark:border-teal-900">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">🔮 Preview Scaling per Ukuran</h3>
                <span className="text-xs text-slate-400">
                    {intensitySizeQuantities?.length > 0
                        ? "✓ Berdasarkan kalibrasi IntensitySizeQuantity (LRM)"
                        : "⚠ Menggunakan estimasi (belum ada kalibrasi)"}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sizes.map((sq, si) => {
                    const isCalibrated = sq.oil_quantity != null;
                    const scaledQtys   = isCalibrated
                        ? lrmScale(items, ingredients, sq)
                        : fallbackScale(items, ingredients, sq.total_volume ?? sq.size?.volume_ml ?? 30);
                    const totalScaled = scaledQtys.reduce((s, q) => s + (q ?? 0), 0);
                    const isBase      = (sq.size?.volume_ml ?? sq.total_volume) === 30;

                    return (
                        <div key={si} className={`bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border ${
                            isBase ? "border-teal-300 ring-1 ring-teal-200" : "border-slate-100 dark:border-slate-800"
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-teal-600">{sq.size?.volume_ml ?? sq.total_volume}ml</span>
                                    {isBase && (
                                        <span className="text-xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full font-semibold">Base</span>
                                    )}
                                </div>
                                <span className={`text-xs font-semibold ${isCalibrated ? "text-emerald-600" : "text-amber-500"}`}>
                                    {isCalibrated ? "✓ Kalibrasi" : "~ Estimasi"}
                                </span>
                            </div>

                            {isCalibrated && (
                                <div className="flex gap-2 mb-3 flex-wrap">
                                    {sq.oil_quantity > 0 && (
                                        <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-100 font-medium">Oil: {sq.oil_quantity}ml</span>
                                    )}
                                    {sq.alcohol_quantity > 0 && (
                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-medium">Alc: {sq.alcohol_quantity}ml</span>
                                    )}
                                    {(sq.other_quantity ?? 0) > 0 && (
                                        <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-medium">Other: {sq.other_quantity}ml</span>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                                {items.map((item, idx) => {
                                    const ing = ingredients.find(i => String(i.id) === String(item.ingredient_id));
                                    if (!ing || !item.base_quantity) return null;
                                    const type = ing.category?.ingredient_type ?? "other";
                                    return (
                                        <div key={idx} className="flex justify-between items-center gap-2">
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                    type === "oil" ? "bg-teal-400" : type === "alcohol" ? "bg-blue-400" : "bg-slate-400"
                                                }`} />
                                                <span className="truncate text-slate-500">
                                                    {ing.name.length > 16 ? ing.name.substring(0, 16) + "…" : ing.name}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {scaledQtys[idx] ?? "—"} {item.unit}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div className="border-t border-teal-100 pt-1.5 mt-1 flex justify-between font-bold text-teal-700">
                                    <span>Total:</span>
                                    <span>{totalScaled} ml</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Create({ variants, intensities, ingredients, intensitySizeQuantities = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        variant_id:   "",
        intensity_id: "",
        items: [{ ingredient_id: "", base_quantity: "", unit: "ml", notes: "" }],
    });

    const [selectedIntensity, setSelectedIntensity] = useState(null);

    const currentSizeQtys = useMemo(() => {
        if (!data.intensity_id) return [];
        return intensitySizeQuantities.filter(q => String(q.intensity_id) === String(data.intensity_id));
    }, [data.intensity_id, intensitySizeQuantities]);

    const addItem    = () => setData("items", [...data.items, { ingredient_id: "", base_quantity: "", unit: "ml", notes: "" }]);
    const removeItem = (idx) => { const n = [...data.items]; n.splice(idx, 1); setData("items", n); };

    const handleItemChange = (idx, field, val) => {
        const n = [...data.items];
        n[idx][field] = val;
        if (field === "ingredient_id") {
            const ing = ingredients.find(i => String(i.id) === String(val));
            n[idx].unit = ing?.unit || "ml";
        }
        setData("items", n);
    };

    const handleIntensityChange = (id) => {
        setData("intensity_id", id);
        setSelectedIntensity(intensities.find(i => String(i.id) === String(id)) ?? null);
    };

    const totalVolume   = data.items.reduce((s, i) => s + (parseFloat(i.base_quantity) || 0), 0);
    const isVolumeValid = Math.abs(totalVolume - 30) <= 0.1;

    const volumeByType = useMemo(() => {
        const result = { oil: 0, alcohol: 0, other: 0 };
        data.items.forEach(item => {
            const ing  = ingredients.find(i => String(i.id) === String(item.ingredient_id));
            const type = ing?.category?.ingredient_type ?? "other";
            result[type] += parseFloat(item.base_quantity) || 0;
        });
        return result;
    }, [data.items, ingredients]);

    const submit = (e) => {
        e.preventDefault();
        if (!isVolumeValid) { toast.error("Total volume harus tepat 30ml untuk base recipe"); return; }
        post(route("recipes.store"), { onSuccess: () => toast.success("Base formula berhasil disimpan (30ml)") });
    };

    return (
        <>
            <Head title="Buat Formula Baru" />
            <div className="max-w-5xl mx-auto px-4 py-6">
                <Link href={route("recipes.index")}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 mb-5 font-medium transition-colors">
                    <IconArrowLeft size={16} /> Kembali ke Formula
                </Link>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl text-teal-600">
                        <IconFlask size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Buat Formula Baru</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Base recipe 30ml — akan di-scale otomatis ke semua ukuran</p>
                    </div>
                </div>

                {/* Info alert */}
                <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <IconInfoCircle size={20} className="text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-teal-900 dark:text-teal-300">
                        <p className="font-semibold mb-1">Base Recipe untuk 30ml</p>
                        <p className="text-teal-800 dark:text-teal-400">
                            Formula ini adalah base recipe untuk volume 30ml. Sistem akan otomatis
                            men-scale formula ini menggunakan <strong>IntensitySizeQuantity</strong> per
                            ingredient type (oil / alcohol / other) dengan Largest Remainder Method.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Variant & Intensity */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h2 className="font-bold text-slate-700 dark:text-white uppercase text-xs mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 tracking-wider">
                            Informasi Formula
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Varian *</label>
                                <select value={data.variant_id} onChange={e => setData("variant_id", e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm px-3 h-10 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                                    required>
                                    <option value="">Pilih Varian</option>
                                    {variants.map(v => <option key={v.id} value={v.id}>{v.name} ({v.code}) - {v.gender}</option>)}
                                </select>
                                {errors.variant_id && <p className="text-red-500 text-xs mt-1">{errors.variant_id}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Intensitas *</label>
                                <select value={data.intensity_id} onChange={e => handleIntensityChange(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm px-3 h-10 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                                    required>
                                    <option value="">Pilih Intensitas</option>
                                    {intensities.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code}) - Oil {i.oil_ratio}% : Alc {i.alcohol_ratio}%</option>)}
                                </select>
                                {errors.intensity_id && <p className="text-red-500 text-xs mt-1">{errors.intensity_id}</p>}
                            </div>
                        </div>

                        {selectedIntensity && (
                            <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 rounded-xl">
                                <p className="text-xs font-semibold text-teal-900 dark:text-teal-300 mb-3">
                                    💡 Panduan Komposisi untuk 30ml ({selectedIntensity.code}):
                                </p>
                                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                                    <div className="text-center p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-800">
                                        <div className="font-bold text-teal-700 dark:text-teal-400 text-base">{(30 * selectedIntensity.oil_ratio / 100).toFixed(1)} ml</div>
                                        <div className="text-teal-600 dark:text-teal-500 mt-0.5">Fragrance Oil</div>
                                    </div>
                                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                                        <div className="font-bold text-blue-700 dark:text-blue-400 text-base">{(30 * selectedIntensity.alcohol_ratio / 100).toFixed(1)} ml</div>
                                        <div className="text-blue-600 dark:text-blue-500 mt-0.5">Alcohol</div>
                                    </div>
                                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="font-bold text-slate-700 dark:text-slate-300 text-base">30 ml</div>
                                        <div className="text-slate-500 mt-0.5">Total</div>
                                    </div>
                                </div>
                                {(volumeByType.oil > 0 || volumeByType.alcohol > 0 || volumeByType.other > 0) && (
                                    <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-teal-200 dark:border-teal-800">
                                        {[
                                            { label: "Oil:",     val: volumeByType.oil,     target: 30 * selectedIntensity.oil_ratio / 100,     color: "text-teal-700 dark:text-teal-400" },
                                            { label: "Alcohol:", val: volumeByType.alcohol, target: 30 * selectedIntensity.alcohol_ratio / 100, color: "text-blue-700 dark:text-blue-400" },
                                            { label: "Other:",   val: volumeByType.other,   target: null,                                        color: "text-slate-600 dark:text-slate-400" },
                                        ].map(({ label, val, target, color }) => (
                                            <div key={label} className="flex justify-between items-center">
                                                <span className="text-slate-500">{label}</span>
                                                <span className={`font-bold ${target !== null && Math.abs(val - target) < 0.5 ? "text-emerald-700" : color}`}>
                                                    {val.toFixed(1)} ml
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className={`mt-3 flex items-center gap-2 text-xs ${currentSizeQtys.length > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-600"}`}>
                                    <span className={`w-2 h-2 rounded-full ${currentSizeQtys.length > 0 ? "bg-emerald-500" : "bg-amber-400"}`} />
                                    {currentSizeQtys.length > 0
                                        ? `Kalibrasi IntensitySizeQuantity tersedia untuk ${currentSizeQtys.length} ukuran`
                                        : "Kalibrasi belum diset — preview scaling akan menggunakan estimasi proporsional"}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ingredients */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div>
                                <h2 className="font-bold text-slate-700 dark:text-white uppercase text-sm">Komposisi Bahan (Base 30ml)</h2>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${
                                            totalVolume > 30.1 ? "bg-red-500" : isVolumeValid ? "bg-teal-500" : "bg-amber-400"
                                        }`} style={{ width: `${Math.min((totalVolume / 30) * 100, 100)}%` }} />
                                    </div>
                                    <span className={`text-xs font-semibold ${
                                        totalVolume > 30.1 ? "text-red-600" : isVolumeValid ? "text-teal-600" : "text-amber-600"
                                    }`}>
                                        {totalVolume.toFixed(2)} / 30 ml
                                        {isVolumeValid && totalVolume > 0 && " ✓"}
                                        {totalVolume > 30.1 && " ⚠ Melebihi 30ml"}
                                    </span>
                                </div>
                            </div>
                            <button type="button" onClick={addItem}
                                className="text-teal-600 font-bold text-xs flex items-center gap-1 hover:text-teal-700 px-3 py-2 hover:bg-teal-50 rounded-lg transition">
                                <IconPlus size={16} /> Tambah Bahan
                            </button>
                        </div>

                        <div className="space-y-3">
                            {data.items.map((item, index) => {
                                const selIng  = ingredients.find(i => String(i.id) === String(item.ingredient_id));
                                const ingType = selIng?.category?.ingredient_type;
                                return (
                                    <div key={index}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                        <div className="md:col-span-1 flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-400 bg-white dark:bg-slate-900 w-7 h-7 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                                {index + 1}
                                            </span>
                                        </div>
                                        <div className="md:col-span-4">
                                            <select value={item.ingredient_id}
                                                onChange={e => handleItemChange(index, "ingredient_id", e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm px-3 h-9 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                                required>
                                                <option value="">Pilih Bahan Baku</option>
                                                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.code})</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-1 flex items-center">
                                            {ingType && <TypeBadge type={ingType} />}
                                        </div>
                                        <div className="md:col-span-2">
                                            <input type="number" step="0.01" min="0" value={item.base_quantity}
                                                onChange={e => handleItemChange(index, "base_quantity", e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm px-3 h-9 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                                placeholder="Jumlah" required />
                                        </div>
                                        <div className="md:col-span-1 flex items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase">{item.unit}</span>
                                        </div>
                                        <div className="md:col-span-2">
                                            <input type="text" value={item.notes}
                                                onChange={e => handleItemChange(index, "notes", e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-xs px-3 h-9 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                                placeholder="Catatan (opsional)" />
                                        </div>
                                        <div className="md:col-span-1 flex items-center justify-center">
                                            {data.items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(index)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                    <IconTrash size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {errors.items && <p className="text-red-500 text-sm mt-2">{errors.items}</p>}
                    </div>

                    {/* Scaling Preview */}
                    <ScalingPreview items={data.items} ingredients={ingredients} intensitySizeQuantities={currentSizeQtys} />

                    {/* Submit */}
                    <div className="flex justify-end gap-3">
                        <Link href={route("recipes.index")}
                            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                            Batal
                        </Link>
                        <button type="submit" disabled={processing || !isVolumeValid}
                            className="px-10 py-3 bg-teal-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-teal-500/30 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                            <IconDeviceFloppy size={20} /> Simpan Base Formula (30ml)
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
