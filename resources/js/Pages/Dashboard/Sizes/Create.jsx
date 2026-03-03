import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconScale,
    IconRuler,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// Volume presets umum untuk botol parfum
const VOLUME_PRESETS = [
    { label: "30 ml",  value: 30  },
    { label: "50 ml",  value: 50  },
    { label: "100 ml", value: 100 },
    { label: "150 ml", value: 150 },
];

export default function Create() {
    const { data, setData, post, processing, errors, reset } = useForm({
        volume_ml:  "",
        name:       "",
        sort_order: 0,
        is_active:  true,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("sizes.store"), {
            onSuccess: () => { toast.success("Ukuran berhasil ditambahkan! ✅"); reset(); },
            onError:   () => toast.error("Terjadi kesalahan, periksa form Anda"),
        });
    };

    return (
        <>
            <Head title="Tambah Ukuran" />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="mb-6">
                    <Link href={route("sizes.index")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors mb-4"
                    >
                        <IconArrowLeft size={18} strokeWidth={2} />
                        <span>Kembali ke daftar ukuran</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Tambah Ukuran Baru
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Lengkapi informasi ukuran botol produk
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Main Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                            <div className="w-1 h-5 bg-primary-600 rounded-full" />
                            Detail Ukuran
                        </h2>

                        {/* Volume Presets */}
                        <div className="mb-5">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Preset Volume Umum
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {VOLUME_PRESETS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        onClick={() => setData("volume_ml", preset.value)}
                                        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                                            Number(data.volume_ml) === preset.value
                                                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                                                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-300 dark:hover:border-primary-700"
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Input
                                type="number"
                                label="Volume (ml)"
                                value={data.volume_ml}
                                onChange={e => setData("volume_ml", e.target.value)}
                                errors={errors.volume_ml}
                                placeholder="Contoh: 100"
                                required
                                min="1"
                                helperText="Harus unik, minimal 1 ml"
                                prefix={<IconRuler size={16} className="text-slate-400" />}
                            />
                            <Input
                                label="Nama Ukuran"
                                value={data.name}
                                onChange={e => setData("name", e.target.value)}
                                errors={errors.name}
                                placeholder="Contoh: Kecil, Sedang, Besar"
                                required
                                helperText="Maksimal 50 karakter"
                            />
                        </div>

                        <div className="mt-5">
                            <Input
                                type="number"
                                label="Urutan Tampilan"
                                value={data.sort_order}
                                onChange={e => setData("sort_order", parseInt(e.target.value) || 0)}
                                errors={errors.sort_order}
                                placeholder="0"
                                required
                                min="0"
                                helperText="Urutan dari kecil ke besar"
                            />
                        </div>

                        {/* Status Toggle */}
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">Status Aktif</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Ukuran dapat digunakan di produk</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={e => setData("is_active", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600" />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                        <div className="flex gap-3">
                            <IconScale size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    Kategori Ukuran Otomatis
                                </h3>
                                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                    <li>• <strong>Small:</strong> di bawah 50 ml</li>
                                    <li>• <strong>Medium:</strong> 50 – 99 ml</li>
                                    <li>• <strong>Large:</strong> 100 ml ke atas</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <Link href={route("sizes.index")}
                            className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
                        >
                            <IconDeviceFloppy size={20} strokeWidth={2} />
                            <span>{processing ? "Menyimpan..." : "Simpan Ukuran"}</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
