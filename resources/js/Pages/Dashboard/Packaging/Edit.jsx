import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconPhoto,
    IconCoin, IconInfoCircle, IconLock, IconPackage,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

const fmt = (v = 0) => Number(v || 0).toLocaleString("id-ID");

// ─── Custom Select (tidak double arrow) ────────────────────────────────────────
function Select({ label, required, value, onChange, errors, children }) {
    return (
        <div>
            {label && (
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    value={value}
                    onChange={onChange}
                    required={required}
                    className={`appearance-none w-full h-10 pl-3 pr-8 rounded-xl border bg-white dark:bg-slate-950 dark:text-white text-sm
                        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all
                        ${errors ? "border-red-400" : "border-slate-300 dark:border-slate-700"}`}
                >
                    {children}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {errors && <p className="text-red-500 text-xs mt-1">{errors}</p>}
        </div>
    );
}

// ─── Price Input ───────────────────────────────────────────────────────────────
function PriceInput({ label, value, onChange, hint, errors, readOnly = false }) {
    return (
        <div>
            {label && (
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">
                    {readOnly && <IconLock size={12} className="inline mr-1 text-slate-400" />}
                    {label}
                </label>
            )}
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                <input
                    type="text"
                    inputMode="numeric"
                    readOnly={readOnly}
                    value={readOnly ? fmt(Math.round(value)) : (value ? fmt(value) : "")}
                    onChange={readOnly ? undefined : e => onChange(Number(e.target.value.replace(/\D/g, "")))}
                    placeholder={readOnly ? undefined : "0"}
                    className={`w-full h-10 pl-10 pr-3 rounded-xl border text-sm transition-all
                        ${readOnly
                            ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
                            : `bg-white dark:bg-slate-950 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                               ${errors ? "border-red-400" : "border-slate-300 dark:border-slate-700"}`
                        }`}
                />
            </div>
            {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
            {errors && <p className="text-red-500 text-xs mt-1">{errors}</p>}
        </div>
    );
}

export default function Edit({ packaging, categories, sizes }) {
    const [preview, setPreview] = useState(packaging.image_url ?? null);

    const { data, setData, post, processing, errors } = useForm({
        _method:                "PUT",
        packaging_category_id:  packaging.packaging_category_id || "",
        code:                   packaging.code        || "",
        name:                   packaging.name        || "",
        unit:                   packaging.unit        || "pcs",
        size_id:                packaging.size_id     || "",
        image:                  null,   // null = tidak ada file baru → foto lama dipertahankan
        description:            packaging.description || "",
        purchase_price:         packaging.purchase_price  || 0,
        selling_price:          packaging.selling_price   || 0,
        is_available_as_addon:  !!packaging.is_available_as_addon,
        is_active:              !!packaging.is_active,
        sort_order:             packaging.sort_order  ?? 0,
    });

    const handleImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData("image", file);
        setPreview(URL.createObjectURL(file));
    };

    const removeImage = (e) => {
        e.stopPropagation();
        setData("image", null);
        setPreview(null);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("packaging.update", packaging.id), {
            forceFormData: true,    // WAJIB agar file gambar terkirim
            onSuccess: () => toast.success("Perubahan berhasil disimpan"),
            onError:   () => toast.error("Periksa kembali form Anda"),
        });
    };

    const avgCost = parseFloat(packaging.average_cost || 0);
    const margin  = data.selling_price > 0 && avgCost > 0
        ? (((data.selling_price - avgCost) / data.selling_price) * 100).toFixed(1)
        : null;

    return (
        <>
            <Head title={`Edit ${packaging.name}`} />
            <div className="max-w-5xl mx-auto px-4 py-6">
                <Link
                    href={route("packaging.index")}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 mb-5 font-medium transition-colors"
                >
                    <IconArrowLeft size={16} /> Kembali ke Daftar Kemasan
                </Link>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl text-teal-600">
                        <IconPackage size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Edit Kemasan</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            <span className="font-mono text-slate-400">{packaging.code}</span> · {packaging.name}
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} encType="multipart/form-data">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── Kolom Kiri ──────────────────────────────────── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Info Dasar */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                <h2 className="text-base font-bold mb-5 text-slate-800 dark:text-white">Ubah Informasi Kemasan</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <Input
                                        label="Kode (SKU)" required
                                        value={data.code}
                                        onChange={e => setData("code", e.target.value.toUpperCase())}
                                        errors={errors.code}
                                    />
                                    <Select
                                        label="Kategori" required
                                        value={data.packaging_category_id}
                                        onChange={e => setData("packaging_category_id", e.target.value)}
                                        errors={errors.packaging_category_id}
                                    >
                                        <option value="">Pilih Kategori</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="mb-4">
                                    <Input
                                        label="Nama Kemasan" required
                                        value={data.name}
                                        onChange={e => setData("name", e.target.value)}
                                        errors={errors.name}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <Input
                                        label="Satuan" required
                                        value={data.unit}
                                        onChange={e => setData("unit", e.target.value)}
                                        errors={errors.unit}
                                    />
                                    <Select
                                        label="Ukuran"
                                        value={data.size_id}
                                        onChange={e => setData("size_id", e.target.value)}
                                    >
                                        <option value="">Semua Ukuran</option>
                                        {sizes.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </Select>
                                    <Input
                                        type="number" label="Urutan"
                                        value={data.sort_order}
                                        onChange={e => setData("sort_order", Number(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Deskripsi</label>
                                    <textarea
                                        rows={3}
                                        value={data.description}
                                        onChange={e => setData("description", e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                                        placeholder="Keterangan tambahan..."
                                    />
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                <h2 className="text-base font-bold mb-1 flex items-center gap-2 text-slate-800 dark:text-white">
                                    <IconCoin size={18} className="text-amber-500" /> Harga
                                </h2>
                                <div className="flex items-start gap-2 mb-5">
                                    <IconInfoCircle size={13} className="text-teal-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-slate-500">
                                        Biaya Rata-rata (HPP) otomatis diperbarui saat menerima Purchase Order. Tidak dapat diubah manual.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <PriceInput
                                        label="Harga Beli (Rp)"
                                        value={data.purchase_price}
                                        onChange={v => setData("purchase_price", v)}
                                        hint="Harga beli standar"
                                        errors={errors.purchase_price}
                                    />
                                    <PriceInput
                                        label="Harga Jual Add-on (Rp)"
                                        value={data.selling_price}
                                        onChange={v => setData("selling_price", v)}
                                        hint="Harga ke pelanggan di POS"
                                        errors={errors.selling_price}
                                    />
                                    <PriceInput
                                        label="HPP / Biaya Rata-rata"
                                        value={avgCost}
                                        hint="Auto-update dari Purchase"
                                        readOnly
                                    />
                                </div>

                                {margin !== null && (
                                    <div className={`mt-4 p-3 rounded-xl flex items-center justify-between text-sm ${
                                        parseFloat(margin) >= 0
                                            ? "bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900"
                                            : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                                    }`}>
                                        <div>
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">Margin Add-on (vs HPP aktual)</span>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Jual {fmt(data.selling_price)} − HPP {fmt(Math.round(avgCost))}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`font-bold text-lg ${parseFloat(margin) >= 0 ? "text-teal-600" : "text-red-500"}`}>
                                                {margin}%
                                            </span>
                                            <span className={`block text-xs ${parseFloat(margin) >= 0 ? "text-teal-500" : "text-red-400"}`}>
                                                Rp {fmt(data.selling_price - Math.round(avgCost))} / unit
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {avgCost > 0 && data.selling_price > 0 && avgCost > data.selling_price && (
                                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 flex items-center gap-2">
                                        ⚠️ <strong>Harga jual lebih rendah dari HPP!</strong> Rugi Rp {fmt(Math.round(avgCost) - data.selling_price)} per unit.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Kolom Kanan ─────────────────────────────────── */}
                        <div className="space-y-5">
                            {/* Foto */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                                <h3 className="font-bold mb-3 text-sm dark:text-white">Gambar Produk</h3>
                                <div
                                    className="w-full aspect-square rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-teal-400 transition-colors group"
                                    onClick={() => document.getElementById('pkg-img-edit').click()}
                                >
                                    {preview ? (
                                        <>
                                            <img src={preview} className="w-full h-full object-cover" alt="preview" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Ganti foto</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeImage}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <IconPhoto size={36} />
                                            <span className="text-xs text-center px-4">Klik untuk upload foto</span>
                                        </div>
                                    )}
                                    <input
                                        id="pkg-img-edit"
                                        type="file"
                                        accept="image/jpg,image/jpeg,image/png,image/webp"
                                        onChange={handleImage}
                                        className="hidden"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-center">
                                    {preview && !data.image ? "Foto saat ini · Klik untuk ganti" : "JPG, PNG, WebP · Maks 2MB"}
                                </p>
                                {errors.image && <p className="text-red-500 text-xs mt-1 text-center">{errors.image}</p>}
                            </div>

                            {/* Toggles */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                                {[
                                    { key: "is_available_as_addon", label: "Addon POS",    desc: "Tampil di kasir sebagai add-on" },
                                    { key: "is_active",             label: "Status Aktif", desc: "Material muncul di semua menu" },
                                ].map(({ key, label, desc }) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-bold dark:text-white">{label}</span>
                                            <p className="text-[11px] text-slate-400">{desc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={data[key]}
                                                onChange={e => setData(key, e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-checked:bg-teal-500 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-400 dark:peer-focus:ring-teal-800 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 transition-colors"
                            >
                                {processing
                                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <IconDeviceFloppy size={20} />
                                }
                                {processing ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>

                            <Link
                                href={route("packaging.index")}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl flex items-center justify-center text-sm transition-colors"
                            >
                                Batal
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = page => <DashboardLayout children={page} />;
