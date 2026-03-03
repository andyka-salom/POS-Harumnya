import { usePage } from "@inertiajs/react";
import {
    IconBooks,
    IconChartArrowsVertical,
    IconChartBarPopular,
    IconChartInfographic,
    IconCirclePlus,
    IconClockHour6,
    IconCreditCard,
    IconLayout2,
    IconCash,
    IconShoppingCart,
    IconTable,
    IconUserBolt,
    IconUserShield,
    IconUserSquare,
    IconUsers,
    IconBuildingSkyscraper,
    IconRuler2,
    IconBuildingWarehouse,
    IconBuildingStore,
    IconUsersPlus,
    IconTicket,
    IconFlask,
    IconPackages,
    IconBoxPadding,
    IconTransfer,
    IconHistory,
    IconAdjustments,
    IconShoppingBag,
    IconPackage,
    IconTag,
    IconCategory,
    IconPerfume,
    IconReportMoney,
    IconReportAnalytics,
} from "@tabler/icons-react";
import hasAnyPermission from "./Permission";
import React from "react";

export default function Menu() {
    const { url } = usePage();

    const menuNavigation = [
        // ─── Overview ─────────────────────────────────────────────────────────
        {
            title: "Overview",
            details: [
                {
                    title: "Dashboard",
                    href: route("dashboard"),
                    active: url === "/dashboard",
                    icon: <IconLayout2 size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["dashboard-access"]),
                },
            ],
        },

        // ─── Master Data ──────────────────────────────────────────────────────
        {
            title: "Master Data",
            details: [
                {
                    title: "Varian",
                    href: route("variants.index"),
                    active: url.startsWith("/dashboard/variants"),
                    icon: <IconCategory size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Intensitas",
                    href: route("intensities.index"),
                    active: url.startsWith("/dashboard/intensities"),
                    icon: <IconChartInfographic size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Size",
                    href: route("sizes.index"),
                    active: url.startsWith("/dashboard/sizes"),
                    icon: <IconRuler2 size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Harga Intensitas",
                    href: route("intensity-size-prices.index"),
                    active: url.startsWith("/dashboard/intensity-size-prices"),
                    icon: <IconCash size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Supplier",
                    href: route("suppliers.index"),
                    active: url.startsWith("/dashboard/suppliers"),
                    icon: <IconBuildingSkyscraper size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
            ],
        },

        // ─── Bahan Baku & Produk ──────────────────────────────────────────────
        {
            title: "Bahan Baku & Produk",
            details: [
                {
                    title: "Bahan Baku",
                    href: route("ingredients.index"),
                    active: url.startsWith("/dashboard/ingredients"),
                    icon: <IconFlask size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Kemasan",
                    href: route("packaging.index"),
                    active: url.startsWith("/dashboard/packaging"),
                    icon: <IconPackage size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Formula & Resep",
                    href: route("recipes.index"),
                    active: url.startsWith("/dashboard/recipes"),
                    icon: <IconBooks size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Produk & Harga",
                    href: route("products.index"),
                    active: url.startsWith("/dashboard/products"),
                    icon: <IconPerfume size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
            ],
        },

        // ─── Lokasi & Tempat ──────────────────────────────────────────────────
        {
            title: "Lokasi & Tempat",
            details: [
                {
                    title: "Gudang",
                    href: route("warehouses.index"),
                    active: url.startsWith("/dashboard/warehouses"),
                    icon: <IconBuildingWarehouse size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Toko / Cabang",
                    href: route("stores.index"),
                    active:
                        url.startsWith("/dashboard/stores") &&
                        !url.startsWith("/dashboard/store-categories"),
                    icon: <IconBuildingStore size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Kategori Toko",
                    href: route("store-categories.index"),
                    active: url.startsWith("/dashboard/store-categories"),
                    icon: <IconTag size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
            ],
        },

        // ─── Manajemen Stok ───────────────────────────────────────────────────
        {
            title: "Manajemen Stok",
            details: [
                {
                    title: "Stok Gudang",
                    href: route("warehouse-stocks.index"),
                    active: url.startsWith("/dashboard/warehouse-stocks"),
                    icon: <IconPackages size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Stok Toko",
                    href: route("store-stocks.index"),
                    active: url.startsWith("/dashboard/store-stocks"),
                    icon: <IconBoxPadding size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Produksi / Repack",
                    href: route("repacks.index"),
                    active: url.startsWith("/dashboard/repacks"),
                    icon: <IconFlask size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Transfer Stok",
                    href: route("stock-transfers.index"),
                    active: url.startsWith("/dashboard/stock-transfers"),
                    icon: <IconTransfer size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Penyesuaian Stok",
                    href: route("stock-adjustments.index"),
                    active: url.startsWith("/dashboard/stock-adjustments"),
                    icon: <IconAdjustments size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Log Pergerakan Stok",
                    href: route("stock-movements.index"),
                    active: url.startsWith("/dashboard/stock-movements"),
                    icon: <IconHistory size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
            ],
        },

        // ─── Pembelian ────────────────────────────────────────────────────────
        {
            title: "Pembelian",
            details: [
                {
                    title: "Purchase Order",
                    href: route("purchases.index"),
                    active: url.startsWith("/dashboard/purchases"),
                    icon: <IconShoppingBag size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
            ],
        },

        // ─── Penjualan ────────────────────────────────────────────────────────
        {
            title: "Penjualan",
            details: [
                {
                    title: "Pelanggan",
                    href: route("customers.index"),
                    active: url.startsWith("/dashboard/customers"),
                    icon: <IconUsersPlus size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["customers-access"]),
                },
                {
                    title: "Sales",
                    href: route("sales-people.index"),
                    active: url.startsWith("/dashboard/sales-people"),
                    icon: <IconUserBolt size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
                {
                    title: "Promo & Diskon",
                    href: route("discounts.index"),
                    active: url.startsWith("/dashboard/discounts"),
                    icon: <IconTicket size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
            ],
        },

        // ─── Transaksi ────────────────────────────────────────────────────────
        {
            title: "Transaksi",
            details: [
                {
                    title: "Transaksi",
                    href: route("transactions.index"),
                    active:
                        url.startsWith("/dashboard/transactions") &&
                        !url.startsWith("/dashboard/transactions/history"),
                    icon: <IconShoppingCart size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["transactions-access"]),
                },
                {
                    title: "Riwayat Transaksi",
                    href: route("transactions.history"),
                    active: url === "/dashboard/transactions/history",
                    icon: <IconClockHour6 size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["transactions-access"]),
                },
            ],
        },

        // ─── Laporan ──────────────────────────────────────────────────────────
        {
            title: "Laporan",
            details: [
                {
                    title: "Laporan Penjualan",
                    href: route("laporan.penjualan"),
                    active: url.startsWith("/dashboard/laporan/penjualan"),
                    icon: <IconChartArrowsVertical size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["reports-access"]),
                },
                {
                    title: "Laporan Keuangan",
                    href: route("laporan.keuangan"),
                    active: url.startsWith("/dashboard/laporan/keuangan"),
                    icon: <IconReportMoney size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["profits-access"]),
                },
            ],
        },

        // ─── Manajemen Pengguna ───────────────────────────────────────────────
        {
            title: "Manajemen Pengguna",
            details: [
                {
                    title: "Hak Akses",
                    href: route("permissions.index"),
                    active: url === "/dashboard/permissions",
                    icon: <IconUserShield size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["permissions-access"]),
                },
                {
                    title: "Akses Group",
                    href: route("roles.index"),
                    active: url === "/dashboard/roles",
                    icon: <IconUsers size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["roles-access"]),
                },
                {
                    title: "Pengguna",
                    icon: <IconUserSquare size={20} strokeWidth={1.5} />,
                    permissions: hasAnyPermission(["users-access"]),
                    subdetails: [
                        {
                            title: "Data Pengguna",
                            href: route("users.index"),
                            icon: <IconTable size={20} strokeWidth={1.5} />,
                            active: url === "/dashboard/users",
                            permissions: hasAnyPermission(["users-access"]),
                        },
                        {
                            title: "Tambah Data Pengguna",
                            href: route("users.create"),
                            icon: <IconCirclePlus size={20} strokeWidth={1.5} />,
                            active: url === "/dashboard/users/create",
                            permissions: hasAnyPermission(["users-create"]),
                        },
                    ],
                },
            ],
        },

        // ─── Pengaturan ───────────────────────────────────────────────────────
        {
            title: "Pengaturan",
            details: [
                {
                    title: "Metode Pembayaran",
                    href: route("payment-methods.index"),
                    active: url.startsWith("/dashboard/payment-methods"),
                    icon: <IconCreditCard size={20} strokeWidth={1.5} />,
                    permissions: true,
                },
            ],
        },
    ];

    return menuNavigation;
}
