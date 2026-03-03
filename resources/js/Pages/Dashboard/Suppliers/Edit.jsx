import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconTruckDelivery, IconBarcode,
    IconPhone, IconUser, IconMail, IconReceipt, IconCreditCard
} from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Edit({ supplier, paymentTerms }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        code: supplier.code || "",
        name: supplier.name || "",
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        tax_id: supplier.tax_id || "",
        payment_term: supplier.payment_term || "cash",
        credit_limit: supplier.credit_limit || 0,
        is_active: supplier.is_active ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        put(route("suppliers.update", supplier.id), {
            onSuccess: () => {
                toast.success("Supplier berhasil diperbarui!");
            },
            onError: () => toast.error("Periksa kembali form Anda"),
        });
    };

    return (
        <>
            <Head title={`Edit Supplier - ${supplier.name}`} />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Link
                    href={route('suppliers.index')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 mb-4 transition-colors"
                >
                    <IconArrowLeft size={18} strokeWidth={2} /> Kembali ke Daftar
                </Link>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                        <IconTruckDelivery size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">Edit Supplier</h1>
                        <p className="text-sm text-slate-500">Update informasi vendor atau pemasok</p>
                    </div>
                </div>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Informasi Utama */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-semibold mb-5 border-b pb-2 dark:text-white">
                                Informasi Utama
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <Input
                                    label="Kode Supplier"
                                    value={data.code}
                                    onChange={e => setData('code', e.target.value.toUpperCase())}
                                    errors={errors.code}
                                    placeholder="SUP-001"
                                    required
                                    icon={<IconBarcode size={18} />}
                                />
                                <Input
                                    label="Nama Perusahaan"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    errors={errors.name}
                                    placeholder="Contoh: PT. Maju Jaya"
                                    required
                                    icon={<IconTruckDelivery size={18} />}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <Input
                                    label="Contact Person"
                                    value={data.contact_person}
                                    onChange={e => setData('contact_person', e.target.value)}
                                    errors={errors.contact_person}
                                    placeholder="Nama Sales/Manager"
                                    icon={<IconUser size={18} />}
                                />
                                <Input
                                    label="Email"
                                    type="email"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    errors={errors.email}
                                    placeholder="supplier@email.com"
                                    icon={<IconMail size={18} />}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <Input
                                    label="Nomor Telepon"
                                    value={data.phone}
                                    onChange={e => setData('phone', e.target.value)}
                                    errors={errors.phone}
                                    placeholder="0812..."
                                    icon={<IconPhone size={18} />}
                                />
                                <Input
                                    label="NPWP (Tax ID)"
                                    value={data.tax_id}
                                    onChange={e => setData('tax_id', e.target.value)}
                                    errors={errors.tax_id}
                                    placeholder="00.000..."
                                    icon={<IconReceipt size={18} />}
                                />
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Alamat Kantor
                                </label>
                                <textarea
                                    rows="3"
                                    value={data.address}
                                    onChange={e => setData('address', e.target.value)}
                                    className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all ${
                                        errors.address ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                                    }`}
                                    placeholder="Alamat lengkap supplier..."
                                />
                                {errors.address && (
                                    <p className="mt-1 text-xs text-red-500">{errors.address}</p>
                                )}
                            </div>
                        </div>

                        {/* Syarat Pembayaran */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-semibold mb-5 border-b pb-2 dark:text-white">
                                Syarat Pembayaran
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Termin Pembayaran
                                    </label>
                                    <select
                                        value={data.payment_term}
                                        onChange={e => setData('payment_term', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="cash">Tunai (Cash)</option>
                                        <option value="credit_7">Kredit 7 Hari</option>
                                        <option value="credit_14">Kredit 14 Hari</option>
                                        <option value="credit_30">Kredit 30 Hari</option>
                                        <option value="credit_60">Kredit 60 Hari</option>
                                    </select>
                                    {errors.payment_term && (
                                        <p className="mt-1 text-xs text-red-500">{errors.payment_term}</p>
                                    )}
                                </div>
                                <Input
                                    label="Batas Kredit (Limit)"
                                    type="number"
                                    value={data.credit_limit}
                                    onChange={e => setData('credit_limit', e.target.value)}
                                    errors={errors.credit_limit}
                                    icon={<IconCreditCard size={18} />}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3">
                            <Link
                                href={route('suppliers.index')}
                                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <IconDeviceFloppy size={20} />
                                {processing ? 'Menyimpan...' : 'Update Supplier'}
                            </button>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm sticky top-6">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                                Status
                            </h3>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="block text-sm font-bold dark:text-slate-200">
                                        Status Aktif
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {data.is_active ? 'Dapat bertransaksi' : 'Tidak aktif'}
                                    </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={e => setData('is_active', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5">
                            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-2">
                                💡 Tips Update
                            </h4>
                            <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1.5">
                                <li>• Pastikan kode unik dan tidak berubah</li>
                                <li>• Update kontak jika ada perubahan PIC</li>
                                <li>• Sesuaikan termin sesuai kesepakatan</li>
                                <li>• Nonaktifkan jika tidak lagi bekerja sama</li>
                            </ul>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
