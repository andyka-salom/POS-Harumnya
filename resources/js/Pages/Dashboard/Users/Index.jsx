import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus,
    IconTrash,
    IconPencil,
    IconUserSquare,
    IconBuildingStore,
    IconPackage,
    IconMail,
    IconShieldCheck,
    IconAlertTriangle,
    IconX,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";
import toast from "react-hot-toast";

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onCancel, processing }) {
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
                <button onClick={onCancel} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                    <IconX size={20} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600">
                        <IconAlertTriangle size={28} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Hapus User</h3>
                        <p className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
                    </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                    Apakah Anda yakin ingin menghapus user{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>?
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={processing}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={processing}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <IconTrash size={16} />
                        {processing ? "Menghapus..." : "Ya, Hapus"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Index({ users, stores, warehouses, roles, filters }) {
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    const getInitials = (name) =>
        name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

    const handleFilterChange = (key, value) => {
        router.get(route("users.index"), { ...filters, [key]: value }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleDelete = () => {
        if (!userToDelete) return;
        setDeleteProcessing(true);
        router.delete(route("users.destroy", userToDelete.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("User berhasil dihapus.");
                setUserToDelete(null);
            },
            onError: () => toast.error("Gagal menghapus user."),
            onFinish: () => setDeleteProcessing(false),
        });
    };

    return (
        <>
            <Head title="Manajemen Pengguna" />

            <DeleteModal
                user={userToDelete}
                onConfirm={handleDelete}
                onCancel={() => setUserToDelete(null)}
                processing={deleteProcessing}
            />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-primary-600 rounded-lg text-white">
                            <IconUserSquare size={20} strokeWidth={2} />
                        </div>
                        Daftar Pengguna
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 ml-10">
                        Total {users.total} pengguna terdaftar
                    </p>
                </div>
                <Button
                    type="link"
                    href={route("users.create")}
                    icon={<IconCirclePlus size={18} />}
                    className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
                    label="Tambah User"
                />
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Search url={route("users.index")} placeholder="Cari nama/email..." />

                <select
                    className="rounded-xl border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    value={filters.role || ""}
                    onChange={(e) => handleFilterChange("role", e.target.value)}
                >
                    <option value="">Semua Role</option>
                    {roles.map((r, i) => (
                        <option key={i} value={r}>{r}</option>
                    ))}
                </select>

                <select
                    className="rounded-xl border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    value={filters.store_id || ""}
                    onChange={(e) => handleFilterChange("store_id", e.target.value)}
                >
                    <option value="">Semua Toko</option>
                    {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <select
                    className="rounded-xl border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    value={filters.warehouse_id || ""}
                    onChange={(e) => handleFilterChange("warehouse_id", e.target.value)}
                >
                    <option value="">Semua Gudang</option>
                    {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
            </div>

            {/* Empty State */}
            {users.data.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <IconUserSquare size={48} strokeWidth={1} className="mb-4" />
                    <p className="font-semibold">Tidak ada user ditemukan</p>
                    <p className="text-sm mt-1">Coba ubah filter atau tambah user baru</p>
                </div>
            )}

            {/* User Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {users.data.map((user) => (
                    <div
                        key={user.id}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow group"
                    >
                        {/* Avatar + Info */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-inner flex-shrink-0">
                                {getInitials(user.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 dark:text-white truncate">{user.name}</h3>
                                <div className="flex items-center gap-1 text-xs text-slate-500 truncate mt-1">
                                    <IconMail size={14} className="flex-shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            {/* Roles */}
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Hak Akses
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {user.roles.length > 0 ? (
                                        user.roles.map((role, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg text-[10px] font-bold uppercase border border-indigo-100 dark:border-indigo-800"
                                            >
                                                <IconShieldCheck size={12} /> {role.name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">Tanpa Role</span>
                                    )}
                                </div>
                            </div>

                            {/* Store & Warehouse */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                        Toko Default
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <IconBuildingStore size={14} className="text-slate-400 flex-shrink-0" />
                                        <span className="truncate">{user.store?.name ?? "Pusat"}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                        Gudang Default
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <IconPackage size={14} className="text-slate-400 flex-shrink-0" />
                                        <span className="truncate">{user.warehouse?.name ?? "Pusat"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-6">
                            <Link
                                href={route("users.edit", user.id)}
                                className="flex-1 flex justify-center items-center py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 transition-colors text-xs font-bold"
                            >
                                <IconPencil size={16} className="mr-2" /> Edit Profil
                            </Link>
                            <button
                                onClick={() => setUserToDelete(user)}
                                className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Hapus user"
                            >
                                <IconTrash size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {users.last_page > 1 && (
                <div className="mt-8">
                    <Pagination links={users.links} />
                </div>
            )}
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
