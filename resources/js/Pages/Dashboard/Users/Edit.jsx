import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconBuildingStore,
    IconPackage,
    IconUserEdit,
    IconLock,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Edit({ user, currentRoles, stores, warehouses, roles }) {
    const { data, setData, put, processing, errors } = useForm({
        name: user.name ?? "",
        email: user.email ?? "",
        password: "",
        password_confirmation: "",
        roles: currentRoles ?? [],
        default_store_id: user.default_store_id ?? "",
        default_warehouse_id: user.default_warehouse_id ?? "",
    });

    const handleRoleChange = (roleName) => {
        setData("roles", data.roles.includes(roleName)
            ? data.roles.filter((r) => r !== roleName)
            : [...data.roles, roleName]
        );
    };

    const submit = (e) => {
        e.preventDefault();
        put(route("users.update", user.id), {
            onSuccess: () => toast.success("Data user berhasil diperbarui."),
            onError: () => toast.error("Terdapat kesalahan pada form."),
        });
    };

    return (
        <>
            <Head title={`Edit ${user.name}`} />
            <div className="max-w-5xl mx-auto py-4">
                <Link
                    href={route("users.index")}
                    className="flex items-center gap-1 text-slate-500 hover:text-primary-600 mb-6 transition-colors text-sm font-medium"
                >
                    <IconArrowLeft size={18} /> Kembali ke Index
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg">
                        <IconUserEdit size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">Edit User</h1>
                        <p className="text-sm text-slate-500">Sesuaikan profil dan hak akses pengguna.</p>
                    </div>
                </div>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="text-lg font-bold mb-6 border-b pb-4 dark:border-slate-800">Profil</h2>
                            <div className="space-y-6">
                                <Input
                                    label="Nama Lengkap"
                                    value={data.name}
                                    onChange={(e) => setData("name", e.target.value)}
                                    errors={errors.name}
                                    required
                                />
                                <Input
                                    type="email"
                                    label="Email"
                                    value={data.email}
                                    onChange={(e) => setData("email", e.target.value)}
                                    errors={errors.email}
                                    required
                                />
                            </div>
                        </div>

                        {/* Roles */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="text-lg font-bold mb-2">Ubah Hak Akses</h2>
                            <p className="text-xs text-slate-400 mb-6 font-medium uppercase tracking-tighter">
                                Izin yang diberikan kepada user:
                            </p>

                            {roles.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">Belum ada role tersedia.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {roles.map((role) => (
                                        <label
                                            key={role.id}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                                                data.roles.includes(role.name)
                                                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-900/10"
                                                    : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded-lg border-slate-300 text-amber-600 focus:ring-amber-500"
                                                checked={data.roles.includes(role.name)}
                                                onChange={() => handleRoleChange(role.name)}
                                            />
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                                                {role.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {errors.roles && (
                                <p className="text-red-500 text-xs mt-3 font-medium">{errors.roles}</p>
                            )}
                        </div>

                        {/* Security */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
                            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <IconLock size={20} className="text-amber-500" /> Keamanan
                            </h2>
                            <p className="text-xs text-slate-400 mb-6 italic">
                                Kosongkan kolom di bawah jika tidak ingin mengubah password.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    type="password"
                                    label="Password Baru"
                                    value={data.password}
                                    onChange={(e) => setData("password", e.target.value)}
                                    errors={errors.password}
                                    autoComplete="new-password"
                                />
                                <Input
                                    type="password"
                                    label="Konfirmasi Password Baru"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData("password_confirmation", e.target.value)}
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Location */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold mb-6 uppercase text-[10px] tracking-widest text-slate-400">
                                Pengaturan Lokasi
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-bold flex items-center gap-2 mb-3 dark:text-slate-300">
                                        <IconBuildingStore size={18} className="text-amber-500" />
                                        Toko Default
                                    </label>
                                    <select
                                        className="w-full rounded-xl border-slate-200 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-amber-500"
                                        value={data.default_store_id}
                                        onChange={(e) => setData("default_store_id", e.target.value)}
                                    >
                                        <option value="">Akses Pusat</option>
                                        {stores.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    {errors.default_store_id && (
                                        <p className="text-red-500 text-xs mt-1">{errors.default_store_id}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-bold flex items-center gap-2 mb-3 dark:text-slate-300">
                                        <IconPackage size={18} className="text-amber-500" />
                                        Gudang Default
                                    </label>
                                    <select
                                        className="w-full rounded-xl border-slate-200 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-amber-500"
                                        value={data.default_warehouse_id}
                                        onChange={(e) => setData("default_warehouse_id", e.target.value)}
                                    >
                                        <option value="">Akses Pusat</option>
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                    {errors.default_warehouse_id && (
                                        <p className="text-red-500 text-xs mt-1">{errors.default_warehouse_id}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <IconDeviceFloppy size={20} />
                            {processing ? "Menyimpan..." : "Perbarui User"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
