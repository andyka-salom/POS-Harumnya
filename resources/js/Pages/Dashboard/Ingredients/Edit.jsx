import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconPhoto,
    IconLock, IconInfoCircle, IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

const INGREDIENT_TYPE_CONFIG = {
    oil:     { label: "Fragrance Oil", desc: "Bibit parfum, essential oil, dll" },
    alcohol: { label: "Alkohol",       desc: "Ethanol, isopropyl alcohol, dll" },
    other:   { label: "Lainnya",       desc: "Air suling, fixative, dll" },
};

const UNITS = [
    { value: "ml",    label: "ml — mililiter" },
    { value: "gr",    label: "gr — gram" },
    { value: "kg",    label: "kg — kilogram" },
    { value: "liter", label: "liter" },
    { value: "pcs",   label: "pcs — pieces" },
];

const fmt = (v = 0) => Number(v || 0).toLocaleString("id-ID");

export default function Edit({ ingredient, categories }) {
    const [preview, setPreview] = useState(ingredient.image_url ?? null);

    const { data, setData, post, processing, errors } = useForm({
        _method:                "PUT",
        ingredient_category_id: ingredient.ingredient_category_id || "",
        code:                   ingredient.code        || "",
        name:                   ingredient.name        || "",
        unit:                   ingredient.unit        || "ml",
        sort_order:             ingredient.sort_order  ?? 0,
        description:            ingredient.description || "",
        image:                  null,
        is_active:              !!ingredient.is_active,
    });

    const selectedCategory = categories.find(c => c.id === data.ingredient_category_id);
    const avgCost = parseFloat(ingredient.average_cost || 0);

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
        post(route("ingredients.update", ingredient.id), {
            forceFormData: true,
            onSuccess: () => toast.success("Bahan baku berhasil diperbarui"),
            onError:   () => toast.error("Periksa kembali form Anda"),
        });
    };

    return (
        <>
            <Head title={`Edit — ${ingredient.name}`} />
            <div className="max-w-5xl mx-auto px-4 py-6">
                <Link
                    href={route("ingredients.index")}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-5 font-medium transition-colors"
                >
                    <IconArrowLeft size={16} /> Kembali ke Daftar Bahan
                </Link>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Edit Bahan Baku</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        <span className="font-mono text-slate-400">{ingredient.code}</span>
                        {" · "}
                        {ingredient.name}
                    </p>
                </div>

                <form onSubmit={submit} encType="multipart/form-data">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── Kolom Kiri (2/3) ─────────────────────────────────── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Informasi Utama */}
                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                <h2 className="text-base font-bold mb-5 text-slate-800 dark:text-white">
                                    Ubah Data Bahan Baku
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <Input
                                        label="Kode Bahan"
                                        required
                                        value={data.code}
                                        onChange={e => setData("code", e.target.value.toUpperCase())}
                                        errors={errors.code}
                                    />
                                    <Input
                                        type="number"
                                        label="Urutan Tampil"
                                        value={data.sort_order}
                                        onChange={e => setData("sort_order", Number(e.target.value))}
                                        errors={errors.sort_order}
                                    />
                                </div>

                                <div className="mb-4">
                                    <Input
                                        label="Nama Bahan Baku"
                                        required
                                        value={data.name}
                                        onChange={e => setData("name", e.target.value)}
                                        errors={errors.name}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {/* Kategori */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">
                                            Kategori <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.ingredient_category_id}
                                            onChange={e => setData("ingredient_category_id", e.target.value)}
                                            className="w-full h-10 rounded-xl border-slate-300 dark:bg-slate-950 dark:border-slate-700 text-sm"
                                            required
                                        >
                                            <option value="">Pilih Kategori</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} ({c.code})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.ingredient_category_id && (
                                            <p className="text-red-500 text-xs mt-1">{errors.ingredient_category_id}</p>
                                        )}
                                        {selectedCategory && (
                                            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                                                <span>Tipe scaling:</span>
                                                <span className="font-bold text-emerald-600">
                                                    {INGREDIENT_TYPE_CONFIG[selectedCategory.ingredient_type]?.label ?? "—"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Satuan */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">
                                            Satuan <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.unit}
                                            onChange={e => setData("unit", e.target.value)}
                                            className="w-full h-10 rounded-xl border-slate-300 dark:bg-slate-950 dark:border-slate-700 text-sm"
                                        >
                                            {UNITS.map(u => (
                                                <option key={u.value} value={u.value}>{u.label}</option>
                                            ))}
                                        </select>
                                        {errors.unit && (
                                            <p className="text-red-500 text-xs mt-1">{errors.unit}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5 dark:text-slate-300">
                                        Deskripsi
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={data.description}
                                        onChange={e => setData("description", e.target.value)}
                                        className="w-full rounded-xl border-slate-300 dark:bg-slate-950 dark:border-slate-700 text-sm"
                                        placeholder="Keterangan tambahan..."
                                    />
                                    {errors.description && (
                                        <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* HPP / Average Cost — Readonly */}
                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <IconLock size={15} className="text-slate-400" />
                                        HPP / Biaya Rata-rata (WAC)
                                    </h3>
                                    <span className={`text-xl font-bold font-mono ${
                                        avgCost > 0
                                            ? "text-slate-800 dark:text-white"
                                            : "text-slate-300"
                                    }`}>
                                        {avgCost > 0
                                            ? `Rp ${fmt(Math.round(avgCost))} / ${ingredient.unit}`
                                            : "Belum ada data PO"
                                        }
                                    </span>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    <IconInfoCircle size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-slate-500">
                                        Otomatis diperbarui via <strong>Weighted Average Cost</strong> setiap kali
                                        Purchase Order diterima. Tidak dapat diubah secara manual.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Kolom Kanan (1/3) ────────────────────────────────── */}
                        <div className="space-y-5">
                            {/* Upload Foto */}
                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                                <h3 className="font-bold mb-3 text-sm dark:text-white">Foto Bahan</h3>
                                <div
                                    className="w-full aspect-square rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-emerald-400 transition-colors group"
                                    onClick={() => document.getElementById('image-upload-edit').click()}
                                >
                                    {preview ? (
                                        <>
                                            <img src={preview} className="w-full h-full object-cover" alt="preview" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Ganti foto
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeImage}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <IconX size={12} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <IconPhoto size={36} />
                                            <span className="text-xs text-center px-4">Klik untuk upload foto</span>
                                        </div>
                                    )}
                                    <input
                                        id="image-upload-edit"
                                        type="file"
                                        accept="image/jpg,image/jpeg,image/png,image/webp"
                                        onChange={handleImage}
                                        className="hidden"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-center">
                                    JPG, PNG, WebP · Maks 2MB
                                </p>
                                {errors.image && (
                                    <p className="text-red-500 text-xs mt-1 text-center">{errors.image}</p>
                                )}
                            </div>

                            {/* Toggle Status */}
                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-bold dark:text-white">Status Aktif</span>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Bahan muncul di semua menu
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={e => setData("is_active", e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-checked:bg-emerald-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-400 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                                    </label>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 transition-colors"
                            >
                                {processing ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <IconDeviceFloppy size={20} />
                                )}
                                {processing ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>

                            <Link
                                href={route("ingredients.index")}
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
