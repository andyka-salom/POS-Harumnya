import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import Button from "@/Components/Dashboard/Button";
import {
    IconArrowLeft, IconDeviceFloppy, IconTag,
    IconAlertTriangle, IconTrash, IconListCheck,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// =============================================================================
// Variant Mode Selector
// =============================================================================

function VariantModeSelector({ value, onChange }) {
    return (
        <div className="space-y-3">
            {/* Semua Variant */}
            <button
                type="button"
                onClick={() => onChange(true)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    value
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
            >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    value ? "border-green-500 bg-green-500" : "border-slate-300 dark:border-slate-600"
                }`}>
                    {value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Semua Variant</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Toko dalam kategori ini boleh menjual semua variant aktif tanpa pembatasan.
                        Variant baru otomatis tersedia.
                    </p>
                </div>
            </button>

            {/* Whitelist */}
            <button
                type="button"
                onClick={() => onChange(false)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    !value
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
            >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    !value ? "border-amber-500 bg-amber-500" : "border-slate-300 dark:border-slate-600"
                }`}>
                    {!value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Whitelist Variant</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Hanya variant yang dikonfigurasi secara eksplisit yang boleh dijual.
                        Variant baru <strong>tidak otomatis</strong> muncul.
                    </p>
                </div>
            </button>

            {!value && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <IconAlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                        Mode whitelist aktif. Pastikan variant sudah dikonfigurasi melalui halaman{" "}
                        <strong>Kelola Variant</strong>.
                    </p>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Edit Page
// =============================================================================

export default function Edit({ category }) {
    const { data, setData, post, processing, errors, transform } = useForm({
        _method:            "PUT",
        code:               category.code               ?? "",
        name:               category.name               ?? "",
        description:        category.description        ?? "",
        allow_all_variants: category.allow_all_variants ?? true,
        sort_order:         category.sort_order          ?? 0,
        is_active:          category.is_active           ?? true,
    });

    // Konversi boolean → 1/0 sebelum dikirim ke server
    transform((d) => ({
        ...d,
        code:               d.code.toUpperCase().trim(),
        allow_all_variants: d.allow_all_variants ? 1 : 0,
        is_active:          d.is_active          ? 1 : 0,
        sort_order:         parseInt(d.sort_order, 10) || 0,
    }));

    const submit = (e) => {
        e.preventDefault();
        post(route("store-categories.update", category.id), {
            onSuccess: () => toast.success("Kategori berhasil diperbarui! ✨"),
            onError:   () => toast.error("Periksa kembali form Anda"),
        });
    };

    return (
        <>
            <Head title={`Edit Kategori — ${category.code}`} />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Nav */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <Link
                        href={route("store-categories.index")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors"
                    >
                        <IconArrowLeft size={18} strokeWidth={2} /> Kembali ke Daftar
                    </Link>
                    <div className="flex items-center gap-2">
                        <Link
                            href={route("store-categories.variants", category.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-bold hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors border border-violet-200 dark:border-violet-800"
                        >
                            <IconListCheck size={16} strokeWidth={2} />
                            Kelola Variant
                        </Link>
                        <Button
                            type="delete"
                            url={route("store-categories.destroy", category.id)}
                            label="Hapus"
                            icon={<IconTrash size={15} strokeWidth={2} />}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold border border-red-100 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                        />
                    </div>
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                        <IconTag size={26} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Kategori Toko</h1>
                        <p className="text-sm text-slate-400 font-mono">Kode: {category.code}</p>
                    </div>
                </div>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Main Column ── */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Informasi */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                                <div className="w-1 h-5 bg-violet-600 rounded-full" />
                                Informasi Kategori
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                {/* Kode — tidak pakai helperText prop, buat manual */}
                                <div>
                                    <Input
                                        label="Kode Kategori"
                                        value={data.code}
                                        onChange={e => setData("code", e.target.value.toUpperCase())}
                                        errors={errors.code}
                                        placeholder="L, M, S, GOLD"
                                        required
                                    />
                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                        Maks 20 karakter, harus unik
                                    </p>
                                </div>
                                <Input
                                    label="Nama Kategori"
                                    value={data.name}
                                    onChange={e => setData("name", e.target.value)}
                                    errors={errors.name}
                                    placeholder="Large, Medium, Small"
                                    required
                                />
                            </div>

                            {/* Deskripsi */}
                            <div className="mb-5">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Deskripsi{" "}
                                    <span className="text-slate-400 font-normal">(opsional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={data.description}
                                    onChange={e => setData("description", e.target.value)}
                                    placeholder="Keterangan kategori: kapasitas outlet, tipe lokasi, kebijakan produk, dll"
                                    className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                                        focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none
                                        ${errors.description ? "border-red-400" : "border-slate-200 dark:border-slate-700"}`}
                                />
                                {errors.description && (
                                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.description}</p>
                                )}
                            </div>

                            {/* Urutan */}
                            <div>
                                <Input
                                    type="number"
                                    label="Urutan Tampil"
                                    value={data.sort_order}
                                    onChange={e => setData("sort_order", e.target.value)}
                                    errors={errors.sort_order}
                                    placeholder="0"
                                />
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                    Angka lebih kecil tampil lebih awal
                                </p>
                            </div>
                        </div>

                        {/* Konfigurasi Variant */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-violet-600 rounded-full" />
                                    Konfigurasi Variant
                                </h2>
                                <Link
                                    href={route("store-categories.variants", category.id)}
                                    className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                                >
                                    <IconListCheck size={13} /> Kelola Whitelist →
                                </Link>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
                                Tentukan apakah toko dalam kategori ini boleh menjual semua variant atau hanya variant tertentu.
                            </p>
                            <VariantModeSelector
                                value={data.allow_all_variants}
                                onChange={v => setData("allow_all_variants", v)}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <Link
                                href={route("store-categories.index")}
                                className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-all flex items-center gap-2 shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <IconDeviceFloppy size={20} strokeWidth={2} />
                                {processing ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>

                    {/* ── Sidebar ── */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm sticky top-6 space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Status Kategori
                            </h3>

                            {/* Toggle is_active */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Aktif</p>
                                    <p className="text-xs text-slate-400">Kategori dapat digunakan</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={e => setData("is_active", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700
                                        peer-checked:after:translate-x-full peer-checked:after:border-white
                                        after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                                        after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                                        peer-checked:bg-violet-600
                                        peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800"
                                    />
                                </label>
                            </div>

                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                Kategori nonaktif tidak bisa dipilih saat membuat atau mengedit toko.
                            </p>

                            {/* Preview */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    Preview Badge
                                </p>
                                <div className="flex items-center gap-2.5">
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                                        <IconTag size={13} />
                                        {data.code || "??"}
                                    </span>
                                    <span className="text-sm text-slate-400 truncate">
                                        {data.name || "Nama kategori"}
                                    </span>
                                </div>
                            </div>

                            {/* Quick action */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Link
                                    href={route("store-categories.variants", category.id)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-bold hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors border border-violet-200 dark:border-violet-800"
                                >
                                    <IconListCheck size={16} strokeWidth={2} />
                                    Kelola Whitelist Variant
                                </Link>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
