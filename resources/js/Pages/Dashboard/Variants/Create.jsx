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
} from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Create() {
    const fileInput = useRef();
    const [preview, setPreview] = useState(null);
    const [imageError, setImageError] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        code: "",
        name: "",
        image: null,
        gender: "unisex",
        description: "",
        is_active: true,
        sort_order: 0,
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
    };

    const removeImage = () => {
        setData("image", null);
        setPreview(null);
        setImageError('');
        if (fileInput.current) {
            fileInput.current.value = '';
        }
    };

    const submit = (e) => {
        e.preventDefault();

        post(route("variants.store"), {
            onSuccess: () => {
                toast.success("Varian berhasil ditambahkan!");
                reset();
                setPreview(null);
                if (fileInput.current) fileInput.current.value = '';
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
            <Head title="Tambah Varian" />

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

                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <IconBoxSeam size={24} className="text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Tambah Varian Baru
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Lengkapi informasi varian produk di bawah ini
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sidebar: Image Upload */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sticky top-6 shadow-sm">
                                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                    Foto Varian <span className="text-red-500">*</span>
                                </label>

                                {/* Image Upload Area */}
                                <div
                                    onClick={() => !preview && fileInput.current?.click()}
                                    className={`relative aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all ${
                                        preview
                                            ? 'border-slate-200 dark:border-slate-700'
                                            : 'border-slate-300 dark:border-slate-700 cursor-pointer hover:border-primary-500 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    } ${errors.image || imageError ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                >
                                    {preview ? (
                                        <>
                                            <img
                                                src={preview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fileInput.current?.click();
                                                    }}
                                                    className="px-4 py-2 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors"
                                                >
                                                    Ganti Foto
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeImage();
                                                }}
                                                className="absolute top-2 right-2 p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg z-10"
                                                title="Hapus gambar"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <IconPhotoPlus
                                                    size={32}
                                                    className="text-slate-400 dark:text-slate-500"
                                                    strokeWidth={1.5}
                                                />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Klik untuk Upload Foto
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

                                <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs text-blue-700 dark:text-blue-400">
                                        <strong>Tips:</strong> Gunakan gambar dengan resolusi tinggi untuk hasil terbaik. Rasio 4:3 atau 1:1 direkomendasikan.
                                    </p>
                                </div>

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

                                {/* Sort Order (Optional) */}
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
                                        Opsional - Angka lebih kecil akan ditampilkan lebih dulu. Default: 0 (otomatis di akhir)
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
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
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
                                            <span>Simpan Varian</span>
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

Create.layout = (page) => <DashboardLayout children={page} />;
