import React, { useState, useMemo, useRef, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconTransfer, IconPlus, IconTrash,
    IconLock, IconAlertTriangle, IconSearch, IconX, IconChevronDown, IconPackage,
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

const fmtQty = (n) => parseInt(n || 0).toLocaleString("id-ID");

export default function Edit({ transfer, warehouses, stores, stockMap }) {
    const { data, setData, put, processing, errors } = useForm({
        transfer_date:         transfer.transfer_date?.split("T")[0] ?? transfer.transfer_date,
        expected_arrival_date: transfer.expected_arrival_date ?? "",
        notes:                 transfer.notes ?? "",
        items: transfer.items?.map((i) => ({
            item_type:          i.item_type,
            item_id:            i.item_id,
            quantity_requested: i.quantity_requested,
            notes:              i.notes ?? "",
            // Pass through server-resolved info for display
            _item_name:  i.item_name ?? "",
            _item_unit:  i.item_unit ?? "",
            _source_stock: i.source_stock ?? 0,
        })) ?? [],
    });

    // Helper: get stock info for a specific item at the (locked) source
    const getStockInfo = (itemType, itemId) => {
        if (!itemId) return null;
        return stockMap[`${transfer.from_location_type}:${transfer.from_location_id}:${itemType}:${itemId}`] ?? null;
    };

    const itemOptionsFor = (idx) => {
        const item = data.items[idx];
        const used = new Set(data.items.filter((_, i) => i !== idx).map((i) => i.item_id).filter(Boolean));
        return Object.entries(stockMap)
            .filter(([k]) => k.startsWith(`${transfer.from_location_type}:${transfer.from_location_id}:${item.item_type}:`))
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
        put(route("stock-transfers.update", transfer.id), { onSuccess: () => toast.success("Transfer berhasil diperbarui!") });
    };

    return (
        <>
            <Head title={`Edit Transfer ${transfer.transfer_number}`} />
            <div className="max-w-5xl mx-auto">
                <Link href={route("stock-transfers.show", transfer.id)} className="flex items-center gap-2 text-slate-500 mb-4 hover:text-primary-600 text-sm">
                    <IconArrowLeft size={18} /> Kembali
                </Link>

                <form onSubmit={submit} className="space-y-6">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-xl font-bold flex items-center gap-2"><IconTransfer size={24} /> Edit Transfer</h2>
                        <p className="text-amber-100 text-sm mt-1">{transfer.transfer_number} · <span className="font-bold capitalize">{transfer.status}</span></p>
                    </div>

                    {/* Locked route */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <IconLock size={15} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rute Transfer (tidak dapat diubah)</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="flex-1 p-3 bg-red-50 rounded-xl text-center border border-red-100">
                                <p className="text-xs text-red-500 font-bold mb-0.5">DARI</p>
                                <p className="font-bold text-slate-700">{transfer.from_name}</p>
                                <p className="text-xs text-slate-400 capitalize">{transfer.from_location_type}</p>
                            </div>
                            <span className="text-slate-400 font-bold">→</span>
                            <div className="flex-1 p-3 bg-success-50 rounded-xl text-center border border-success-100">
                                <p className="text-xs text-success-600 font-bold mb-0.5">KE</p>
                                <p className="font-bold text-slate-700">{transfer.to_name}</p>
                                <p className="text-xs text-slate-400 capitalize">{transfer.to_location_type}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Tanggal Transfer *" type="date" value={data.transfer_date}
                                onChange={(e) => setData("transfer_date", e.target.value)} errors={errors.transfer_date} />
                            <Input label="Est. Tgl Tiba" type="date" value={data.expected_arrival_date}
                                onChange={(e) => setData("expected_arrival_date", e.target.value)} errors={errors.expected_arrival_date} />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Item Transfer</h3>
                            <button type="button" onClick={addItem}
                                className="flex items-center gap-1.5 text-xs font-bold text-primary-600 px-3 py-1.5 bg-primary-50 rounded-lg border border-primary-200">
                                <IconPlus size={14} /> Tambah Item
                            </button>
                        </div>

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
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipe</label>
                                                <select value={item.item_type}
                                                    onChange={(e) => setData("items", data.items.map((it, i) => i === idx ? { ...it, item_type: e.target.value, item_id: "", quantity_requested: "" } : it))}
                                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-900 text-xs py-2.5">
                                                    <option value="ingredient">Ingredient</option>
                                                    <option value="packaging_material">Packaging</option>
                                                </select>
                                            </div>

                                            <div className="col-span-5">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Item</label>
                                                <SearchSelect
                                                    options={options}
                                                    value={item.item_id}
                                                    onChange={(v) => setData("items", data.items.map((it, i) => i === idx ? { ...it, item_id: v, quantity_requested: "" } : it))}
                                                    placeholder="Cari item..."
                                                    renderOption={(o) => `${o.name} (${o.code})`} />
                                                {errors[`items.${idx}.item_id`] && <p className="text-red-500 text-xs mt-1">{errors[`items.${idx}.item_id`]}</p>}
                                            </div>

                                            <div className="col-span-4">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                                    Jumlah{stockInfo ? ` (${stockInfo.unit})` : ""}
                                                </label>
                                                <input type="number" min="1" step="1" max={stockInfo?.qty ?? undefined}
                                                    value={item.quantity_requested}
                                                    onChange={(e) => updateItem(idx, "quantity_requested", e.target.value)}
                                                    disabled={!item.item_id}
                                                    className={`w-full rounded-xl border text-sm text-right py-2.5 ${overflow ? "border-red-400 bg-red-50" : "border-slate-200 dark:bg-slate-900"}`}
                                                    placeholder="0" />
                                                {errors[`items.${idx}.quantity_requested`] && <p className="text-red-500 text-xs mt-1">{errors[`items.${idx}.quantity_requested`]}</p>}
                                            </div>

                                            <div className="col-span-1 flex items-end justify-center">
                                                {data.items.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(idx)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-5">
                                                        <IconTrash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {stockInfo && (
                                            <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border ${overflow ? "bg-red-100 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-600"}`}>
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
                    </div>

                    {/* Notes */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Catatan</label>
                        <textarea value={data.notes} onChange={(e) => setData("notes", e.target.value)}
                            rows={3} className="w-full rounded-xl border-slate-200 dark:bg-slate-950 text-sm resize-none" />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link href={route("stock-transfers.show", transfer.id)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">Batal</Link>
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
