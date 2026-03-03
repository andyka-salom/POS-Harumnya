import React, { useState, useRef } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconArrowLeft, IconDownload, IconUpload, IconFileSpreadsheet,
    IconCircleCheck, IconCircleX, IconAlertTriangle, IconInfoCircle,
    IconTrash, IconRefresh, IconEye, IconX,
} from "@tabler/icons-react";
import axios from "axios";
import toast from "react-hot-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Badge({ color, children }) {
    const cls = {
        green:  "bg-green-100 text-green-700 border border-green-200",
        red:    "bg-red-100 text-red-700 border border-red-200",
        amber:  "bg-amber-100 text-amber-700 border border-amber-200",
        blue:   "bg-blue-100 text-blue-700 border border-blue-200",
        slate:  "bg-slate-100 text-slate-600 border border-slate-200",
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${cls[color] ?? cls.slate}`}>
            {children}
        </span>
    );
}

// ─── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step }) {
    const steps = ["Upload File", "Validasi", "Import"];
    return (
        <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => {
                const idx = i + 1;
                const done    = step > idx;
                const active  = step === idx;
                return (
                    <React.Fragment key={i}>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            done   ? "bg-green-100 text-green-700" :
                            active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" :
                                     "bg-slate-100 text-slate-400"
                        }`}>
                            {done
                                ? <IconCircleCheck size={16}/>
                                : <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">{idx}</span>}
                            {s}
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 rounded ${step > idx ? "bg-green-400" : "bg-slate-200"}`}/>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Validation Result Panel ──────────────────────────────────────────────────
function ValidationPanel({ result, onReset }) {
    const [showErrors, setShowErrors]   = useState(true);
    const [showSummary, setShowSummary] = useState(true);

    return (
        <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Baris",   val: result.total_rows,   color: "blue",  icon: <IconFileSpreadsheet size={16}/> },
                    { label: "Baris Valid",   val: result.valid_count,  color: "green", icon: <IconCircleCheck size={16}/> },
                    { label: "Baris Error",   val: result.error_count,  color: "red",   icon: <IconCircleX size={16}/> },
                    { label: "Kombinasi",     val: result.summary.length, color: "slate", icon: <IconEye size={16}/> },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
                        <div className={`flex items-center gap-2 mb-1 text-${s.color}-600`}>{s.icon}
                            <span className="text-xs font-semibold uppercase text-slate-500">{s.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{s.val}</div>
                    </div>
                ))}
            </div>

            {/* Volume warnings */}
            {result.volume_warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                        <IconAlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                        <div>
                            <p className="font-semibold text-amber-900 text-sm mb-2">
                                Peringatan Volume (total ≠ 30ml)
                            </p>
                            {result.volume_warnings.map((w, i) => (
                                <p key={i} className="text-xs text-amber-800">⚠ {w}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary per kombinasi */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <button onClick={() => setShowSummary(!showSummary)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
                    <h3 className="font-bold text-slate-700 text-sm">
                        Ringkasan Kombinasi ({result.summary.length})
                    </h3>
                    {showSummary ? <IconX size={16} className="text-slate-400"/> : <IconEye size={16} className="text-slate-400"/>}
                </button>
                {showSummary && (
                    <div className="border-t overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b">
                                    <th className="px-4 py-2.5 text-left font-bold text-slate-500">Kombinasi</th>
                                    <th className="px-4 py-2.5 text-center font-bold text-slate-500">Jml Bahan</th>
                                    <th className="px-4 py-2.5 text-center font-bold text-slate-500">Total Volume</th>
                                    <th className="px-4 py-2.5 text-center font-bold text-slate-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {result.summary.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-2.5 font-semibold text-slate-800">{s.combination}</td>
                                        <td className="px-4 py-2.5 text-center">{s.ingredient_count} bahan</td>
                                        <td className="px-4 py-2.5 text-center font-bold">
                                            <span className={s.is_valid_volume ? "text-green-700" : "text-red-600"}>
                                                {s.total_volume} ml
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            {s.is_valid_volume
                                                ? <Badge color="green"><IconCircleCheck size={11}/> Valid</Badge>
                                                : <Badge color="amber"><IconAlertTriangle size={11}/> Volume ≠ 30ml</Badge>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Error rows */}
            {result.errors.length > 0 && (
                <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <button onClick={() => setShowErrors(!showErrors)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-50 transition">
                        <h3 className="font-bold text-red-700 text-sm flex items-center gap-2">
                            <IconCircleX size={16}/> Baris Error ({result.errors.length})
                        </h3>
                        {showErrors ? <IconX size={16} className="text-slate-400"/> : <IconEye size={16} className="text-slate-400"/>}
                    </button>
                    {showErrors && (
                        <div className="border-t divide-y">
                            {result.errors.map((e, i) => (
                                <div key={i} className="px-5 py-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge color="red">Baris {e.row}</Badge>
                                        <span className="text-xs text-slate-500">
                                            {[e.data.variant_code, e.data.intensity_code, e.data.ingredient_code]
                                                .filter(Boolean).join(' / ') || '—'}
                                        </span>
                                    </div>
                                    {e.errors.map((err, j) => (
                                        <p key={j} className="text-xs text-red-600 ml-1">• {err}</p>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-3">
                <button onClick={onReset}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition text-sm">
                    <IconRefresh size={16}/> Pilih File Lain
                </button>
            </div>
        </div>
    );
}

// ─── Import Options Panel ─────────────────────────────────────────────────────
function ImportOptionsPanel({ validationResult, onImport, loading }) {
    const [overwrite, setOverwrite]   = useState(true);
    const [skipErrors, setSkipErrors] = useState(true);

    const canImport = validationResult.valid_count > 0;

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="font-bold text-slate-700 mb-4">Opsi Import</h3>

                <div className="space-y-4">
                    {/* Overwrite option */}
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition">
                        <input type="checkbox" checked={overwrite}
                            onChange={e => setOverwrite(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600"/>
                        <div>
                            <p className="font-semibold text-sm text-slate-800">Timpa formula yang sudah ada</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Jika kombinasi variant + intensity sudah memiliki formula, hapus dan ganti dengan data baru.
                                Jika tidak dicentang, kombinasi yang sudah ada akan dilewati.
                            </p>
                        </div>
                    </label>

                    {/* Skip errors option */}
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition">
                        <input type="checkbox" checked={skipErrors}
                            onChange={e => setSkipErrors(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600"/>
                        <div>
                            <p className="font-semibold text-sm text-slate-800">Lewati baris yang error</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Baris yang error akan dilewati, baris valid tetap diimport.
                                Jika tidak dicentang, seluruh import dibatalkan jika ada 1 baris error.
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Confirm box */}
            <div className={`rounded-xl border p-5 ${canImport ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-start gap-3">
                    {canImport
                        ? <IconCircleCheck size={20} className="text-green-600 flex-shrink-0 mt-0.5"/>
                        : <IconCircleX size={20} className="text-red-600 flex-shrink-0 mt-0.5"/>}
                    <div>
                        <p className={`font-semibold text-sm ${canImport ? "text-green-900" : "text-red-900"}`}>
                            {canImport
                                ? `Siap import ${validationResult.valid_count} baris data (${validationResult.summary.length} kombinasi formula)`
                                : "Tidak ada baris valid untuk diimport"}
                        </p>
                        {validationResult.error_count > 0 && (
                            <p className="text-xs text-amber-700 mt-1">
                                ⚠ {validationResult.error_count} baris error akan {skipErrors ? "dilewati" : "membatalkan semua import"}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <button
                onClick={() => onImport({ overwrite, skip_errors: skipErrors })}
                disabled={!canImport || loading}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                {loading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> Mengimport...</>
                ) : (
                    <><IconUpload size={20}/> Import {validationResult.valid_count} Baris Sekarang</>
                )}
            </button>
        </div>
    );
}

// ─── Import Result Panel ──────────────────────────────────────────────────────
function ImportResultPanel({ result }) {
    return (
        <div className="space-y-4">
            <div className={`rounded-2xl border p-6 ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-start gap-4">
                    {result.success
                        ? <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center">
                            <IconCircleCheck size={28} className="text-green-600"/>
                          </div>
                        : <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center">
                            <IconCircleX size={28} className="text-red-600"/>
                          </div>}
                    <div>
                        <h3 className={`font-bold text-lg mb-1 ${result.success ? "text-green-900" : "text-red-900"}`}>
                            {result.success ? "Import Berhasil!" : "Import Gagal"}
                        </h3>
                        <p className={`text-sm ${result.success ? "text-green-800" : "text-red-800"}`}>{result.message}</p>
                    </div>
                </div>
            </div>

            {result.success && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Baris Disimpan",  val: result.imported,    color: "green" },
                        { label: "Kombinasi Ditimpa", val: result.overwritten, color: "amber" },
                        { label: "Dilewati",         val: result.skipped,     color: "slate" },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-xl border p-4 text-center shadow-sm">
                            <div className={`text-2xl font-bold text-${s.color}-600`}>{s.val}</div>
                            <div className="text-xs text-slate-500 font-medium mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {result.errors?.length > 0 && (
                <div className="bg-white rounded-xl border border-red-200 p-4">
                    <p className="font-semibold text-red-700 text-sm mb-3 flex items-center gap-2">
                        <IconCircleX size={16}/> Baris yang Dilewati ({result.errors.length})
                    </p>
                    {result.errors.slice(0, 10).map((e, i) => (
                        <div key={i} className="text-xs text-red-600 mb-1">
                            Baris {e.row}: {e.errors.join(', ')}
                        </div>
                    ))}
                    {result.errors.length > 10 && (
                        <p className="text-xs text-slate-400 mt-2">...dan {result.errors.length - 10} lainnya</p>
                    )}
                </div>
            )}

            <Link href={route("recipes.index")}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition">
                <IconEye size={18}/> Lihat Semua Formula
            </Link>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Import() {
    const [step, setStep]                       = useState(1);
    const [file, setFile]                       = useState(null);
    const [dragOver, setDragOver]               = useState(false);
    const [validating, setValidating]           = useState(false);
    const [importing, setImporting]             = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [importResult, setImportResult]       = useState(null);
    const fileInputRef                          = useRef(null);

    // ── Download template ─────────────────────────────────────────────────────
    const handleDownloadTemplate = () => {
        window.location.href = route("recipes.import.template");
        toast.success("Mendownload template...");
    };

    // ── File selection ────────────────────────────────────────────────────────
    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;
        if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
            toast.error("Hanya file .xlsx atau .xls yang diterima");
            return;
        }
        setFile(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        handleFileSelect(dropped);
    };

    // ── Step 1 → 2: Validate ─────────────────────────────────────────────────
    const handleValidate = async () => {
        if (!file) return;
        setValidating(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("_token", document.querySelector('meta[name=csrf-token]')?.content ?? "");

        try {
            const { data } = await axios.post(route("recipes.import.validate"), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setValidationResult(data);
            setStep(2);
        } catch (err) {
            const msg = err.response?.data?.message ?? "Gagal memvalidasi file";
            toast.error(msg);
        } finally {
            setValidating(false);
        }
    };

    // ── Step 2 → 3: Import ────────────────────────────────────────────────────
    const handleImport = async ({ overwrite, skip_errors }) => {
        setImporting(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("overwrite", overwrite ? "1" : "0");
        formData.append("skip_errors", skip_errors ? "1" : "0");
        formData.append("_token", document.querySelector('meta[name=csrf-token]')?.content ?? "");

        try {
            const { data } = await axios.post(route("recipes.import.store"), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setImportResult(data);
            setStep(3);
            if (data.success) toast.success("Import berhasil!");
            else toast.error(data.message);
        } catch (err) {
            const msg = err.response?.data?.message ?? "Gagal import";
            toast.error(msg);
            if (err.response?.data) {
                setImportResult(err.response.data);
                setStep(3);
            }
        } finally {
            setImporting(false);
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setFile(null);
        setValidationResult(null);
        setImportResult(null);
        setStep(1);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="Import Formula Variant" />
            <div className="max-w-4xl mx-auto">
                <Link href={route("recipes.index")}
                    className="flex items-center gap-2 text-slate-500 mb-4 hover:text-indigo-600 text-sm transition">
                    <IconArrowLeft size={18}/> Kembali ke Formula
                </Link>

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Import Formula Variant</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Upload file Excel untuk import banyak formula sekaligus
                        </p>
                    </div>
                    <button onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-indigo-200 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-50 hover:border-indigo-300 transition shadow-sm">
                        <IconDownload size={18}/> Download Template
                    </button>
                </div>

                {/* Step Indicator */}
                <StepIndicator step={step}/>

                {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
                {step === 1 && (
                    <div className="space-y-6">
                        {/* How-to card */}
                        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                            <div className="flex items-start gap-3">
                                <IconInfoCircle size={20} className="text-indigo-600 flex-shrink-0 mt-0.5"/>
                                <div className="text-sm text-indigo-900">
                                    <p className="font-semibold mb-2">Cara Import Formula Variant</p>
                                    <ol className="space-y-1 text-indigo-800">
                                        <li>1. <strong>Download template</strong> → klik tombol di pojok kanan atas</li>
                                        <li>2. <strong>Isi data</strong> di sheet "Import Data" mulai baris ke-4</li>
                                        <li>3. <strong>Kolom wajib:</strong> variant_code, intensity_code, ingredient_code, base_quantity</li>
                                        <li>4. <strong>Total base_quantity</strong> per kombinasi variant + intensity harus = 30ml</li>
                                        <li>5. Upload file dan klik Validasi</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* Drop zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-12 text-center ${
                                dragOver
                                    ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
                                    : file
                                    ? "border-green-400 bg-green-50"
                                    : "border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/50"
                            }`}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={e => handleFileSelect(e.target.files[0])}
                            />

                            {file ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-green-100 border-2 border-green-300 flex items-center justify-center">
                                        <IconFileSpreadsheet size={32} className="text-green-600"/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-green-800 text-lg">{file.name}</p>
                                        <p className="text-green-600 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1">
                                        <IconTrash size={13}/> Hapus file
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                                        <IconUpload size={28} className="text-slate-400"/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700 text-base">
                                            {dragOver ? "Lepaskan file di sini" : "Klik atau seret file ke sini"}
                                        </p>
                                        <p className="text-slate-400 text-sm mt-1">Format: .xlsx atau .xls · Maks 5MB</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleValidate}
                                disabled={!file || validating}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/30">
                                {validating ? (
                                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> Memvalidasi...</>
                                ) : (
                                    <><IconEye size={18}/> Validasi File</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Validation Result + Import Options ────────────────── */}
                {step === 2 && validationResult && (
                    <div className="space-y-6">
                        <ValidationPanel result={validationResult} onReset={handleReset}/>
                        <hr className="border-slate-200"/>
                        <ImportOptionsPanel
                            validationResult={validationResult}
                            onImport={handleImport}
                            loading={importing}
                        />
                    </div>
                )}

                {/* ── Step 3: Import Result ─────────────────────────────────────── */}
                {step === 3 && importResult && (
                    <div className="space-y-4">
                        <ImportResultPanel result={importResult}/>
                        <button onClick={handleReset}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition text-sm">
                            <IconRefresh size={16}/> Import File Lain
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

Import.layout = (page) => <DashboardLayout children={page} />;
