import React, { useState, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconAlertCircle,
    IconInfoCircle, IconBottle, IconBox,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Create({ stores, ingredients, packagingMaterials }) {
    const { data, setData, post, processing, errors } = useForm({
        item_type:    "ingredient",
        store_id:     "",
        item_id:      "",
        quantity:     "",
        min_stock:    "",
        max_stock:    "",   // kedua tipe punya max_stock di migration
        average_cost: "",
    });

    const [selectedItem,     setSelectedItem]     = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("");

    const isIngredient = data.item_type === "ingredient";
    const currentItems = isIngredient ? ingredients : packagingMaterials;

    const groupedItems = currentItems.reduce((acc, item) => {
        const cat = item.category?.name || "Lainnya";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const filteredItems = selectedCategory
        ? (groupedItems[selectedCategory] || [])
        : currentItems;

    useEffect(() => {
        setSelectedItem(
            data.item_id ? currentItems.find((i) => i.id === data.item_id) ?? null : null
        );
    }, [data.item_id, data.item_type]);

    useEffect(() => {
        setData((d) => ({
            ...d,
            item_id: "", quantity: "", min_stock: "", max_stock: "", average_cost: "",
        }));
        setSelectedItem(null);
        setSelectedCategory("");
    }, [data.item_type]);

    const getItemUnit = () => {
        if (!selectedItem) return "unit";
        return isIngredient ? selectedItem.unit : (selectedItem.size?.name || "pcs");
    };

    const totalValue = () =>
        (parseInt(data.quantity, 10) || 0) * (parseFloat(data.average_cost) || 0);

    const submit = (e) => {
        e.preventDefault();
        post(route("store-stocks.store"), {
            onSuccess: () => toast.success("Stok toko berhasil ditambahkan"),
        });
    };

    return (
        <>
            <Head title="Tambah Stok Toko" />
            <div className="max-w-5xl mx-auto">
                <Link
                    href={route("store-stocks.index")}
                    className="flex items-center gap-2 text-slate-500 mb-4 hover:text-primary-600 transition-all text-sm"
                >
                    <IconArrowLeft size={18} /> Kembali
                </Link>

                <form onSubmit={submit} className="space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl p-6 shadow-lg">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <IconBox size={28} /> Tambah Stok Toko Baru
                        </h2>
                        <p className="text-primary-100 text-sm mt-1">
                            Tambahkan stok ingredient atau packaging ke cabang toko
                        </p>
                    </div>

                    {/* Item type selector */}
                    <div className="bg-white dark:bg-slate-900 border-2 border-primary-200 rounded-2xl p-5">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Tipe Item *</p>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { type: "ingredient", label: "Ingredient", sub: "Bahan Baku",      Icon: IconBottle, color: "emerald" },
                                { type: "packaging",  label: "Packaging",  sub: "Kemasan & Botol",  Icon: IconBox,    color: "violet"  },
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

                    {/* Form body */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 space-y-5">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 border-b pb-2 text-sm">
                            Informasi Stok
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Store select */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Pilih Toko / Cabang *
                                </label>
                                <select
                                    value={data.store_id}
                                    onChange={(e) => setData("store_id", e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-950 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">-- Pilih Toko --</option>
                                    {stores.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                                {errors.store_id && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <IconAlertCircle size={13} /> {errors.store_id}
                                    </p>
                                )}
                            </div>

                            {/* Quantity — bigInteger, step=1 */}
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

                        {/* Stock limits — kedua tipe punya min + max di migration */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                        {/* Total value preview */}
                        {data.quantity && data.average_cost && (
                            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200">
                                <p className="text-xs text-primary-700 dark:text-primary-300 mb-1">
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
                    </div>

                    {/* Info box */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex gap-3 items-start">
                        <IconInfoCircle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                            <p className="font-bold mb-1">Informasi:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-xs">
                                <li>Pastikan toko dan item yang dipilih sudah benar</li>
                                <li>Stok minimum digunakan untuk notifikasi low stock</li>
                                <li>Stok maksimum digunakan untuk notifikasi overstock</li>
                                <li>Perubahan stok selanjutnya hanya via Stock Movement</li>
                            </ul>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Link
                            href={route("store-stocks.index")}
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
                            {processing ? "Menyimpan..." : "Simpan Stok"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
