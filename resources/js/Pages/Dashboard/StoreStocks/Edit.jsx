import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import { IconArrowLeft, IconDeviceFloppy, IconAlertCircle, IconLock } from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Edit({ stock, itemType }) {
    const isIngredient = itemType === "ingredient";

    const { data, setData, put, processing, errors } = useForm({
        item_type: itemType,
        min_stock: stock.min_stock ?? "",
        // Kedua tipe punya max_stock per migration terbaru
        max_stock: stock.max_stock ?? "",
    });

    const submit = (e) => {
        e.preventDefault();
        put(route("store-stocks.update", { id: stock.id, item_type: itemType }), {
            onSuccess: () => toast.success("Pengaturan stok berhasil diperbarui"),
        });
    };

    // quantity adalah bigInteger (signed) — parseInt
    const fmtNum = (n) =>
        Number.isFinite(parseInt(n, 10))
            ? parseInt(n, 10).toLocaleString("id-ID")
            : "-";

    const fmtCur = (n) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(n || 0);

    const getItemName = () => isIngredient ? stock.ingredient?.name             : stock.packaging_material?.name;
    const getItemCode = () => isIngredient ? stock.ingredient?.code             : stock.packaging_material?.code;
    const getItemUnit = () =>
        isIngredient
            ? (stock.ingredient?.unit || "unit")
            : (stock.packaging_material?.size?.name || "pcs");

    const currentQty = parseInt(stock.quantity ?? 0, 10);

    const stockStatusPreview = () => {
        const min = parseInt(data.min_stock, 10) || 0;
        const max = parseInt(data.max_stock, 10) || 0;
        if (currentQty < 0)              return { label: "Negatif",    cls: "bg-red-100 text-red-700 border-red-300"        };
        if (currentQty === 0)            return { label: "Habis",      cls: "bg-slate-100 text-slate-700 border-slate-300"  };
        if (min > 0 && currentQty < min) return { label: "Low Stock",  cls: "bg-danger-100 text-danger-700 border-danger-300"  };
        if (max > 0 && currentQty > max) return { label: "Over Stock", cls: "bg-warning-100 text-warning-700 border-warning-300" };
        return                                  { label: "Normal",     cls: "bg-success-100 text-success-700 border-success-300" };
    };

    return (
        <>
            <Head title="Edit Pengaturan Stok" />
            <div className="max-w-4xl mx-auto">
                <Link
                    href={route("store-stocks.index", { item_type: itemType })}
                    className="flex items-center gap-2 text-slate-500 mb-4 hover:text-primary-600 transition-all text-sm"
                >
                    <IconArrowLeft size={18} /> Kembali
                </Link>

                <form
                    onSubmit={submit}
                    className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6"
                >
                    {/* Title */}
                    <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            Edit Pengaturan Stok {isIngredient ? "Ingredient" : "Packaging"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Update batas minimum dan maksimum stok toko
                        </p>
                    </div>

                    {/* Read-only info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <ReadOnlyField
                            label="Toko / Cabang"
                            primary={stock.store?.name}
                            secondary={stock.store?.code}
                        />
                        <ReadOnlyField
                            label={isIngredient ? "Ingredient" : "Packaging"}
                            primary={getItemName()}
                            secondary={`${getItemCode()} · ${getItemUnit()}`}
                        />
                        <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Stok Saat Ini
                            </p>
                            <div className={`p-3 rounded-lg border ${
                                currentQty < 0
                                    ? "bg-red-50 dark:bg-red-900/20 border-red-200"
                                    : "bg-primary-50 dark:bg-primary-900/20 border-primary-200"
                            }`}>
                                <div className={`text-2xl font-bold ${currentQty < 0 ? "text-red-600" : "text-primary-600"}`}>
                                    {fmtNum(currentQty)}
                                </div>
                                <div className={`text-xs ${currentQty < 0 ? "text-red-500" : "text-primary-500"}`}>
                                    {getItemUnit()}
                                    {currentQty < 0 && (
                                        <span className="ml-2 font-bold">(Stok Negatif — darurat)</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Nilai Inventaris
                            </p>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                                <div className="text-xl font-bold text-green-600">{fmtCur(stock.total_value)}</div>
                                <div className="text-xs text-green-500">@ {fmtCur(stock.average_cost)}/unit</div>
                            </div>
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2">
                            <IconAlertCircle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                <p className="font-bold mb-1">Informasi Penting:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-xs">
                                    <li>Quantity stok <strong>TIDAK BISA</strong> diedit manual</li>
                                    <li>Perubahan quantity hanya melalui <strong>Stock Movement</strong></li>
                                    <li>Stok negatif terjadi akibat pengambilan darurat</li>
                                    <li>Halaman ini untuk mengatur batas minimum &amp; maksimum</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Editable fields — kedua tipe punya max_stock */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Stok Minimum (Alert Low Stock)"
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
                            label="Stok Maksimum (Alert Over Stock)"
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

                    {/* Status preview */}
                    {(data.min_stock || data.max_stock) && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                Preview Status Stok:
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                                <Stat
                                    label="Saat Ini"
                                    value={`${fmtNum(currentQty)} ${getItemUnit()}`}
                                    cls={currentQty < 0 ? "text-red-600" : "text-primary-600"}
                                />
                                {data.min_stock && (
                                    <Stat label="Min" value={fmtNum(data.min_stock)} cls="text-danger-600" />
                                )}
                                {data.max_stock && (
                                    <Stat label="Max" value={fmtNum(data.max_stock)} cls="text-warning-600" />
                                )}
                                {(() => {
                                    const { label, cls } = stockStatusPreview();
                                    return (
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
                                            {label}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Link
                            href={route("store-stocks.show", { id: stock.id, item_type: itemType })}
                            className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
                        >
                            Lihat Detail &amp; Riwayat →
                        </Link>
                        <div className="flex gap-3">
                            <Link
                                href={route("store-stocks.index", { item_type: itemType })}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-7 py-2.5 bg-primary-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                <IconDeviceFloppy size={18} />
                                {processing ? "Menyimpan..." : "Update Pengaturan"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

function ReadOnlyField({ label, primary, secondary }) {
    return (
        <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">{label}</p>
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200">
                <IconLock size={14} className="text-slate-400 shrink-0" />
                <div>
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">{primary}</div>
                    {secondary && <div className="text-xs text-slate-500">{secondary}</div>}
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, cls }) {
    return (
        <div>
            <span className="text-slate-500">{label}: </span>
            <span className={`font-bold ${cls}`}>{value}</span>
        </div>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
