import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Button from "@/Components/Dashboard/Button";
import {
    IconCirclePlus, IconDatabaseOff, IconPencilCog, IconTrash,
    IconPackages, IconAlertTriangle, IconTrendingUp, IconClock,
    IconBuildingWarehouse, IconChartBar, IconCurrencyDollar,
    IconInfoCircle, IconBottle, IconBox, IconSearch, IconX,
} from "@tabler/icons-react";
import Table from "@/Components/Dashboard/Table";
import Pagination from "@/Components/Dashboard/Pagination";

export default function Index({
    stocks         = { data: [], links: [] },
    warehouses     = [],
    itemType       = "ingredient",
    summary        = { total_items: 0, low_stock: 0, out_of_stock: 0, over_stock: 0, total_value: 0 },
    overallSummary = {
        total_ingredients: 0,
        total_packaging: 0,
        low_stock_ingredients: 0,
        low_stock_packaging: 0,
        over_stock_ingredients: 0,
        over_stock_packaging: 0,
    },
    filters = {},
}) {
    const [searchTerm,        setSearchTerm]        = useState(filters.search       || "");
    const [selectedWarehouse, setSelectedWarehouse] = useState(filters.warehouse_id || "");
    const [selectedStatus,    setSelectedStatus]    = useState(filters.stock_status || "");

    // ROOT CAUSE FIX: simpan semua filter di ref agar navigate tidak pernah stale.
    // navigateWithFilters adalah fungsi biasa yang di-recreate tiap render, tapi
    // useCallback/useDebounce memoize referensi lama → closure baca nilai lama.
    // Solusi: ref selalu menyimpan nilai terkini tanpa memoization.
    const filtersRef = useRef({ searchTerm, selectedWarehouse, selectedStatus });
    useEffect(() => {
        filtersRef.current = { searchTerm, selectedWarehouse, selectedStatus };
    }, [searchTerm, selectedWarehouse, selectedStatus]);

    // Timer ref untuk debounce — tidak perlu hook khusus
    const debounceTimer = useRef(null);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const fmt = (n) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency", currency: "IDR", minimumFractionDigits: 0,
        }).format(n || 0);

    const fmtNum = (n) => parseInt(n ?? 0, 10).toLocaleString("id-ID");

    const fmtDate = (d) =>
        d
            ? new Date(d).toLocaleDateString("id-ID", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })
            : "-";

    const getItemName = (s) =>
        itemType === "ingredient" ? s.ingredient?.name : s.packaging_material?.name;
    const getItemCode = (s) =>
        itemType === "ingredient" ? s.ingredient?.code : s.packaging_material?.code;
    const getItemUnit = (s) =>
        itemType === "ingredient"
            ? (s.ingredient?.unit || "unit")
            : (s.packaging_material?.size?.name || "pcs");

    const getQty = (s) => parseInt(s.quantity ?? 0, 10);

    const getStockStatus = (s) => {
        const qty = getQty(s);
        const min = parseInt(s.min_stock ?? 0, 10);
        const max = parseInt(s.max_stock ?? 0, 10);

        if (qty < 0)
            return { label: "Negatif",     color: "bg-red-100 text-red-700 border-red-300",              icon: <IconAlertTriangle size={12} /> };
        if (qty === 0)
            return { label: "Habis",       color: "bg-slate-100 text-slate-600 border-slate-300",         icon: <IconPackages size={12} /> };
        if (min > 0 && qty < min)
            return { label: "Stok Rendah", color: "bg-danger-100 text-danger-700 border-danger-300",      icon: <IconAlertTriangle size={12} /> };
        if (max > 0 && qty > max)
            return { label: "Overstock",   color: "bg-warning-100 text-warning-700 border-warning-300",   icon: <IconTrendingUp size={12} /> };
        return      { label: "Normal",     color: "bg-success-100 text-success-700 border-success-300",   icon: null };
    };

    // ─── Navigation ───────────────────────────────────────────────────────────

    /**
     * Baca nilai filter dari REF (selalu fresh, tidak pernah stale closure),
     * merge dengan overrides, lalu navigate.
     */
    const navigateWithFilters = (overrides = {}) => {
        const { searchTerm, selectedWarehouse, selectedStatus } = filtersRef.current;
        const params = {
            item_type:    itemType,
            search:       searchTerm       || undefined,
            warehouse_id: selectedWarehouse || undefined,
            stock_status: selectedStatus   || undefined,
            ...overrides,
        };
        const cleaned = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v != null && v !== "")
        );
        router.get(route("warehouse-stocks.index"), cleaned, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        // Debounce 500ms — menggunakan ref timer, bukan hook, agar tidak ada stale closure
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            // Baca langsung dari argument, bukan dari closure state
            navigateWithFilters({ search: val || undefined });
        }, 500);
    };

    const clearSearch = () => {
        setSearchTerm("");
        clearTimeout(debounceTimer.current);
        navigateWithFilters({ search: undefined });
    };

    const handleWarehouseChange = (e) => {
        const val = e.target.value;
        setSelectedWarehouse(val);
        navigateWithFilters({ warehouse_id: val || undefined });
    };

    const handleStatusChange = (e) => {
        const val = e.target.value;
        setSelectedStatus(val);
        navigateWithFilters({ stock_status: val || undefined });
    };

    const switchItemType = (type) =>
        router.get(route("warehouse-stocks.index"), { item_type: type }, { replace: true });

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <Head title="Stok Gudang" />

            {/* Page Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconBuildingWarehouse size={28} className="text-primary-500" />
                        Stok Gudang
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Monitoring inventaris ingredient &amp; packaging di gudang.
                    </p>
                </div>
                <Button
                    type="link"
                    icon={<IconCirclePlus size={18} />}
                    className="bg-primary-500 hover:bg-primary-600 text-white shadow-md transition-all"
                    label="Tambah Stok"
                    href={route("warehouse-stocks.create")}
                />
            </div>

            {/* Tab Switcher — BUG FIX: tampilkan badge "low" DAN "over" */}
            <div className="mb-6 grid grid-cols-2 gap-4">
                {[
                    {
                        type: "ingredient", label: "Ingredient", sub: "Bahan Baku",
                        Icon: IconBottle, activeColor: "emerald",
                        total: overallSummary.total_ingredients,
                        low:   overallSummary.low_stock_ingredients,
                        over:  overallSummary.over_stock_ingredients,
                    },
                    {
                        type: "packaging", label: "Packaging", sub: "Kemasan & Botol",
                        Icon: IconBox, activeColor: "violet",
                        total: overallSummary.total_packaging,
                        low:   overallSummary.low_stock_packaging,
                        over:  overallSummary.over_stock_packaging,
                    },
                ].map(({ type, label, sub, Icon, activeColor, total, low, over }) => {
                    const active = itemType === type;
                    return (
                        <button
                            key={type}
                            onClick={() => switchItemType(type)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                active
                                    ? `border-${activeColor}-500 bg-${activeColor}-50 dark:bg-${activeColor}-900/20`
                                    : "border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${active ? `bg-${activeColor}-500` : "bg-slate-200"}`}>
                                    <Icon size={22} className={active ? "text-white" : "text-slate-600"} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 dark:text-white text-sm">{label}</div>
                                    <div className="text-xs text-slate-500">{total} items · {sub}</div>
                                </div>
                                {/* BUG FIX: tampilkan badge low DAN over */}
                                <div className="flex flex-col gap-1 items-end shrink-0">
                                    {low > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-danger-100 text-danger-700 border border-danger-200 whitespace-nowrap">
                                            {low} Low
                                        </span>
                                    )}
                                    {over > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-warning-100 text-warning-700 border border-warning-200 whitespace-nowrap">
                                            {over} Over
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Summary Cards — BUG FIX: tambah card "Overstock" */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[
                    {
                        label: `Total ${itemType === "ingredient" ? "Ingredient" : "Packaging"}`,
                        value: summary.total_items,
                        Icon: IconChartBar,
                        colorBg: "bg-blue-50 dark:bg-blue-900/20",
                        colorIcon: "text-blue-600",
                        colorText: "text-slate-800 dark:text-slate-200",
                    },
                    {
                        label: "Low Stock",
                        value: summary.low_stock,
                        Icon: IconAlertTriangle,
                        colorBg: "bg-danger-50 dark:bg-danger-900/20",
                        colorIcon: "text-danger-600",
                        colorText: "text-danger-700",
                        accent: "border-l-danger-500",
                    },
                    {
                        label: "Out of Stock",
                        value: summary.out_of_stock,
                        Icon: IconPackages,
                        colorBg: "bg-slate-100 dark:bg-slate-800",
                        colorIcon: "text-slate-500",
                        colorText: "text-slate-700 dark:text-slate-300",
                    },
                    {
                        label: "Overstock",
                        value: summary.over_stock,
                        Icon: IconTrendingUp,
                        colorBg: "bg-warning-50 dark:bg-warning-900/20",
                        colorIcon: "text-warning-600",
                        colorText: "text-warning-700",
                        accent: "border-l-warning-500",
                    },
                    {
                        label: "Nilai Aset",
                        value: fmt(summary.total_value),
                        Icon: IconCurrencyDollar,
                        colorBg: "bg-success-50 dark:bg-success-900/20",
                        colorIcon: "text-success-600",
                        colorText: "text-success-700",
                        accent: "border-l-success-500",
                        wide: true,
                    },
                ].map(({ label, value, Icon, colorBg, colorIcon, colorText, accent, wide }) => (
                    <div
                        key={label}
                        className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between gap-3 ${
                            accent ? `border-l-4 ${accent}` : ""
                        } ${wide ? "lg:col-span-1" : ""}`}
                    >
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">{label}</p>
                            <p className={`text-xl font-black leading-none ${colorText}`}>{value}</p>
                        </div>
                        <div className={`p-2.5 rounded-lg shrink-0 ${colorBg}`}>
                            <Icon size={20} className={colorIcon} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-col md:flex-row gap-3">
                {/* BUG FIX: search input dengan clear button */}
                <div className="flex-1 relative">
                    <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder={`Cari ${itemType === "ingredient" ? "ingredient" : "packaging"} atau gudang...`}
                        className="w-full pl-9 pr-8 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                    {searchTerm && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <IconX size={15} />
                        </button>
                    )}
                </div>
                <select
                    value={selectedWarehouse}
                    onChange={handleWarehouseChange}
                    className="w-full md:w-52 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm"
                >
                    <option value="">Semua Gudang</option>
                    {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                </select>
                <select
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    className="w-full md:w-44 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm"
                >
                    <option value="">Semua Status</option>
                    <option value="low">Stok Rendah</option>
                    <option value="out">Stok Habis / Negatif</option>
                    <option value="over">Overstock</option>
                </select>
            </div>

            {/* Active filter chips */}
            {(searchTerm || selectedWarehouse || selectedStatus) && (
                <div className="mb-3 flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-slate-500 font-bold">Filter aktif:</span>
                    {searchTerm && (
                        <Chip label={`"${searchTerm}"`} onRemove={clearSearch} />
                    )}
                    {selectedWarehouse && (
                        <Chip
                            label={warehouses.find(w => w.id === selectedWarehouse)?.name || selectedWarehouse}
                            onRemove={() => { setSelectedWarehouse(""); navigateWithFilters({ warehouse_id: undefined }); }}
                        />
                    )}
                    {selectedStatus && (
                        <Chip
                            label={{ low: "Stok Rendah", out: "Habis/Negatif", over: "Overstock" }[selectedStatus]}
                            onRemove={() => { setSelectedStatus(""); navigateWithFilters({ stock_status: undefined }); }}
                        />
                    )}
                </div>
            )}

            {/* Table */}
            {stocks?.data?.length > 0 ? (
                <Table.Card title={`Rincian Stok ${itemType === "ingredient" ? "Ingredient" : "Packaging"}`}>
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th className="w-10 text-center">No</Table.Th>
                                <Table.Th>Item &amp; Gudang</Table.Th>
                                <Table.Th className="text-right">Kuantitas</Table.Th>
                                <Table.Th className="text-center">Min / Max</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Terakhir Masuk</Table.Th>
                                <Table.Th className="text-right">Nilai</Table.Th>
                                <Table.Th className="w-20 text-center">Aksi</Table.Th>
                            </tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {stocks.data.map((item, i) => {
                                const status = getStockStatus(item);
                                const qty    = getQty(item);
                                const rowNum = i + 1 + (stocks.current_page - 1) * stocks.per_page;
                                return (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                                    >
                                        <Table.Td className="text-center text-slate-400 text-sm font-medium">
                                            {rowNum}
                                        </Table.Td>

                                        <Table.Td>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                {getItemName(item)}
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                <IconBuildingWarehouse size={11} />
                                                <span>{item.warehouse?.name}</span>
                                                <span className="text-slate-300">·</span>
                                                <span className="font-mono uppercase">{getItemCode(item)}</span>
                                                {itemType === "packaging" && item.packaging_material?.size && (
                                                    <>
                                                        <span className="text-slate-300">·</span>
                                                        <span>{item.packaging_material.size.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="text-right">
                                            <div className={`text-base font-black tabular-nums ${qty < 0 ? "text-red-600" : "text-primary-600 dark:text-primary-400"}`}>
                                                {qty.toLocaleString("id-ID")}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {getItemUnit(item)}
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="text-center">
                                            <div className="text-[11px] font-semibold text-slate-500 space-y-0.5">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="text-slate-400">Min</span>
                                                    <span className={`font-bold ${item.min_stock != null ? "text-danger-600" : "text-slate-300"}`}>
                                                        {item.min_stock != null ? fmtNum(item.min_stock) : "—"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="text-slate-400">Max</span>
                                                    <span className={`font-bold ${item.max_stock != null ? "text-warning-600" : "text-slate-300"}`}>
                                                        {item.max_stock != null ? fmtNum(item.max_stock) : "—"}
                                                    </span>
                                                </div>
                                            </div>
                                        </Table.Td>

                                        <Table.Td>
                                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-black uppercase border ${status.color}`}>
                                                {status.icon}
                                                {status.label}
                                            </span>
                                        </Table.Td>

                                        <Table.Td>
                                            <div className="text-[11px] space-y-0.5">
                                                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                    <IconClock size={11} />
                                                    {fmtDate(item.last_in_at || item.updated_at)}
                                                </div>
                                                {item.last_in_qty && (
                                                    <div className="text-success-600 font-semibold">
                                                        +{parseInt(item.last_in_qty, 10).toLocaleString("id-ID")} {getItemUnit(item)}
                                                    </div>
                                                )}
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="text-right">
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm tabular-nums">
                                                {fmt(item.total_value)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 tabular-nums">
                                                @ {fmt(item.average_cost)}/unit
                                            </div>
                                        </Table.Td>

                                        <Table.Td>
                                            <div className="flex justify-center gap-1.5">
                                                <Button
                                                    type="edit"
                                                    icon={<IconPencilCog size={14} />}
                                                    className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200 rounded-lg"
                                                    href={route("warehouse-stocks.edit", {
                                                        id: item.id,
                                                        item_type: itemType,
                                                    })}
                                                />
                                                <Button
                                                    type="delete"
                                                    icon={<IconTrash size={14} />}
                                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200 rounded-lg"
                                                    url={route("warehouse-stocks.destroy", {
                                                        id: item.id,
                                                        item_type: itemType,
                                                    })}
                                                />
                                            </div>
                                        </Table.Td>
                                    </tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </Table.Card>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                        <IconDatabaseOff size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                        Tidak ada data stok
                    </h3>
                    <p className="text-slate-500 text-sm max-w-xs text-center mt-1">
                        {(searchTerm || selectedWarehouse || selectedStatus)
                            ? "Tidak ada hasil untuk filter yang dipilih."
                            : `Belum ada stok ${itemType === "ingredient" ? "ingredient" : "packaging"} yang terdaftar.`
                        }
                    </p>
                    {!(searchTerm || selectedWarehouse || selectedStatus) && (
                        <Link
                            href={route("warehouse-stocks.create")}
                            className="mt-5 flex items-center gap-2 text-primary-600 font-bold hover:underline text-sm"
                        >
                            <IconCirclePlus size={17} /> Tambah Stok Sekarang
                        </Link>
                    )}
                </div>
            )}

            <div className="mt-6">
                <Pagination links={stocks?.links || []} />
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3 items-start">
                <IconInfoCircle className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <strong>Informasi:</strong> Total nilai = Kuantitas × Biaya Rata-rata.{" "}
                    <strong>Low Stock</strong> aktif jika qty &lt; minimum.{" "}
                    <strong>Overstock</strong> aktif jika qty &gt; maksimum.{" "}
                    <strong>Negatif</strong> terjadi akibat pengambilan stok darurat.{" "}
                    Perubahan qty hanya melalui <strong>Stock Movement</strong>.
                </p>
            </div>
        </>
    );
}

// ─── Chip filter ──────────────────────────────────────────────────────────────
function Chip({ label, onRemove }) {
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-700 border border-primary-200">
            {label}
            <button onClick={onRemove} className="hover:text-primary-900 ml-0.5">
                <IconX size={11} />
            </button>
        </span>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
