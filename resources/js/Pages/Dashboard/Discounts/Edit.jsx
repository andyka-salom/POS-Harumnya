import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import Button from "@/Components/Dashboard/Button";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconTag,
    IconTrash,
    IconBuildingStore,
    IconPercentage,
    IconCurrencyDollar,
    IconGift,
    IconDeviceGamepad2,
    IconInfoCircle,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import {
    ApplicabilitiesSection,
    RequirementsSection,
    RewardsSection,
} from "./DiscountFormSections";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
    {
        id: "percentage",
        label: "Persentase",
        sub: "Potongan %",
        icon: () => <IconPercentage size={16} />,
    },
    {
        id: "fixed_amount",
        label: "Nominal",
        sub: "Potongan Rp",
        icon: () => <IconCurrencyDollar size={16} />,
    },
    {
        id: "buy_x_get_y",
        label: "Buy X Get Y",
        sub: "Beli X, gratis Y",
        icon: () => <IconGift size={16} />,
    },
    {
        id: "free_product",
        label: "Gratis Produk",
        sub: "Free dengan syarat",
        icon: () => <IconGift size={16} />,
    },
    {
        id: "game_reward",
        label: "Game Reward",
        sub: "Via Plinko / Game",
        icon: () => <IconDeviceGamepad2 size={16} />,
    },
];

const GET_PRODUCT_TYPE_OPTIONS = [
    { id: "same", label: "Produk yang sama persis" },
    { id: "specific", label: "Produk spesifik (lihat Reward)" },
    { id: "lower_intensity", label: "Intensity lebih rendah (EDP→EDT)" },
    { id: "choose_from_pool", label: "Pilih dari pool (Plinko)" },
    { id: "choose_variant", label: "Pelanggan bebas pilih variant" },
];

// ─── Normalise helpers ────────────────────────────────────────────────────────

const normaliseApplicabilities = (items = []) =>
    items.map(({ variant_id, intensity_id, size_id }) => ({
        variant_id,
        intensity_id,
        size_id,
    }));

const normaliseRequirements = (items = []) =>
    items.map(({ variant_id, intensity_id, size_id, required_quantity, matching_mode, group_key }) => ({
        variant_id,
        intensity_id,
        size_id,
        required_quantity: required_quantity ?? 1,
        matching_mode: matching_mode ?? "all",
        group_key: group_key ?? null,
    }));

