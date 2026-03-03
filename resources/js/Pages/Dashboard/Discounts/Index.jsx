import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconCirclePlus,
    IconTag,
    IconPencil,
    IconTrash,
    IconPercentage,
    IconGift,
    IconCurrencyDollar,
    IconRefresh,
    IconCheck,
    IconX,
    IconDeviceGamepad2,
    IconBuildingStore,
    IconCalendar,
    IconInfinity,
} from "@tabler/icons-react";
import Search from "@/Components/Dashboard/Search";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    percentage: { icon: (s) => <IconPercentage size={s} />, label: "Persentase" },
    fixed_amount: { icon: (s) => <IconCurrencyDollar size={s} />, label: "Nominal" },
    buy_x_get_y: { icon: (s) => <IconGift size={s} />, label: "Buy X Get Y" },
    free_product: { icon: (s) => <IconGift size={s} />, label: "Gratis Produk" },
    game_reward: { icon: (s) => <IconDeviceGamepad2 size={s} />, label: "Game Reward" },
    bundle: { icon: (s) => <IconTag size={s} />, label: "Bundle" },
};

function TypeBadge({ type }) {
    const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.percentage;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {cfg.icon(12)}
            {cfg.label}
        </span>
    );
}

// ─── Value cell ───────────────────────────────────────────────────────────────

function ValueCell({ item }) {
    if (item.type === "percentage") {
        return (
            <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                {item.value}% off
            </span>
        );
    }
    if (item.type === "fixed_amount") {
        return (
            <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                Rp {Number(item.value).toLocaleString("id-ID")}
            </span>
        );
    }
    if (item.type === "buy_x_get_y") {
        return (
            <span className="font-semibold text-slate-800 dark:text-slate-100">
                Beli {item.buy_quantity}, gratis {item.get_quantity}
            </span>
        );
    }
    if (item.type === "game_reward") {
        return (
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 text-sm">
                <IconDeviceGamepad2 size={14} /> Game
            </span>
        );
    }
    return <span className="text-slate-400 dark:text-slate-600">—</span>;
}

// ─── Date format ──────────────────────────────────────────────────────────────

const fmtDate = (d) =>
    d
        ? new Date(d).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : null;

function PeriodCell({ start, end }) {
    const s = fmtDate(start);
    const e = fmtDate(end);

    if (!s && !e) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-600">
                <IconInfinity size={13} /> Tidak terbatas
            </span>
        );
    }

    return (
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
            <div className="flex items-center gap-1">
                <IconCalendar size={11} className="text-slate-300 dark:text-slate-600" />
                {s ?? "—"}
            </div>
            <div className="text-slate-300 dark:text-slate-600 pl-3.5">s/d</div>
            <div className="flex items-center gap-1">
                <IconCalendar size={11} className="text-slate-300 dark:text-slate-600" />
                {e ?? "—"}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Index({ discounts, filters }) {
    return (
        <>
            <Head title="Promo & Diskon" />

            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 flex items-center justify-center bg-slate-900 dark:bg-slate-100 rounded-lg text-white dark:text-slate-900">
                            <IconTag size={16} />
                        </div>
                        Promo & Diskon
                    </h1>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 ml-10.5">
                        Kelola voucher, diskon otomatis, Buy X Get Y, dan game reward
                    </p>
                </div>
                <Link
                    href={route("discounts.create")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-lg transition-all"
                >
                    <IconCirclePlus size={16} />
                    Buat Promo
                </Link>
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex gap-2">
                <div className="flex-1 max-w-xs">
                    <Search
                        url={route("discounts.index")}
                        placeholder="Cari kode atau nama…"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => router.reload({ only: ["discounts"] })}
                    className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                    title="Refresh"
                >
                    <IconRefresh size={16} />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {discounts.data.length === 0 ? (
                    <div className="py-24 text-center">
                        <IconTag size={36} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-600">
                            Belum ada promo
                        </p>
                        <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">
                            Buat promo pertama Anda
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                                        Promo
                                    </th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                                        Tipe
                                    </th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                                        Nilai
                                    </th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                                        Toko
                                    </th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                                        Periode
                                    </th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                                        Status
                                    </th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {discounts.data.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        {/* Nama & kode */}
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                                {item.name}
                                            </div>
                                            <code className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 block">
                                                {item.code}
                                            </code>
                                        </td>

                                        {/* Tipe */}
                                        <td className="px-5 py-4">
                                            <TypeBadge type={item.type} />
                                        </td>

                                        {/* Nilai */}
                                        <td className="px-5 py-4">
                                            <ValueCell item={item} />
                                            {(item.min_purchase_quantity > 0 ||
                                                item.min_purchase_amount > 0) && (
                                                <div className="text-[11px] text-slate-400 dark:text-slate-600 mt-1 space-y-0.5">
                                                    {item.min_purchase_quantity > 0 && (
                                                        <div>Min {item.min_purchase_quantity} pcs</div>
                                                    )}
                                                    {item.min_purchase_amount > 0 && (
                                                        <div>
                                                            Min Rp{" "}
                                                            {Number(
                                                                item.min_purchase_amount
                                                            ).toLocaleString("id-ID")}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Toko */}
                                        <td className="px-5 py-4">
                                            {item.stores?.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.stores.slice(0, 2).map((ds) => (
                                                        <span
                                                            key={ds.id}
                                                            className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                                                        >
                                                            <IconBuildingStore size={10} />
                                                            {ds.store?.name ?? "—"}
                                                        </span>
                                                    ))}
                                                    {item.stores.length > 2 && (
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-600 self-center">
                                                            +{item.stores.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 dark:text-slate-600 italic">
                                                    Semua toko
                                                </span>
                                            )}
                                        </td>

                                        {/* Periode */}
                                        <td className="px-5 py-4">
                                            <PeriodCell
                                                start={item.start_date}
                                                end={item.end_date}
                                            />
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            {item.is_active ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-1 rounded-md">
                                                    <IconCheck size={11} strokeWidth={2.5} /> Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md">
                                                    <IconX size={11} strokeWidth={2.5} /> Nonaktif
                                                </span>
                                            )}
                                        </td>

                                        {/* Aksi */}
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end items-center gap-1">
                                                <Link
                                                    href={route("discounts.edit", item.id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                                    title="Edit"
                                                >
                                                    <IconPencil size={14} />
                                                </Link>
                                                <Button
                                                    type="delete"
                                                    url={route("discounts.destroy", item.id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                                    icon={<IconTrash size={14} />}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-4">
                <Pagination links={discounts.links} />
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
