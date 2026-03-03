import React, { useState, useMemo } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import {
    IconArrowLeft, IconDeviceFloppy, IconPlus, IconTrash,
    IconInfoCircle, IconFlask, IconDroplet, IconLeaf,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ─── Ingredient type badge ────────────────────────────────────────────────────
function TypeBadge({ type }) {
    const map = {
        oil:     { label: "Oil",     cls: "bg-purple-100 text-purple-700 border-purple-200" },
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
/**
 * @param {Array}  items         - data.items dari form
 * @param {Array}  ingredients   - daftar ingredient (dengan category.ingredient_type)
 * @param {Object} intensityQty  - { oil_quantity, alcohol_quantity, other_quantity }
 * @returns {Array<number>}      - scaled qty per item index
 */
function lrmScale(items, ingredients, intensityQty) {
    if (!intensityQty) return items.map(() => null);

    const targetByType = {
        oil:     intensityQty.oil_quantity     ?? 0,
        alcohol: intensityQty.alcohol_quantity ?? 0,
        other:   intensityQty.other_quantity   ?? 0,
    };

    // Kelompokkan item per type
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

        if (baseSum <= 0 || target <= 0) {
            entries.forEach(e => { result[e.idx] = 0; });
            return;
        }

        // Hitung raw
        const raws = entries.map(e => ({ idx: e.idx, raw: (e.qty / baseSum) * target }));

        // Floor + LRM
        const floors     = raws.map(r => Math.floor(r.raw));
        const totalFloor = floors.reduce((s, f) => s + f, 0);
        const remainder  = target - totalFloor;

        const sorted = raws
            .map((r, i) => ({ idx: r.idx, floor: floors[i], rem: r.raw - floors[i] }))
            .sort((a, b) => b.rem - a.rem);

        sorted.forEach((entry, i) => {
            result[entry.idx] = entry.floor + (i < remainder ? 1 : 0);
        });
    });

    return result;
}

// ─── Fallback scaling (saat intensitySizeQuantities belum ada) ────────────────
function fallbackScale(items, ingredients, targetVol) {
    const baseSum = items.reduce((s, i) => s + (parseFloat(i.base_quantity) || 0), 0);
    if (baseSum <= 0) return items.map(() => null);
    return items.map(item => {
        const qty = parseFloat(item.base_quantity) || 0;
        return Math.round((qty / baseSum) * targetVol);
    });
}

// ─── Scaling Preview Panel ────────────────────────────────────────────────────
function ScalingPreview({ items, ingredients, intensitySizeQuantities }) {
    const hasItems = items.some(i => i.ingredient_id && i.base_quantity);
    if (!hasItems) return null;

    // Ambil semua ukuran yang tersedia dari intensitySizeQuantities
    // Jika belum ada, fallback ke 30/50/100
    const sizes = intensitySizeQuantities && intensitySizeQuantities.length > 0
        ? intensitySizeQuantities
        : [
            { size: { volume_ml: 30, name: "30ml" }, oil_quantity: null, alcohol_quantity: null, other_quantity: null, total_volume: 30, is_calibrated: false },
            { size: { volume_ml: 50, name: "50ml" }, oil_quantity: null, alcohol_quantity: null, other_quantity: null, total_volume: 50, is_calibrated: false },
            { size: { volume_ml: 100, name: "100ml" }, oil_quantity: null, alcohol_quantity: null, other_quantity: null, total_volume: 100, is_calibrated: false },
          ];

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-2xl border border-purple-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    🔮 Preview Scaling per Ukuran
                </h3>
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
                        <div key={si} className={`bg-white p-4 rounded-xl shadow-sm border ${
                            isBase ? "border-purple-300 ring-1 ring-purple-200" : "border-slate-100"
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-purple-600">
                                        {sq.size?.volume_ml ?? sq.total_volume}ml
                                    </span>
                                    {isBase && (
                                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold">
                                            Base
                                        </span>
                                    )}
                                </div>
                                <span className={`text-xs font-semibold ${isCalibrated ? "text-green-600" : "text-amber-500"}`}>
                                    {isCalibrated ? "✓ Kalibrasi" : "~ Estimasi"}
                                </span>
                            </div>

                            {/* Per-type quota info */}
                            {isCalibrated && (
                                <div className="flex gap-2 mb-3 flex-wrap">
                                    {sq.oil_quantity > 0 && (
                                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100 font-medium">
                                            Oil: {sq.oil_quantity}ml
                                        </span>
                                    )}
                                    {sq.alcohol_quantity > 0 && (
                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-medium">
                                            Alcohol: {sq.alcohol_quantity}ml
                                        </span>
                                    )}
                                    {(sq.other_quantity ?? 0) > 0 && (
                                        <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                            Other: {sq.other_quantity}ml
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1.5 text-xs text-slate-600">
                                {items.map((item, idx) => {
                                    const ing = ingredients.find(i => String(i.id) === String(item.ingredient_id));
                                    if (!ing || !item.base_quantity) return null;
                                    const type = ing.category?.ingredient_type ?? "other";
                                    return (
                                        <div key={idx} className="flex justify-between items-center gap-2">
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                    type === "oil" ? "bg-purple-400" :
                                                    type === "alcohol" ? "bg-blue-400" : "bg-slate-400"
                                                }`}/>
                                                <span className="truncate text-slate-500">
                                                    {ing.name.length > 16 ? ing.name.substring(0, 16) + "…" : ing.name}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-slate-700 whitespace-nowrap">
                                                {scaledQtys[idx] ?? "—"} {item.unit}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div className="border-t pt-1.5 mt-1 flex justify-between font-bold text-purple-700">
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
    /**
     * intensitySizeQuantities: object keyed by intensity_id
     * {
     *   "uuid-intensity": [
     *     { size: { id, name, volume_ml }, oil_quantity, alcohol_quantity, other_quantity, total_volume },
     *     ...
     *   ]
     * }
     * Dikirim dari RecipeController::create()
     */

    const { data, setData, post, processing, errors } = useForm({
        variant_id:   "",
        intensity_id: "",
        items: [{ ingredient_id: "", base_quantity: "", unit: "ml", notes: "" }],
    });

    const [selectedIntensity, setSelectedIntensity] = useState(null);

    // SizeQuantities untuk intensity yang dipilih
    // intensitySizeQuantities adalah flat array, filter berdasarkan intensity_id
    const currentSizeQtys = useMemo(() => {
        if (!data.intensity_id) return [];
        return intensitySizeQuantities.filter(
            q => String(q.intensity_id) === String(data.intensity_id)
        );
    }, [data.intensity_id, intensitySizeQuantities]);

    const addItem = () =>
        setData("items", [...data.items, { ingredient_id: "", base_quantity: "", unit: "ml", notes: "" }]);

    const removeItem = (idx) => {
        const newItems = [...data.items];
        newItems.splice(idx, 1);
        setData("items", newItems);
    };

    const handleItemChange = (idx, field, val) => {
        const newItems = [...data.items];
        newItems[idx][field] = val;
        if (field === "ingredient_id") {
            const ing = ingredients.find(i => String(i.id) === String(val));
            newItems[idx].unit = ing?.unit || "ml";
        }
        setData("items", newItems);
    };

    const handleIntensityChange = (intensityId) => {
        setData("intensity_id", intensityId);
        setSelectedIntensity(intensities.find(i => String(i.id) === String(intensityId)) ?? null);
    };

    const totalVolume = data.items.reduce((s, i) => s + (parseFloat(i.base_quantity) || 0), 0);
    const isVolumeValid = Math.abs(totalVolume - 30) <= 0.1;

    // Kelompokkan volume input berdasarkan ingredient_type untuk panduan saran
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
        if (!isVolumeValid) {
            toast.error("Total volume harus tepat 30ml untuk base recipe");
            return;
        }
        post(route("recipes.store"), {
            onSuccess: () => toast.success("Base formula berhasil disimpan (30ml)"),
        });
    };

    return (
        <>
            <Head title="Buat Formula Baru" />
            <div className="max-w-5xl mx-auto">
                <Link href={route("recipes.index")}
                    className="flex items-center gap-2 text-slate-500 mb-4 hover:text-primary-600 text-sm">
                    <IconArrowLeft size={20} /> Kembali
                </Link>

                {/* Info Alert */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <IconInfoCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Base Recipe untuk 30ml</p>
                        <p>
                            Formula ini adalah base recipe untuk volume 30ml. Sistem akan otomatis
                            men-scale formula ini menggunakan <strong>IntensitySizeQuantity</strong> per
                            ingredient type (oil / alcohol / other) dengan Largest Remainder Method.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Variant & Intensity Selection */}
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <h2 className="font-bold text-slate-700 uppercase text-xs mb-4 pb-2 border-b tracking-wider">
                            Informasi Formula
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Varian *</label>
                                <select value={data.variant_id}
                                    onChange={e => setData("variant_id", e.target.value)}
                                    className="w-full rounded-xl border-slate-200" required>
                                    <option value="">Pilih Varian</option>
                                    {variants.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.name} ({v.code}) - {v.gender}
                                        </option>
                                    ))}
                                </select>
                                {errors.variant_id && <p className="text-red-500 text-xs mt-1">{errors.variant_id}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Intensitas *</label>
                                <select value={data.intensity_id}
                                    onChange={e => handleIntensityChange(e.target.value)}
                                    className="w-full rounded-xl border-slate-200" required>
                                    <option value="">Pilih Intensitas</option>
                                    {intensities.map(i => (
                                        <option key={i.id} value={i.id}>
                                            {i.name} ({i.code}) - Oil {i.oil_ratio}% : Alc {i.alcohol_ratio}%
                                        </option>
                                    ))}
                                </select>
                                {errors.intensity_id && <p className="text-red-500 text-xs mt-1">{errors.intensity_id}</p>}
                            </div>
                        </div>

                        {/* Panduan komposisi berdasarkan intensity */}
                        {selectedIntensity && (
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs font-semibold text-amber-900 mb-3">
                                    💡 Panduan Komposisi untuk 30ml ({selectedIntensity.code}):
                                </p>
                                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                                    <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-100">
                                        <div className="font-bold text-purple-700 text-base">
                                            {(30 * selectedIntensity.oil_ratio / 100).toFixed(1)} ml
                                        </div>
                                        <div className="text-purple-600 mt-0.5">Fragrance Oil</div>
                                    </div>
                                    <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                                        <div className="font-bold text-blue-700 text-base">
                                            {(30 * selectedIntensity.alcohol_ratio / 100).toFixed(1)} ml
                                        </div>
                                        <div className="text-blue-600 mt-0.5">Alcohol</div>
                                    </div>
                                    <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="font-bold text-slate-700 text-base">30 ml</div>
                                        <div className="text-slate-500 mt-0.5">Total</div>
                                    </div>
                                </div>
                                {/* Volume input saat ini per type */}
                                {(volumeByType.oil > 0 || volumeByType.alcohol > 0 || volumeByType.other > 0) && (
                                    <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-amber-200">
                                        <div className="flex justify-between items-center">
                                            <span className="text-amber-700">Oil:</span>
                                            <span className={`font-bold ${Math.abs(volumeByType.oil - (30 * selectedIntensity.oil_ratio / 100)) < 0.5 ? "text-green-700" : "text-amber-800"}`}>
                                                {volumeByType.oil.toFixed(1)} ml
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-amber-700">Alcohol:</span>
                                            <span className={`font-bold ${Math.abs(volumeByType.alcohol - (30 * selectedIntensity.alcohol_ratio / 100)) < 0.5 ? "text-green-700" : "text-amber-800"}`}>
                                                {volumeByType.alcohol.toFixed(1)} ml
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-amber-700">Other:</span>
                                            <span className="font-bold text-slate-600">
                                                {volumeByType.other.toFixed(1)} ml
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {/* Status kalibrasi */}
                                {currentSizeQtys.length > 0 ? (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
                                        <span className="w-2 h-2 rounded-full bg-green-500"/>
                                        Kalibrasi IntensitySizeQuantity tersedia untuk {currentSizeQtys.length} ukuran
                                        — preview scaling menggunakan data aktual
                                    </div>
                                ) : (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                                        <span className="w-2 h-2 rounded-full bg-amber-400"/>
                                        Kalibrasi belum diset — preview scaling akan menggunakan estimasi proporsional
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Ingredients */}
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <div>
                                <h2 className="font-bold text-slate-700 uppercase text-sm">
                                    Komposisi Bahan (Base 30ml)
                                </h2>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${
                                            totalVolume > 30.1 ? "bg-red-500" :
                                            isVolumeValid ? "bg-green-500" : "bg-amber-400"
                                        }`} style={{ width: `${Math.min((totalVolume / 30) * 100, 100)}%` }} />
                                    </div>
                                    <span className={`text-xs font-semibold ${
                                        totalVolume > 30.1 ? "text-red-600" :
                                        isVolumeValid ? "text-green-600" : "text-amber-600"
                                    }`}>
                                        {totalVolume.toFixed(2)} / 30 ml
                                        {isVolumeValid && totalVolume > 0 && " ✓"}
                                        {totalVolume > 30.1 && " ⚠ Melebihi 30ml"}
                                    </span>
                                </div>
                            </div>
                            <button type="button" onClick={addItem}
                                className="text-primary-600 font-bold text-xs flex items-center gap-1 hover:text-primary-700 px-3 py-2 hover:bg-primary-50 rounded-lg transition">
                                <IconPlus size={16} /> Tambah Bahan
                            </button>
                        </div>

                        <div className="space-y-3">
                            {data.items.map((item, index) => {
                                const selIng = ingredients.find(i => String(i.id) === String(item.ingredient_id));
                                const ingType = selIng?.category?.ingredient_type;
                                return (
                                    <div key={index}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
                                        {/* No */}
                                        <div className="md:col-span-1 flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-400 bg-white w-7 h-7 rounded-full flex items-center justify-center border">
                                                {index + 1}
                                            </span>
                                        </div>

                                        {/* Ingredient */}
                                        <div className="md:col-span-4">
                                            <select value={item.ingredient_id}
                                                onChange={e => handleItemChange(index, "ingredient_id", e.target.value)}
                                                className="w-full rounded-lg border-slate-200 text-sm" required>
                                                <option value="">Pilih Bahan Baku</option>
                                                {ingredients.map(ing => (
                                                    <option key={ing.id} value={ing.id}>
                                                        {ing.name} ({ing.code})
                                                    </option>
                                                ))}
                                            </select>
                                            {errors[`items.${index}.ingredient_id`] && (
                                                <p className="text-red-500 text-xs mt-1">{errors[`items.${index}.ingredient_id`]}</p>
                                            )}
                                        </div>

                                        {/* Type badge */}
                                        <div className="md:col-span-1 flex items-center">
                                            {ingType && <TypeBadge type={ingType} />}
                                        </div>

                                        {/* Quantity */}
                                        <div className="md:col-span-2">
                                            <input type="number" step="0.01" min="0"
                                                value={item.base_quantity}
                                                onChange={e => handleItemChange(index, "base_quantity", e.target.value)}
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                placeholder="Jumlah" required />
                                            {errors[`items.${index}.base_quantity`] && (
                                                <p className="text-red-500 text-xs mt-1">{errors[`items.${index}.base_quantity`]}</p>
                                            )}
                                        </div>

                                        {/* Unit */}
                                        <div className="md:col-span-1 flex items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase">{item.unit}</span>
                                        </div>

                                        {/* Notes */}
                                        <div className="md:col-span-2">
                                            <input type="text" value={item.notes}
                                                onChange={e => handleItemChange(index, "notes", e.target.value)}
                                                className="w-full rounded-lg border-slate-200 text-xs"
                                                placeholder="Catatan (opsional)" />
                                        </div>

                                        {/* Delete */}
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
                    <ScalingPreview
                        items={data.items}
                        ingredients={ingredients}
                        intensitySizeQuantities={currentSizeQtys}
                    />

                    {/* Submit */}
                    <div className="flex justify-end gap-3">
                        <Link href={route("recipes.index")}
                            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition">
                            Batal
                        </Link>
                        <button type="submit"
                            disabled={processing || !isVolumeValid}
                            className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                            <IconDeviceFloppy size={20} />
                            Simpan Base Formula (30ml)
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
