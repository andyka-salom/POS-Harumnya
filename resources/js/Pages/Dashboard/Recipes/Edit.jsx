import React, { useState, useMemo } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import {
    IconArrowLeft, IconDeviceFloppy, IconPlus, IconTrash, IconAlertTriangle,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ─── Type badge ───────────────────────────────────────────────────────────────
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

// ─── LRM scaling (frontend mirror) ───────────────────────────────────────────
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

        if (baseSum <= 0 || target <= 0) {
            entries.forEach(e => { result[e.idx] = 0; });
            return;
        }

        const raws       = entries.map(e => ({ idx: e.idx, raw: (e.qty / baseSum) * target }));
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

function fallbackScale(items, ingredients, targetVol) {
    const baseSum = items.reduce((s, i) => s + (parseFloat(i.base_quantity) || 0), 0);
    if (baseSum <= 0) return items.map(() => null);
    return items.map(item => {
        const qty = parseFloat(item.base_quantity) || 0;
        return Math.round((qty / baseSum) * targetVol);
    });
}

// ─── Scaling Preview ──────────────────────────────────────────────────────────
function ScalingPreview({ items, ingredients, sizeQuantities }) {
    const hasItems = items.some(i => i.ingredient_id && i.base_quantity);
    if (!hasItems) return null;

    const sizes = sizeQuantities && sizeQuantities.length > 0
        ? sizeQuantities
        : [
            { size: { volume_ml: 30, name: "30ml" }, oil_quantity: null, alcohol_quantity: null, other_quantity: null, total_volume: 30 },
            { size: { volume_ml: 50, name: "50ml" }, oil_quantity: null, alcohol_quantity: null, other_quantity: null, total_volume: 50 },
            { size: { volume_ml: 100, name: "100ml" }, oil_quantity: null, alcohol_quantity: null, other_quantity: null, total_volume: 100 },
          ];

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-2xl border border-purple-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 text-sm">🔮 Preview Scaling per Ukuran</h3>
                <span className="text-xs text-slate-400">
                    {sizeQuantities?.length > 0
                        ? "✓ Berdasarkan kalibrasi IntensitySizeQuantity (LRM)"
                        : "⚠ Estimasi (belum ada kalibrasi)"}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sizes.map((sq, si) => {
                    const isCalibrated = sq.oil_quantity != null;
                    const isBase       = (sq.size?.volume_ml) === 30;
                    const scaledQtys   = isCalibrated
                        ? lrmScale(items, ingredients, sq)
                        : fallbackScale(items, ingredients, sq.total_volume ?? sq.size?.volume_ml ?? 30);
                    const totalScaled = scaledQtys.reduce((s, q) => s + (q ?? 0), 0);

                    return (
                        <div key={si} className={`bg-white p-4 rounded-xl shadow-sm border ${
                            isBase ? "border-purple-300 ring-1 ring-purple-200" : "border-slate-100"
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-purple-600">{sq.size?.volume_ml}ml</span>
                                    {isBase && (
                                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold">Base</span>
                                    )}
                                </div>
                                <span className={`text-xs font-semibold ${isCalibrated ? "text-green-600" : "text-amber-500"}`}>
                                    {isCalibrated ? "✓ Kalibrasi" : "~ Estimasi"}
                                </span>
                            </div>

                            {/* Quota info */}
                            {isCalibrated && (
                                <div className="flex gap-1.5 mb-3 flex-wrap">
                                    {sq.oil_quantity > 0 && (
                                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100 font-medium">
                                            Oil {sq.oil_quantity}ml
                                        </span>
                                    )}
                                    {sq.alcohol_quantity > 0 && (
                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-medium">
                                            Alc {sq.alcohol_quantity}ml
                                        </span>
                                    )}
                                    {(sq.other_quantity ?? 0) > 0 && (
                                        <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                            Other {sq.other_quantity}ml
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
                                <div className="border-t pt-1.5 flex justify-between font-bold text-purple-700">
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
export default function Edit({
    variant, intensity, recipes,
    variants, intensities, ingredients,
    sizeQuantities = []   // IntensitySizeQuantity[] untuk intensity ini, dari controller
}) {
    /**
     * sizeQuantities dikirim dari RecipeController::edit() — array of:
     * { size: { id, name, volume_ml }, oil_quantity, alcohol_quantity, other_quantity, total_volume }
     */

    const { data, setData, put, processing, errors } = useForm({
        items: recipes.map(r => ({
            id:             r.id,
            ingredient_id:  r.ingredient_id,
            base_quantity:  r.base_quantity,
            unit:           r.unit,
            notes:          r.notes ?? "",
        })),
    });

    const totalVolume    = data.items.reduce((s, i) => s + (parseFloat(i.base_quantity) || 0), 0);
    const isVolumeValid  = Math.abs(totalVolume - 30) <= 0.1;
    const volumePercent  = Math.min((totalVolume / 30) * 100, 100);
    const volumeOver     = totalVolume > 30.1;

    const addItem = () =>
        setData("items", [...data.items, { ingredient_id: "", base_quantity: "", unit: "ml", notes: "" }]);

    const removeItem = (idx) => {
        if (data.items.length <= 1) return;
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

    const submit = (e) => {
        e.preventDefault();
        if (!isVolumeValid) {
            toast.error("Total volume harus tepat 30ml untuk base recipe");
            return;
        }
        put(route("recipes.update", [variant.id, intensity.id]), {
            onSuccess: () => toast.success("Formula berhasil diperbarui"),
            onError:   () => toast.error("Terjadi kesalahan, periksa kembali form"),
        });
    };

    return (
        <>
            <Head title={`Edit Formula — ${variant.name} ${intensity.code}`} />
            <div className="max-w-5xl mx-auto">
                <Link href={route("recipes.index")}
                    className="flex items-center gap-2 text-slate-500 mb-4 hover:text-primary-600 transition text-sm">
                    <IconArrowLeft size={18} /> Kembali ke Formula
                </Link>

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Edit Formula</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-600 font-semibold">{variant.name}</span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                {intensity.code}
                            </span>
                            <span className="text-slate-400 text-sm">· {intensity.name}</span>
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <IconAlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                        <p className="font-semibold mb-1">Perhatian saat mengedit formula</p>
                        <p>
                            Perubahan pada formula base (30ml) <strong>tidak otomatis</strong> mengupdate
                            product yang sudah ada. Anda perlu regenerasi product recipes secara manual jika diperlukan.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Info read-only */}
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <h2 className="font-bold text-slate-700 uppercase text-xs mb-4 pb-2 border-b tracking-wider">
                            Informasi Formula
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Varian</label>
                                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 font-semibold text-sm">
                                    {variant.name} <span className="text-slate-400 font-normal">({variant.code})</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 ml-1">Tidak dapat diubah.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Intensitas</label>
                                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 font-semibold text-sm">
                                    {intensity.name}{" "}
                                    <span className="text-slate-400 font-normal">({intensity.code})</span>
                                    <span className="ml-2 text-xs text-slate-400">
                                        Oil {intensity.oil_ratio}% · Alc {intensity.alcohol_ratio}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Ratio Guide */}
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-semibold text-blue-900 mb-2">
                                💡 Panduan Komposisi untuk {intensity.code} (30ml):
                            </p>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                                <div className="text-center">
                                    <div className="font-bold text-purple-700 text-sm">
                                        {(30 * intensity.oil_ratio / 100).toFixed(2)} ml
                                    </div>
                                    <div className="text-blue-600">Fragrance Oil</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-blue-700 text-sm">
                                        {(30 * intensity.alcohol_ratio / 100).toFixed(2)} ml
                                    </div>
                                    <div className="text-blue-600">Alcohol</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-blue-900 text-sm">30 ml</div>
                                    <div className="text-blue-600">Total</div>
                                </div>
                            </div>
                            {sizeQuantities.length > 0 ? (
                                <div className="mt-3 text-xs text-green-700 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500"/>
                                    Kalibrasi tersedia untuk {sizeQuantities.length} ukuran — scaling akurat
                                </div>
                            ) : (
                                <div className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-400"/>
                                    Kalibrasi IntensitySizeQuantity belum diset untuk intensity ini
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <div>
                                <h2 className="font-bold text-slate-700 uppercase text-sm tracking-wide">
                                    Komposisi Bahan (Base 30ml)
                                </h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-40 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${
                                            volumeOver ? "bg-red-500" : isVolumeValid ? "bg-green-500" : "bg-amber-400"
                                        }`} style={{ width: `${volumePercent}%` }} />
                                    </div>
                                    <span className={`text-xs font-semibold ${
                                        volumeOver ? "text-red-600" : isVolumeValid ? "text-green-600" : "text-amber-600"
                                    }`}>
                                        {totalVolume.toFixed(2)} / 30 ml
                                        {isVolumeValid && " ✓"}
                                        {volumeOver && " ⚠ Melebihi 30ml"}
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
                                        <div className="md:col-span-1 flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-400 bg-white w-7 h-7 rounded-full flex items-center justify-center border">
                                                {index + 1}
                                            </span>
                                        </div>
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
                                        <div className="md:col-span-1 flex items-center">
                                            {ingType && <TypeBadge type={ingType} />}
                                        </div>
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
                                        <div className="md:col-span-1 flex items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase">{item.unit}</span>
                                        </div>
                                        <div className="md:col-span-2">
                                            <input type="text" value={item.notes}
                                                onChange={e => handleItemChange(index, "notes", e.target.value)}
                                                className="w-full rounded-lg border-slate-200 text-xs"
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
                        {errors.items && <p className="text-red-500 text-sm mt-3">{errors.items}</p>}
                    </div>

                    {/* Scaling Preview */}
                    <ScalingPreview
                        items={data.items}
                        ingredients={ingredients}
                        sizeQuantities={sizeQuantities}
                    />

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pb-8">
                        <Link href={route("recipes.show", [variant.id, intensity.id])}
                            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition">
                            Batal
                        </Link>
                        <button type="submit" disabled={processing || !isVolumeValid}
                            className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                            <IconDeviceFloppy size={20} />
                            {processing ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
