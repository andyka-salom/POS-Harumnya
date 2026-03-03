import React, { useState, useRef } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import Textarea from "@/Components/Dashboard/TextArea";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconPhotoPlus,
    IconAlertCircle,
    IconBoxSeam,
    IconRefresh,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Edit({ variant }) {
    const fileInput = useRef();
    const [preview, setPreview] = useState(variant.image_url);
    const [imageError, setImageError] = useState('');
    const [hasNewImage, setHasNewImage] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        _method: "PUT",
        code: variant.code || "",
        name: variant.name || "",
        image: null,
        gender: variant.gender || "unisex",
        description: variant.description || "",
        is_active: variant.is_active ?? true,
        sort_order: variant.sort_order || 0,
    });

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setImageError('');

        if (!file) return;

        // Validasi ukuran file (4MB)
        if (file.size > 4 * 1024 * 1024) {
            setImageError('Ukuran file maksimal 4MB');
            if (fileInput.current) fileInput.current.value = '';
            return;
        }

        // Validasi tipe file
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setImageError('Format file harus JPG, PNG, atau WEBP');
            if (fileInput.current) fileInput.current.value = '';
            return;
        }

        setData("image", file);
        setPreview(URL.createObjectURL(file));
        setHasNewImage(true);
    };

    const removeImage = () => {
        setData("image", null);
        setPreview(variant.image_url); // Kembali ke gambar asli
        setImageError('');
        setHasNewImage(false);
        if (fileInput.current) {
            fileInput.current.value = '';
        }
    };

    const submit = (e) => {
        e.preventDefault();

        post(route("variants.update", variant.id), {
            onSuccess: () => {
                toast.success("Varian berhasil diperbarui!");
            },
            onError: (errors) => {
                if (errors.image) {
                    setImageError(errors.image);
                }
                toast.error("Terjadi kesalahan, periksa form Anda");

                // Scroll to first error
                const firstError = Object.keys(errors)[0];
                const element = document.querySelector(`[name="${firstError}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.focus();
                }
            }
        });
    };

    return (
        <>
            <Head title={`Edit Varian: ${variant.name}`} />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href={route('variants.index')}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors mb-4 group"
                    >
                        <IconArrowLeft size={18} strokeWidth={2} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Kembali ke daftar varian</span>
                    </Link>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning-500 to-warning-600 flex items-center justify-center shadow-lg shadow-warning-500/30">
                                <IconBoxSeam size={24} className="text-white" strokeWidth={2} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Edit Varian
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Perbarui informasi varian produk
                                </p>
                            </div>
                        </div>
                        <div className="hidden sm:block">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                                {variant.code}
                            </span>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sidebar: Image Upload */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sticky top-6 shadow-sm">
                                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                    Foto Varian
                                </label>

                                {/* Image Upload Area */}
                                <div className="relative aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden group">
                                    {preview ? (
                                        <>
                                            <img
                                                src={preview}
                                                alt={variant.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div
                                                onClick={() => fileInput.current?.click()}
                                                className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                            >
                                                <IconPhotoPlus size={32} className="text-white mb-2" strokeWidth={1.5} />
                                                <p className="text-white text-sm font-semibold">Ganti Foto</p>
                                                <p className="text-white/80 text-xs mt-1">Max 4MB</p>
                                            </div>
                                            {hasNewImage && (
                                                <div className="absolute top-2 left-2 z-10">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-green-500 text-white text-xs font-semibold shadow-lg">
                                                        Gambar Baru
                                                    </span>
                                                </div>
                                            )}
                                            {hasNewImage && (
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="absolute top-2 right-2 p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg z-10"
                                                    title="Batalkan perubahan"
                                                >
                                                    <IconRefresh size={16} strokeWidth={2} />
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div
                                            onClick={() => fileInput.current?.click()}
                                            className="text-center p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors w-full h-full flex flex-col items-center justify-center"
                                        >
                                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <IconPhotoPlus
                                                    size={32}
                                                    className="text-slate-400 dark:text-slate-500"
                                                    strokeWidth={1.5}
                                                />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Upload Foto Baru
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                JPG, PNG, WEBP (Max 4MB)
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInput}
                                        onChange={handleImageChange}
                                        className="hidden"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                    />
                                </div>

                                {/* Error Messages */}
                                {(errors.image || imageError) && (
                                    <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                        <IconAlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                            {errors.image || imageError}
                                        </p>
                                    </div>
                                )}

                                {!hasNewImage && variant.image_url && (
                                    <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                        <p className="text-xs text-blue-700 dark:text-blue-400">
                                            <strong>Info:</strong> Gambar saat ini akan tetap digunakan jika tidak mengupload gambar baru.
                                        </p>
                                    </div>
                                )}

                                {/* Status Toggle */}
                                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                                                Status Aktif
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                Varian bisa digunakan
                                            </span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={data.is_active}
                                                onChange={e => setData('is_active', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Form Fields */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-1 h-5 bg-primary-600 rounded-full"></div>
                                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                        Informasi Varian
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Code Input */}
                                    <div>
                                        <Input
                                            label="Kode Varian"
                                            value={data.code}
                                            onChange={e => setData('code', e.target.value.toUpperCase())}
                                            errors={errors.code}
                                            placeholder="VAR-001"
                                            required
                                            maxLength={50}
                                        />
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Format: Huruf kapital, angka, dan tanda strip (-)
                                        </p>
                                    </div>

                                    {/* Gender Select */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Gender <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.gender}
                                            onChange={e => setData('gender', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                        >
                                            <option value="unisex">🔄 Unisex</option>
                                            <option value="male">👨 Pria</option>
                                            <option value="female">👩 Wanita</option>
                                        </select>
                                        {errors.gender && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                                                {errors.gender}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Name Input */}
                                <div className="mt-5">
                                    <Input
                                        label="Nama Varian"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        errors={errors.name}
                                        placeholder="Contoh: T-Shirt Oversize Premium"
                                        required
                                        maxLength={255}
                                    />
                                </div>

                                {/* Description Textarea */}
                                <div className="mt-5">
                                    <Textarea
                                        label="Deskripsi"
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        errors={errors.description}
                                        rows={4}
                                        placeholder="Jelaskan detail varian seperti bahan, ukuran, atau keunggulan..."
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Opsional - Berikan deskripsi yang jelas untuk membantu identifikasi varian
                                    </p>
                                </div>

                                {/* Sort Order */}
                                <div className="mt-5">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Urutan Tampilan
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.sort_order}
                                        onChange={e => setData('sort_order', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                        placeholder="0"
                                    />
                                    {errors.sort_order && (
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                                            {errors.sort_order}
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Angka lebih kecil akan ditampilkan lebih dulu
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <Link
                                    href={route('variants.index')}
                                    className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
                                >
                                    Batal
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-warning-600 to-warning-700 hover:from-warning-700 hover:to-warning-800 text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-warning-500/30"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <IconDeviceFloppy size={20} strokeWidth={2} />
                                            <span>Update Varian</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
