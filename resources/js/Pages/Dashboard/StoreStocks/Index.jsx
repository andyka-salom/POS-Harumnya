import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Button from "@/Components/Dashboard/Button";
import {
    IconCirclePlus, IconDatabaseOff, IconPencilCog, IconTrash, IconEye,
    IconPackages, IconAlertTriangle, IconTrendingUp, IconClock,
    IconBottle, IconBox, IconChartBar, IconCurrencyDollar,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Table from "@/Components/Dashboard/Table";
import Pagination from "@/Components/Dashboard/Pagination";

export default function Index({
    stocks      = { data: [], links: [] },
    stores      = [],
    itemType    = "ingredient",
    summary     = {
        total_ingredients: 0,
        total_packaging: 0,
        low_stock_ingredients: 0,
        low_stock_packaging: 0,
    },
    itemSummary = { total_items: 0, low_stock: 0, out_of_stock: 0, total_value: 0 },
    filters     = {},
}) {
    const [selectedStore,  setSelectedStore]  = useState(filters.store_id     || "");
    const [selectedStatus, setSelectedStatus] = useState(filters.stock_status || "");

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

    // quantity adalah bigInteger signed
    const getQty = (s) => parseInt(s.quantity ?? 0, 10);

    const getStockStatus = (s) => {
        const qty = getQty(s);
        const min = parseInt(s.min_stock ?? 0, 10);
        const max = parseInt(s.max_stock ?? 0, 10);

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
                label: "Low Stock",
                color: "bg-danger-100 text-danger-700 border-danger-300",
                icon: <IconAlertTriangle size={13} />,
            };
        if (max > 0 && qty > max)
            return {
                label: "Over Stock",
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
        Object.keys(newFilters).forEach((k) => { if (!newFilters[k]) delete newFilters[k]; });
        router.get(route("store-stocks.index"), newFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const switchItemType = (type) =>
        router.get(route("store-stocks.index"), { item_type: type }, { replace: true });

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <Head title="Stok Toko" />

            {/* Page header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconPackages size={28} className="text-primary-500" />
                        Stok Toko
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        Kelola stok ingredient &amp; packaging di setiap cabang toko.
                    </p>
                </div>
                <Button
                    type="link"
                    icon={<IconCirclePlus size={18} />}
                    className="bg-primary-500 hover:bg-primary-600 text-white shadow-lg"
                    label="Tambah Stok"
                    href={route("store-stocks.create")}
                />
            </div>

            {/* Tab switcher */}
            <div className="mb-6 grid grid-cols-2 gap-4">
                {[
                    {
                        type: "ingredient", label: "Ingredient", sub: "Bahan Baku",
                        Icon: IconBottle, color: "emerald",
                        total: summary.total_ingredients,
                        low:   summary.low_stock_ingredients,
                    },
                    {
                        type: "packaging", label: "Packaging", sub: "Kemasan & Botol",
                        Icon: IconBox, color: "violet",
                        total: summary.total_packaging,
                        low:   summary.low_stock_packaging,
                    },
                ].map(({ type, label, sub, Icon, color, total, low }) => {
                    const active = itemType === type;
                    return (
                        <button
                            key={type}
                            onClick={() => switchItemType(type)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                active
                                    ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
                                    : "border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${active ? `bg-${color}-500` : "bg-slate-200"}`}>
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
                        value: itemSummary.total_items,
                        Icon: IconChartBar,
                        color: "blue",
                        textColor: "slate",
                    },
                    {
                        label: "Low Stock",
                        value: itemSummary.low_stock,
                        Icon: IconAlertTriangle,
                        color: "danger",
                        textColor: "danger",
                        accent: true,
                    },
                    {
                        label: "Out of Stock",
                        value: itemSummary.out_of_stock,
                        Icon: IconPackages,
                        color: "slate",
                        textColor: "slate",
                    },
                    {
                        label: "Nilai Aset",
                        value: fmt(itemSummary.total_value),
                        Icon: IconCurrencyDollar,
                        color: "success",
                        textColor: "success",
                        accent: true,
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
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Search
                    url={route("store-stocks.index")}
                    placeholder={`Cari ${itemType === "ingredient" ? "ingredient" : "packaging"} atau toko...`}
                />
                <select
                    value={selectedStore}
                    onChange={(e) => {
                        setSelectedStore(e.target.value);
                        handleFilter("store_id", e.target.value);
                    }}
                    className="rounded-xl border-slate-200 dark:bg-slate-950 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                    <option value="">Semua Toko</option>
                    {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                </select>
                <select
                    value={selectedStatus}
                    onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        handleFilter("stock_status", e.target.value);
                    }}
                    className="rounded-xl border-slate-200 dark:bg-slate-950 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                    <option value="">Semua Status</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Stok Habis / Negatif</option>
                    {/* Kedua tipe punya max_stock → overstock berlaku untuk keduanya */}
                    <option value="over">Over Stock</option>
                </select>
            </div>

            {/* Table */}
            {stocks.data.length > 0 ? (
                <Table.Card title={`Data Stok ${itemType === "ingredient" ? "Ingredient" : "Packaging"}`}>
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th className="w-10">No</Table.Th>
                                <Table.Th>Toko</Table.Th>
                                <Table.Th>{itemType === "ingredient" ? "Ingredient" : "Packaging"}</Table.Th>
                                <Table.Th className="text-right">Stok</Table.Th>
                                <Table.Th className="text-right">Min / Max</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Terakhir Masuk</Table.Th>
                                <Table.Th className="text-right">Nilai</Table.Th>
                                <Table.Th className="w-28 text-center">Aksi</Table.Th>
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
                                        <Table.Td className="text-center text-slate-400">{rowNum}</Table.Td>

                                        <Table.Td>
                                            <div className="font-bold text-slate-700 dark:text-slate-200">
                                                {item.store?.name}
                                            </div>
                                            <div className="text-xs text-slate-500">{item.store?.code}</div>
                                        </Table.Td>

                                        <Table.Td>
                                            <div className="font-bold text-slate-700 dark:text-slate-200">
                                                {getItemName(item)}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {getItemCode(item)}
                                                {itemType === "packaging" && item.packaging_material?.size && (
                                                    <span> · {item.packaging_material.size.name}</span>
                                                )}
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="text-right">
                                            <div className={`font-bold text-lg ${qty < 0 ? "text-red-600" : "text-primary-600 dark:text-primary-400"}`}>
                                                {qty.toLocaleString("id-ID")}
                                            </div>
                                            <div className="text-xs text-slate-400">{getItemUnit(item)}</div>
                                        </Table.Td>

                                        <Table.Td className="text-right text-xs space-y-0.5">
                                            <div className="text-slate-600">
                                                Min:{" "}
                                                <span className="font-semibold">
                                                    {item.min_stock != null
                                                        ? parseInt(item.min_stock, 10).toLocaleString("id-ID")
                                                        : "-"}
                                                </span>
                                            </div>
                                            <div className="text-slate-600">
                                                Max:{" "}
                                                <span className="font-semibold">
                                                    {item.max_stock != null
                                                        ? parseInt(item.max_stock, 10).toLocaleString("id-ID")
                                                        : "-"}
                                                </span>
                                            </div>
                                        </Table.Td>

                                        <Table.Td>
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border flex items-center gap-1 w-fit ${status.color}`}>
                                                {status.icon}
                                                {status.label}
                                            </span>
                                        </Table.Td>

                                        <Table.Td>
                                            <div className="text-xs space-y-0.5">
                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                    <IconClock size={11} />
                                                    {fmtDate(item.last_in_at || item.updated_at)}
                                                </div>
                                                {item.last_in_qty && (
                                                    <div className="flex items-center gap-1 text-success-600">
                                                        <IconTrendingUp size={11} />
                                                        +{parseInt(item.last_in_qty, 10).toLocaleString("id-ID")} {getItemUnit(item)}
                                                    </div>
                                                )}
                                            </div>
                                        </Table.Td>

                                        <Table.Td className="text-right">
                                            <div className="font-bold text-slate-700 dark:text-slate-200">
                                                {fmt(item.total_value)}
                                            </div>
                                            <div className="text-xs text-slate-400">@ {fmt(item.average_cost)}</div>
                                        </Table.Td>

                                        <Table.Td>
                                            <div className="flex justify-center gap-1">
                                                <Button
                                                    type="link"
                                                    icon={<IconEye size={15} />}
                                                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                                                    href={route("store-stocks.show", { id: item.id, item_type: itemType })}
                                                />
                                                <Button
                                                    type="edit"
                                                    icon={<IconPencilCog size={15} />}
                                                    className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
                                                    href={route("store-stocks.edit", { id: item.id, item_type: itemType })}
                                                />
                                                <Button
                                                    type="delete"
                                                    icon={<IconTrash size={15} />}
                                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                                                    url={route("store-stocks.destroy", { id: item.id, item_type: itemType })}
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
                <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <IconDatabaseOff size={48} className="text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 dark:text-slate-400">Tidak ada data stok</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Stok {itemType === "ingredient" ? "ingredient" : "packaging"} tidak ditemukan.
                    </p>
                    <Link
                        href={route("store-stocks.create")}
                        className="mt-4 flex items-center gap-2 text-primary-600 font-bold hover:underline text-sm"
                    >
                        <IconCirclePlus size={16} /> Tambah Stok Sekarang
                    </Link>
                </div>
            )}

            <div className="mt-4">
                <Pagination links={stocks.links} />
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
