import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconBuildingStore,
    IconMapPin, IconTag,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Select Component (inline, konsisten dengan Input yang sudah ada)
// ---------------------------------------------------------------------------
function Select({ label, value, onChange, options, placeholder = "— Pilih —", errors, helperText }) {
    return (
        <div>
            {label && (
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                </label>
            )}
            <select
                value={value}
                onChange={onChange}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all
                    ${errors ? "border-red-400 dark:border-red-600" : "border-slate-200 dark:border-slate-700"}`}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {errors     && <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors}</p>}
            {helperText && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Create Page
// ---------------------------------------------------------------------------
export default function Create({ categories }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        code:               "",
        name:               "",
        address:            "",
        phone:              "",
        manager_name:       "",
        email:              "",
        is_active:          true,
        store_category_id:  "",   // ← tambahan
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("stores.store"), {
            onSuccess: () => { toast.success("Toko berhasil ditambahkan! 🏪"); reset(); },
            onError:   () => toast.error("Periksa kembali form Anda"),
        });
    };

    // Opsi dropdown kategori
    const categoryOptions = categories.map(c => ({
        value: c.id,
        label: `${c.code} — ${c.name}`,
    }));

    return (
        <>
            <Head title="Tambah Toko" />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                <Link href={route("stores.index")}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors mb-4"
                >
                    <IconArrowLeft size={18} strokeWidth={2} /> Kembali ke Daftar
                </Link>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
                        <IconBuildingStore size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tambah Toko Baru</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Daftarkan data toko atau cabang penjualan</p>
                    </div>
                </div>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Main Form ── */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Card: Informasi Toko */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                                <div className="w-1 h-5 bg-primary-600 rounded-full" />
                                Informasi Toko
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <Input
                                    label="Kode Toko"
                                    value={data.code}
                                    onChange={e => setData("code", e.target.value.toUpperCase())}
                                    errors={errors.code}
                                    placeholder="STR-JKT-01"
                                    required
                                    helperText="Unik, maks 50 karakter"
                                />
                                <Input
                                    label="Nama Toko"
                                    value={data.name}
                                    onChange={e => setData("name", e.target.value)}
                                    errors={errors.name}
                                    placeholder="Toko Utama Jakarta"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <Input
                                    label="Nama Manajer"
                                    value={data.manager_name}
                                    onChange={e => setData("manager_name", e.target.value)}
                                    errors={errors.manager_name}
                                    placeholder="Nama penanggung jawab"
                                />
                                <Input
                                    type="email"
                                    label="Email Kontak"
                                    value={data.email}
                                    onChange={e => setData("email", e.target.value)}
                                    errors={errors.email}
                                    placeholder="toko@email.com"
                                />
                            </div>

                            <div className="mb-5">
                                <Input
                                    label="Nomor Telepon"
                                    value={data.phone}
                                    onChange={e => setData("phone", e.target.value)}
                                    errors={errors.phone}
                                    placeholder="021-xxxx atau 08xxx"
                                    helperText="Maks 50 karakter"
                                />
                            </div>

                            {/* Alamat */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Alamat Lengkap
                                </label>
                                <div className="relative">
                                    <IconMapPin size={16} className="absolute top-3 left-3 text-slate-400 pointer-events-none" />
                                    <textarea
                                        rows={3}
                                        value={data.address}
                                        onChange={e => setData("address", e.target.value)}
                                        placeholder="Alamat lengkap lokasi toko..."
                                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                                            focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none
                                            ${errors.address ? "border-red-400 dark:border-red-600" : "border-slate-200 dark:border-slate-700"}`}
                                    />
                                </div>
                                {errors.address && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.address}</p>
                                )}
                            </div>
                        </div>

                        {/* Card: Kategori Toko */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                                <div className="w-1 h-5 bg-violet-500 rounded-full" />
                                Kategori Toko
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                                Menentukan variant parfum apa saja yang dapat dijual di toko ini.
                            </p>

                            <Select
                                label="Kategori"
                                value={data.store_category_id}
                                onChange={e => setData("store_category_id", e.target.value)}
                                options={categoryOptions}
                                placeholder="— Tidak dikategorikan (semua variant) —"
                                errors={errors.store_category_id}
                                helperText="Kosongkan jika toko boleh menjual semua variant"
                            />

                            {/* Info hint berdasarkan kategori yang dipilih */}
                            {data.store_category_id && (() => {
                                const cat = categories.find(c => c.id === data.store_category_id);
                                if (!cat) return null;
                                return cat.allow_all_variants ? (
                                    <div className="mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                        <p className="text-xs text-green-700 dark:text-green-300">
                                            ✅ Kategori <strong>{cat.code}</strong> mengizinkan semua variant dijual di toko ini.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            ⚠️ Kategori <strong>{cat.code}</strong> menggunakan whitelist variant.
                                            Hanya variant yang sudah dikonfigurasi di <strong>Master Kategori</strong> yang akan tampil di POS toko ini.
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <Link href={route("stores.index")}
                                className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Batal
                            </Link>
                            <button type="submit" disabled={processing}
                                className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all flex items-center gap-2 shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <IconDeviceFloppy size={20} strokeWidth={2} />
                                <span>{processing ? "Menyimpan..." : "Simpan Data"}</span>
                            </button>
                        </div>
                    </div>

                    {/* ── Sidebar ── */}
                    <div className="lg:col-span-1 space-y-4">

                        {/* Status */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm sticky top-6">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                                Pengaturan Status
                            </h3>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Status Aktif</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Toko dapat beroperasi</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={data.is_active}
                                        onChange={e => setData("is_active", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800
                                        rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white
                                        after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300
                                        after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"
                                    />
                                </label>
                            </div>

                            <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Toko yang dinonaktifkan tidak akan muncul pada pilihan transaksi penjualan.
                                </p>
                            </div>
                        </div>

                        {/* Info Kategori Tersedia */}
                        {categories.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <IconTag size={15} className="text-violet-500" />
                                    Kategori Tersedia
                                </h3>
                                <div className="space-y-2">
                                    {categories.map(cat => (
                                        <div key={cat.id}
                                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 font-mono w-6">{cat.code}</span>
                                                <span className="text-xs text-slate-600 dark:text-slate-400">{cat.name}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                cat.allow_all_variants
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                            }`}>
                                                {cat.allow_all_variants ? "Semua" : "Whitelist"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