const normaliseRewards = (items = []) =>
    items.map(
        ({
            variant_id,
            intensity_id,
            size_id,
            reward_quantity,
            customer_can_choose,
            is_pool,
            max_choices,
            discount_percentage,
            fixed_price,
            priority,
            pools,
        }) => ({
            variant_id,
            intensity_id,
            size_id,
            reward_quantity: reward_quantity ?? 1,
            customer_can_choose: Boolean(customer_can_choose),
            is_pool: Boolean(is_pool),
            max_choices: max_choices ?? 1,
            discount_percentage: discount_percentage ?? 100,
            fixed_price: fixed_price ?? null,
            priority: priority ?? 0,
            pools: (pools ?? []).map(
                ({
                    product_id,
                    variant_id,
                    intensity_id,
                    size_id,
                    label,
                    image_url,
                    fixed_price,
                    probability,
                    is_active,
                    sort_order,
                }) => ({
                    product_id,
                    variant_id,
                    intensity_id,
                    size_id,
                    label,
                    image_url: image_url ?? null,
                    fixed_price: fixed_price ?? 0,
                    probability: probability ?? null,
                    is_active: is_active ?? true,
                    sort_order: sort_order ?? 0,
                })
            ),
        })
    );

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, className = "" }) {
    return (
        <div
            className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl ${className}`}
        >
            {children}
        </div>
    );
}

function CardHeader({ title }) {
    return (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
        </div>
    );
}

function CardBody({ children, className = "" }) {
    return <div className={`p-5 ${className}`}>{children}</div>;
}

function FieldLabel({ children }) {
    return (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            {children}
        </label>
    );
}

function NativeSelect({ value, onChange, children }) {
    return (
        <select
            value={value}
            onChange={onChange}
            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-transparent py-2 px-3 transition-all"
        >
            {children}
        </select>
    );
}

function Toggle({ checked, onChange }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
            <div className="w-10 h-[22px] bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-slate-800 dark:peer-checked:bg-slate-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all" />
        </label>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Edit({ discount, stores, variants, intensities, sizes }) {
    const { data, setData, put, processing, errors } = useForm({
        code: discount.code,
        name: discount.name,
        type: discount.type,
        value: Number(discount.value),
        description: discount.description ?? "",
        buy_quantity: discount.buy_quantity ?? 1,
        get_quantity: discount.get_quantity ?? 1,
        get_product_type: discount.get_product_type ?? "specific",
        min_purchase_amount: discount.min_purchase_amount ?? "",
        min_purchase_quantity: discount.min_purchase_quantity ?? "",
        max_discount_amount: discount.max_discount_amount ?? "",
        start_date: discount.start_date ?? "",
        end_date: discount.end_date ?? "",
        is_game_reward: Boolean(discount.is_game_reward),
        game_probability: discount.game_probability ?? "",
        priority: discount.priority ?? 0,
        is_combinable: Boolean(discount.is_combinable),
        is_active: Boolean(discount.is_active),
        store_ids: discount.stores?.map((ds) => ds.store_id) ?? [],
        applicabilities: normaliseApplicabilities(discount.applicabilities ?? []),
        requirements: normaliseRequirements(discount.requirements ?? []),
        rewards: normaliseRewards(discount.rewards ?? []),
    });

    const submit = (e) => {
        e.preventDefault();
        put(route("discounts.update", discount.id), {
            onSuccess: () => toast.success("Promo diperbarui"),
            onError: () => toast.error("Periksa kembali form"),
        });
    };

    const toggleStore = (id) => {
        setData(
            "store_ids",
            data.store_ids.includes(id)
                ? data.store_ids.filter((s) => s !== id)
                : [...data.store_ids, id]
        );
    };

    const needsXY = ["buy_x_get_y", "free_product"].includes(data.type);
    const isGame = data.type === "game_reward";
    const needsValue = ["percentage", "fixed_amount"].includes(data.type);

    return (
        <>
            <Head title={`Edit — ${discount.name}`} />
            <div className="max-w-5xl mx-auto px-4 py-6">

                {/* Top bar */}
                <div className="flex items-center justify-between mb-6">
                    <Link
                        href={route("discounts.index")}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                        <IconArrowLeft size={13} /> Kembali
                    </Link>
                    <Button
                        type="delete"
                        url={route("discounts.destroy", discount.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 px-3 py-1.5 rounded-lg transition-all"
                        label="Hapus"
                        icon={<IconTrash size={13} />}
                    />
                </div>

                {/* Page title */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 flex items-center justify-center bg-slate-900 dark:bg-slate-100 rounded-lg text-white dark:text-slate-900">
                        <IconTag size={18} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Promo</h1>
                        <code className="text-xs font-mono text-slate-400 dark:text-slate-500">
                            {discount.code}
                        </code>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* ── Main column ── */}
                        <div className="lg:col-span-2 space-y-4">

                            {/* Informasi Dasar */}
                            <Card>
                                <CardHeader title="Informasi Dasar" />
                                <CardBody className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Kode Promo"
                                            value={data.code}
                                            onChange={(e) =>
                                                setData("code", e.target.value.toUpperCase())
                                            }
                                            errors={errors.code}
                                            required
                                        />
                                        <Input
                                            label="Nama Promo"
                                            value={data.name}
                                            onChange={(e) => setData("name", e.target.value)}
                                            errors={errors.name}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>Tipe Diskon</FieldLabel>
                                        <div className="grid grid-cols-5 gap-2">
                                            {TYPE_OPTIONS.map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setData("type", t.id);
                                                        setData("is_game_reward", t.id === "game_reward");
                                                    }}
                                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                                                        data.type === t.id
                                                            ? "border-slate-800 dark:border-slate-300 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                                                            : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-600 dark:hover:text-slate-300"
                                                    }`}
                                                >
                                                    {t.icon()}
                                                    <span className="text-[11px] font-semibold leading-tight">
                                                        {t.label}
                                                    </span>
                                                    <span className="text-[10px] leading-tight opacity-60">
                                                        {t.sub}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
                                        {needsValue && (
                                            <Input
                                                type="number"
                                                min={0}
                                                label={
                                                    data.type === "percentage"
                                                        ? "Besar Diskon (%)"
                                                        : "Nominal Potongan (Rp)"
                                                }
                                                value={data.value}
                                                onChange={(e) => setData("value", e.target.value)}
                                                errors={errors.value}
                                                required
                                            />
                                        )}
                                        {(needsXY || isGame) && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    label="Beli (Qty)"
                                                    value={data.buy_quantity}
                                                    onChange={(e) =>
                                                        setData("buy_quantity", e.target.value)
                                                    }
                                                />
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    label="Gratis (Qty)"
                                                    value={data.get_quantity}
                                                    onChange={(e) =>
                                                        setData("get_quantity", e.target.value)
                                                    }
                                                />
                                            </div>
                                        )}
                                        {(needsXY || isGame) && (
                                            <div>
                                                <FieldLabel>Tipe Produk Reward</FieldLabel>
                                                <NativeSelect
                                                    value={data.get_product_type}
                                                    onChange={(e) =>
                                                        setData("get_product_type", e.target.value)
                                                    }
                                                >
                                                    {GET_PRODUCT_TYPE_OPTIONS.map((o) => (
                                                        <option key={o.id} value={o.id}>
                                                            {o.label}
                                                        </option>
                                                    ))}
                                                </NativeSelect>
                                            </div>
                                        )}
                                        {isGame && (
                                            <Input
                                                type="number"
                                                min={1}
                                                max={100}
                                                label="Probabilitas (%)"
                                                value={data.game_probability}
                                                onChange={(e) =>
                                                    setData("game_probability", e.target.value)
                                                }
                                                placeholder="30"
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <FieldLabel>Deskripsi</FieldLabel>
                                        <textarea
                                            value={data.description}
                                            onChange={(e) => setData("description", e.target.value)}
                                            rows={2}
                                            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-transparent py-2 px-3 transition-all resize-none"
                                        />
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Syarat & Batasan */}
                            <Card>
                                <CardHeader title="Syarat & Batasan" />
                                <CardBody className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            type="number"
                                            min={0}
                                            label="Min. Belanja (Rp)"
                                            value={data.min_purchase_amount}
                                            onChange={(e) =>
                                                setData("min_purchase_amount", e.target.value)
                                            }
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            label="Min. Qty di Cart"
                                            value={data.min_purchase_quantity}
                                            onChange={(e) =>
                                                setData("min_purchase_quantity", e.target.value)
                                            }
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            label="Maks. Nominal Diskon (Rp)"
                                            value={data.max_discount_amount}
                                            onChange={(e) =>
                                                setData("max_discount_amount", e.target.value)
                                            }
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            label="Prioritas"
                                            value={data.priority}
                                            onChange={(e) => setData("priority", e.target.value)}
                                        />
                                        <div>
                                            <FieldLabel>Tanggal Mulai</FieldLabel>
                                            <input
                                                type="date"
                                                value={data.start_date}
                                                onChange={(e) =>
                                                    setData("start_date", e.target.value)
                                                }
                                                className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-transparent py-2 px-3 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <FieldLabel>Tanggal Selesai</FieldLabel>
                                            <input
                                                type="date"
                                                value={data.end_date}
                                                onChange={(e) => setData("end_date", e.target.value)}
                                                className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-transparent py-2 px-3 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={data.is_combinable}
                                            onChange={(e) => setData("is_combinable", e.target.checked)}
                                            className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            Dapat dikombinasikan dengan promo lain
                                        </span>
                                    </label>
                                </CardBody>
                            </Card>

                            <ApplicabilitiesSection
                                items={data.applicabilities}
                                onChange={(v) => setData("applicabilities", v)}
                                variants={variants}
                                intensities={intensities}
                                sizes={sizes}
                            />
                            <RequirementsSection
                                items={data.requirements}
                                onChange={(v) => setData("requirements", v)}
                                variants={variants}
                                intensities={intensities}
                                sizes={sizes}
                            />
                            <RewardsSection
                                items={data.rewards}
                                onChange={(v) => setData("rewards", v)}
                                variants={variants}
                                intensities={intensities}
                                sizes={sizes}
                            />
                        </div>

                        {/* ── Sidebar ── */}
                        <div className="space-y-4">
                            <div className="sticky top-6 space-y-4">

                                <Card>
                                    <CardHeader title="Berlaku di Toko" />
                                    <CardBody>
                                        <div className="space-y-1 max-h-52 overflow-y-auto">
                                            {stores.map((store) => (
                                                <label
                                                    key={store.id}
                                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm select-none ${
                                                        data.store_ids.includes(store.id)
                                                            ? "border-slate-800 dark:border-slate-300 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                                                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={data.store_ids.includes(store.id)}
                                                        onChange={() => toggleStore(store.id)}
                                                        className="rounded border-slate-400"
                                                    />
                                                    <IconBuildingStore size={13} className="opacity-60" />
                                                    <span className="font-medium text-xs">{store.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {data.store_ids.length === 0 && (
                                            <div className="mt-3 flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500">
                                                <IconInfoCircle size={13} className="flex-shrink-0 mt-0.5" />
                                                Kosong = berlaku di semua toko
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>

                                <Card>
                                    <CardBody>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                Status Aktif
                                            </span>
                                            <Toggle
                                                checked={data.is_active}
                                                onChange={(e) => setData("is_active", e.target.checked)}
                                            />
                                        </div>
                                    </CardBody>
                                </Card>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 text-white dark:text-slate-900 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    <IconDeviceFloppy size={16} />
                                    {processing ? "Menyimpan…" : "Simpan Perubahan"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
