import React, { useState, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconAlertCircle,
    IconInfoCircle, IconBottle, IconBox,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Create({ warehouses, ingredients, packagingMaterials }) {
    const { data, setData, post, processing, errors } = useForm({
        item_type:    "ingredient",
        warehouse_id: "",
        item_id:      "",
        quantity:     "",
        min_stock:    "",
        max_stock:    "",
        average_cost: "",
    });

    const [selectedItem,     setSelectedItem]     = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("");

    const isIngredient = data.item_type === "ingredient";
    const currentItems = isIngredient ? ingredients : packagingMaterials;

    // Group by category for filter tabs
    const groupedItems = currentItems.reduce((acc, item) => {
        const cat = item.category?.name || "Lainnya";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const filteredItems = selectedCategory
        ? (groupedItems[selectedCategory] || [])
        : currentItems;

    // Sync selected item when item_id or type changes
    useEffect(() => {
        setSelectedItem(
            data.item_id ? currentItems.find((i) => i.id === data.item_id) ?? null : null
        );
    }, [data.item_id, data.item_type]);

    // Reset item fields on type switch
    useEffect(() => {
        setData((d) => ({ ...d, item_id: "", quantity: "", min_stock: "", max_stock: "", average_cost: "" }));
        setSelectedItem(null);
        setSelectedCategory("");
    }, [data.item_type]);

    const getItemUnit = () => {
        if (!selectedItem) return "unit";
        return isIngredient ? selectedItem.unit : (selectedItem.size?.name || "pcs");
    };

    const totalValue = () =>
        (parseFloat(data.quantity) || 0) * (parseFloat(data.average_cost) || 0);

    const stockAlert = () => {
        const qty = parseFloat(data.quantity) || 0;
        const min = parseFloat(data.min_stock) || 0;
        const max = parseFloat(data.max_stock) || 0;
        // qty negatif tidak relevan di form input awal (validasi backend min:0)
        if (qty === 0)            return { type: "error",   message: "Stok kosong!" };
        if (min && qty < min)     return { type: "warning", message: "Stok di bawah minimum!" };
        if (max && qty > max)     return { type: "info",    message: "Stok melebihi maksimum!" };
        return null;
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("warehouse-stocks.store"), {
            onSuccess: () => toast.success("Stok gudang berhasil ditambahkan"),
        });
    };

    const alert = stockAlert();

    return (
        <>
            <Head title="Tambah Stok Gudang" />
            <div className="max-w-5xl mx-auto">
                <Link
                    href={route("warehouse-stocks.index")}
                    className="flex items-center gap-2 text-slate-500 mb-4 hover:text-primary-600 transition-all text-sm"
                >
                    <IconArrowLeft size={18} /> Kembali
                </Link>

                <form onSubmit={submit} className="space-y-6">
                    {/* Header banner */}
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <IconBox size={28} /> Tambah Stok Gudang Baru
                        </h2>
                        <p className="text-primary-100 text-sm mt-1">
                            Daftarkan stok ingredient atau packaging ke gudang
                        </p>
                    </div>

                    {/* Item type selector */}
                    <div className="bg-white dark:bg-slate-900 border-2 border-primary-200 rounded-2xl p-5">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                            Tipe Item *
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { type: "ingredient", label: "Ingredient", sub: "Bahan Baku",     Icon: IconBottle, color: "emerald" },
                                { type: "packaging",  label: "Packaging",  sub: "Kemasan & Botol", Icon: IconBox,    color: "violet"  },
                            ].map(({ type, label, sub, Icon, color }) => {
                                const active = data.item_type === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setData("item_type", type)}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                                            active
                                                ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
                                                : "border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-lg ${active ? `bg-${color}-500` : "bg-slate-200"}`}>
                                                <Icon size={22} className={active ? "text-white" : "text-slate-600"} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white text-sm">{label}</div>
                                                <div className="text-xs text-slate-500">{sub}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.item_type && (
                            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                                <IconAlertCircle size={13} /> {errors.item_type}
                            </p>
                        )}
                    </div>

                    {/* Main grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left: Form fields */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 space-y-5">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 border-b pb-2 text-sm">
                                Informasi Stok
                            </h3>

                            {/* Warehouse */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Pilih Gudang *
                                </label>
                                <select
                                    value={data.warehouse_id}
                                    onChange={(e) => setData("warehouse_id", e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-950 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">-- Pilih Gudang --</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.code})
                                        </option>
                                    ))}
                                </select>
                                {errors.warehouse_id && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <IconAlertCircle size={13} /> {errors.warehouse_id}
                                    </p>
                                )}
                            </div>

                            {/* Category filter tabs */}
                            {Object.keys(groupedItems).length > 1 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Filter Kategori
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategory("")}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                selectedCategory === ""
                                                    ? "bg-primary-500 text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            Semua
                                        </button>
                                        {Object.keys(groupedItems).map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                    selectedCategory === cat
                                                        ? "bg-primary-500 text-white"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Item select */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Pilih {isIngredient ? "Ingredient" : "Packaging"} *
                                </label>
                                <select
                                    value={data.item_id}
                                    onChange={(e) => setData("item_id", e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-950 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">-- Pilih Item --</option>
                                    {filteredItems.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} ({item.code})
                                            {!isIngredient && item.size ? ` — ${item.size.name}` : ""}
                                        </option>
                                    ))}
                                </select>
                                {errors.item_id && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <IconAlertCircle size={13} /> {errors.item_id}
                                    </p>
                                )}
                                {selectedItem && (
                                    <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                                        <strong>Kategori:</strong> {selectedItem.category?.name}
                                        &nbsp;·&nbsp;
                                        <strong>Satuan:</strong> {getItemUnit()}
                                    </div>
                                )}
                            </div>

                            {/* Quantity & Cost */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Jumlah Stok Awal *"
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={data.quantity}
                                    onChange={(e) => setData("quantity", e.target.value)}
                                    errors={errors.quantity}
                                    placeholder="0"
                                    suffix={getItemUnit()}
                                />
                                <Input
                                    label="Harga Rata-rata per Unit"
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    value={data.average_cost}
                                    onChange={(e) => setData("average_cost", e.target.value)}
                                    errors={errors.average_cost}
                                    placeholder="0.00"
                                    prefix="Rp"
                                />
                            </div>

                            {/* Stock limits — kedua tipe punya max_stock di migration */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Stok Minimum (Alert Low)"
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={data.min_stock}
                                    onChange={(e) => setData("min_stock", e.target.value)}
                                    errors={errors.min_stock}
                                    placeholder="0"
                                    suffix={getItemUnit()}
                                />
                                <Input
                                    label="Stok Maksimum (Alert Over)"
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={data.max_stock}
                                    onChange={(e) => setData("max_stock", e.target.value)}
                                    errors={errors.max_stock}
                                    placeholder="0"
                                    suffix={getItemUnit()}
                                />
                            </div>
                        </div>

                        {/* Right: Summary panel */}
                        <div className="space-y-4">
                            {data.quantity && data.average_cost && (
                                <div className="p-5 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl border border-primary-200 dark:border-primary-800">
                                    <p className="text-xs text-primary-700 dark:text-primary-300 mb-1 font-medium">
                                        Total Nilai Inventaris
                                    </p>
                                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                        {new Intl.NumberFormat("id-ID", {
                                            style: "currency",
                                            currency: "IDR",
                                            minimumFractionDigits: 0,
                                        }).format(totalValue())}
                                    </p>
                                    <p className="text-xs text-primary-500 mt-1">
                                        {parseInt(data.quantity, 10).toLocaleString("id-ID")} {getItemUnit()}
                                        &nbsp;×&nbsp;
                                        {new Intl.NumberFormat("id-ID", {
                                            style: "currency",
                                            currency: "IDR",
                                            minimumFractionDigits: 0,
                                        }).format(data.average_cost)}
                                    </p>
                                </div>
                            )}

                            {alert && (
                                <div className={`p-4 rounded-xl border flex items-center gap-2 ${
                                    alert.type === "error"   ? "bg-red-50 border-red-200" :
                                    alert.type === "warning" ? "bg-yellow-50 border-yellow-200" :
                                                               "bg-blue-50 border-blue-200"
                                }`}>
                                    <IconAlertCircle size={17} className={
                                        alert.type === "error"
                                            ? "text-red-500"
                                            : alert.type === "warning"
                                            ? "text-yellow-500"
                                            : "text-blue-500"
                                    } />
                                    <p className={`text-sm font-bold ${
                                        alert.type === "error"
                                            ? "text-red-700"
                                            : alert.type === "warning"
                                            ? "text-yellow-700"
                                            : "text-blue-700"
                                    }`}>
                                        {alert.message}
                                    </p>
                                </div>
                            )}

                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-start gap-2">
                                    <IconInfoCircle size={16} className="text-slate-500 mt-0.5 shrink-0" />
                                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                        <p className="font-bold">Catatan:</p>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            <li>Stok awal hanya diinput sekali</li>
                                            <li>Perubahan qty via Stock Movement</li>
                                            <li>Min stock → alert Low Stock</li>
                                            <li>Max stock → alert Overstock</li>
                                            <li>Harga rata-rata untuk valuasi aset</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3">
                        <Link
                            href={route("warehouse-stocks.index")}
                            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-7 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold flex items-center gap-2 hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 text-sm"
                        >
                            <IconDeviceFloppy size={18} />
                            {processing ? "Menyimpan..." : "Simpan Stok Gudang"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
