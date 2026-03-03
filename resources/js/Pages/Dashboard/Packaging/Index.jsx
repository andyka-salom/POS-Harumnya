import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router, useForm } from "@inertiajs/react";
import {
    IconCirclePlus, IconPencil, IconTrash, IconPackage,
    IconPhoto, IconCheck, IconX, IconLock, IconTrendingUp, IconTrendingDown,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";
import Input from "@/Components/Dashboard/Input";
import toast from "react-hot-toast";

const fmt = (v = 0) => Number(v || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 });

// ─── Modal Kategori ──────────────────────────────────────────────────────────
function CategoryModal({ show, onClose, category = null }) {
    const isEdit = !!category;
    const { data, setData, post, put, processing, reset, errors } = useForm({
        code:        category?.code        || "",
        name:        category?.name        || "",
        description: category?.description || "",
        sort_order:  category?.sort_order  || 0,
        is_active:   category?.is_active   ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = {
            onSuccess: () => { onClose(); reset(); toast.success(isEdit ? "Kategori diperbarui" : "Kategori dibuat"); },
            onError:   () => toast.error("Periksa kembali input Anda"),
        };
        isEdit
            ? put(route("packaging.categories.update", category.id), opts)
            : post(route("packaging.categories.store"), opts);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl border dark:border-slate-800">
                <h3 className="text-lg font-bold mb-5 dark:text-white">
                    {isEdit ? "Edit Kategori" : "Tambah Kategori"}
                </h3>
                <form onSubmit={submit} className="space-y-4">
                    <Input label="Kode" value={data.code} onChange={e => setData("code", e.target.value.toUpperCase())} errors={errors.code} required />
                    <Input label="Nama Kategori" value={data.name} onChange={e => setData("name", e.target.value)} errors={errors.name} required />
                    <Input label="Urutan" type="number" value={data.sort_order} onChange={e => setData("sort_order", e.target.value)} />
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={data.is_active} onChange={e => setData("is_active", e.target.checked)} className="rounded text-violet-600" />
                        <span className="text-sm dark:text-slate-300">Status Aktif</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Batal</button>
                        <Button type="submit" processing={processing} label="Simpan" />
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Margin Badge ────────────────────────────────────────────────────────────
function MarginBadge({ sellingPrice, avgCost }) {
    if (!sellingPrice || !avgCost) return <span className="text-slate-300 text-xs">—</span>;
    const margin  = ((sellingPrice - avgCost) / sellingPrice) * 100;
    const profit  = sellingPrice - Math.round(avgCost);
    const isGood  = margin >= 0;
    return (
        <div className="text-right">
            <span className={`text-sm font-bold flex items-center justify-end gap-1 ${isGood ? "text-emerald-600" : "text-red-500"}`}>
                {isGood ? <IconTrendingUp size={13}/> : <IconTrendingDown size={13}/>}
                {margin.toFixed(1)}%
            </span>
            <span className={`text-[10px] ${isGood ? "text-emerald-500" : "text-red-400"}`}>
                {isGood ? "+" : ""}{fmt(profit)}/unit
            </span>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Index({ materials, categories, filters }) {
    const [activeTab, setActiveTab] = useState(filters.tab || "materials");
    const [catModal,  setCatModal]  = useState({ show: false, data: null });

    return (
        <>
            <Head title="Manajemen Kemasan" />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-2 bg-violet-600 rounded-lg text-white"><IconPackage size={20} /></div>
                    Kemasan & Packaging
                </h1>
                <div className="flex gap-2">
                    {activeTab === "materials" ? (
                        <Button
                            type="link" href={route("packaging.create")}
                            icon={<IconCirclePlus size={18} />} label="Tambah Kemasan"
                            className="bg-violet-600 text-white"
                        />
                    ) : (
                        <Button
                            type="button" onClick={() => setCatModal({ show: true, data: null })}
                            icon={<IconCirclePlus size={18} />} label="Tambah Kategori"
                            className="bg-slate-800 text-white"
                        />
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 mb-6 border-b border-slate-200 dark:border-slate-800">
                {[
                    { key: "materials",  label: "Daftar Kemasan" },
                    { key: "categories", label: "Kategori" },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`pb-3 text-sm font-bold transition-all border-b-2 ${
                            activeTab === tab.key
                                ? "border-violet-600 text-violet-600"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: Materials ── */}
            {activeTab === "materials" && (
                <>
                    {/* Filter Bar */}
                    <div className="mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="w-full sm:w-96">
                            <Search url={route("packaging.index")} placeholder="Cari nama atau kode kemasan..." />
                        </div>
                        <select
                            className="rounded-xl border-slate-200 dark:border-slate-700 text-sm dark:bg-slate-900 h-10 px-3"
                            value={filters.category_id || ""}
                            onChange={e => router.get(route("packaging.index"), { category_id: e.target.value }, { preserveState: true })}
                        >
                            <option value="">Semua Kategori</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-5 py-3.5">Produk Kemasan</th>
                                        <th className="px-5 py-3.5">Kategori</th>
                                        <th className="px-5 py-3.5">Satuan</th>
                                        <th className="px-5 py-3.5 text-right">Harga Beli</th>
                                        <th className="px-5 py-3.5 text-right">Harga Jual</th>
                                        <th className="px-5 py-3.5 text-right flex items-center gap-1 justify-end">
                                            <IconLock size={11}/> HPP (WAC)
                                        </th>
                                        <th className="px-5 py-3.5 text-right">Margin</th>
                                        <th className="px-5 py-3.5 text-center">Addon</th>
                                        <th className="px-5 py-3.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {materials.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-5 py-12 text-center text-slate-400 text-sm">
                                                Belum ada material kemasan.
                                            </td>
                                        </tr>
                                    ) : materials.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">

                                            {/* Produk */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {item.image_url
                                                            ? <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                                                            : <IconPhoto size={18} className="text-slate-400" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name}</div>
                                                        <div className="text-[10px] font-mono text-slate-400">{item.code}</div>
                                                        {item.size && (
                                                            <div className="text-[10px] text-violet-500 font-medium">{item.size.name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Kategori */}
                                            <td className="px-5 py-3.5">
                                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 text-violet-600 font-semibold">
                                                    {item.category?.name ?? "—"}
                                                </span>
                                            </td>

                                            {/* Satuan */}
                                            <td className="px-5 py-3.5 text-xs text-slate-500 uppercase font-medium">
                                                {item.unit}
                                            </td>

                                            {/* Harga Beli */}
                                            <td className="px-5 py-3.5 text-right">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {item.purchase_price > 0 ? `Rp ${fmt(item.purchase_price)}` : "—"}
                                                </span>
                                            </td>

                                            {/* Harga Jual */}
                                            <td className="px-5 py-3.5 text-right">
                                                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                                    {item.selling_price > 0 ? `Rp ${fmt(item.selling_price)}` : "—"}
                                                </span>
                                            </td>

                                            {/* HPP / Average Cost — readonly, hanya info */}
                                            <td className="px-5 py-3.5 text-right">
                                                <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                                                    {parseFloat(item.average_cost) > 0
                                                        ? `Rp ${fmt(Math.round(item.average_cost))}`
                                                        : <span className="text-slate-300 text-xs">Belum ada PO</span>
                                                    }
                                                </span>
                                            </td>

                                            {/* Margin */}
                                            <td className="px-5 py-3.5">
                                                <MarginBadge
                                                    sellingPrice={item.selling_price}
                                                    avgCost={parseFloat(item.average_cost)}
                                                />
                                            </td>

                                            {/* Addon toggle */}
                                            <td className="px-5 py-3.5 text-center">
                                                {item.is_available_as_addon
                                                    ? <IconCheck size={18} className="text-emerald-500 mx-auto" />
                                                    : <IconX    size={18} className="text-slate-300 mx-auto" />
                                                }
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={route("packaging.edit", item.id)}
                                                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <IconPencil size={15} />
                                                    </Link>
                                                    <Button
                                                        type="delete"
                                                        url={route("packaging.destroy", item.id)}
                                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg"
                                                        icon={<IconTrash size={15} />}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Pagination links={materials.links} />
                    </div>
                </>
            )}

            {/* ── TAB: Categories ── */}
            {activeTab === "categories" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Urutan</th>
                                    <th className="px-6 py-4">Kode</th>
                                    <th className="px-6 py-4">Kategori</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                                            Belum ada kategori.
                                        </td>
                                    </tr>
                                ) : categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="px-6 py-4 text-xs text-slate-400">{cat.sort_order}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-violet-600 font-bold">{cat.code}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-white">{cat.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            {cat.is_active
                                                ? <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full">Aktif</span>
                                                : <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-400 rounded-full">Nonaktif</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setCatModal({ show: true, data: cat })}
                                                    className="text-slate-400 hover:text-violet-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <IconPencil size={16} />
                                                </button>
                                                <Button
                                                    type="delete"
                                                    url={route("packaging.categories.destroy", cat.id)}
                                                    className="text-slate-400 hover:text-red-500 p-0 bg-transparent"
                                                    icon={<IconTrash size={16} />}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Info Panel */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">Tentang Kategori</h3>
                        <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside">
                            <li>Kategori digunakan untuk mengelompokkan kemasan (Botol, Tutup, Box, dll)</li>
                            <li>Kategori yang memiliki material tidak dapat dihapus</li>
                            <li>Urutan menentukan tampilan di dropdown POS</li>
                        </ul>
                    </div>
                </div>
            )}

            <CategoryModal
                show={catModal.show}
                onClose={() => setCatModal({ show: false, data: null })}
                category={catModal.data}
            />
        </>
    );
}

Index.layout = page => <DashboardLayout children={page} />;
