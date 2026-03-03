import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconAdjustments,
    IconPlus, IconTrash, IconLock, IconTrendingUp, IconTrendingDown,
    IconRefresh, IconSearch, IconX, IconChevronDown,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

const fmt    = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parseInt(n) || 0);
const fmtQty = (n) => parseInt(n || 0).toLocaleString("id-ID");

// ─── SearchSelect ─────────────────────────────────────────────────────────────
function SearchSelect({ options, value, onChange, placeholder = "Cari...", renderOption, disabled = false }) {
    const [open,  setOpen]  = useState(false);
    const [query, setQuery] = useState("");
    const ref               = useRef(null);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = useMemo(() =>
        query.trim() === "" ? options
            : options.filter((o) => renderOption(o).toLowerCase().includes(query.toLowerCase())),
        [options, query]
    );
    const selected = options.find((o) => String(o.id) === String(value));
    const handleSelect = (id) => { onChange(id); setOpen(false); setQuery(""); };

    return (
        <div ref={ref} className="relative">
            <button type="button" disabled={disabled}
                onClick={() => { setOpen((v) => !v); setQuery(""); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors
                    ${disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                    : open ? "border-orange-400 ring-2 ring-orange-100 bg-white dark:bg-slate-950"
                    : "border-slate-200 bg-white dark:bg-slate-950 hover:border-slate-300"}`}>
                <span className={selected ? "text-slate-800 dark:text-slate-200 font-medium truncate" : "text-slate-400"}>
                    {selected ? renderOption(selected) : placeholder}
                </span>
                {value && !disabled
                    ? <IconX size={14} className="text-slate-400 shrink-0 hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); onChange(""); }} />
                    : <IconChevronDown size={14} className="text-slate-400 shrink-0" />}
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <IconSearch size={13} className="text-slate-400 shrink-0" />
                            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ketik untuk mencari..."
                                className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300" />
                            {query && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery("")}>
                                <IconX size={12} className="text-slate-400" />
                            </button>}
                        </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                        {filtered.length === 0
                            ? <p className="px-4 py-3 text-xs text-slate-400 text-center">Tidak ditemukan</p>
                            : filtered.map((o) => (
                                <button key={o.id} type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelect(o.id)}
                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                                        ${String(o.id) === String(value)
                                            ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 font-bold"
                                            : "text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"}`}>
                                    {renderOption(o)}
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Edit({ adjustment, warehouses, stores, ingredients, packagingMaterials, typeOptions }) {
    const { data, setData, put, processing, errors } = useForm({
        adjustment_date: adjustment.adjustment_date?.split("T")[0] ?? adjustment.adjustment_date,
        type:            adjustment.type,
        notes:           adjustment.notes ?? "",
        items: adjustment.items?.map((i) => ({
            item_type:         i.item_type,
            item_id:           i.item_id,
            // cast to integer on load — matches schema
            system_quantity:   parseInt(i.system_quantity)   || 0,
            physical_quantity: parseInt(i.physical_quantity) || "",
            unit_cost:         parseFloat(i.unit_cost)       || 0.0,
            notes:             i.notes ?? "",
        })) ?? [],
    });

    const [refreshing, setRefreshing] = useState({});

    const allItems = useMemo(() => [
        ...ingredients.map((i)       => ({ ...i, _type: "ingredient" })),
        ...packagingMaterials.map((p) => ({ ...p, _type: "packaging_material" })),
    ], [ingredients, packagingMaterials]);

    const usedItemIds = data.items.map((i) => i.item_id).filter(Boolean);

    // Integer difference
    const getDifference = (item) => (parseInt(item.physical_quantity) || 0) - (parseInt(item.system_quantity) || 0);

    const updateItem = (idx, key, value) =>
        setData("items", data.items.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));

    const addItem    = () => setData("items", [...data.items, { item_type: "ingredient", item_id: "", system_quantity: 0, physical_quantity: "", unit_cost: 0.0, notes: "" }]);
    const removeItem = (idx) => setData("items", data.items.filter((_, i) => i !== idx));

    // Refresh system qty from AJAX (integer qty, float avg_cost)
    const refreshSystemQty = useCallback(async (idx) => {
        const item = data.items[idx];
        if (!item.item_id) return;
        setRefreshing((r) => ({ ...r, [idx]: true }));
        try {
            const res = await fetch(route("stock-adjustments.current-stock"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content || "",
                },
                body: JSON.stringify({
                    location_type: adjustment.location_type,
                    location_id:   adjustment.location_id,
                    item_type:     item.item_type,
                    item_id:       item.item_id,
                }),
            });
            const json = await res.json();
            setData("items", data.items.map((it, i) =>
                i === idx ? {
                    ...it,
                    system_quantity: parseInt(json.quantity)       || 0,
                    unit_cost:       parseFloat(json.average_cost)  || 0.0,
                } : it
            ));
            toast.success("Qty sistem diperbarui");
        } catch {
            toast.error("Gagal mengambil qty sistem");
        } finally {
            setRefreshing((r) => ({ ...r, [idx]: false }));
        }
    }, [data.items, adjustment]);

    const submit = (e) => {
        e.preventDefault();
        put(route("stock-adjustments.update", adjustment.id), {
            onSuccess: () => toast.success("Adjustment berhasil diperbarui!"),
        });
    };

    return (
        <>
            <Head title={`Edit Adjustment ${adjustment.adjustment_number}`} />
            <div className="max-w-5xl mx-auto">
                <Link href={route("stock-adjustments.show", adjustment.id)}
                    className="flex items-center gap-2 text-slate-500 mb-4 hover:text-orange-600 text-sm">
                    <IconArrowLeft size={18} /> Kembali
                </Link>

                <form onSubmit={submit} className="space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <IconAdjustments size={24} /> Edit Penyesuaian Stok
                        </h2>
                        <p className="text-amber-100 text-sm mt-1">
                            {adjustment.adjustment_number} · Status: <span className="font-bold capitalize">{adjustment.status}</span>
                        </p>
                    </div>

                    {/* Read-only location */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 rounded-2xl p-5 flex items-center gap-3">
                        <IconLock size={15} className="text-slate-400 shrink-0" />
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                            <strong>Lokasi:</strong> {adjustment.location_name} &nbsp;·&nbsp;
                            <span className="capitalize">{adjustment.location_type}</span>
                            <span className="ml-2 text-xs text-slate-400">(tidak dapat diubah)</span>
                        </div>
                    </div>

                    {/* Type + Date */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipe Adjustment *</label>
                                <select value={data.type} onChange={(e) => setData("type", e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-950 text-sm">
                                    {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
                            </div>
                            <Input label="Tanggal Adjustment *" type="date"
                                value={data.adjustment_date}
                                onChange={(e) => setData("adjustment_date", e.target.value)}
                                errors={errors.adjustment_date} />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div>
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">Item Adjustment</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Klik <IconRefresh size={11} className="inline" /> untuk menyegarkan qty dari stok terkini</p>
                            </div>
                            <button type="button" onClick={addItem}
                                className="flex items-center gap-1.5 text-xs font-bold text-orange-600 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-200">
                                <IconPlus size={14} /> Tambah Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {data.items.map((item, idx) => {
                                const diff    = getDifference(item);
                                const valDiff = Math.round(Math.abs(diff) * (parseFloat(item.unit_cost) || 0));
                                const ing     = allItems.find((i) => i._type === item.item_type && i.id === item.item_id);
                                const itemOptions = allItems.filter(
                                    (i) => i._type === item.item_type && (!usedItemIds.includes(i.id) || i.id === item.item_id)
                                );

                                return (
                                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3">
                                        <div className="grid grid-cols-12 gap-3 items-start">
                                            {/* Item type */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipe</label>
                                                <select value={item.item_type}
                                                    onChange={(e) => setData("items", data.items.map((it, i) =>
                                                        i === idx ? { ...it, item_type: e.target.value, item_id: "", system_quantity: 0, physical_quantity: "", unit_cost: 0.0 } : it
                                                    ))}
                                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-900 text-xs">
                                                    <option value="ingredient">Ingredient</option>
                                                    <option value="packaging_material">Packaging</option>
                                                </select>
                                            </div>

                                            {/* Item searchable */}
                                            <div className="col-span-5">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Item</label>
                                                <SearchSelect
                                                    options={itemOptions}
                                                    value={item.item_id}
                                                    onChange={(v) => {
                                                        setData("items", data.items.map((it, i) =>
                                                            i === idx ? { ...it, item_id: v, system_quantity: 0, physical_quantity: "", unit_cost: 0.0 } : it
                                                        ));
                                                    }}
                                                    placeholder="Cari item..."
                                                    renderOption={(i) => `${i.name} (${i.code})`}
                                                />
                                                {errors[`items.${idx}.item_id`] && (
                                                    <p className="text-red-500 text-xs mt-1">{errors[`items.${idx}.item_id`]}</p>
                                                )}
                                                {ing && <p className="text-xs text-slate-400 mt-0.5">{ing.unit}</p>}
                                            </div>

                                            {/* System qty (read-only integer + refresh) */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center justify-between">
                                                    Qty Sistem
                                                    <button type="button" onClick={() => refreshSystemQty(idx)}
                                                        disabled={refreshing[idx]}
                                                        className="text-orange-500 hover:text-orange-700 disabled:opacity-40">
                                                        <IconRefresh size={11} className={refreshing[idx] ? "animate-spin" : ""} />
                                                    </button>
                                                </label>
                                                <div className="w-full rounded-xl border border-slate-200 bg-slate-100 dark:bg-slate-700 px-3 py-2 text-sm text-right text-slate-500 font-mono">
                                                    {fmtQty(item.system_quantity)}
                                                </div>
                                            </div>

                                            {/* Physical qty (integer) */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Qty Fisik *</label>
                                                <input type="number" step="1" min="0"
                                                    value={item.physical_quantity}
                                                    onChange={(e) => updateItem(idx, "physical_quantity", e.target.value)}
                                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-900 text-sm text-right"
                                                    placeholder="0" />
                                                {errors[`items.${idx}.physical_quantity`] && (
                                                    <p className="text-red-500 text-xs mt-1">{errors[`items.${idx}.physical_quantity`]}</p>
                                                )}
                                            </div>

                                            {/* Remove */}
                                            <div className="col-span-1 flex items-end pb-0.5 justify-center">
                                                {data.items.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(idx)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                        <IconTrash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Difference preview — integers */}
                                        {item.physical_quantity !== "" && (
                                            <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold border ${
                                                diff > 0 ? "bg-success-50 border-success-200 text-success-700"
                                                : diff < 0 ? "bg-red-50 border-red-200 text-red-700"
                                                : "bg-slate-100 border-slate-200 text-slate-500"
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    {diff > 0 ? <IconTrendingUp size={16} /> : diff < 0 ? <IconTrendingDown size={16} /> : null}
                                                    <span>Selisih: {diff > 0 ? "+" : ""}{fmtQty(diff)} {ing?.unit ?? "unit"}</span>
                                                </div>
                                                <span>Nilai: {fmt(valDiff)}</span>
                                            </div>
                                        )}

                                        <input type="text" value={item.notes}
                                            onChange={(e) => updateItem(idx, "notes", e.target.value)}
                                            placeholder="Catatan item (opsional)..."
                                            className="w-full rounded-xl border-slate-200 dark:bg-slate-900 text-xs" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Catatan</label>
                        <textarea value={data.notes} onChange={(e) => setData("notes", e.target.value)}
                            rows={3} className="w-full rounded-xl border-slate-200 dark:bg-slate-950 text-sm resize-none"
                            placeholder="Catatan atau keterangan tambahan..." />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link href={route("stock-adjustments.show", adjustment.id)}
                            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">
                            Batal
                        </Link>
                        <button type="submit" disabled={processing}
                            className="px-7 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 text-sm">
                            <IconDeviceFloppy size={18} />
                            {processing ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
Edit.layout = (page) => <DashboardLayout children={page} />;
