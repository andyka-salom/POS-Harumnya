import React, { useState, useMemo, useRef, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconShoppingBag, IconPlus, IconTrash,
    IconInfoCircle, IconBuilding, IconSearch, IconX, IconChevronDown,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ─── Money helpers ─────────────────────────────────────────────────────────────
// Migration 006: decimal(15,2) → support sen / desimal
const fmtRp = (n) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(parseFloat(n) || 0);

// Parse string "12.000,59" → "12000.59"  (simpan sebagai string agar presisi)
const parseDecimal = (str) => {
    // Hapus titik ribuan, ganti koma desimal → titik
    const cleaned = String(str).replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? "0" : num.toFixed(2);
};

// Format angka numerik ke tampilan "12.000,59"
const displayDecimal = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(val);
    if (isNaN(num) || num === 0) return "";
    return num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// ─── Searchable dropdown ──────────────────────────────────────────────────────
function SearchSelect({ options, value, onChange, placeholder = "Cari...", renderOption, renderSelected, disabled = false }) {
    const [open, setOpen]   = useState(false);
    const [query, setQuery] = useState("");
    const ref               = useRef(null);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = useMemo(() =>
        query.trim() === ""
            ? options
            : options.filter((o) => renderOption(o).toLowerCase().includes(query.toLowerCase())),
        [options, query]
    );
    const selected = options.find((o) => o.id === value);

    return (
        <div ref={ref} className="relative">
            <button type="button" disabled={disabled}
                onClick={() => { setOpen((v) => !v); setQuery(""); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors
                    ${disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                    : open ? "border-indigo-400 ring-2 ring-indigo-100 bg-white dark:bg-slate-950"
                    : "border-slate-200 bg-white dark:bg-slate-950 hover:border-slate-300"}`}>
                <span className={selected ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-400"}>
                    {selected ? (renderSelected ? renderSelected(selected) : renderOption(selected)) : placeholder}
                </span>
                {value && !disabled
                    ? <IconX size={14} className="text-slate-400 shrink-0" onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }} />
                    : <IconChevronDown size={14} className="text-slate-400 shrink-0" />}
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <IconSearch size={13} className="text-slate-400 shrink-0" />
                            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ketik untuk mencari..."
                                className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300" />
                        </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                        {filtered.length === 0
                            ? <p className="px-4 py-3 text-xs text-slate-400 text-center">Tidak ditemukan</p>
                            : filtered.map((o) => (
                                <button key={o.id} type="button"
                                    onClick={() => { onChange(o.id); setOpen(false); setQuery(""); }}
                                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors
                                        ${o.id === value ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 font-bold" : "text-slate-700 dark:text-slate-300"}`}>
                                    {renderOption(o)}
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Decimal money input ───────────────────────────────────────────────────────
// Menampilkan format ribuan, menyimpan string "12000.59" ke state
function MoneyInput({ value, onChange, placeholder = "0", className = "" }) {
    const [display, setDisplay] = useState(displayDecimal(value));

    useEffect(() => {
        setDisplay(displayDecimal(value));
    }, [value]);

    const handleChange = (e) => {
        // Izinkan karakter angka, titik (ribuan), koma (desimal)
        const raw = e.target.value.replace(/[^\d.,]/g, "");
        setDisplay(raw);
    };

    const handleBlur = () => {
        const parsed = parseDecimal(display);
        const num    = parseFloat(parsed);
        setDisplay(num === 0 ? "" : num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
        onChange(parsed);
    };

    return (
        <input type="text" inputMode="decimal" value={display}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`rounded-xl border-slate-200 dark:bg-slate-900 text-sm text-right ${className}`} />
    );
}

const PAYMENT_LABELS = {
    cash: "Tunai", credit_7: "Kredit 7 Hari", credit_14: "Kredit 14 Hari",
    credit_30: "Kredit 30 Hari", credit_60: "Kredit 60 Hari",
};

export default function Create({ suppliers, warehouses, stores, ingredients, packagingMaterials }) {
    const { data, setData, post, processing, errors } = useForm({
        supplier_id:            "",
        destination_type:       "warehouse",
        destination_id:         "",
        purchase_date:          new Date().toISOString().split("T")[0],
        expected_delivery_date: "",
        tax:                    "0",
        discount:               "0",
        shipping_cost:          "0",
        notes:                  "",
        items: [{
            item_type: "ingredient", item_id: "",
            quantity: "", unit_price: "0", notes: "",
        }],
    });

    const destinations     = data.destination_type === "warehouse" ? warehouses : stores;
    const selectedSupplier = suppliers.find((s) => s.id === data.supplier_id);

    const allItems = useMemo(() => [
        ...ingredients.map((i) => ({ ...i, _type: "ingredient" })),
        ...packagingMaterials.map((p) => ({ ...p, _type: "packaging_material" })),
    ], [ingredients, packagingMaterials]);

    const usedItemIds = data.items.map((i) => i.item_id).filter(Boolean);
    const addItem     = () => setData("items", [...data.items, { item_type: "ingredient", item_id: "", quantity: "", unit_price: "0", notes: "" }]);
    const removeItem  = (idx) => setData("items", data.items.filter((_, i) => i !== idx));
    const updateItem  = (idx, key, val) =>
        setData("items", data.items.map((item, i) => (i === idx ? { ...item, [key]: val } : item)));

    // Hitung subtotal & total menggunakan parseFloat
    const subtotal = data.items.reduce((s, i) => {
        const qty   = parseInt(i.quantity) || 0;
        const price = parseFloat(i.unit_price) || 0;
        return s + qty * price;
    }, 0);
    const total = subtotal
        + (parseFloat(data.tax) || 0)
        + (parseFloat(data.shipping_cost) || 0)
        - (parseFloat(data.discount) || 0);

    const submit = (e) => {
        e.preventDefault();
        post(route("purchases.store"), {
            onSuccess: () => toast.success("Purchase Order berhasil disimpan!"),
        });
    };

    return (
        <>
            <Head title="Buat Purchase Order" />
            <div className="max-w-5xl mx-auto">
                <Link href={route("purchases.index")} className="flex items-center gap-2 text-slate-500 mb-4 hover:text-indigo-600 text-sm">
                    <IconArrowLeft size={18} /> Kembali
                </Link>

                <form onSubmit={submit} className="space-y-6">
                    {/* Banner */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <IconShoppingBag size={28} /> Buat Purchase Order
                        </h2>
                        <p className="text-indigo-100 text-sm mt-1">Pembelian bahan baku &amp; kemasan dari supplier</p>
                    </div>

                    {/* PO Header */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 space-y-5">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide border-b pb-2">Informasi PO</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Supplier */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Supplier *</label>
                                <SearchSelect
                                    options={suppliers}
                                    value={data.supplier_id}
                                    onChange={(v) => setData("supplier_id", v)}
                                    placeholder="Cari supplier..."
                                    renderOption={(s) => `${s.name} (${s.code})`} />
                                {errors.supplier_id && <p className="text-red-500 text-xs mt-1">{errors.supplier_id}</p>}
                                {selectedSupplier && (
                                    <div className="mt-2 p-2 bg-indigo-50 rounded-lg text-xs text-indigo-700 flex items-center gap-1">
                                        <IconBuilding size={12} />
                                        {PAYMENT_LABELS[selectedSupplier.payment_term] ?? "-"}
                                        {selectedSupplier.credit_limit > 0 && ` · Limit: ${fmtRp(selectedSupplier.credit_limit)}`}
                                    </div>
                                )}
                            </div>

                            <Input label="Tanggal PO *" type="date" value={data.purchase_date}
                                onChange={(e) => setData("purchase_date", e.target.value)} errors={errors.purchase_date} />

                            {/* Destinasi */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-600">Tipe Destinasi *</label>
                                <div className="flex gap-2">
                                    {["warehouse", "store"].map((t) => (
                                        <button key={t} type="button"
                                            onClick={() => { setData("destination_type", t); setData("destination_id", ""); }}
                                            className={`flex-1 py-2 rounded-xl border-2 font-bold text-xs transition-all ${
                                                data.destination_type === t
                                                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                                    : "border-slate-200 text-slate-500"}`}>
                                            {t === "warehouse" ? "Gudang" : "Toko"}
                                        </button>
                                    ))}
                                </div>
                                <SearchSelect
                                    options={destinations}
                                    value={data.destination_id}
                                    onChange={(v) => setData("destination_id", v)}
                                    placeholder={`Cari ${data.destination_type === "warehouse" ? "gudang" : "toko"}...`}
                                    renderOption={(d) => `${d.name} (${d.code})`} />
                                {errors.destination_id && <p className="text-red-500 text-xs mt-1">{errors.destination_id}</p>}
                            </div>

                            <Input label="Est. Tgl Tiba" type="date" value={data.expected_delivery_date}
                                onChange={(e) => setData("expected_delivery_date", e.target.value)} errors={errors.expected_delivery_date} />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Item Pembelian</h3>
                            <button type="button" onClick={addItem}
                                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
                                <IconPlus size={14} /> Tambah Item
                            </button>
                        </div>
                        {errors.items && <p className="text-red-500 text-xs">{errors.items}</p>}

                        <div className="space-y-3">
                            {data.items.map((item, idx) => {
                                const qty      = parseInt(item.quantity) || 0;
                                const price    = parseFloat(item.unit_price) || 0;
                                const lineTotal = qty * price;
                                const filtered = allItems.filter((i) =>
                                    i._type === item.item_type && (!usedItemIds.includes(i.id) || i.id === item.item_id)
                                );
                                const ing = allItems.find((i) => i._type === item.item_type && i.id === item.item_id);

                                return (
                                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3">
                                        <div className="grid grid-cols-12 gap-3 items-start">
                                            {/* Tipe */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipe</label>
                                                <select value={item.item_type}
                                                    onChange={(e) => updateItem(idx, "item_type", e.target.value)}
                                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-900 text-xs py-2.5">
                                                    <option value="ingredient">Ingredient</option>
                                                    <option value="packaging_material">Packaging</option>
                                                </select>
                                            </div>
                                            {/* Item */}
                                            <div className="col-span-4">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Item</label>
                                                <SearchSelect
                                                    options={filtered}
                                                    value={item.item_id}
                                                    onChange={(v) => {
                                                        const found = filtered.find((i) => i.id === v);
                                                        const refPrice = found?.average_cost ?? found?.purchase_price ?? "0";
                                                        updateItem(idx, "item_id", v);
                                                        // Auto-isi harga referensi jika belum diisi
                                                        if (!parseFloat(item.unit_price)) {
                                                            updateItem(idx, "unit_price", String(parseFloat(refPrice) || "0"));
                                                        }
                                                    }}
                                                    placeholder="Cari item..."
                                                    renderOption={(i) => `${i.name} (${i.code})`} />
                                                {errors[`items.${idx}.item_id`] && (
                                                    <p className="text-red-500 text-xs mt-1">{errors[`items.${idx}.item_id`]}</p>
                                                )}
                                                {ing?.average_cost && (
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        Avg cost: {fmtRp(ing.average_cost)}
                                                    </p>
                                                )}
                                            </div>
                                            {/* Qty — integer signed */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Qty{ing ? ` (${ing.unit ?? ing.size?.name ?? "pcs"})` : ""}
                                                </label>
                                                <input type="number" step="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-900 text-sm text-right py-2.5"
                                                    placeholder="0" />
                                                {errors[`items.${idx}.quantity`] && (
                                                    <p className="text-red-500 text-xs mt-1">{errors[`items.${idx}.quantity`]}</p>
                                                )}
                                            </div>
                                            {/* Harga — decimal */}
                                            <div className="col-span-3">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Harga/Unit (Rp)</label>
                                                <MoneyInput
                                                    value={item.unit_price}
                                                    onChange={(v) => updateItem(idx, "unit_price", v)}
                                                    className="w-full" />
                                                {errors[`items.${idx}.unit_price`] && (
                                                    <p className="text-red-500 text-xs mt-1">{errors[`items.${idx}.unit_price`]}</p>
                                                )}
                                            </div>
                                            {/* Hapus */}
                                            <div className="col-span-1 flex items-end pb-0.5 justify-center">
                                                {data.items.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(idx)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-5">
                                                        <IconTrash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* Subtotal baris */}
                                        <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200">
                                            <span className="text-xs text-slate-500">Subtotal</span>
                                            <span className={`text-sm font-black ${lineTotal < 0 ? "text-red-600" : "text-indigo-700"}`}>
                                                {fmtRp(lineTotal)}
                                            </span>
                                        </div>
                                        <input type="text" value={item.notes}
                                            onChange={(e) => updateItem(idx, "notes", e.target.value)}
                                            placeholder="Catatan item (opsional)..."
                                            className="w-full rounded-xl border-slate-200 dark:bg-slate-900 text-xs" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Biaya + Ringkasan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5 space-y-3">
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide border-b pb-2">Biaya Tambahan</h3>
                            {[
                                { label: "PPN / Tax",    key: "tax" },
                                { label: "Ongkos Kirim", key: "shipping_cost" },
                                { label: "Diskon",       key: "discount" },
                            ].map(({ label, key }) => (
                                <div key={key} className="flex items-center gap-3">
                                    <label className="text-sm text-slate-600 w-36 shrink-0">{label}</label>
                                    <MoneyInput value={data[key]} onChange={(v) => setData(key, v)} className="flex-1" />
                                </div>
                            ))}
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 rounded-2xl p-5 space-y-2">
                            <h3 className="font-bold text-indigo-700 text-sm uppercase tracking-wide border-b border-indigo-200 pb-2">Ringkasan</h3>
                            {[
                                { label: "Subtotal",  value: subtotal },
                                { label: "PPN / Tax", value: parseFloat(data.tax) || 0 },
                                { label: "Ongkir",    value: parseFloat(data.shipping_cost) || 0 },
                                { label: "Diskon",    value: -(parseFloat(data.discount) || 0) },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{label}</span>
                                    <span className={`font-bold ${value < 0 ? "text-red-600" : "text-slate-700"}`}>
                                        {value < 0 ? "-" : ""}{fmtRp(Math.abs(value))}
                                    </span>
                                </div>
                            ))}
                            <div className="flex justify-between text-base font-black border-t border-indigo-300 pt-2">
                                <span className="text-indigo-800">TOTAL</span>
                                <span className="text-indigo-800">{fmtRp(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Catatan */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Catatan PO</label>
                        <textarea value={data.notes} onChange={(e) => setData("notes", e.target.value)}
                            rows={3} className="w-full rounded-xl border-slate-200 dark:bg-slate-950 text-sm resize-none"
                            placeholder="Instruksi pengiriman, keterangan khusus, dll..." />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <IconInfoCircle size={14} className="shrink-0" />
                        Stok diperbarui otomatis saat PO <strong>Diselesaikan</strong>.
                        Harga beli menjadi dasar perhitungan WAC (Weighted Average Cost).
                        Qty negatif = retur ke supplier.
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link href={route("purchases.index")}
                            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">
                            Batal
                        </Link>
                        <button type="submit" disabled={processing}
                            className="px-7 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/30 text-sm">
                            <IconDeviceFloppy size={18} />
                            {processing ? "Menyimpan..." : "Simpan sebagai Draft"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
Create.layout = (page) => <DashboardLayout children={page} />;
