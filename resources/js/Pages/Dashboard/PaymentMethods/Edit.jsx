import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconCreditCard,
    IconReceipt,
    IconArrowsExchange,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

const TYPE_STYLES = {
    cash:     "bg-green-100 text-green-700 border-green-300",
    card:     "bg-blue-100 text-blue-700 border-blue-300",
    transfer: "bg-indigo-100 text-indigo-700 border-indigo-300",
    qris:     "bg-purple-100 text-purple-700 border-purple-300",
    ewallet:  "bg-pink-100 text-pink-700 border-pink-300",
    other:    "bg-slate-100 text-slate-600 border-slate-300",
};

export default function Edit({ paymentMethod, types }) {
    const { data, setData, put, processing, errors } = useForm({
        code:            paymentMethod.code ?? "",
        name:            paymentMethod.name ?? "",
        type:            paymentMethod.type ?? "cash",
        has_admin_fee:   paymentMethod.has_admin_fee ?? false,
        admin_fee_pct:   paymentMethod.admin_fee_pct ?? "0",
        can_give_change: paymentMethod.can_give_change ?? false,
        is_active:       paymentMethod.is_active ?? true,
        sort_order:      paymentMethod.sort_order ?? 0,
    });

    const submit = (e) => {
        e.preventDefault();
        put(route("payment-methods.update", paymentMethod.id), {
            onSuccess: () => toast.success("Metode pembayaran berhasil diperbarui."),
            onError: () => toast.error("Terdapat kesalahan pada form."),
        });
    };

    return (
        <>
            <Head title={`Edit ${paymentMethod.name}`} />
            <div className="max-w-3xl mx-auto py-4">
                <Link
                    href={route("payment-methods.index")}
                    className="flex items-center gap-1 text-slate-500 hover:text-primary-600 mb-6 transition-colors text-sm font-medium"
                >
                    <IconArrowLeft size={18} /> Kembali ke List
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg">
                        <IconCreditCard size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">Edit Metode Pembayaran</h1>
                        <p className="text-sm text-slate-500">Perbarui informasi metode pembayaran.</p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Main Info */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h2 className="text-lg font-bold mb-6 border-b pb-4 dark:border-slate-800">Informasi Metode</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Input
                                    label="Kode"
                                    value={data.code}
                                    onChange={(e) => setData("code", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                                    errors={errors.code}
                                    placeholder="contoh: cash, bca_transfer"
                                    required
                                    autoComplete="off"
                                />
                                <p className="text-xs text-slate-400 mt-1">Hanya huruf kecil, angka, underscore, atau strip.</p>
                            </div>

                            <Input
                                label="Nama"
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                errors={errors.name}
                                placeholder="contoh: Tunai, Transfer BCA"
                                required
                            />
                        </div>
                    </div>

                    {/* Type Selection */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h2 className="text-lg font-bold mb-2">Tipe Pembayaran</h2>
                        <p className="text-xs text-slate-500 mb-6">Pilih kategori yang sesuai.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(types).map(([key, label]) => (
                                <label
                                    key={key}
                                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                                        data.type === key
                                            ? `${TYPE_STYLES[key]} border-current font-bold`
                                            : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="type"
                                        className="sr-only"
                                        value={key}
                                        checked={data.type === key}
                                        onChange={() => setData("type", key)}
                                    />
                                    <span className="text-sm font-semibold">{label}</span>
                                </label>
                            ))}
                        </div>
                        {errors.type && <p className="text-red-500 text-xs mt-3">{errors.type}</p>}
                    </div>

                    {/* Fee & Change Config */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h2 className="text-lg font-bold mb-2">Konfigurasi Biaya & Kembalian</h2>
                        <p className="text-xs text-slate-500 mb-6">Atur biaya admin dan kemampuan memberikan kembalian.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Admin Fee Toggle + Input */}
                            <div className="space-y-3">
                                <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                                    data.has_admin_fee
                                        ? "border-amber-400 bg-amber-50/50 dark:bg-amber-900/10"
                                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                }`}>
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-slate-300 text-amber-500 focus:ring-amber-400"
                                        checked={data.has_admin_fee}
                                        onChange={(e) => setData("has_admin_fee", e.target.checked)}
                                    />
                                    <div>
                                        <p className={`text-sm font-bold flex items-center gap-1 ${data.has_admin_fee ? "text-amber-700 dark:text-amber-400" : "text-slate-500"}`}>
                                            <IconReceipt size={14} /> Ada Biaya Admin
                                        </p>
                                        <p className="text-xs text-slate-400">Dikenakan ke transaksi</p>
                                    </div>
                                </label>

                                {data.has_admin_fee && (
                                    <div>
                                        <label className="block text-sm font-bold mb-2 dark:text-slate-300">
                                            Persentase Biaya Admin (%)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="w-full rounded-xl border-slate-200 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-amber-500 pr-12"
                                                value={data.admin_fee_pct}
                                                onChange={(e) => setData("admin_fee_pct", e.target.value)}
                                                placeholder="0.70"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">Contoh: 0.70 untuk QRIS MDR 0,70%</p>
                                        {errors.admin_fee_pct && <p className="text-red-500 text-xs mt-1">{errors.admin_fee_pct}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Can Give Change */}
                            <div>
                                <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                                    data.can_give_change
                                        ? "border-teal-400 bg-teal-50/50 dark:bg-teal-900/10"
                                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                }`}>
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-slate-300 text-teal-600 focus:ring-teal-500"
                                        checked={data.can_give_change}
                                        onChange={(e) => setData("can_give_change", e.target.checked)}
                                    />
                                    <div>
                                        <p className={`text-sm font-bold flex items-center gap-1 ${data.can_give_change ? "text-teal-700 dark:text-teal-400" : "text-slate-500"}`}>
                                            <IconArrowsExchange size={14} /> Bisa Memberi Kembalian
                                        </p>
                                        <p className="text-xs text-slate-400">Aktifkan untuk pembayaran tunai</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h2 className="text-lg font-bold mb-6 border-b pb-4 dark:border-slate-800">Pengaturan</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div>
                                <label className="block text-sm font-bold mb-2 dark:text-slate-300">Urutan Tampil</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="255"
                                    className="w-full rounded-xl border-slate-200 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-amber-500"
                                    value={data.sort_order}
                                    onChange={(e) => setData("sort_order", parseInt(e.target.value) || 0)}
                                />
                                <p className="text-xs text-slate-400 mt-1">Angka lebih kecil tampil lebih dulu.</p>
                                {errors.sort_order && <p className="text-red-500 text-xs mt-1">{errors.sort_order}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 dark:text-slate-300">Status</label>
                                <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                                    data.is_active
                                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                }`}>
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        checked={data.is_active}
                                        onChange={(e) => setData("is_active", e.target.checked)}
                                    />
                                    <div>
                                        <p className={`text-sm font-bold ${data.is_active ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>
                                            {data.is_active ? "Aktif" : "Nonaktif"}
                                        </p>
                                        <p className="text-xs text-slate-400">Tersedia untuk transaksi</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <IconDeviceFloppy size={20} />
                        {processing ? "Menyimpan..." : "Perbarui Metode Pembayaran"}
                    </button>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
