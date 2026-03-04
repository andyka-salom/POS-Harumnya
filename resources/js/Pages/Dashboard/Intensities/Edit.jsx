import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link } from "@inertiajs/react";
import { IconArrowLeft } from "@tabler/icons-react";
import { IntensityForm } from "./Create";

export default function Edit({ intensity, sizes, size_quantities }) {
    return (
        <>
            <Head title={`Edit Intensitas: ${intensity.name}`} />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-6">
                    <Link
                        href={route("intensities.index")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors mb-4"
                    >
                        <IconArrowLeft size={18} strokeWidth={2} />
                        Kembali ke daftar intensitas
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Level Intensitas</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Perbarui kekuatan aroma dan volume per ukuran botol
                            </p>
                        </div>
                        <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                            {intensity.code}
                        </span>
                    </div>
                </div>

                <IntensityForm
                    mode="edit"
                    intensity={intensity}
                    sizes={sizes}
                    sizeQuantities={size_quantities}
                    routeName="intensities.update"
                />
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
