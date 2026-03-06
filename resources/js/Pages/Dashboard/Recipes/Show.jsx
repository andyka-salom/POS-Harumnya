import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    IconArrowLeft, IconEdit, IconTrash, IconFlask, IconRuler, IconDroplet,
    IconChevronDown, IconChevronUp, IconCircleCheck, IconAlertTriangle,
    IconPackage, IconRefresh, IconSparkles, IconX, IconCheck,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ─── Delete Modal (identik dengan Packaging) ──────────────────────────────────
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

// ─── Generate Result Banner ───────────────────────────────────────────────────
function GenerateResultBanner({ details, onClose }) {
    if (!details || details.length === 0) return null;
    const generated = details.filter(d => d.status === "generated");
    const skipped   = details.filter(d => d.status === "skipped");
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mb-5">
            <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 dark:bg-slate-800">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Hasil Generate Products</h4>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX size={16} /></button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {details.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-2.5 text-sm">
                        <div className="flex items-center gap-3">
                            {d.status === "generated"
                                ? <IconCheck size={15} className="text-teal-500" />
                                : <IconAlertTriangle size={13} className="text-amber-500" />}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{d.size}</span>
                            {d.sku && <span className="text-xs text-slate-400 font-mono">{d.sku}</span>}
                        </div>
                        <div className="text-right">
                            {d.status === "generated"
                                ? <span className="text-xs text-teal-600 font-semibold">✓ {d.recipes} bahan di-scale</span>
                                : <span className="text-xs text-amber-600">{d.reason}</span>}
                        </div>
                    </div>
                ))}
            </div>
            {generated.length > 0 && (
                <div className="px-5 py-3 bg-teal-50 dark:bg-teal-950/20 border-t text-xs text-teal-700 font-semibold">
                    {generated.length} product baru dibuat · {skipped.length} dilewati
                </div>
            )}
        </div>
    );
}

