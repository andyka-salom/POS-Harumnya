import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus, IconDatabaseOff, IconPencil, IconTrash, IconLayoutGrid,
    IconList, IconTruckDelivery, IconCircleCheck, IconCircleX, IconFilter,
    IconRefresh, IconUser, IconCreditCard, IconSearch, IconX, IconDownload,
    IconMailFilled, IconPhoneFilled, IconFilterOff
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";

function SupplierCard({ supplier }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                    <IconTruckDelivery size={24} />
                </div>
                <div className="flex items-center gap-2">
                    {supplier.is_active ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-full">
                            <IconCircleCheck size={14} />
                            Aktif
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-full">
                            <IconCircleX size={14} />
                            Nonaktif
                        </span>
                    )}
                </div>
            </div>

            <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate mb-1 text-base">
                {supplier.name}
            </h3>
            <code className="text-[10px] bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded text-teal-600 dark:text-teal-400 font-mono uppercase">
                {supplier.code}
            </code>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <IconUser size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{supplier.contact_person || 'Tidak ada kontak'}</span>
                </div>

                {supplier.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <IconMailFilled size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                    </div>
                )}

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <IconCreditCard size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="capitalize">{supplier.payment_term_label}</span>
                </div>

                {supplier.payment_term !== 'cash' && supplier.credit_limit > 0 && (
                    <div className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                        Limit: {supplier.formatted_credit_limit}
                    </div>
                )}
            </div>

            <Link
                href={route("suppliers.edit", supplier.id)}
                className="mt-4 block text-center py-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
            >
                Edit Detail
            </Link>
        </div>
    );
}

