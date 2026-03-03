import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft, IconDeviceFloppy, IconTruckDelivery, IconBarcode,
    IconPhone, IconUser, IconMail, IconReceipt, IconCreditCard,
    IconMapPin, IconAlertCircle, IconInfoCircle
} from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Create({ paymentTerms }) {
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        code: "",
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        tax_id: "",
        payment_term: "cash",
        credit_limit: 0,
        is_active: true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        post(route("suppliers.store"), {
            onSuccess: () => {
                toast.success("Supplier berhasil ditambahkan! 🚚");
                reset();
            },
            onError: (errors) => {
                const errorMessages = Object.values(errors).flat();
                toast.error(errorMessages[0] || "Periksa kembali form Anda");
            },
            preserveScroll: true,
        });
    };

    const handleGenerateCode = () => {
        setIsGeneratingCode(true);
        // Simulate code generation - in production, this could be an API call
        setTimeout(() => {
            const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            setData('code', `SUP-${randomNum}`);
            setIsGeneratingCode(false);
            toast.success("Kode berhasil di-generate!");
        }, 500);
    };

    const handlePaymentTermChange = (term) => {
        setData(prevData => ({
            ...prevData,
            payment_term: term,
            credit_limit: term === 'cash' ? 0 : prevData.credit_limit
        }));
    };

    return (
        <>
            <Head title="Tambah Supplier" />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Breadcrumb */}
                <Link
                    href={route('suppliers.index')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 mb-4 transition-colors"
                >
                    <IconArrowLeft size={18} strokeWidth={2} /> Kembali ke Daftar
                </Link>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                        <IconTruckDelivery size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">Tambah Supplier Baru</h1>
                        <p className="text-sm text-slate-500">Registrasi vendor atau pemasok barang</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Informasi Utama */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-5 pb-3 border-b dark:border-slate-800">
                                <IconInfoCircle size={20} className="text-indigo-500" />
                                <h2 className="text-lg font-semibold dark:text-white">Informasi Utama</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <div>
                                    <Input
                                        label="Kode Supplier"
                                        value={data.code}
                                        onChange={e => setData('code', e.target.value.toUpperCase())}
                                        errors={errors.code}
                                        placeholder="SUP-001"
                                        required
                                        icon={<IconBarcode size={18} />}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerateCode}
                                        disabled={isGeneratingCode}
                                        className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isGeneratingCode ? (
                                            <>
                                                <div className="animate-spin h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                                Generating...
                                            </>
                                        ) : (
                                            '✨ Generate Kode Otomatis'
                                        )}
                                    </button>
                                </div>

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
                                    placeholder="00.000.000.0-000.000"
                                    icon={<IconReceipt size={18} />}
                                />
                            </div>

                            <div className="mb-5">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <IconMapPin size={16} />
                                    Alamat Kantor
                                </label>
                                <textarea
                                    rows="3"
                                    value={data.address}
                                    onChange={e => setData('address', e.target.value)}
                                    className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none ${
                                        errors.address ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700'
                                    }`}
                                    placeholder="Alamat lengkap supplier termasuk kota dan kode pos..."
                                />
                                {errors.address && (
                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                        <IconAlertCircle size={12} />
                                        {errors.address}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Syarat Pembayaran */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-5 pb-3 border-b dark:border-slate-800">
                                <IconCreditCard size={20} className="text-indigo-500" />
                                <h2 className="text-lg font-semibold dark:text-white">Syarat Pembayaran</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Termin Pembayaran <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.payment_term}
                                        onChange={e => handlePaymentTermChange(e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all ${
                                            errors.payment_term ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        <option value="cash">💰 Tunai (Cash)</option>
                                        <option value="credit_7">📅 Kredit 7 Hari</option>
                                        <option value="credit_14">📅 Kredit 14 Hari</option>
                                        <option value="credit_30">📅 Kredit 30 Hari</option>
                                        <option value="credit_60">📅 Kredit 60 Hari</option>
                                    </select>
                                    {errors.payment_term && (
                                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                            <IconAlertCircle size={12} />
                                            {errors.payment_term}
                                        </p>
                                    )}
                                </div>

                                <Input
                                    label="Batas Kredit (Limit)"
                                    type="number"
                                    value={data.credit_limit}
                                    onChange={e => setData('credit_limit', e.target.value)}
                                    errors={errors.credit_limit}
                                    placeholder="0"
                                    icon={<IconCreditCard size={18} />}
                                    disabled={data.payment_term === 'cash'}
                                    helper={data.payment_term === 'cash' ? 'Tidak tersedia untuk pembayaran tunai' : 'Maksimal hutang yang diperbolehkan'}
                                />
                            </div>

                            {data.payment_term !== 'cash' && data.credit_limit > 0 && (
                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        💡 <strong>Info:</strong> Supplier akan mendapat limit kredit sebesar Rp {Number(data.credit_limit).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row justify-end gap-3">
                            <Link
                                href={route('suppliers.index')}
                                className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-center"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <>
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <IconDeviceFloppy size={20} />
                                        Simpan Supplier
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Status Card */}
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
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 dark:peer-focus:ring-indigo-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>
                        </div>

                        {/* Help Card */}
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5">
                            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-3 flex items-center gap-2">
                                <IconInfoCircle size={18} />
                                Panduan Pengisian
                            </h4>
                            <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-500 mt-0.5">•</span>
                                    <span><strong>Kode:</strong> Harus unik, gunakan format SUP-XXX</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-500 mt-0.5">•</span>
                                    <span><strong>Email:</strong> Pastikan valid untuk komunikasi</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-500 mt-0.5">•</span>
                                    <span><strong>NPWP:</strong> Format 00.000.000.0-000.000</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-500 mt-0.5">•</span>
                                    <span><strong>Kredit:</strong> Limit hanya berlaku jika bukan cash</span>
                                </li>
                            </ul>
                        </div>

                        {/* Required Fields Info */}
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5">
                            <h4 className="text-sm font-bold text-yellow-900 dark:text-yellow-200 mb-2 flex items-center gap-2">
                                <IconAlertCircle size={18} />
                                Field Wajib
                            </h4>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                Field yang ditandai dengan <span className="text-red-500">*</span> wajib diisi sebelum menyimpan data supplier.
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = (page) => <DashboardLayout children={page} />;
