import React, { useState, useMemo } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconPlus, IconEye, IconEdit, IconTrash, IconFlask,
    IconChevronDown, IconChevronUp, IconAlertTriangle, IconCircleCheck,
    IconFileImport, IconDownload, IconSparkles, IconSearch,
    IconX, IconDroplet, IconLock,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ─── Pill Badge ───────────────────────────────────────────────────────────────
const Badge = ({ color = "slate", children }) => {
    const colors = {
        teal:   "bg-teal-100 text-teal-700 ring-teal-200",
        green:  "bg-emerald-100 text-emerald-700 ring-emerald-200",
        amber:  "bg-amber-100 text-amber-700 ring-amber-200",
        slate:  "bg-slate-100 text-slate-600 ring-slate-200",
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${colors[color] ?? colors.slate}`}>
            {children}
        </span>
    );
};

const TypeDot = ({ type }) => {
    if (type === "oil")     return <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />;
    if (type === "alcohol") return <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />;
    return <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />;
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ show, title, message, onConfirm, onClose, loading }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconAlertTriangle size={22} className="text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{message}</p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} disabled={loading}
                        className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                        Batal
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                        className="px-5 py-2.5 text-sm font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 flex items-center gap-2">
                        {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── ScalingPreviewTable ──────────────────────────────────────────────────────
function ScalingPreviewTable({ sizeScaling }) {
    if (!sizeScaling || sizeScaling.length === 0) {
        return (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mt-3">
                <IconAlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-700 font-medium">
                    IntensitySizeQuantity belum dikonfigurasi — generate product tidak tersedia
                </span>
            </div>
        );
    }
    return (
        <div className="overflow-x-auto mt-3 rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-gradient-to-r from-teal-700 to-teal-600 text-white">
                        <th className="px-3 py-2.5 text-left font-semibold text-teal-100 min-w-[140px] rounded-tl-xl">Bahan</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-teal-200 w-16">Tipe</th>
                        {sizeScaling.map((s, i) => (
                            <th key={i} className={`px-3 py-2.5 text-center font-semibold text-white ${i === sizeScaling.length - 1 ? "rounded-tr-xl" : ""}`}>
                                <div className="text-sm font-bold">{s.volume_ml}ml</div>
                                <div className="text-teal-200 font-normal text-[10px] mt-0.5">
                                    {[s.oil_quantity > 0 && `oil ${s.oil_quantity}`, s.alcohol_quantity > 0 && `alc ${s.alcohol_quantity}`].filter(Boolean).join(" · ")}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sizeScaling[0]?.ingredients?.map((ing, idx) => (
                        <tr key={idx} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                            <td className="px-3 py-2 font-medium text-slate-700 truncate max-w-[160px]">
                                <div className="flex items-center gap-1.5">
                                    <TypeDot type={ing.ingredient_type} />
                                    {ing.name}
                                </div>
                            </td>
                            <td className="px-3 py-2">
                                <Badge color={ing.ingredient_type === "oil" ? "teal" : "slate"}>
                                    {ing.ingredient_type ?? "other"}
                                </Badge>
                            </td>
                            {sizeScaling.map((s, si) => {
                                const item = s.ingredients?.find(i => i.ingredient_id === ing.ingredient_id);
                                return (
                                    <td key={si} className="px-3 py-2 text-center">
                                        <span className="font-bold text-slate-800">{item?.scaled_quantity ?? 0}</span>
                                        <span className="text-slate-400 ml-0.5 text-[10px]">{item?.unit ?? "ml"}</span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    <tr className="bg-teal-50 border-t-2 border-teal-200">
                        <td className="px-3 py-2.5 font-bold text-teal-800 text-xs uppercase tracking-wide" colSpan={2}>Total Volume</td>
                        {sizeScaling.map((s, i) => (
                            <td key={i} className="px-3 py-2.5 text-center">
                                <span className="font-bold text-teal-700">{s.total_volume}</span>
                                <span className="text-teal-400 ml-0.5 text-[10px]">ml</span>
                                <IconCircleCheck size={11} className="inline ml-1 text-emerald-500" />
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onDelete }) {
    const [showScaling, setShowScaling] = useState(false);
    const [generating, setGenerating]   = useState(false);

    // is_generated datang dari server — product sudah dibuat sebelumnya
    const hasScaling    = recipe.size_scaling && recipe.size_scaling.length > 0;
    const isGenerated   = recipe.is_generated === true;

    const handleGenerate = () => {
        if (!hasScaling) { toast.error("Kalibrasi IntensitySizeQuantity belum diset"); return; }
        if (isGenerated)  { toast("Products sudah di-generate. Gunakan Regenerate di halaman Detail.", { icon: "🔒" }); return; }

        setGenerating(true);
        router.post(
            route("recipes.generate-products", [recipe.variant_id, recipe.intensity_id]),
            { regenerate: false },
            {
                onSuccess: (page) => {
                    const flash = page.props?.flash ?? {};
                    if (flash.success)      toast.success(flash.success);
                    else if (flash.warning) toast(flash.warning, { icon: "⚠️" });
                    else                    toast.success("Products berhasil di-generate!");
                },
                onError:  () => toast.error("Gagal generate products"),
                onFinish: () => setGenerating(false),
            }
        );
    };

    const visibleIngredients = recipe.recipes.slice(0, 5);
    const hiddenCount        = recipe.recipes.length - 5;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-300 hover:shadow-md shadow-sm transition-all duration-200 flex flex-col overflow-hidden">
            {/* Top accent bar */}
            <div className={`h-1 w-full ${
                isGenerated  ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                hasScaling   ? "bg-gradient-to-r from-teal-400 to-teal-500" :
                               "bg-gradient-to-r from-amber-300 to-orange-400"
            }`} />

            <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Title */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{recipe.variant.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{recipe.intensity.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge color="teal">{recipe.intensity.code}</Badge>
                        {isGenerated && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                                <IconCircleCheck size={10} /> Generated
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 text-[11px]">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 text-center">
                        <div className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{parseFloat(recipe.total_volume).toFixed(0)}</div>
                        <div className="text-slate-400 text-[10px]">ml</div>
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 text-center">
                        <div className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{recipe.ingredient_count}</div>
                        <div className="text-slate-400 text-[10px]">bahan</div>
                    </div>
                    <div className={`flex-1 rounded-lg px-2 py-1.5 text-center ${hasScaling ? "bg-teal-50 dark:bg-teal-950/30" : "bg-amber-50"}`}>
                        <div className={`font-bold tabular-nums ${hasScaling ? "text-teal-600" : "text-amber-500"}`}>
                            {hasScaling ? recipe.size_scaling.length : "—"}
                        </div>
                        <div className={`text-[10px] ${hasScaling ? "text-teal-400" : "text-amber-400"}`}>ukuran</div>
                    </div>
                </div>

                {/* Ingredients preview */}
                <div className="flex flex-col gap-1">
                    {visibleIngredients.map((item, idx) => {
                        const type = item.ingredient?.category?.ingredient_type;
                        return (
                            <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <TypeDot type={type} />
                                    <span className="text-slate-600 dark:text-slate-400 truncate">{item.ingredient.name}</span>
                                </div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 flex-shrink-0 tabular-nums">
                                    {parseFloat(item.base_quantity).toFixed(2)}<span className="text-slate-400 font-normal">{item.unit}</span>
                                </span>
                            </div>
                        );
                    })}
                    {hiddenCount > 0 && (
                        <div className="text-[10px] text-slate-400 text-center mt-0.5">+{hiddenCount} bahan lainnya</div>
                    )}
                </div>
            </div>

            {/* Scaling toggle */}
            <div className="border-t border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => setShowScaling(!showScaling)}
                    className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                    <span className={hasScaling ? "text-teal-600 flex items-center gap-1" : "text-amber-500 flex items-center gap-1"}>
                        {hasScaling
                            ? <><IconCircleCheck size={11} /> {recipe.size_scaling.length} ukuran siap</>
                            : <><IconAlertTriangle size={11} /> Belum kalibrasi</>}
                    </span>
                    {showScaling ? <IconChevronUp size={12} className="text-slate-400" /> : <IconChevronDown size={12} className="text-slate-400" />}
                </button>
                {showScaling && (
                    <div className="px-4 pb-3">
                        <ScalingPreviewTable sizeScaling={recipe.size_scaling} />
                    </div>
                )}
            </div>

            {/* Action footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-0.5">
                    <Link
                        href={route("recipes.show", [recipe.variant_id, recipe.intensity_id])}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                        title="Detail"
                    >
                        <IconEye size={15} />
                    </Link>
                    <Link
                        href={route("recipes.edit", [recipe.variant_id, recipe.intensity_id])}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                        title="Edit"
                    >
                        <IconEdit size={15} />
                    </Link>
                    <button
                        onClick={() => onDelete(recipe)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Hapus"
                    >
                        <IconTrash size={15} />
                    </button>
                </div>

                {/* Generate button — terkunci jika sudah di-generate */}
                {isGenerated ? (
                    <Link
                        href={route("recipes.show", [recipe.variant_id, recipe.intensity_id])}
                        title="Sudah di-generate — klik untuk Regenerate di halaman detail"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition"
                    >
                        <IconLock size={11} /> Sudah Generated
                    </Link>
                ) : (
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !hasScaling}
                        title={hasScaling ? "Generate Products" : "Kalibrasi belum diset"}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 text-white rounded-lg text-[11px] font-bold hover:bg-teal-700 transition shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {generating
                            ? <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Generating</>
                            : <><IconSparkles size={12} /> Generate</>}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ recipes }) {
    const stats = useMemo(() => {
        const total      = recipes.length;
        const calibrated = recipes.filter(r => r.size_scaling?.length > 0).length;
        const generated  = recipes.filter(r => r.is_generated).length;
        const ingredients = recipes.reduce((sum, r) => sum + (r.ingredient_count ?? 0), 0);
        return { total, calibrated, uncalibrated: total - calibrated, generated, ingredients };
    }, [recipes]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
                { label: "Total Formula",    value: stats.total,        icon: IconFlask,         color: "text-teal-600",    bg: "bg-teal-50"     },
                { label: "Sudah Kalibrasi",  value: stats.calibrated,   icon: IconCircleCheck,   color: "text-emerald-600", bg: "bg-emerald-50"  },
                { label: "Sudah Generated",  value: stats.generated,    icon: IconSparkles,      color: "text-teal-600",    bg: "bg-teal-50"     },
                { label: "Total Bahan",      value: stats.ingredients,  icon: IconDroplet,       color: "text-slate-600",   bg: "bg-slate-100"   },
            ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={18} className={color} />
                    </div>
                    <div>
                        <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
                        <div className="text-[11px] text-slate-500">{label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Main Index ───────────────────────────────────────────────────────────────
export default function Index({ variantRecipes }) {
    const [search, setSearch]           = useState("");
    const [filterStatus, setFilter]     = useState("all");
    const [deleteModal, setDeleteModal] = useState({ show: false, item: null, loading: false });

    const filtered = useMemo(() => variantRecipes.filter(r => {
        const matchSearch =
            !search ||
            r.variant.name.toLowerCase().includes(search.toLowerCase()) ||
            r.intensity.name.toLowerCase().includes(search.toLowerCase()) ||
            r.intensity.code.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filterStatus === "all" ||
            (filterStatus === "calibrated"   && r.size_scaling?.length > 0) ||
            (filterStatus === "uncalibrated" && !r.size_scaling?.length) ||
            (filterStatus === "generated"    && r.is_generated);
        return matchSearch && matchFilter;
    }), [variantRecipes, search, filterStatus]);

    const confirmDelete = (recipe) => setDeleteModal({ show: true, item: recipe, loading: false });
    const closeDelete   = ()       => setDeleteModal({ show: false, item: null, loading: false });

    const handleDelete = () => {
        const { item } = deleteModal;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        router.delete(route("recipes.destroy", [item.variant_id, item.intensity_id]), {
            onSuccess: () => { closeDelete(); toast.success("Formula berhasil dihapus"); },
            onError:   () => { closeDelete(); toast.error("Gagal menghapus formula"); },
        });
    };

    return (
        <>
            <Head title="Formula Variant" />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-teal-600 rounded-lg text-white shadow-lg shadow-teal-500/30">
                            <IconFlask size={20} />
                        </div>
                        Formula Variant
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 ml-11">Base recipe 30ml untuk setiap kombinasi variant &amp; intensity</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                        href={route("recipes.import.template")}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
                    >
                        <IconDownload size={15} /> Template
                    </a>
                    <Link
                        href={route("recipes.import.index")}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
                    >
                        <IconFileImport size={15} /> Import
                    </Link>
                    <Link
                        href={route("recipes.create")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-500/30 hover:bg-teal-700 transition"
                    >
                        <IconPlus size={15} /> Buat Formula
                    </Link>
                </div>
            </div>

            {variantRecipes.length > 0 && <StatsBar recipes={variantRecipes} />}

            {/* Search & Filter */}
            {variantRecipes.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari variant, intensity, kode…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <IconX size={14} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {[
                            { key: "all",          label: "Semua"        },
                            { key: "calibrated",   label: "✓ Kalibrasi"  },
                            { key: "generated",    label: "✓ Generated"  },
                            { key: "uncalibrated", label: "⚠ Belum"     },
                        ].map(({ key, label }) => (
                            <button key={key} onClick={() => setFilter(key)}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                                    filterStatus === key
                                        ? "bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-500/20"
                                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                                }`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {(search || filterStatus !== "all") && (
                <p className="text-xs text-slate-500 mb-3">
                    Menampilkan <strong>{filtered.length}</strong> dari {variantRecipes.length} formula
                </p>
            )}

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {variantRecipes.length === 0 ? (
                    <div className="col-span-full bg-white dark:bg-slate-900 p-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <IconFlask size={32} className="text-teal-400" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-semibold mb-1">Belum ada formula variant</p>
                        <p className="text-sm text-slate-400 mb-5">Mulai buat formula pertama Anda</p>
                        <Link
                            href={route("recipes.create")}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition shadow-lg shadow-teal-500/30"
                        >
                            <IconPlus size={18} /> Buat Formula Baru
                        </Link>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full bg-white dark:bg-slate-900 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                        <IconSearch size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-semibold">Tidak ada hasil yang sesuai</p>
                        <button onClick={() => { setSearch(""); setFilter("all"); }} className="mt-3 text-sm text-teal-600 hover:underline">
                            Reset filter
                        </button>
                    </div>
                ) : filtered.map((recipe, i) => (
                    <RecipeCard key={`${recipe.variant_id}-${recipe.intensity_id}`} recipe={recipe} onDelete={confirmDelete} />
                ))}
            </div>

            {/* Delete Modal */}
            <DeleteModal
                show={deleteModal.show}
                loading={deleteModal.loading}
                title={`Hapus Formula "${deleteModal.item?.variant?.name} — ${deleteModal.item?.intensity?.name}"?`}
                message="Formula yang dihapus tidak dapat dikembalikan. Product yang sudah di-generate tidak akan terpengaruh."
                onConfirm={handleDelete}
                onClose={closeDelete}
            />
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