function FilterPanel({ filters, onFilterChange, onClearFilters }) {
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    showFilters || filters.is_active !== undefined || filters.payment_term
                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
                <IconFilter size={18} />
                Filter
                {(filters.is_active !== undefined || filters.payment_term) && (
                    <span className="bg-white/20 px-1.5 rounded-full text-xs">
                        {[filters.is_active !== undefined, filters.payment_term].filter(Boolean).length}
                    </span>
                )}
            </button>

            {showFilters && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowFilters(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-white">Filter Data</h3>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <IconX size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Status Supplier
                                </label>
                                <select
                                    value={filters.is_active ?? ''}
                                    onChange={(e) => onFilterChange('is_active', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="">Semua Status</option>
                                    <option value="1">Aktif</option>
                                    <option value="0">Nonaktif</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Termin Pembayaran
                                </label>
                                <select
                                    value={filters.payment_term || ''}
                                    onChange={(e) => onFilterChange('payment_term', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="">Semua Termin</option>
                                    <option value="cash">Tunai (Cash)</option>
                                    <option value="credit_7">Kredit 7 Hari</option>
                                    <option value="credit_14">Kredit 14 Hari</option>
                                    <option value="credit_30">Kredit 30 Hari</option>
                                    <option value="credit_60">Kredit 60 Hari</option>
                                </select>
                            </div>

                            <div className="flex gap-2 pt-2 border-t dark:border-slate-800">
                                <button
                                    onClick={onClearFilters}
                                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <IconFilterOff size={16} className="inline mr-1" />
                                    Reset
                                </button>
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="flex-1 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function Index({ suppliers, filters }) {
    const [viewMode, setViewMode] = useState(localStorage.getItem('supplier_view_mode') || 'list');

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('supplier_view_mode', mode);
    };

    const handleFilterChange = (key, value) => {
        router.get(route('suppliers.index'), {
            ...filters,
            [key]: value || undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearFilters = () => {
        router.get(route('suppliers.index'), {
            search: filters.search,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleRefresh = () => {
        router.reload({ only: ['suppliers'] });
    };

    const activeFiltersCount = [
        filters.is_active !== undefined,
        filters.payment_term,
    ].filter(Boolean).length;

    return (
        <>
            <Head title="Data Supplier" />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-teal-600 rounded-lg text-white shadow-lg shadow-teal-500/30">
                            <IconTruckDelivery size={20} />
                        </div>
                        Data Supplier
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1 ml-11">
                        {suppliers.total} Supplier Terdaftar
                        {activeFiltersCount > 0 && (
                            <span className="ml-2 text-teal-600">
                                • {activeFiltersCount} filter aktif
                            </span>
                        )}
                    </p>
                </div>
                <Button
                    type="link"
                    href={route("suppliers.create")}
                    icon={<IconCirclePlus size={18} />}
                    className="bg-teal-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/30 hover:bg-teal-700"
                    label="Tambah Supplier"
                />
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="w-full sm:w-80">
                    <Search
                        url={route("suppliers.index")}
                        placeholder="Cari nama, kode, email..."
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Refresh data"
                    >
                        <IconRefresh size={18} />
                    </button>

                    <FilterPanel
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                    />

                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => handleViewModeChange('grid')}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-white dark:bg-slate-900 shadow text-teal-600'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                            title="Grid view"
                        >
                            <IconLayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => handleViewModeChange('list')}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'list'
                                    ? 'bg-white dark:bg-slate-900 shadow text-teal-600'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                            title="List view"
                        >
                            <IconList size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Filter aktif:
                    </span>
                    {filters.is_active !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg text-xs font-medium">
                            Status: {filters.is_active === '1' ? 'Aktif' : 'Nonaktif'}
                            <button
                                onClick={() => handleFilterChange('is_active', '')}
                                className="hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded p-0.5"
                            >
                                <IconX size={12} />
                            </button>
                        </span>
                    )}
                    {filters.payment_term && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg text-xs font-medium">
                            Termin: {filters.payment_term.replace('_', ' ')}
                            <button
                                onClick={() => handleFilterChange('payment_term', '')}
                                className="hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded p-0.5"
                            >
                                <IconX size={12} />
                            </button>
                        </span>
                    )}
                    <button
                        onClick={handleClearFilters}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                        Reset semua
                    </button>
                </div>
            )}

            {/* Content */}
            {suppliers.data.length > 0 ? (
                viewMode === 'list' ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                            Supplier / Kode
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                            Kontak
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                            Termin / Limit
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-center">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {suppliers.data.map(item => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold dark:text-slate-200">
                                                        {item.name}
                                                    </span>
                                                    <code className="text-[10px] font-mono text-teal-600 dark:text-teal-400 uppercase mt-0.5">
                                                        {item.code}
                                                    </code>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm space-y-1">
                                                    <p className="font-semibold dark:text-slate-300 flex items-center gap-1.5">
                                                        <IconUser size={14} className="text-slate-400" />
                                                        {item.contact_person || '-'}
                                                    </p>
                                                    {item.email && (
                                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                            <IconMailFilled size={12} className="text-slate-400" />
                                                            {item.email}
                                                        </p>
                                                    )}
                                                    {item.phone && (
                                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                            <IconPhoneFilled size={12} className="text-slate-400" />
                                                            {item.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    <p className="font-semibold dark:text-slate-300 capitalize">
                                                        {item.payment_term_label}
                                                    </p>
                                                    {item.credit_limit > 0 && (
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            Limit: {item.formatted_credit_limit}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {item.is_active ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full text-xs font-semibold">
                                                        <IconCircleCheck size={14} />
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full text-xs font-semibold">
                                                        <IconCircleX size={14} />
                                                        Nonaktif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={route('suppliers.edit', item.id)}
                                                        className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <IconPencil size={16} />
                                                    </Link>
                                                    <Button
                                                        type="delete"
                                                        url={route("suppliers.destroy", item.id)}
                                                        className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                                        icon={<IconTrash size={16} />}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {suppliers.data.map(item => (
                            <SupplierCard key={item.id} supplier={item} />
                        ))}
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl">
                    <IconDatabaseOff size={64} className="text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold dark:text-white mb-1">
                        {filters.search || activeFiltersCount > 0 ? 'Tidak ada hasil' : 'Data Supplier Kosong'}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                        {filters.search || activeFiltersCount > 0
                            ? 'Coba ubah kata kunci atau filter pencarian'
                            : 'Mulai tambahkan supplier pertama Anda'}
                    </p>
                    {filters.search || activeFiltersCount > 0 ? (
                        <button
                            onClick={handleClearFilters}
                            className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Reset Filter
                        </button>
                    ) : (
                        <Button
                            type="link"
                            href={route("suppliers.create")}
                            label="Tambah Supplier Baru"
                            icon={<IconCirclePlus size={18} />}
                            className="bg-teal-600 text-white px-6 py-2.5 shadow-lg shadow-teal-500/30 hover:bg-teal-700"
                        />
                    )}
                </div>
            )}

            {/* Pagination */}
            {suppliers.data.length > 0 && (
                <div className="mt-8">
                    <Pagination links={suppliers.links} />
                </div>
            )}
        </>
    );
}

Index.layout = page => <DashboardLayout children={page} />;
