import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus,
    IconDatabaseOff,
    IconPencilCog,
    IconTrash,
    IconLayoutGrid,
    IconList,
    IconBottle, // Icon Botol
    IconFilter,
    IconRefresh,
    IconX,
    IconPhotoOff,
    IconTag
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";

// Format Rupiah
const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

// Card Component
function BottleCard({ bottle, isSelected, onSelect }) {
    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all">
            {/* Checkbox */}
            <div className="absolute top-3 left-3 z-10">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(bottle.id, e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-white shadow text-primary-600 focus:ring-2 focus:ring-primary-500"
                />
            </div>

            {/* Status Badge */}
            <div className="absolute top-3 right-3 z-10">
                {bottle.is_active ? (
                    <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs font-bold shadow-sm backdrop-blur-sm bg-opacity-90">Aktif</span>
                ) : (
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-bold shadow-sm">Non-Aktif</span>
                )}
            </div>

            {/* Image Section */}
            <div className="h-48 w-full bg-slate-50 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                {bottle.image_url ? (
                    <img
                        src={bottle.image_url}
                        alt={bottle.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                        <IconPhotoOff size={32} />
                        <span className="text-xs">No Image</span>
                    </div>
                )}
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="mb-3">
                    <div className="flex justify-between items-start">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 mb-1">
                            <IconTag size={10} /> {bottle.size?.name || 'Unknown Size'}
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 truncate" title={bottle.name}>
                        {bottle.name}
                    </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Jual</p>
                        <p className="text-sm font-bold text-primary-600">{formatRupiah(bottle.price)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Modal</p>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{formatRupiah(bottle.cost_price)}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link
                        href={route("bottle-prices.edit", bottle.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-warning-100 text-warning-700 hover:bg-warning-200 dark:bg-warning-900/50 dark:text-warning-400 dark:hover:bg-warning-900/70 transition-all font-semibold text-xs"
                    >
                        <IconPencilCog size={16} /> Edit
                    </Link>
                    <Button
                        type={"delete"}
                        icon={<IconTrash size={16} />}
                        className="px-3 py-2 rounded-lg bg-danger-100 text-danger-700 hover:bg-danger-200 dark:bg-danger-900/50 dark:text-danger-400 dark:hover:bg-danger-900/70 transition-all"
                        url={route("bottle-prices.destroy", bottle.id)}
                    />
                </div>
            </div>
        </div>
    );
}

// Filter Modal (Simplified for brevity)
function FilterModal({ show, onClose, sizes, filters, onApply }) {
    const [temp, setTemp] = useState(filters);
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl border dark:border-slate-800">
                <h3 className="font-bold mb-4 dark:text-white">Filter</h3>
                <div className="space-y-4">
                    <select value={temp.size_id || ''} onChange={e => setTemp({...temp, size_id: e.target.value})} className="w-full rounded-xl border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <option value="">Semua Ukuran</option>
                        {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select value={temp.is_active} onChange={e => setTemp({...temp, is_active: e.target.value})} className="w-full rounded-xl border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <option value="">Semua Status</option>
                        <option value="1">Aktif</option>
                        <option value="0">Tidak Aktif</option>
                    </select>
                </div>
                <div className="flex gap-2 mt-6">
                    <button onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded-lg dark:bg-slate-800 dark:text-slate-300">Batal</button>
                    <button onClick={() => { onApply(temp); onClose(); }} className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Terapkan</button>
                </div>
            </div>
        </div>
    );
}

export default function Index({ bottles, sizes, filters }) {
    const [viewMode, setViewMode] = useState(localStorage.getItem('bottleViewMode') || 'grid');
    const [showFilter, setShowFilter] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const handleApplyFilters = (newFilters) => {
        router.get(route('bottle-prices.index'), { ...filters, ...newFilters }, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Katalog Botol & Harga" />
            <div className="mb-6 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <IconBottle size={24} className="text-white" />
                        </div>
                        Botol & Kemasan
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">{bottles.total} Pilihan Botol Tersedia</p>
                </div>
                <Button type="link" icon={<IconCirclePlus size={20} />} className="bg-primary-600 text-white font-semibold shadow-lg" label="Tambah Botol" href={route("bottle-prices.create")} />
            </div>

            <div className="mb-6 flex flex-col sm:flex-row justify-between gap-3">
                <div className="w-full sm:w-96">
                    <Search url={route("bottle-prices.index")} placeholder="Cari nama botol..." />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => router.reload({ only: ['bottles'] })} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"><IconRefresh size={20} /></button>
                    <button onClick={() => setShowFilter(true)} className={`p-2.5 rounded-xl ${filters.size_id ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}><IconFilter size={20} /></button>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                        <button onClick={() => { setViewMode('grid'); localStorage.setItem('bottleViewMode', 'grid'); }} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow text-primary-600' : 'text-slate-500'}`}><IconLayoutGrid size={18} /></button>
                        <button onClick={() => { setViewMode('list'); localStorage.setItem('bottleViewMode', 'list'); }} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow text-primary-600' : 'text-slate-500'}`}><IconList size={18} /></button>
                    </div>
                </div>
            </div>

            {bottles.data.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {bottles.data.map(item => (
                            <BottleCard key={item.id} bottle={item} isSelected={selectedIds.includes(item.id)} onSelect={(id, c) => c ? setSelectedIds([...selectedIds, id]) : setSelectedIds(selectedIds.filter(x => x !== id))} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                                <tr>
                                    <th className="p-4 text-xs font-bold uppercase text-slate-500">Nama</th>
                                    <th className="p-4 text-xs font-bold uppercase text-slate-500">Ukuran</th>
                                    <th className="p-4 text-xs font-bold uppercase text-slate-500">Harga Jual</th>
                                    <th className="p-4 text-xs font-bold uppercase text-slate-500">Harga Modal</th>
                                    <th className="p-4 text-xs font-bold uppercase text-slate-500 text-center">Status</th>
                                    <th className="p-4 text-xs font-bold uppercase text-slate-500 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                                {bottles.data.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                                                {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-400"><IconPhotoOff size={16}/></div>}
                                            </div>
                                            <span className="font-semibold dark:text-white">{item.name}</span>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400">{item.size?.name}</td>
                                        <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{formatRupiah(item.price)}</td>
                                        <td className="p-4 font-mono text-slate-500">{formatRupiah(item.cost_price)}</td>
                                        <td className="p-4 text-center">
                                            {item.is_active ? <span className="text-green-600 text-xs font-bold">Aktif</span> : <span className="text-slate-400 text-xs">Non-Aktif</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link href={route('bottle-prices.edit', item.id)} className="text-warning-600 hover:underline text-sm font-semibold mr-3">Edit</Link>
                                            <Link href={route('bottle-prices.destroy', item.id)} method="delete" as="button" className="text-danger-600 hover:underline text-sm font-semibold">Hapus</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="text-center py-20">
                    <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4"><IconDatabaseOff size={32} className="text-slate-400"/></div>
                    <h3 className="text-lg font-bold dark:text-white">Tidak ada data ditemukan</h3>
                </div>
            )}

            <div className="mt-6"><Pagination links={bottles.links} /></div>
            <FilterModal show={showFilter} onClose={() => setShowFilter(false)} sizes={sizes} filters={filters} onApply={handleApplyFilters} />
        </>
    );
}

Index.layout = page => <DashboardLayout children={page} />;
