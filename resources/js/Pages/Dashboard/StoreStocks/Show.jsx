import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link } from "@inertiajs/react";
import {
    IconArrowLeft, IconPackage, IconTrendingUp, IconTrendingDown,
    IconClock, IconUser, IconFileText, IconAlertTriangle,
    IconCircleCheck, IconHistory, IconChartLine,
} from "@tabler/icons-react";
import Table from "@/Components/Dashboard/Table";
import Pagination from "@/Components/Dashboard/Pagination";

export default function Show({ stock, movements, summary, itemType }) {
    const isIngredient = itemType === "ingredient";

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const fmt = (n) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(n || 0);

    // quantity adalah bigInteger — tampilkan sebagai integer
    const fmtNum = (n) =>
        Number.isFinite(parseInt(n, 10))
            ? parseInt(n, 10).toLocaleString("id-ID")
            : "-";

    const fmtDate = (d) =>
        d
            ? new Date(d).toLocaleDateString("id-ID", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })
            : "-";

    // quantity adalah bigInteger (signed)
    const currentQty = parseInt(stock.quantity ?? 0, 10);
    const minStock   = parseInt(stock.min_stock ?? 0, 10);
    // Kedua tipe punya max_stock per migration terbaru
    const maxStock   = parseInt(stock.max_stock ?? 0, 10);

    const getItemName = () => isIngredient ? stock.ingredient?.name             : stock.packaging_material?.name;
    const getItemUnit = () => isIngredient ? (stock.ingredient?.unit || "unit") : (stock.packaging_material?.size?.name || "pcs");
    const getItemCode = () => isIngredient ? stock.ingredient?.code             : stock.packaging_material?.code;

    const stockStatus = () => {
        if (currentQty < 0)
            return {
                label: "Negatif",
                color: "bg-red-100 text-red-700 border-red-300",
                icon: <IconAlertTriangle size={15} />,
            };
        if (currentQty === 0)
            return {
                label: "Habis",
                color: "bg-slate-100 text-slate-700 border-slate-300",
                icon: <IconAlertTriangle size={15} />,
            };
        if (minStock > 0 && currentQty < minStock)
            return {
                label: "Low Stock",
                color: "bg-danger-100 text-danger-700 border-danger-300",
                icon: <IconAlertTriangle size={15} />,
            };
        if (maxStock > 0 && currentQty > maxStock)
            return {
                label: "Over Stock",
                color: "bg-warning-100 text-warning-700 border-warning-300",
                icon: <IconAlertTriangle size={15} />,
            };
        return {
            label: "Normal",
            color: "bg-success-100 text-success-700 border-success-300",
            icon: <IconCircleCheck size={15} />,
        };
    };

    const status = stockStatus();

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <Head title={`Detail Stok — ${getItemName()}`} />

            <div className="max-w-7xl mx-auto">
                <Link
                    href={route("store-stocks.index", { item_type: itemType })}
                    className="flex items-center gap-2 text-slate-500 mb-4 hover:text-primary-600 transition-all text-sm"
                >
                    <IconArrowLeft size={18} /> Kembali ke Daftar Stok
                </Link>

                {/* Summary grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

                    {/* Main info card */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                                    <IconPackage size={24} className="text-primary-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{getItemName()}</h1>
                                    <p className="text-sm text-slate-500">{getItemCode()} · {stock.store?.name}</p>
                                </div>
                            </div>
                            <span className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold border ${status.color}`}>
                                {status.icon} {status.label}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InfoTile label="Stok Saat Ini" color={currentQty < 0 ? "red" : "primary"}>
                                <p className={`text-3xl font-bold ${currentQty < 0 ? "text-red-700 dark:text-red-300" : "text-primary-700 dark:text-primary-300"}`}>
                                    {fmtNum(currentQty)}
                                </p>
                                <p className={`text-xs mt-0.5 ${currentQty < 0 ? "text-red-500" : "text-primary-500"}`}>
                                    {getItemUnit()}
                                    {currentQty < 0 && <span className="ml-1 font-bold">(Negatif)</span>}
                                </p>
                            </InfoTile>

                            <InfoTile label="Nilai Inventaris" color="green">
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{fmt(stock.total_value)}</p>
                                <p className="text-xs text-green-500 mt-0.5">@ {fmt(stock.average_cost)}</p>
                            </InfoTile>

                            <InfoTile label="Stok Minimum" color="slate">
                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                                    {stock.min_stock != null ? fmtNum(stock.min_stock) : "-"}
                                </p>
                                {stock.min_stock && (
                                    <p className="text-xs text-slate-400 mt-0.5">{getItemUnit()}</p>
                                )}
                            </InfoTile>

                            {/* Kedua tipe punya max_stock */}
                            <InfoTile label="Stok Maksimum" color="slate">
                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                                    {stock.max_stock != null ? fmtNum(stock.max_stock) : "-"}
                                </p>
                                {stock.max_stock && (
                                    <p className="text-xs text-slate-400 mt-0.5">{getItemUnit()}</p>
                                )}
                            </InfoTile>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Last IN */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <IconTrendingUp size={17} className="text-success-600" />
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Terakhir Masuk</h3>
                            </div>
                            {stock.last_in_at ? (
                                <div className="space-y-1.5">
                                    <div className="text-2xl font-bold text-success-600">
                                        +{fmtNum(stock.last_in_qty || 0)}
                                    </div>
                                    <div className="text-xs text-slate-500 space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <IconClock size={11} /> {fmtDate(stock.last_in_at)}
                                        </div>
                                        {stock.lastInUser && (
                                            <div className="flex items-center gap-1">
                                                <IconUser size={11} /> {stock.lastInUser.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">Belum ada data</p>
                            )}
                        </div>

                        {/* Last OUT */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <IconTrendingDown size={17} className="text-danger-600" />
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Terakhir Keluar</h3>
                            </div>
                            {stock.last_out_at ? (
                                <div className="space-y-1.5">
                                    <div className="text-2xl font-bold text-danger-600">
                                        -{fmtNum(stock.last_out_qty || 0)}
                                    </div>
                                    <div className="text-xs text-slate-500 space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <IconClock size={11} /> {fmtDate(stock.last_out_at)}
                                        </div>
                                        {stock.lastOutUser && (
                                            <div className="flex items-center gap-1">
                                                <IconUser size={11} /> {stock.lastOutUser.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">Belum ada data</p>
                            )}
                        </div>

                        {/* Totals */}
                        <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <IconChartLine size={17} className="text-primary-600" />
                                <h3 className="text-sm font-bold text-primary-700 dark:text-primary-300">
                                    Total Pergerakan
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-slate-600 dark:text-slate-400">Total Masuk</p>
                                    <p className="text-lg font-bold text-success-600">
                                        +{fmtNum(summary.total_in || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-600 dark:text-slate-400">Total Keluar</p>
                                    <p className="text-lg font-bold text-danger-600">
                                        -{fmtNum(summary.total_out || 0)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-800">
                                <p className="text-xs text-slate-600 dark:text-slate-400">Jumlah Transaksi</p>
                                <p className="text-xl font-bold text-primary-600">{summary.total_movements || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Movement history */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <IconHistory size={22} className="text-primary-600" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                Riwayat Pergerakan Stok
                            </h2>
                            <p className="text-xs text-slate-500">Histori lengkap stok masuk dan keluar</p>
                        </div>
                    </div>

                    {movements.data.length > 0 ? (
                        <>
                            <Table>
                                <Table.Thead>
                                    <tr>
                                        <Table.Th className="w-10">No</Table.Th>
                                        <Table.Th>No. Movement</Table.Th>
                                        <Table.Th>Tipe</Table.Th>
                                        <Table.Th>Arah</Table.Th>
                                        <Table.Th className="text-right">Qty</Table.Th>
                                        <Table.Th className="text-right">Sebelum</Table.Th>
                                        <Table.Th className="text-right">Sesudah</Table.Th>
                                        <Table.Th>User</Table.Th>
                                        <Table.Th>Tanggal</Table.Th>
                                        <Table.Th>Catatan</Table.Th>
                                    </tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {movements.data.map((mv, i) => (
                                        <tr
                                            key={mv.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
                                        >
                                            <Table.Td className="text-center text-slate-400">
                                                {i + 1 + (movements.current_page - 1) * movements.per_page}
                                            </Table.Td>
                                            <Table.Td>
                                                <div className="font-mono text-xs text-primary-600 dark:text-primary-400 font-bold">
                                                    {mv.movement_number}
                                                </div>
                                                {mv.reference_number && (
                                                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <IconFileText size={11} /> {mv.reference_number}
                                                    </div>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                                    {mv.movement_type_label}
                                                </span>
                                            </Table.Td>
                                            <Table.Td>
                                                {mv.direction === "in" ? (
                                                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-success-100 text-success-700 font-bold w-fit">
                                                        <IconTrendingUp size={13} /> {mv.direction_label}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-danger-100 text-danger-700 font-bold w-fit">
                                                        <IconTrendingDown size={13} /> {mv.direction_label}
                                                    </span>
                                                )}
                                            </Table.Td>
                                            <Table.Td className="text-right">
                                                <div className={`font-bold text-base ${mv.direction === "in" ? "text-success-600" : "text-danger-600"}`}>
                                                    {mv.direction === "in" ? "+" : "-"}{fmtNum(mv.quantity)}
                                                </div>
                                                {mv.unit_cost ? (
                                                    <div className="text-xs text-slate-400">@ {fmt(mv.unit_cost)}</div>
                                                ) : null}
                                            </Table.Td>
                                            <Table.Td className="text-right text-sm text-slate-500">
                                                {mv.stock_before != null ? fmtNum(mv.stock_before) : "-"}
                                            </Table.Td>
                                            <Table.Td className="text-right text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {mv.stock_after != null ? fmtNum(mv.stock_after) : "-"}
                                            </Table.Td>
                                            <Table.Td>
                                                {mv.creator && (
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                                                            <IconUser size={13} /> {mv.creator.name}
                                                        </div>
                                                    </div>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                                    <IconClock size={11} /> {fmtDate(mv.movement_date)}
                                                </div>
                                            </Table.Td>
                                            <Table.Td>
                                                {mv.notes
                                                    ? <div className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">{mv.notes}</div>
                                                    : <span className="text-xs text-slate-400">-</span>
                                                }
                                            </Table.Td>
                                        </tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                <Pagination links={movements.links} />
                            </div>
                        </>
                    ) : (
                        <div className="p-12 text-center">
                            <IconHistory size={48} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500">Belum ada riwayat pergerakan stok</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function InfoTile({ label, color, children }) {
    const colors = {
        primary: "bg-primary-50 dark:bg-primary-900/20",
        green:   "bg-green-50 dark:bg-green-900/20",
        red:     "bg-red-50 dark:bg-red-900/20",
        slate:   "bg-slate-50 dark:bg-slate-800/50",
    };
    const borders = {
        primary: "border-primary-200",
        green:   "border-green-200",
        red:     "border-red-200",
        slate:   "border-slate-200 dark:border-slate-700",
    };
    return (
        <div className={`p-4 rounded-xl border ${colors[color] ?? colors.slate} ${borders[color] ?? borders.slate}`}>
            <p className="text-xs font-semibold mb-1 text-slate-500">{label}</p>
            {children}
        </div>
    );
}

Show.layout = (page) => <DashboardLayout children={page} />;
