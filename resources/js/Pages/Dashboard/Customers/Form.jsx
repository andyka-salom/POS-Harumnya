import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import Textarea from "@/Components/Dashboard/TextArea";
import {
    IconDeviceFloppy,
    IconArrowLeft,
    IconUserCircle,
    IconSettings,
    IconTrophy,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// Tier labels & colors (sesuai kolom enum DB)
const TIER_CONFIG = {
    bronze:   { label: "Bronze",   color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400" },
    silver:   { label: "Silver",   color: "text-slate-600 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:text-slate-300" },
    gold:     { label: "Gold",     color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400" },
    platinum: { label: "Platinum", color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400" },
};

const TIER_THRESHOLDS = { platinum: 2000, gold: 1000, silver: 500, bronze: 0 };

function resolveTier(points) {
    const p = parseInt(points) || 0;
    if (p >= 2000) return "platinum";
    if (p >= 1000) return "gold";
    if (p >= 500)  return "silver";
    return "bronze";
}

export default function Form({ customer = null }) {
    const isEdit = !!customer;

    const { data, setData, post, put, processing, errors } = useForm({
        name:       customer?.name       || "",
        email:      customer?.email      || "",
        phone:      customer?.phone      || "",
        address:    customer?.address    || "",
        birth_date: customer?.birth_date || "",
        gender:     customer?.gender     || "male",
        points:     customer?.points     || 0,
        is_active:  customer?.is_active  ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route("customers.update", customer.id), {
                onSuccess: () => toast.success("Data pelanggan berhasil diperbarui."),
                onError:   () => toast.error("Terdapat kesalahan pada form."),
            });
        } else {
            post(route("customers.store"), {
                onSuccess: () => toast.success("Pelanggan baru berhasil ditambahkan."),
                onError:   () => toast.error("Terdapat kesalahan pada form."),
            });
        }
    };

    const currentTier = resolveTier(data.points);
    const tierCfg     = TIER_CONFIG[currentTier];

    // Hitung poin menuju tier berikutnya
    const nextTierEntry = Object.entries(TIER_THRESHOLDS)
        .sort(([, a], [, b]) => a - b)
        .find(([, threshold]) => threshold > (parseInt(data.points) || 0));
    const pointsToNext = nextTierEntry ? nextTierEntry[1] - (parseInt(data.points) || 0) : null;

    return (
        <>
            <Head title={isEdit ? `Edit ${customer.name}` : "Tambah Pelanggan"} />

            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link
                        href={route("customers.index")}
                        className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 transition-colors mb-2"
                    >
                        <IconArrowLeft size={16} /> Kembali ke Daftar
                    </Link>
                    <h1 className="text-2xl font-bold dark:text-white">
                        {isEdit ? `Edit: ${customer.name}` : "Tambah Pelanggan Baru"}
                    </h1>
                </div>
            </div>

            <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Kiri: Informasi Personal ── */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 text-primary-600">
                            <IconUserCircle size={20} />
                            <h2 className="text-sm font-bold uppercase tracking-wider">Informasi Personal</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nama Lengkap"
                                value={data.name}
                                errors={errors.name}
                                onChange={(e) => setData("name", e.target.value)}
                                placeholder="Contoh: Budi Santoso"
                                required
                            />
                            <Input
                                label="No. WhatsApp/Telepon"
                                value={data.phone}
                                errors={errors.phone}
                                onChange={(e) => setData("phone", e.target.value)}
                                placeholder="0812xxxxxxxx"
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={data.email}
                                errors={errors.email}
                                onChange={(e) => setData("email", e.target.value)}
                                placeholder="budi@example.com"
                            />

                            {/* Gender — support 'other' sesuai enum DB */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                                <select
                                    className="rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm focus:ring-primary-500 focus:border-primary-500 p-2.5"
                                    value={data.gender}
                                    onChange={(e) => setData("gender", e.target.value)}
                                >
                                    <option value="male">Laki-laki</option>
                                    <option value="female">Perempuan</option>
                                    <option value="other">Lainnya</option>
                                </select>
                                {errors.gender && <p className="text-red-500 text-xs">{errors.gender}</p>}
                            </div>

                            <Input
                                label="Tanggal Lahir"
                                type="date"
                                value={data.birth_date}
                                errors={errors.birth_date}
                                onChange={(e) => setData("birth_date", e.target.value)}
                            />
                        </div>

                        <div className="mt-4">
                            <Textarea
                                label="Alamat Lengkap"
                                value={data.address}
                                errors={errors.address}
                                onChange={(e) => setData("address", e.target.value)}
                                placeholder="Masukkan alamat lengkap pelanggan..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Statistik denormalized — hanya tampil di edit */}
                    {isEdit && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-5 text-slate-500">
                                <IconTrophy size={18} />
                                <h2 className="text-sm font-bold uppercase tracking-wider">Statistik Member</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Transaksi</p>
                                    <p className="text-xl font-black dark:text-white">{(customer.total_transactions ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Belanja</p>
                                    <p className="text-xl font-black text-emerald-600">
                                        Rp {Math.floor(parseFloat(customer.lifetime_spending ?? 0)).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Poin Diperoleh</p>
                                    <p className="text-xl font-black text-primary-600">{(customer.lifetime_points_earned ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Terdaftar</p>
                                    <p className="text-sm font-bold dark:text-white">
                                        {customer.registered_at
                                            ? new Date(customer.registered_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Kanan: Status & Membership ── */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 text-primary-600">
                            <IconSettings size={20} />
                            <h2 className="text-sm font-bold uppercase tracking-wider">Status & Membership</h2>
                        </div>

                        <div className="space-y-5">
                            {/* Poin */}
                            <div>
                                <Input
                                    label="Saldo Poin"
                                    type="number"
                                    min="0"
                                    value={data.points}
                                    errors={errors.points}
                                    onChange={(e) => setData("points", parseInt(e.target.value) || 0)}
                                />

                                {/* Tier badge dinamis */}
                                <div className={`mt-2 p-3 rounded-xl border flex items-center justify-between ${tierCfg.color}`}>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Tier Saat Ini</p>
                                        <p className="font-black text-sm uppercase">{tierCfg.label}</p>
                                    </div>
                                    {pointsToNext && (
                                        <p className="text-[10px] text-right opacity-70 leading-tight">
                                            {pointsToNext.toLocaleString()} poin<br />ke tier berikutnya
                                        </p>
                                    )}
                                </div>

                                {/* Progress bar */}
                                {nextTierEntry && (
                                    <div className="mt-2">
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${Math.min(100, ((parseInt(data.points) || 0) / nextTierEntry[1]) * 100)}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Toggle Status Aktif */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <div>
                                    <p className="text-sm font-bold dark:text-white">Status Akun</p>
                                    <p className="text-xs text-slate-500">Tentukan apakah pelanggan aktif</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={data.is_active}
                                        onChange={(e) => setData("is_active", e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-4 px-6 rounded-2xl font-bold shadow-lg shadow-primary-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        <IconDeviceFloppy size={20} />
                        {processing ? "Memproses..." : isEdit ? "Simpan Perubahan" : "Daftarkan Pelanggan"}
                    </button>

                    {isEdit && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                <strong>Info:</strong> Mengubah poin secara manual akan otomatis menyesuaikan tier pelanggan.
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </>
    );
}

Form.layout = (page) => <DashboardLayout children={page} />;