// ─── Generate Panel ───────────────────────────────────────────────────────────
function GeneratePanel({ variantId, intensityId, sizePreview }) {
    const [loading, setLoading]         = useState(false);
    const [regenerate, setRegenerate]   = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [generated, setGenerated]     = useState(false); // ★ hide after success

    const calibratedSizes = sizePreview?.filter(p => p.is_calibrated) ?? [];
    const canGenerate     = calibratedSizes.length > 0;

    const handleGenerate = () => {
        if (regenerate && !showConfirm) { setShowConfirm(true); return; }
        setShowConfirm(false);
        setLoading(true);
        router.post(
            route("recipes.generate-products", [variantId, intensityId]),
            { regenerate },
            {
                onSuccess: (page) => {
                    const flash = page.props.flash ?? {};
                    if (flash.success)      toast.success(flash.success);
                    else if (flash.warning) toast(flash.warning, { icon: "⚠️" });
                    else if (flash.error)   toast.error(flash.error);
                    setGenerated(true); // ★ hide panel after success
                },
                onError:  () => toast.error("Terjadi kesalahan saat generate products"),
                onFinish: () => setLoading(false),
            }
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
                <IconPackage size={14} className="text-teal-500" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Generate Products</h3>
            </div>
            <div className="p-5 space-y-4">
                {/* Status info */}
                {!canGenerate ? (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <IconAlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">Belum ada kalibrasi IntensitySizeQuantity — konfigurasi dulu di menu Intensitas.</p>
                    </div>
                ) : (
                    <div className="flex items-start gap-2 p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 rounded-lg">
                        <IconCircleCheck size={15} className="text-teal-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-teal-700 dark:text-teal-400">
                            <span className="font-semibold">{calibratedSizes.length} ukuran</span> siap di-generate ({calibratedSizes.map(s => s.size.volume_ml + "ml").join(", ")})
                        </p>
                    </div>
                )}

                {/* ★ Hide controls entirely after success */}
                {!generated ? (
                    <>
                        {/* Regenerate toggle */}
                        <label className="flex items-start gap-3 cursor-pointer">
                            <div
                                className={`relative mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0 ${regenerate ? "bg-amber-500" : "bg-slate-200"}`}
                                onClick={() => { setRegenerate(!regenerate); setShowConfirm(false); }}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${regenerate ? "translate-x-4" : ""}`} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Regenerate (timpa yang ada)</p>
                                <p className="text-xs text-slate-400 mt-0.5">Hapus product lama dan buat ulang dengan formula terbaru</p>
                            </div>
                        </label>

                        {showConfirm && regenerate && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                <p className="font-semibold mb-1">⚠️ Konfirmasi Regenerate</p>
                                <p>Product recipes lama akan dihapus dan dibuat ulang. Klik tombol lagi untuk konfirmasi.</p>
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={!canGenerate || loading}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm ${
                                regenerate
                                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                                    : "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/20"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading
                                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                                : regenerate
                                    ? <><IconRefresh size={15} /> {showConfirm ? "Konfirmasi Regenerate" : "Regenerate Products"}</>
                                    : <><IconSparkles size={15} /> Generate Products</>}
                        </button>
                        <p className="text-xs text-slate-400 text-center">Scaling menggunakan LRM per ingredient type</p>
                    </>
                ) : (
                    /* ★ Success state replaces controls */
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <IconCircleCheck size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Products berhasil di-generate</p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5">Lihat di menu Products untuk detail</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Size Preview Panel ───────────────────────────────────────────────────────
function SizePreviewPanel({ sizePreview }) {
    const [activeSize, setActiveSize] = useState(sizePreview?.[0]?.size?.id ?? null);
    const activePreview = sizePreview?.find(p => p.size.id === activeSize);

    if (!sizePreview || sizePreview.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b bg-slate-50 dark:bg-slate-800">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Preview Scaling</h3>
                </div>
                <div className="p-6 text-center">
                    <IconAlertTriangle size={28} className="mx-auto text-amber-400 mb-2" />
                    <p className="text-xs text-amber-700 font-medium">IntensitySizeQuantity belum dikonfigurasi untuk intensity ini.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-slate-50 dark:bg-slate-800">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Preview Scaling</h3>
                <p className="text-xs text-slate-400 mt-0.5">Integer via Largest Remainder Method per tipe</p>
            </div>

            {/* Size tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
                {sizePreview.map(preview => (
                    <button key={preview.size.id}
                        onClick={() => setActiveSize(preview.size.id)}
                        className={`flex-1 min-w-[60px] py-2.5 text-sm font-bold transition whitespace-nowrap ${
                            activeSize === preview.size.id
                                ? "text-teal-700 bg-teal-50 border-b-2 border-teal-600"
                                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}>
                        {preview.size.volume_ml}ml
                        {preview.is_calibrated
                            ? <IconCircleCheck size={10} className="inline ml-1 text-teal-500" />
                            : <IconAlertTriangle size={10} className="inline ml-1 text-amber-400" />}
                    </button>
                ))}
            </div>

            {activePreview && (
                <div className="p-4 space-y-2">
                    {activePreview.is_calibrated && (
                        <div className="flex gap-1.5 flex-wrap mb-3">
                            {activePreview.oil_quantity > 0 && (
                                <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-100 font-medium">Oil {activePreview.oil_quantity}ml</span>
                            )}
                            {activePreview.alcohol_quantity > 0 && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-medium">Alc {activePreview.alcohol_quantity}ml</span>
                            )}
                            {(activePreview.other_quantity ?? 0) > 0 && (
                                <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-medium">Other {activePreview.other_quantity}ml</span>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                        <span>{activePreview.is_calibrated
                            ? <span className="text-teal-600 font-semibold">✓ Dikalibrasi</span>
                            : <span className="text-amber-600 font-semibold">⚠ Fallback</span>}
                        </span>
                        <span>Total: <strong className="text-teal-700">{activePreview.total_volume} ml</strong></span>
                    </div>

                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {activePreview.ingredients.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        item.ingredient_type === "oil"     ? "bg-teal-400" :
                                        item.ingredient_type === "alcohol" ? "bg-blue-400" : "bg-slate-400"
                                    }`} />
                                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{item.ingredient?.name ?? "—"}</span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.scaled_quantity}</span>
                                    <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                                    <div className="text-[10px] text-slate-400">({parseFloat(item.original_quantity).toFixed(1)}ml base)</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-teal-700 text-xs">
                        <span>Total:</span>
                        <span>
                            {activePreview.ingredients.reduce((s, i) => s + (i.scaled_quantity || 0), 0)} ml
                            <IconCircleCheck size={11} className="inline ml-1 text-emerald-500" />
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Show ────────────────────────────────────────────────────────────────
export default function Show({ recipes, variant, intensity, sizePreview }) {
    const { props } = usePage();
    const flash           = props.flash ?? {};
    const generateDetails = props.generateDetails ?? null;

    const [showAllIngredients, setShowAll] = useState(false);
    const [showDetails, setShowDetails]    = useState(!!generateDetails);
    const [deleteModal, setDeleteModal]    = useState({ show: false, loading: false });

    const totalVolume    = recipes.reduce((s, r) => s + parseFloat(r.base_quantity || 0), 0);
    const displayRecipes = showAllIngredients ? recipes : recipes.slice(0, 6);

    const handleDelete = () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        router.delete(route("recipes.destroy", [variant.id, intensity.id]), {
            onSuccess: () => toast.success("Formula berhasil dihapus"),
            onError:   () => {
                setDeleteModal({ show: false, loading: false });
                toast.error("Gagal menghapus formula");
            },
        });
    };

    return (
        <>
            <Head title={`Formula — ${variant.name} ${intensity.code}`} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-4">
                    <Link href={route("recipes.index")}
                        className="flex items-center gap-1.5 text-slate-500 hover:text-teal-600 text-sm font-medium transition">
                        <IconArrowLeft size={16} /> Kembali
                    </Link>
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{variant.name}</h1>
                            <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 rounded-full text-xs font-bold">{intensity.code}</span>
                            {variant.gender && (
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-xs capitalize">{variant.gender}</span>
                            )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">{intensity.name} · Base 30ml · {recipes.length} bahan</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <Link href={route("recipes.edit", [variant.id, intensity.id])}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-semibold text-sm hover:bg-amber-100 transition">
                        <IconEdit size={15} /> Edit
                    </Link>
                    <button
                        onClick={() => setDeleteModal({ show: true, loading: false })}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 transition">
                        <IconTrash size={15} /> Hapus
                    </button>
                </div>
            </div>

            {showDetails && generateDetails && (
                <GenerateResultBanner details={generateDetails} onClose={() => setShowDetails(false)} />
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                    { icon: <IconFlask size={16} className="text-teal-500" />,   label: "Bahan",     value: recipes.length,         unit: "items"     },
                    { icon: <IconDroplet size={16} className="text-blue-500" />, label: "Volume",    value: totalVolume.toFixed(1), unit: "ml (base)" },
                    { icon: <IconRuler size={16} className="text-teal-500" />,   label: "Oil Ratio", value: intensity.oil_ratio,    unit: "%"         },
                ].map((c, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                            {c.icon}
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{c.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums">{c.value}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{c.unit}</div>
                    </div>
                ))}
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

                {/* Left — Ingredients */}
                <div className="xl:col-span-3 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b bg-slate-50 dark:bg-slate-800">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                                Komposisi Bahan — Base 30ml
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {displayRecipes.map((recipe, idx) => {
                                const pct  = totalVolume > 0 ? (parseFloat(recipe.base_quantity) / totalVolume) * 100 : 0;
                                const type = recipe.ingredient?.category?.ingredient_type;
                                return (
                                    <div key={recipe.id ?? idx} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                        <div className="w-6 h-6 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] font-bold text-teal-600">{idx + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{recipe.ingredient?.name ?? "—"}</span>
                                                {type && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border flex-shrink-0 ${
                                                        type === "oil"     ? "bg-teal-50 text-teal-600 border-teal-200" :
                                                        type === "alcohol" ? "bg-blue-50 text-blue-600 border-blue-200" :
                                                                             "bg-slate-50 text-slate-500 border-slate-200"
                                                    }`}>{type}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all ${
                                                        type === "oil"     ? "bg-teal-400" :
                                                        type === "alcohol" ? "bg-blue-400" : "bg-slate-400"
                                                    }`} style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-xs text-slate-400 w-10 text-right tabular-nums">{pct.toFixed(1)}%</span>
                                            </div>
                                            {recipe.notes && (
                                                <p className="text-xs text-slate-400 mt-0.5 italic">{recipe.notes}</p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{parseFloat(recipe.base_quantity).toFixed(2)}</span>
                                            <span className="text-xs text-slate-400 ml-1">{recipe.unit}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total row */}
                        <div className="px-5 py-3 bg-teal-50 dark:bg-teal-950/20 border-t border-teal-100 dark:border-teal-900 flex justify-between items-center">
                            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Total Volume</span>
                            <span className="font-bold text-teal-800 dark:text-teal-300 tabular-nums">
                                {totalVolume.toFixed(2)} <span className="text-teal-500 font-normal text-xs">ml</span>
                            </span>
                        </div>

                        {recipes.length > 6 && (
                            <button onClick={() => setShowAll(!showAllIngredients)}
                                className="w-full py-3 text-xs font-bold text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition flex items-center justify-center gap-1 border-t border-slate-100 dark:border-slate-800">
                                {showAllIngredients
                                    ? <><IconChevronUp size={13} /> Tampilkan lebih sedikit</>
                                    : <><IconChevronDown size={13} /> +{recipes.length - 6} bahan lainnya</>}
                            </button>
                        )}
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="xl:col-span-2 space-y-4">
                    <GeneratePanel
                        variantId={variant.id}
                        intensityId={intensity.id}
                        sizePreview={sizePreview}
                    />
                    <SizePreviewPanel sizePreview={sizePreview} />

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-3">Aksi Cepat</h3>
                        <div className="space-y-2">
                            <Link href={route("recipes.edit", [variant.id, intensity.id])}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition">
                                <IconEdit size={15} /> Edit Formula
                            </Link>
                            <Link href={route("recipes.create")}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-teal-700 bg-teal-50 dark:bg-teal-950/20 hover:bg-teal-100 rounded-xl transition">
                                <IconFlask size={15} /> Buat Formula Baru
                            </Link>
                            <button
                                onClick={() => setDeleteModal({ show: true, loading: false })}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition">
                                <IconTrash size={15} /> Hapus Formula
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            <DeleteModal
                show={deleteModal.show}
                loading={deleteModal.loading}
                title={`Hapus Formula "${variant.name} — ${intensity.name}"?`}
                message="Formula yang dihapus tidak dapat dikembalikan. Product yang sudah di-generate tidak akan terpengaruh."
                onConfirm={handleDelete}
                onClose={() => setDeleteModal({ show: false, loading: false })}
            />
        </>
    );
}

Show.layout = (page) => <DashboardLayout children={page} />;
