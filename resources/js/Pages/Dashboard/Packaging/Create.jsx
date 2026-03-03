import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconPackage,
    IconPhoto, IconCoin, IconInfoCircle,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

const fmt = (v = 0) => Number(v || 0).toLocaleString("id-ID");

export default function Create({ categories, sizes }) {
    const [preview, setPreview] = useState(null);

    const { data, setData, post, processing, errors } = useForm({
        packaging_category_id: "",
        code:                  "",
        name:                  "",
        unit:                  "pcs",
        size_id:               "",
        image:                 null,
        description:           "",
        // Pricing — sesuai migration 003
        purchase_price:        0,
        selling_price:         0,
        // Status
        is_available_as_addon: true,
        is_active:             true,
        sort_order:            0,
    });

    const handleImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData("image", file);
        setPreview(URL.createObjectURL(file));
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("packaging.store"), {
            onSuccess: () => toast.success("Material kemasan berhasil disimpan"),
            onError:   () => toast.error("Periksa kembali form Anda"),
        });
    };

    // Hitung margin preview
    const margin = data.selling_price > 0 && data.purchase_price > 0
        ? (((data.selling_price - data.purchase_price) / data.selling_price) * 100).toFixed(1)
        : null;

    return (
        <>
            <Head title="Tambah Kemasan" />
            <div className="max-w-5xl mx-auto px-4 py-6">
                <Link href={route("packaging.index")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 font-medium">
                    <IconArrowLeft size={16} /> Kembali ke Daftar Kemasan
                </Link>

                <form onSubmit={submit} encType="multipart/form-data">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── Kolom Kiri (2/3) ── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Info Dasar */}
                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                <h2 className="text-base font-bold mb-5 flex items-center gap-2 text-slate-800 dark:text-white">
                                    <IconPackage size={18} className="text-violet-600" /> Informasi Dasar
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <Input
                                        label="Kode (SKU)" required
                                        value={data.code}
                                        onChange={e => setData("code", e.target.value.toUpperCase())}
                                        errors={errors.code}
                                        placeholder="BTL-50ML-001"
                                    />
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">
                                            Kategori <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.packaging_category_id}
                                            onChange={e => setData("packaging_category_id", e.target.value)}
                                            className="w-full rounded-xl border-slate-300 dark:bg-slate-950 dark:border-slate-700 text-sm h-10"
                                        >
                                            <option value="">Pilih Kategori</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        {errors.packaging_category_id && (
                                            <p className="text-red-500 text-xs mt-1">{errors.packaging_category_id}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <Input
                                        label="Nama Kemasan" required
                                        value={data.name}
                                        onChange={e => setData("name", e.target.value)}
                                        errors={errors.name}
                                        placeholder="Botol Spray 50ml"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <Input
                                        label="Satuan" required
                                        value={data.unit}
                                        onChange={e => setData("unit", e.target.value)}
                                        errors={errors.unit}
                                        placeholder="pcs, box, set"
                                    />
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">
                                            Ukuran (Opsional)
                                        </label>
                                        <select
                                            value={data.size_id}
                                            onChange={e => setData("size_id", e.target.value)}
                                            className="w-full rounded-xl border-slate-300 dark:bg-slate-950 dark:border-slate-700 text-sm h-10"
                                        >
                                            <option value="">Semua Ukuran</option>
                                            {sizes.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Input
                                        type="number" label="Urutan Tampil"
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
                                        className="w-full rounded-xl border-slate-300 dark:bg-slate-950 dark:border-slate-700 text-sm"
                                        placeholder="Keterangan tambahan..."
                                    />
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                <h2 className="text-base font-bold mb-1 flex items-center gap-2 text-slate-800 dark:text-white">
                                    <IconCoin size={18} className="text-amber-500" /> Harga
                                </h2>
                                <p className="text-xs text-slate-400 mb-5 flex items-center gap-1">
                                    <IconInfoCircle size={13} />
                                    <span>
                                        <strong>Harga Beli</strong> = referensi awal.
                                        <strong> Harga Jual</strong> = harga saat dijual sebagai add-on di POS.
                                        Biaya rata-rata (HPP) akan otomatis update saat barang diterima dari purchase order.
                                    </span>
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Purchase Price */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">
                                            Harga Beli (Rp)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={data.purchase_price ? fmt(data.purchase_price) : ""}
                                                onChange={e => setData("purchase_price", Number(e.target.value.replace(/\D/g, "")))}
                                                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                                placeholder="0"
                                            />
                                        </div>
                                        {errors.purchase_price && (
                                            <p className="text-red-500 text-xs mt-1">{errors.purchase_price}</p>
                                        )}
                                        <p className="text-[11px] text-slate-400 mt-1">Harga beli standar dari supplier</p>
                                    </div>

                                    {/* Selling Price */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">
                                            Harga Jual Add-on (Rp)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={data.selling_price ? fmt(data.selling_price) : ""}
                                                onChange={e => setData("selling_price", Number(e.target.value.replace(/\D/g, "")))}
                                                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                                placeholder="0"
                                            />
                                        </div>
                                        {errors.selling_price && (
                                            <p className="text-red-500 text-xs mt-1">{errors.selling_price}</p>
                                        )}
                                        <p className="text-[11px] text-slate-400 mt-1">Harga yang ditagih ke pelanggan saat jadi add-on</p>
                                    </div>
                                </div>

                                {/* Margin Preview */}
                                {margin !== null && (
                                    <div className={`mt-4 p-3 rounded-xl flex items-center justify-between text-sm ${
                                        parseFloat(margin) >= 0
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900"
                                            : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                                    }`}>
                                        <span className="text-slate-600 dark:text-slate-400">Estimasi Margin Add-on</span>
                                        <div className="text-right">
                                            <span className={`font-bold text-base ${parseFloat(margin) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                {margin}%
                                            </span>
                                            <span className={`block text-xs ${parseFloat(margin) >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                                                Rp {fmt(data.selling_price - data.purchase_price)} / unit
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Kolom Kanan (1/3) ── */}
                        <div className="space-y-6">

                            {/* Image Upload */}
                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                <h3 className="font-bold mb-4 text-sm dark:text-white">Gambar Produk</h3>
                                <div className="w-full aspect-square rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-violet-400 transition-colors group">
                                    {preview
                                        ? <img src={preview} className="w-full h-full object-cover" alt="preview" />
                                        : (
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <IconPhoto size={40} />
                                                <span className="text-xs">Klik untuk upload</span>
                                            </div>
                                        )
                                    }
                                    <input
                                        type="file"
                                        accept="image/jpg,image/jpeg,image/png,image/webp"
                                        onChange={handleImage}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-center">JPG, PNG, WebP · Maks 2MB</p>
                            </div>

                            {/* Toggle Options */}
                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-bold dark:text-white">Addon POS</span>
                                        <p className="text-[11px] text-slate-400">Tampil sebagai pilihan add-on di kasir</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.is_available_as_addon}
                                            onChange={e => setData("is_available_as_addon", e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-checked:bg-violet-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-violet-400 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                                    </label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-bold dark:text-white">Status Aktif</span>
                                        <p className="text-[11px] text-slate-400">Material muncul di semua menu</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={e => setData("is_active", e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-checked:bg-violet-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-violet-400 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                                    </label>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-lg shadow-violet-200 dark:shadow-none flex items-center justify-center gap-2 transition-colors"
                            >
                                {processing
                                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <IconDeviceFloppy size={20} />
                                }
                                Simpan Kemasan
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = page => <DashboardLayout children={page} />;
