import React, { useState, useMemo, useRef, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconTransfer, IconPlus, IconTrash,
    IconInfoCircle, IconAlertTriangle, IconSearch, IconX, IconChevronDown, IconPackage,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ─── Searchable dropdown ──────────────────────────────────────────────────────
function SearchSelect({ options, value, onChange, placeholder = "Cari...", renderOption, disabled = false }) {
    const [open,  setOpen]  = useState(false);
    const [query, setQuery] = useState("");
    const containerRef      = useRef(null);

    // Close on outside click — but only on mousedown outside container
    useEffect(() => {
        const h = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = useMemo(() =>
        query.trim() === ""
            ? options
            : options.filter((o) => renderOption(o).toLowerCase().includes(query.toLowerCase())),
        [options, query]
    );

    const selected = options.find((o) => String(o.id) === String(value));

    const handleSelect = (id) => {
        onChange(id);
        setOpen(false);
        setQuery("");
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => { setOpen((v) => !v); setQuery(""); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors
                    ${disabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                        : open
                            ? "border-indigo-400 ring-2 ring-indigo-100 bg-white dark:bg-slate-950"
                            : "border-slate-200 bg-white dark:bg-slate-950 hover:border-slate-300"
                    }`}
            >
                <span className={selected ? "text-slate-800 dark:text-slate-200 font-medium truncate" : "text-slate-400"}>
                    {selected ? renderOption(selected) : placeholder}
                </span>
                {value && !disabled ? (
                    <IconX
                        size={14}
                        className="text-slate-400 shrink-0 hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); onChange(""); }}
                    />
                ) : (
                    <IconChevronDown size={14} className="text-slate-400 shrink-0" />
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <IconSearch size={13} className="text-slate-400 shrink-0" />
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ketik untuk mencari..."
                                className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300"
                            />
                            {query && (
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery("")}>
                                    <IconX size={12} className="text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="max-h-52 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-slate-400 text-center">Tidak ditemukan</p>
                        ) : (
                            filtered.map((o) => (
                                <button
                                    key={o.id}
                                    type="button"
                                    // onMouseDown with preventDefault prevents the outside-click
                                    // handler from firing before onClick, which would close the
                                    // dropdown before the selection is registered.
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelect(o.id)}
                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                                        ${String(o.id) === String(value)
                                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 font-bold"
                                            : "text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                        }`}
                                >
                                    {renderOption(o)}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtQty = (n) => parseInt(n || 0).toLocaleString("id-ID");

export default function Create({ warehouses, stores, stockMap }) {
    const { data, setData, post, processing, errors } = useForm({
        from_location_type:    "warehouse",
        from_location_id:      "",
        to_location_type:      "store",
        to_location_id:        "",
        transfer_date:         new Date().toISOString().split("T")[0],
        expected_arrival_date: "",
        notes:                 "",
        items: [{ item_type: "ingredient", item_id: "", quantity_requested: "", notes: "" }],
    });

    const fromLocations = data.from_location_type === "warehouse" ? warehouses : stores;
    const toLocations   = data.to_location_type   === "warehouse" ? warehouses : stores;

    // Items available at the source location (has stock > 0)
    const availableItems = useMemo(() => {
        if (!data.from_location_id) return [];
        return Object.values(stockMap).filter((s) =>
            s.item_type && `${data.from_location_type}:${data.from_location_id}:${s.item_type}:${s.item_id}` in
                Object.fromEntries(Object.entries(stockMap).map(([k, v]) => [k, v]))
            &&
            stockMap[`${data.from_location_type}:${data.from_location_id}:${s.item_type}:${s.item_id}`]
        );
    }, [data.from_location_type, data.from_location_id, stockMap]);

    // Helper: get stock info for a specific item at source
    const getStockInfo = (itemType, itemId) => {
        if (!data.from_location_id || !itemId) return null;
        return stockMap[`${data.from_location_type}:${data.from_location_id}:${itemType}:${itemId}`] ?? null;
    };

    // Items available filtered by type, excluding already-chosen (except self)
    const itemOptionsFor = (idx) => {
        const item  = data.items[idx];
        const used  = new Set(data.items.filter((_, i) => i !== idx).map((i) => i.item_id).filter(Boolean));
        return Object.entries(stockMap)
            .filter(([k]) => k.startsWith(`${data.from_location_type}:${data.from_location_id}:${item.item_type}:`))
            .map(([, v]) => ({ ...v, id: v.item_id }))   // ← SearchSelect expects .id
            .filter((v) => !used.has(v.item_id))
            .sort((a, b) => a.name.localeCompare(b.name));
    };

    const addItem    = () => setData("items", [...data.items, { item_type: "ingredient", item_id: "", quantity_requested: "", notes: "" }]);
    const removeItem = (idx) => setData("items", data.items.filter((_, i) => i !== idx));
    const updateItem = (idx, key, val) =>
        setData("items", data.items.map((item, i) => (i === idx ? { ...item, [key]: val } : item)));

    const submit = (e) => {
        e.preventDefault();
        post(route("stock-transfers.store"), { onSuccess: () => toast.success("Transfer berhasil disimpan!") });
    };

    return (
        <>
            <Head title="Buat Transfer Stok" />
            <div className="max-w-5xl mx-auto">
                <Link href={route("stock-transfers.index")} className="flex items-center gap-2 text-slate-500 mb-4 hover:text-primary-600 text-sm">
                    <IconArrowLeft size={18} /> Kembali
                </Link>

                <form onSubmit={submit} className="space-y-6">
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><IconTransfer size={28} /> Buat Transfer Stok</h2>
                        <p className="text-primary-100 text-sm mt-1">Pindahkan stok dari satu lokasi ke lokasi lain</p>
                    </div>

                    {/* Rute Transfer */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 space-y-5">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide border-b pb-2">Rute Transfer</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* FROM */}
                            <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100">
                                <p className="text-xs font-black text-red-600 uppercase tracking-wider">📦 Dari (Asal)</p>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tipe Lokasi</label>
                                    <div className="flex gap-2">
                                        {["warehouse", "store"].map((t) => (
                                            <button key={t} type="button"
                                                onClick={() => { setData("from_location_type", t); setData("from_location_id", ""); setData("items", [{ item_type: "ingredient", item_id: "", quantity_requested: "", notes: "" }]); }}
                                                className={`flex-1 py-2 rounded-xl border-2 font-bold text-xs transition-all ${
                                                    data.from_location_type === t ? "border-red-400 bg-red-100 text-red-700" : "border-slate-200 bg-white text-slate-500"}`}>
                                                {t === "warehouse" ? "Gudang" : "Toko"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">{data.from_location_type === "warehouse" ? "Gudang" : "Toko"} *</label>
                                    <SearchSelect
                                        options={fromLocations}
                                        value={data.from_location_id}
                                        onChange={(v) => { setData("from_location_id", v); setData("items", [{ item_type: "ingredient", item_id: "", quantity_requested: "", notes: "" }]); }}
                                        placeholder="Cari lokasi asal..."
                                        renderOption={(l) => `${l.name} (${l.code})`} />
                                    {errors.from_location_id && <p className="text-red-500 text-xs mt-1">{errors.from_location_id}</p>}
                                </div>
                            </div>

                            {/* TO */}
                            <div className="space-y-3 p-4 bg-success-50 dark:bg-success-900/10 rounded-xl border border-success-100">
                                <p className="text-xs font-black text-success-600 uppercase tracking-wider">🏪 Ke (Tujuan)</p>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tipe Lokasi</label>
                                    <div className="flex gap-2">
                                        {["warehouse", "store"].map((t) => (
                                            <button key={t} type="button"
                                                onClick={() => { setData("to_location_type", t); setData("to_location_id", ""); }}
                                                className={`flex-1 py-2 rounded-xl border-2 font-bold text-xs transition-all ${
                                                    data.to_location_type === t ? "border-success-400 bg-success-100 text-success-700" : "border-slate-200 bg-white text-slate-500"}`}>
                                                {t === "warehouse" ? "Gudang" : "Toko"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">{data.to_location_type === "warehouse" ? "Gudang" : "Toko"} *</label>
                                    <SearchSelect
                                        options={toLocations}
                                        value={data.to_location_id}
                                        onChange={(v) => setData("to_location_id", v)}
                                        placeholder="Cari lokasi tujuan..."
                                        renderOption={(l) => `${l.name} (${l.code})`} />
                                    {errors.to_location_id && <p className="text-red-500 text-xs mt-1">{errors.to_location_id}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <Input label="Tanggal Transfer *" type="date" value={data.transfer_date}
                                onChange={(e) => setData("transfer_date", e.target.value)} errors={errors.transfer_date} />
                            <Input label="Est. Tgl Tiba" type="date" value={data.expected_arrival_date}
                                onChange={(e) => setData("expected_arrival_date", e.target.value)} errors={errors.expected_arrival_date} />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Item yang Ditransfer</h3>
                            <button type="button" onClick={addItem} disabled={!data.from_location_id}
                                className="flex items-center gap-1.5 text-xs font-bold text-primary-600 px-3 py-1.5 bg-primary-50 rounded-lg border border-primary-200 disabled:opacity-40 disabled:cursor-not-allowed">
                                <IconPlus size={14} /> Tambah Item
                            </button>
                        </div>

                        {!data.from_location_id && (
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <IconInfoCircle size={14} className="shrink-0" />
                                Pilih lokasi asal terlebih dahulu untuk melihat item yang tersedia.
                            </div>
                        )}

                        {errors.items && <p className="text-red-500 text-xs">{errors.items}</p>}

                        <div className="space-y-3">
                            {data.items.map((item, idx) => {
                                const options   = itemOptionsFor(idx);
                                const stockInfo = getStockInfo(item.item_type, item.item_id);
                                const qty       = parseInt(item.quantity_requested) || 0;
                                const maxQty    = stockInfo?.qty ?? 0;
                                const overflow  = qty > maxQty && maxQty > 0;

                                return (
                                    <div key={idx} className={`p-4 rounded-xl space-y-3 border ${overflow ? "bg-red-50 border-red-200" : "bg-slate-50 dark:bg-slate-800/40 border-transparent"}`}>
                                        <div className="grid grid-cols-12 gap-3 items-start">
                                            {/* Type toggle */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipe</label>
                                                <select value={item.item_type}
                                                    onChange={(e) => setData("items", data.items.map((it, i) => i === idx ? { ...it, item_type: e.target.value, item_id: "", quantity_requested: "" } : it))}
                                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-900 text-xs py-2.5">
                                                    <option value="ingredient">Ingredient</option>
                                                    <option value="packaging_material">Packaging</option>
                                                </select>
                                            </div>

                                            {/* Item — searchable, filtered to stock > 0 */}
                                            <div className="col-span-5">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Item</label>
                                                <SearchSelect
                                                    options={options}
                                                    value={item.item_id}
                                                    onChange={(v) => setData("items", data.items.map((it, i) => i === idx ? { ...it, item_id: v, quantity_requested: "" } : it))}
                                                    placeholder={data.from_location_id ? "Cari item..." : "Pilih lokasi asal dulu"}
                                                    disabled={!data.from_location_id}
                                                    renderOption={(o) => `${o.name} (${o.code})`} />
                                                {errors[`items.${idx}.item_id`] && <p className="text-red-500 text-xs mt-1">{errors[`items.${idx}.item_id`]}</p>}
                                            </div>

                                            {/* Qty */}
                                            <div className="col-span-4">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Jumlah{stockInfo ? ` (${stockInfo.unit})` : ""}
                                                </label>
                                                <input type="number" min="1" step="1"
                                                    max={stockInfo?.qty ?? undefined}
                                                    value={item.quantity_requested}
                                                    onChange={(e) => updateItem(idx, "quantity_requested", e.target.value)}
                                                    disabled={!item.item_id}
                                                    className={`w-full rounded-xl border text-sm text-right py-2.5 ${
                                                        overflow ? "border-red-400 bg-red-50" : "border-slate-200 dark:bg-slate-900"}`}
                                                    placeholder="0" />
                                                {errors[`items.${idx}.quantity_requested`] && <p className="text-red-500 text-xs mt-1">{errors[`items.${idx}.quantity_requested`]}</p>}
                                            </div>

                                            {/* Remove */}
                                            <div className="col-span-1 flex items-end pb-0.5 justify-center">
                                                {data.items.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(idx)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-5">
                                                        <IconTrash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stock info bar */}
                                        {stockInfo && (
                                            <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border ${
                                                overflow ? "bg-red-100 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-600"}`}>
                                                <span className="flex items-center gap-1">
                                                    <IconPackage size={12} />
                                                    Stok tersedia: <strong className={overflow ? "text-red-700" : "text-success-700"}>{fmtQty(stockInfo.qty)} {stockInfo.unit}</strong>
                                                </span>
                                                {overflow && (
                                                    <span className="flex items-center gap-1 text-red-600 font-bold">
                                                        <IconAlertTriangle size={12} /> Melebihi stok!
                                                    </span>
                                                )}
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

                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-xl p-3 border border-blue-100">
                            <IconInfoCircle size={14} className="shrink-0" />
                            Hanya item yang memiliki stok di lokasi asal yang ditampilkan. Stok dikurangi saat <strong>Dikirim</strong>, masuk saat <strong>Diterima</strong>.
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Catatan Transfer</label>
                        <textarea value={data.notes} onChange={(e) => setData("notes", e.target.value)}
                            rows={3} className="w-full rounded-xl border-slate-200 dark:bg-slate-950 text-sm resize-none"
                            placeholder="Catatan atau instruksi tambahan..." />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link href={route("stock-transfers.index")} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">Batal</Link>
                        <button type="submit" disabled={processing}
                            className="px-7 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-500/30 text-sm">
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
