import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import { IconArrowLeft, IconDeviceFloppy, IconTarget } from "@tabler/icons-react";
import toast from "react-hot-toast";
import Table from "@/Components/Dashboard/Table";

export default function Targets({ salesPerson, targets }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        target_amount: "",
        target_quantity: "",
    });

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const submit = (e) => {
        e.preventDefault();
        post(route("sales-people.targets.store", salesPerson.id), {
            onSuccess: () => {
                toast.success("Target berhasil diperbarui");
                reset('target_amount', 'target_quantity');
            }
        });
    };

    return (
        <>
            <Head title={`Target Sales: ${salesPerson.name}`} />
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <Link
                        href={route('sales-people.index')}
                        className="flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-all"
                    >
                        <IconArrowLeft size={20} /> Kembali ke Daftar Sales
                    </Link>
                    <div className="text-right">
                        <div className="text-sm text-slate-500">Sales Person</div>
                        <div className="font-bold text-lg">{salesPerson.name}</div>
                        <div className="text-xs text-slate-400">{salesPerson.store?.name}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Input Target */}
                    <div className="lg:col-span-1">
                        <form onSubmit={submit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                            <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                                <IconTarget size={24} className="text-primary-600" />
                                <h2 className="font-bold text-lg dark:text-white">Set Target Baru</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold block mb-2 text-slate-700 dark:text-slate-300">Tahun</label>
                                    <input
                                        type="number"
                                        min="2020"
                                        max="2099"
                                        value={data.year}
                                        onChange={e => setData('year', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                    {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-2 text-slate-700 dark:text-slate-300">Bulan</label>
                                    <select
                                        value={data.month}
                                        onChange={e => setData('month', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        {months.map((m, i) => (
                                            <option key={i} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                    {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month}</p>}
                                </div>
                            </div>

                            <Input
                                label="Target Nominal (Rp)"
                                type="number"
                                min="0"
                                step="1000"
                                value={data.target_amount}
                                onChange={e => setData('target_amount', e.target.value)}
                                errors={errors.target_amount}
                                placeholder="Contoh: 50000000"
                            />

                            <Input
                                label="Target Kuantitas (Opsional)"
                                type="number"
                                min="0"
                                value={data.target_quantity}
                                onChange={e => setData('target_quantity', e.target.value)}
                                errors={errors.target_quantity}
                                placeholder="Contoh: 100 unit"
                            />

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30 disabled:opacity-50"
                            >
                                <IconDeviceFloppy size={18} />
                                {processing ? 'Menyimpan...' : 'Simpan Target'}
                            </button>

                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                Target akan di-update jika periode sudah ada
                            </p>
                        </form>
                    </div>

                    {/* Riwayat Target */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="font-bold text-lg dark:text-white">Riwayat Target Penjualan</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Target bulanan yang telah ditetapkan</p>
                            </div>

                            {targets.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-bold text-slate-600 dark:text-slate-400">Periode</th>
                                                <th className="text-right p-4 text-xs font-bold text-slate-600 dark:text-slate-400">Target Nominal</th>
                                                <th className="text-right p-4 text-xs font-bold text-slate-600 dark:text-slate-400">Target Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {targets.map((t) => (
                                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm dark:text-white">
                                                            {months[t.month - 1]} {t.year}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="font-bold text-primary-600 dark:text-primary-400">
                                                            {t.target_amount ? `Rp ${new Intl.NumberFormat('id-ID').format(t.target_amount)}` : '-'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="text-sm text-slate-600 dark:text-slate-400">
                                                            {t.target_quantity ? `${new Intl.NumberFormat('id-ID').format(t.target_quantity)} unit` : '-'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <IconTarget size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                                    <p className="text-slate-500 dark:text-slate-400">Belum ada target yang ditetapkan</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Gunakan form di samping untuk menambah target</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Targets.layout = (page) => <DashboardLayout children={page} />;
