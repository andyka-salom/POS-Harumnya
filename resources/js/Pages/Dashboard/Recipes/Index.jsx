import React, { useState, useMemo } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconPlus, IconEye, IconEdit, IconTrash, IconFlask,
    IconChevronDown, IconChevronUp, IconAlertTriangle, IconCircleCheck,
    IconFileImport, IconDownload, IconSparkles, IconSearch,
    IconFilter, IconX, IconDroplet, IconTestPipe, IconLayersIntersect,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ─── Pill Badge ───────────────────────────────────────────────────────────────
const Badge = ({ color = "slate", children }) => {
    const colors = {
        purple: "bg-purple-100 text-purple-700 ring-purple-200",
        blue:   "bg-blue-100 text-blue-700 ring-blue-200",
        green:  "bg-emerald-100 text-emerald-700 ring-emerald-200",
        amber:  "bg-amber-100 text-amber-700 ring-amber-200",
        slate:  "bg-slate-100 text-slate-600 ring-slate-200",
        rose:   "bg-rose-100 text-rose-700 ring-rose-200",
        indigo: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${colors[color]}`}>
            {children}
        </span>
    );
};

// ─── Type icon ────────────────────────────────────────────────────────────────
const TypeDot = ({ type }) => {
    if (type === "oil")     return <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />;
    if (type === "alcohol") return <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />;
    return <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />;
};

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
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-200 min-w-[140px] rounded-tl-xl">Bahan</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-300 w-16">Tipe</th>
                        {sizeScaling.map((s, i) => (
                            <th key={i} className={`px-3 py-2.5 text-center font-semibold text-white ${i === sizeScaling.length - 1 ? "rounded-tr-xl" : ""}`}>
                                <div className="text-sm font-bold">{s.volume_ml}ml</div>
                                <div className="text-slate-400 font-normal text-[10px] mt-0.5">
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
                                <Badge color={ing.ingredient_type === "oil" ? "purple" : ing.ingredient_type === "alcohol" ? "blue" : "slate"}>
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
                    <tr className="bg-gradient-to-r from-violet-50 to-indigo-50 border-t-2 border-indigo-200">
                        <td className="px-3 py-2.5 font-bold text-indigo-800 text-xs uppercase tracking-wide" colSpan={2}>
                            Total Volume
                        </td>
                        {sizeScaling.map((s, i) => (
                            <td key={i} className="px-3 py-2.5 text-center">
                                <span className="font-bold text-indigo-700">{s.total_volume}</span>
                                <span className="text-indigo-400 ml-0.5 text-[10px]">ml</span>
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
function RecipeCard({ recipe }) {
    const [showScaling, setShowScaling] = useState(false);
    const [generating, setGenerating]   = useState(false);
    const hasScaling = recipe.size_scaling && recipe.size_scaling.length > 0;

    const handleGenerate = () => {
        if (!hasScaling) { toast.error("Kalibrasi IntensitySizeQuantity belum diset"); return; }
        setGenerating(true);
        router.post(
            route("recipes.generate-products", [recipe.variant_id, recipe.intensity_id]),
            { regenerate: false },
            {
                onSuccess: (page) => {
                    const flash = page.props?.flash ?? {};
                    if (flash.success)      toast.success(flash.success);
                    else if (flash.warning) toast(flash.warning, { icon: "⚠️" });
                    else                   toast.success("Products berhasil di-generate!");
                },
                onError:  () => toast.error("Gagal generate products"),
                onFinish: () => setGenerating(false),
            }
        );
    };

    const handleDelete = () => {
        if (confirm(`Hapus formula ${recipe.variant.name} - ${recipe.intensity.name}?`)) {
            router.delete(route("recipes.destroy", [recipe.variant_id, recipe.intensity_id]));
        }
    };

    const visibleIngredients = recipe.recipes.slice(0, 5);
    const hiddenCount = recipe.recipes.length - 5;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md shadow-sm transition-all duration-200 flex flex-col overflow-hidden">
            {/* Top color band */}
            <div className={`h-1 w-full ${hasScaling ? "bg-gradient-to-r from-indigo-400 to-violet-500" : "bg-gradient-to-r from-amber-300 to-orange-400"}`} />

            {/* Main content */}
            <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{recipe.variant.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{recipe.intensity.name}</p>
                    </div>
                    <Badge color="purple">{recipe.intensity.code}</Badge>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-2 text-[11px]">
                    <div className="flex-1 bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                        <div className="font-bold text-slate-800 tabular-nums">{parseFloat(recipe.total_volume).toFixed(0)}</div>
                        <div className="text-slate-400 text-[10px]">ml</div>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                        <div className="font-bold text-slate-800 tabular-nums">{recipe.ingredient_count}</div>
                        <div className="text-slate-400 text-[10px]">bahan</div>
                    </div>
                    <div className={`flex-1 rounded-lg px-2 py-1.5 text-center ${hasScaling ? "bg-emerald-50" : "bg-amber-50"}`}>
                        <div className={`font-bold tabular-nums ${hasScaling ? "text-emerald-600" : "text-amber-500"}`}>
                            {hasScaling ? recipe.size_scaling.length : "—"}
                        </div>
                        <div className={`text-[10px] ${hasScaling ? "text-emerald-400" : "text-amber-400"}`}>ukuran</div>
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
                                    <span className="text-slate-600 truncate">{item.ingredient.name}</span>
                                </div>
                                <span className="font-bold text-slate-700 flex-shrink-0 tabular-nums">
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
            <div className="border-t border-slate-100">
                <button
                    onClick={() => setShowScaling(!showScaling)}
                    className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold hover:bg-slate-50 transition"
                >
                    <span className={hasScaling ? "text-emerald-600 flex items-center gap-1" : "text-amber-500 flex items-center gap-1"}>
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
            <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-0.5">
                    <Link href={route("recipes.show", [recipe.variant_id, recipe.intensity_id])}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Detail">
                        <IconEye size={15} />
                    </Link>
                    <Link href={route("recipes.edit", [recipe.variant_id, recipe.intensity_id])}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition" title="Edit">
                        <IconEdit size={15} />
                    </Link>
                    <button onClick={handleDelete}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Hapus">
                        <IconTrash size={15} />
                    </button>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating || !hasScaling}
                    title={hasScaling ? "Generate Products" : "Kalibrasi belum diset"}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {generating
                        ? <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Generating</>
                        : <><IconSparkles size={12} /> Generate</>}
                </button>
            </div>
        </div>
    );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ recipes }) {
    const stats = useMemo(() => {
        const total = recipes.length;
        const calibrated = recipes.filter(r => r.size_scaling?.length > 0).length;
        const sizes = [...new Set(recipes.flatMap(r => r.size_scaling?.map(s => s.volume_ml) ?? []))].length;
        const ingredients = recipes.reduce((sum, r) => sum + (r.ingredient_count ?? 0), 0);
        return { total, calibrated, uncalibrated: total - calibrated, sizes, ingredients };
    }, [recipes]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
                { label: "Total Formula",     value: stats.total,          icon: IconFlask,          color: "text-indigo-600",  bg: "bg-indigo-50"  },
                { label: "Sudah Kalibrasi",   value: stats.calibrated,     icon: IconCircleCheck,    color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Belum Kalibrasi",   value: stats.uncalibrated,   icon: IconAlertTriangle,  color: "text-amber-600",   bg: "bg-amber-50"   },
                { label: "Total Bahan",        value: stats.ingredients,    icon: IconDroplet,        color: "text-purple-600",  bg: "bg-purple-50"  },
            ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
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

// ─── Index ────────────────────────────────────────────────────────────────────
export default function Index({ variantRecipes }) {
    const [search, setSearch]       = useState("");
    const [filterStatus, setFilter] = useState("all"); // all | calibrated | uncalibrated

    const filtered = useMemo(() => {
        return variantRecipes.filter(r => {
            const matchSearch =
                !search ||
                r.variant.name.toLowerCase().includes(search.toLowerCase()) ||
                r.intensity.name.toLowerCase().includes(search.toLowerCase()) ||
                r.intensity.code.toLowerCase().includes(search.toLowerCase());
            const matchFilter =
                filterStatus === "all" ||
                (filterStatus === "calibrated"   && r.size_scaling?.length > 0) ||
                (filterStatus === "uncalibrated" && !r.size_scaling?.length);
            return matchSearch && matchFilter;
        });
    }, [variantRecipes, search, filterStatus]);

    return (
        <>
            <Head title="Formula Variant" />

            {/* Page header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <IconFlask size={22} className="text-indigo-600" />
                        Formula Variant
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Base recipe 30ml untuk setiap kombinasi variant &amp; intensity
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                        href={route("recipes.import.template")}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
                    >
                        <IconDownload size={15} /> Template
                    </a>
                    <Link
                        href={route("recipes.import.index")}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
                    >
                        <IconFileImport size={15} /> Import
                    </Link>
                    <Link
                        href={route("recipes.create")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow hover:bg-indigo-700 transition"
                    >
                        <IconPlus size={15} /> Buat Formula
                    </Link>
                </div>
            </div>

            {/* Stats */}
            {variantRecipes.length > 0 && <StatsBar recipes={variantRecipes} />}

            {/* Search & Filter toolbar */}
            {variantRecipes.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari variant, intensity, kode…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <IconX size={14} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1.5">
                        {[
                            { key: "all",           label: "Semua"   },
                            { key: "calibrated",    label: "✓ Kalibrasi" },
                            { key: "uncalibrated",  label: "⚠ Belum" },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                                    filterStatus === key
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Result count */}
            {search || filterStatus !== "all" ? (
                <p className="text-xs text-slate-500 mb-3">
                    Menampilkan <strong>{filtered.length}</strong> dari {variantRecipes.length} formula
                </p>
            ) : null}

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {variantRecipes.length === 0 ? (
                    <div className="bg-white p-16 rounded-2xl border border-dashed border-slate-300 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <IconFlask size={32} className="text-slate-400" />
                        </div>
                        <p className="text-slate-600 font-semibold mb-1">Belum ada formula variant</p>
                        <p className="text-sm text-slate-400 mb-5">Mulai buat formula pertama Anda</p>
                        <Link
                            href={route("recipes.create")}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow"
                        >
                            <IconPlus size={18} /> Buat Formula Baru
                        </Link>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
                        <IconSearch size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-semibold">Tidak ada hasil yang sesuai</p>
                        <button onClick={() => { setSearch(""); setFilter("all"); }} className="mt-3 text-sm text-indigo-600 hover:underline">
                            Reset filter
                        </button>
                    </div>
                ) : (
                    filtered.map((recipe, i) => (
                        <RecipeCard key={i} recipe={recipe} />
                    ))
                )}
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
