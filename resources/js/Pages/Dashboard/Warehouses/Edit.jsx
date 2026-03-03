import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import Button from "@/Components/Dashboard/Button";
import {
    IconArrowLeft, IconDeviceFloppy, IconBuildingWarehouse,
    IconMapPin, IconTrash,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Edit({ warehouse }) {
    const { data, setData, post, processing, errors } = useForm({
        _method:      "PUT",
        code:         warehouse.code         ?? "",
        name:         warehouse.name         ?? "",
        address:      warehouse.address      ?? "",
        phone:        warehouse.phone        ?? "",
        manager_name: warehouse.manager_name ?? "",
        email:        warehouse.email        ?? "",
        is_active:    warehouse.is_active    ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("warehouses.update", warehouse.id), {
            onSuccess: () => toast.success("Data gudang diperbarui! ✨"),
            onError:   () => toast.error("Periksa kembali form Anda"),
        });
    };

    return (
        <>
            <Head title={`Edit ${warehouse.name}`} />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <Link href={route("warehouses.index")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors"
                    >
                        <IconArrowLeft size={18} strokeWidth={2} /> Kembali
                    </Link>
                    <Button
                        type="delete"
                        url={route("warehouses.destroy", warehouse.id)}
                        className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 dark:border-red-900/30 transition-all"
                        label="Hapus Gudang"
                        icon={<IconTrash size={16} strokeWidth={2} />}
                    />
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
                        <IconBuildingWarehouse size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Data Gudang</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">Kode: {warehouse.code}</p>
                    </div>
                </div>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Main Form ── */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                                <div className="w-1 h-5 bg-primary-600 rounded-full" />
                                Informasi Utama
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <Input
                                    label="Kode Gudang"
                                    value={data.code}
                                    onChange={e => setData("code", e.target.value.toUpperCase())}
                                    errors={errors.code}
                                    required
                                    helperText="Unik, maks 50 karakter"
                                />
                                <Input
                                    label="Nama Gudang"
                                    value={data.name}
                                    onChange={e => setData("name", e.target.value)}
                                    errors={errors.name}
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
                                    placeholder="gudang@email.com"
                                />
                            </div>

                            <div className="mb-5">
                                <Input
                                    label="Nomor Telepon"
                                    value={data.phone}
                                    onChange={e => setData("phone", e.target.value)}
                                    errors={errors.phone}
                                    placeholder="021-xxxx atau 08xxx"
                                />
                            </div>

                            {/* Address */}
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
                                        placeholder="Alamat lengkap lokasi gudang..."
                                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none ${
                                            errors.address ? "border-red-400 dark:border-red-600" : "border-slate-200 dark:border-slate-700"
                                        }`}
                                    />
                                </div>
                                {errors.address && <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.address}</p>}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <Link href={route("warehouses.index")}
                                className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Batal
                            </Link>
                            <button type="submit" disabled={processing}
                                className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all flex items-center gap-2 shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <IconDeviceFloppy size={20} strokeWidth={2} />
                                <span>{processing ? "Menyimpan..." : "Simpan Perubahan"}</span>
                            </button>
                        </div>
                    </div>

                    {/* ── Sidebar: Status ── */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm sticky top-6">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Status</h3>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Status Aktif</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Gudang dapat digunakan</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={data.is_active}
                                        onChange={e => setData("is_active", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600" />
                                </label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
