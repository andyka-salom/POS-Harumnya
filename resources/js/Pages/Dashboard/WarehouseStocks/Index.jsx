import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Button from "@/Components/Dashboard/Button";
import {
    IconCirclePlus, IconDatabaseOff, IconPencilCog, IconTrash,
    IconPackages, IconAlertTriangle, IconTrendingUp, IconClock,
    IconBuildingWarehouse, IconChartBar, IconCurrencyDollar,
    IconInfoCircle, IconBottle, IconBox,
} from "@tabler/icons-react";
import Table from "@/Components/Dashboard/Table";
import Pagination from "@/Components/Dashboard/Pagination";

export default function Index({
    stocks         = { data: [], links: [] },
    warehouses     = [],
    itemType       = "ingredient",
    summary        = { total_items: 0, low_stock: 0, out_of_stock: 0, total_value: 0 },
    overallSummary = {
        total_ingredients: 0,
        total_packaging: 0,
        low_stock_ingredients: 0,
        low_stock_packaging: 0,
    },
    filters = {},
}) {
    const [searchTerm,        setSearchTerm]        = useState(filters.search       || "");
    const [selectedWarehouse, setSelectedWarehouse] = useState(filters.warehouse_id || "");
    const [selectedStatus,    setSelectedStatus]    = useState(filters.stock_status || "");

    // Debounced search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== filters.search) handleFilter("search", searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const fmt = (n) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(n || 0);

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

    // quantity adalah bigInteger signed — parseInt agar tidak ada float artifacts
    const getQty = (s) => parseInt(s.quantity ?? 0, 10);

    const getStockStatus = (s) => {
        const qty = getQty(s);
        const min = parseInt(s.min_stock ?? 0, 10);
        const max = parseInt(s.max_stock ?? 0, 10);

        // Stok negatif → tampilkan sebagai "Negatif" (lebih informatif dari "Habis")
        if (qty < 0)
            return {
                label: "Negatif",
                color: "bg-red-100 text-red-700 border-red-300",
                icon: <IconAlertTriangle size={13} />,
            };
        if (qty === 0)
            return {
                label: "Habis",
                color: "bg-slate-100 text-slate-700 border-slate-300",
                icon: <IconPackages size={13} />,
            };
        if (min > 0 && qty < min)
            return {
                label: "Stok Rendah",
                color: "bg-danger-100 text-danger-700 border-danger-300",
                icon: <IconAlertTriangle size={13} />,
            };
        if (max > 0 && qty > max)
            return {
                label: "Overstock",
                color: "bg-warning-100 text-warning-700 border-warning-300",
                icon: <IconTrendingUp size={13} />,
            };
        return {
            label: "Normal",
            color: "bg-success-100 text-success-700 border-success-300",
            icon: null,
        };
    };

    // ─── Navigation ───────────────────────────────────────────────────────────

    const handleFilter = (key, value) => {
        const newFilters = { item_type: itemType, ...filters, [key]: value };
        Object.keys(newFilters).forEach((k) => {
            if (!newFilters[k]) delete newFilters[k];
        });
        router.get(route("warehouse-stocks.index"), newFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
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
                    <p className="text-sm text-slate-500 font-medium">
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

            {/* Tab Switcher */}
            <div className="mb-6 grid grid-cols-2 gap-4">
                {[
                    {
                        type: "ingredient", label: "Ingredient", sub: "Bahan Baku",
                        Icon: IconBottle, activeColor: "emerald",
                        total: overallSummary.total_ingredients,
                        low:   overallSummary.low_stock_ingredients,
                    },
                    {
                        type: "packaging", label: "Packaging", sub: "Kemasan & Botol",
                        Icon: IconBox, activeColor: "violet",
                        total: overallSummary.total_packaging,
                        low:   overallSummary.low_stock_packaging,
                    },
                ].map(({ type, label, sub, Icon, activeColor, total, low }) => {
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
                                    <Icon size={24} className={active ? "text-white" : "text-slate-600"} />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 dark:text-white">{label}</div>
                                    <div className="text-sm text-slate-500">{total} items · {sub}</div>
                                </div>
                                {low > 0 && (
                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-danger-100 text-danger-700">
                                        {low} Low
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    {
                        label: `Total ${itemType === "ingredient" ? "Ingredient" : "Packaging"}`,
                        value: summary.total_items,
                        Icon: IconChartBar, color: "blue", textColor: "slate",
                    },
                    {
                        label: "Low Stock",
                        value: summary.low_stock,
                        Icon: IconAlertTriangle, color: "danger", textColor: "danger", accent: true,
                    },
                    {
                        label: "Out of Stock",
                        value: summary.out_of_stock,
                        Icon: IconPackages, color: "slate", textColor: "slate",
                    },
                    {
                        label: "Nilai Aset",
                        value: fmt(summary.total_value),
                        Icon: IconCurrencyDollar, color: "success", textColor: "success", accent: true,
                    },
                ].map(({ label, value, Icon, color, textColor, accent }) => (
                    <div
                        key={label}
                        className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm ${
                            accent ? `border-l-4 border-l-${textColor}-500` : ""
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</p>
                                <p className={`text-xl font-black text-${textColor}-600 mt-1`}>{value}</p>
                            </div>
                            <div className={`p-3 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg`}>
                                <Icon size={22} className={`text-${color}-600`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-col md:flex-row gap-3">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Cari ${itemType === "ingredient" ? "ingredient" : "packaging"} atau gudang...`}
                    className="flex-1 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <select
                    value={selectedWarehouse}
                    onChange={(e) => {
                        setSelectedWarehouse(e.target.value);
                        handleFilter("warehouse_id", e.target.value);
                    }}
                    className="w-full md:w-56 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm"
                >
                    <option value="">Semua Gudang</option>
                    {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
                <select
                    value={selectedStatus}
                    onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        handleFilter("stock_status", e.target.value);
                    }}
                    className="w-full md:w-44 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm"
                >
                    <option value="">Semua Status</option>
                    <option value="low">Stok Rendah</option>
                    <option value="out">Stok Habis / Negatif</option>
                    {/* Kedua tipe punya max_stock → overstock berlaku untuk keduanya */}
                    <option value="over">Overstock</option>
                </select>
            </div>

            {/* Table */}
            {stocks?.data?.length > 0 ? (
                <Table.Card title={`Rincian Stok ${itemType === "ingredient" ? "Ingredient" : "Packaging"}`}>
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th className="w-10">No</Table.Th>
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
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
                                    >
                                        <Table.Td className="text-center text-slate-400 font-medium">
                                            {rowNum}
                                        </Table.Td>

                                        <Table.Td>
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                {getItemName(item)}
                                            </div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-1 uppercase tracking-tighter">
                                                <IconBuildingWarehouse size={11} />
                                                {item.warehouse?.name} · {getItemCode(item)}
                                                {itemType === "packaging" && item.packaging_material?.size && (
                                                    <span> · {item.packaging_material.size.name}</span>
                                                )}
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="text-right">
                                            <div className={`font-black ${qty < 0 ? "text-red-600" : "text-primary-600 dark:text-primary-400"}`}>
                                                {qty.toLocaleString("id-ID")}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {getItemUnit(item)}
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="text-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                            <div>
                                                Min: {item.min_stock != null
                                                    ? parseInt(item.min_stock, 10).toLocaleString("id-ID")
                                                    : "-"}
                                            </div>
                                            <div className="text-slate-300">|</div>
                                            <div>
                                                Max: {item.max_stock != null
                                                    ? parseInt(item.max_stock, 10).toLocaleString("id-ID")
                                                    : "-"}
                                            </div>
                                        </Table.Td>

                                        <Table.Td>
                                            <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase border ${status.color} flex items-center gap-1 w-fit shadow-sm`}>
                                                {status.icon}
                                                {status.label}
                                            </span>
                                        </Table.Td>

                                        <Table.Td>
                                            <div className="text-[11px] space-y-0.5">
                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                    <IconClock size={11} />
                                                    {fmtDate(item.last_in_at || item.updated_at)}
                                                </div>
                                                {item.last_in_qty && (
                                                    <div className="text-slate-400 italic">
                                                        +{parseInt(item.last_in_qty, 10).toLocaleString("id-ID")} {getItemUnit(item)}
                                                    </div>
                                                )}
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="text-right">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                {fmt(item.total_value)}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                @ {fmt(item.average_cost)}/unit
                                            </div>
                                        </Table.Td>

                                        <Table.Td>
                                            <div className="flex justify-center gap-1">
                                                <Button
                                                    type="edit"
                                                    icon={<IconPencilCog size={15} />}
                                                    className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200"
                                                    href={route("warehouse-stocks.edit", {
                                                        id: item.id,
                                                        item_type: itemType,
                                                    })}
                                                />
                                                <Button
                                                    type="delete"
                                                    icon={<IconTrash size={15} />}
                                                    className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200"
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
                        <IconDatabaseOff size={48} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                        Tidak ada data stok
                    </h3>
                    <p className="text-slate-500 text-sm max-w-xs text-center mt-1">
                        Belum ada stok {itemType === "ingredient" ? "ingredient" : "packaging"} yang terdaftar.
                    </p>
                    <Link
                        href={route("warehouse-stocks.create")}
                        className="mt-6 flex items-center gap-2 text-primary-600 font-bold hover:underline"
                    >
                        <IconCirclePlus size={18} /> Tambah Stok Sekarang
                    </Link>
                </div>
            )}

            <div className="mt-6">
                <Pagination links={stocks?.links || []} />
            </div>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3 items-start">
                <IconInfoCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <strong>Informasi:</strong> Total nilai dihitung dari Kuantitas × Biaya Rata-rata.
                    Status <strong>Low Stock</strong> aktif jika kuantitas di bawah minimum.
                    Status <strong>Overstock</strong> aktif jika kuantitas melebihi maksimum.
                    Status <strong>Negatif</strong> terjadi akibat pengambilan stok darurat.
                    Perubahan kuantitas hanya bisa dilakukan melalui <strong>Stock Movement</strong>.
                </p>
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
