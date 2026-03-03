import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import Textarea from "@/Components/Dashboard/TextArea";
import { IconDeviceFloppy, IconArrowLeft, IconUserCircle } from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Form({ customer = null }) {
    const isEdit = !!customer;

    const { data, setData, post, put, processing, errors } = useForm({
        name: customer?.name || "",
        email: customer?.email || "",
        phone: customer?.phone || "",
        address: customer?.address || "",
        birth_date: customer?.birth_date || "",
        gender: customer?.gender || "male",
        points: customer?.points || 0,
        is_active: customer?.is_active ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route("customers.update", customer.id), {
                onSuccess: () => toast.success("Pelanggan diperbarui"),
            });
        } else {
            post(route("customers.store"), {
                onSuccess: () => toast.success("Pelanggan berhasil disimpan"),
            });
        }
    };

    return (
        <>
            <Head title={isEdit ? "Edit Pelanggan" : "Tambah Pelanggan"} />

            <div className="mb-6">
                <Link href={route("customers.index")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 transition-colors">
                    <IconArrowLeft size={16} /> Kembali
                </Link>
                <h1 className="text-2xl font-bold dark:text-white mt-2">
                    {isEdit ? "Perbarui Pelanggan" : "Tambah Pelanggan Baru"}
                </h1>
            </div>

            <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <IconUserCircle size={18} /> Profil Utama
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nama Lengkap"
                                value={data.name}
                                errors={errors.name}
                                onChange={(e) => setData("name", e.target.value)}
                                placeholder="Contoh: John Doe"
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
                                placeholder="john@example.com"
                            />
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                                <select
                                    className="rounded-xl border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm focus:ring-primary-500"
                                    value={data.gender}
                                    onChange={(e) => setData("gender", e.target.value)}
                                >
                                    <option value="male">Laki-laki</option>
                                    <option value="female">Perempuan</option>
                                </select>
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
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Status & Loyalty</h2>
                        <div className="space-y-4">
                            <Input
                                label="Poin Member"
                                type="number"
                                value={data.points}
                                errors={errors.points}
                                onChange={(e) => setData("points", e.target.value)}
                            />
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <span className="text-xs text-slate-500 block mb-1">Tier Saat Ini</span>
                                <span className="font-bold text-primary-600 italic">
                                    {data.points >= 1000 ? 'Gold' : data.points >= 500 ? 'Silver' : data.points >= 100 ? 'Bronze' : 'Regular'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 py-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={data.is_active}
                                        onChange={(e) => setData("is_active", e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Akun Aktif</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-2xl font-bold shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
                    >
                        <IconDeviceFloppy size={20} />
                        {processing ? "Menyimpan..." : "Simpan Data"}
                    </button>
                </div>
            </form>
        </>
    );
}

Form.layout = (page) => <DashboardLayout children={page} />;
