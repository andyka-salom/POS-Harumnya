import Card from '@/Components/Dashboard/Card';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Head, router } from '@inertiajs/react';
import {
    IconTrendingUp, IconMoneybag, IconReceipt, IconChartPie, IconChartBar,
    IconBuildingStore, IconFilter, IconDownload, IconArrowUpRight, IconArrowDownRight,
    IconCash, IconDiscount2, IconPackage, IconPercentage, IconCircleDot, IconAlertTriangle,
} from '@tabler/icons-react';
import { useState, useCallback, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
    PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ReferenceLine,
} from 'recharts';

const C = { primary:'#7c3aed', success:'#16a34a', danger:'#dc2626', warning:'#d97706', info:'#2563eb' };
const PALETTE = ['#7c3aed','#2563eb','#16a34a','#d97706','#db2777','#0891b2','#ea580c','#65a30d'];

const idr = (v) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(v??0);
const compact = (v) => {
    v=v??0;
    if(v>=1_000_000_000) return `Rp${(v/1_000_000_000).toFixed(1)}M`;
    if(v>=1_000_000)     return `Rp${(v/1_000_000).toFixed(1)}Jt`;
    if(v>=1_000)         return `Rp${(v/1_000).toFixed(0)}Rb`;
    return `Rp${v}`;
};
const num = (v) => new Intl.NumberFormat('id-ID').format(v??0);
const pct = (v) => `${(v??0).toFixed(1)}%`;

const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[160px]">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">{label}</p>
            {payload.map((p,i)=>(
                <div key={i} className="flex items-center justify-between gap-4 text-xs mb-1 last:mb-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{background:p.color}}/>
                        <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
                    </div>
                    <span className="font-bold" style={{color:p.color}}>
                        {typeof p.value==='number'&&p.value>1000 ? compact(p.value) : `${num(p.value)}${p.name.includes('%')?'%':''}`}
                    </span>
                </div>
            ))}
        </div>
    );
};

function MetricCard({ label, value, sub, icon:Icon, accent=C.primary, trend, trendLabel, small=false, gradient=false }) {
    const up = trend >= 0;
    if (gradient) return (
        <Card className="relative overflow-hidden border-0 text-white" style={{background:`linear-gradient(135deg,${accent}ee,${accent}bb)`}}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className={`uppercase tracking-wider font-medium opacity-80 mb-1.5 ${small?'text-[10px]':'text-xs'}`}>{label}</p>
                    <p className={`font-bold leading-none ${small?'text-lg':'text-2xl'}`}>{value}</p>
                    {sub&&<p className="text-xs opacity-70 mt-1">{sub}</p>}
                </div>
                {Icon&&<div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Icon size={20}/></div>}
            </div>
        </Card>
    );
    return (
        <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{background:accent}}/>
            <div className="flex items-start justify-between mt-1">
                <div className="flex-1">
                    <p className={`text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium ${small?'text-[10px]':'text-xs'} mb-1.5`}>{label}</p>
                    <p className={`font-bold text-slate-900 dark:text-white leading-none ${small?'text-lg':'text-2xl'}`}>{value}</p>
                    {sub&&<p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
                </div>
                {Icon&&(
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:accent+'18'}}>
                        <Icon size={18} style={{color:accent}} strokeWidth={1.8}/>
                    </div>
                )}
            </div>
            {trend!==undefined&&(
                <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        up?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          :'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                        {up?<IconArrowUpRight size={11}/>:<IconArrowDownRight size={11}/>}
                        {Math.abs(trend)}%
                    </span>
                    {trendLabel&&<span className="text-[11px] text-slate-400">{trendLabel}</span>}
                </div>
            )}
        </Card>
    );
}

function STitle({ icon:Icon, children, sub, accent=C.primary }) {
    return (
        <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:accent+'18'}}>
                <Icon size={15} style={{color:accent}}/>
            </div>
            <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-none">{children}</h3>
                {sub&&<p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">{sub}</p>}
            </div>
        </div>
    );
}

function MarginGauge({ value, max=100 }) {
    const pct_ = Math.min((value/max)*100,100);
    const color = value>=50 ? C.success : value>=30 ? C.warning : C.danger;
    return (
        <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5"><span>0%</span><span>{max}%</span></div>
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct_}%`,background:`linear-gradient(90deg,${color}99,${color})`}}/>
            </div>
            <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-slate-400">Gross Margin</span>
                <span className="text-sm font-bold" style={{color}}>{value.toFixed(1)}%</span>
            </div>
        </div>
    );
}

const TH = ({children}) => (
    <th className="text-left py-2.5 pr-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-700">{children}</th>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function LaporanKeuangan({
    filters={}, stores=[], isSuperAdmin=false,
    summary={}, trendData=[], dailyMargin=[], byIntensity=[], bySize=[], byVariant=[],
    byPayment=[], byStore=[], discountAnalysis=[], detailTransactions=[],
}) {
    const [activeTab, setActiveTab] = useState('ringkasan');
    const [lf, setLf] = useState({
        store_id:  filters.store_id  ?? '',
        date_from: filters.date_from ?? '',
        date_to:   filters.date_to   ?? '',
        group_by:  filters.group_by  ?? 'day',
    });

    const setF = (k,v) => setLf(p=>({...p,[k]:v}));

    const apply = useCallback(() => {
        router.get(route('laporan.keuangan'), {
            store_id:  lf.store_id  || undefined,
            date_from: lf.date_from || undefined,
            date_to:   lf.date_to   || undefined,
            group_by:  lf.group_by,
        }, { preserveState:true, preserveScroll:true });
    }, [lf]);

    const TABS = [
        { key:'ringkasan', label:'Ringkasan'     },
        { key:'tren',      label:'Tren & Grafik' },
        { key:'produk',    label:'Produk'         },
        { key:'toko',      label:'Per Toko', hide:!isSuperAdmin },
        { key:'detail',    label:'Detail Transaksi' },
    ].filter(t=>!t.hide);

    const totalPaymentAmt = useMemo(() => byPayment.reduce((a,b)=>a+(b.amount??0),0), [byPayment]);

    const groupLabel = lf.group_by==='day'?'hari':lf.group_by==='week'?'minggu':'bulan';

    return (
        <>
            <Head title="Laporan Keuangan"/>
            <div className="space-y-5">

                {/* ── HEADER ──────────────────────────────────────────── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Keuangan</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {filters.date_from} — {filters.date_to}
                            {filters.store_id ? ` · ${stores.find(s=>s.id===filters.store_id)?.name??''}` : ' · Semua Toko'}
                        </p>
                    </div>
                    <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <IconDownload size={15}/>Export
                    </button>
                </div>

                {/* ── FILTER ──────────────────────────────────────────── */}
                <Card>
                    <div className="flex flex-wrap items-end gap-3">
                        {isSuperAdmin && (
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Toko</label>
                                <select value={lf.store_id} onChange={e=>setF('store_id',e.target.value)}
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option value="">Semua Toko</option>
                                    {stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Dari Tanggal</label>
                            <input type="date" value={lf.date_from} onChange={e=>setF('date_from',e.target.value)}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Sampai Tanggal</label>
                            <input type="date" value={lf.date_to} onChange={e=>setF('date_to',e.target.value)}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                        </div>
                        <div className="min-w-[120px]">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Kelompokkan</label>
                            <select value={lf.group_by} onChange={e=>setF('group_by',e.target.value)}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="day">Per Hari</option>
                                <option value="week">Per Minggu</option>
                                <option value="month">Per Bulan</option>
                            </select>
                        </div>
                        <div className="min-w-[160px]">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Preset</label>
                            <div className="flex gap-1">
                                {[{label:'Bln Ini',preset:'month'},{label:'7H',days:7},{label:'30H',days:30},{label:'90H',days:90}].map(({label,days,preset})=>(
                                    <button key={label} onClick={()=>{
                                        const to=new Date(), from=new Date();
                                        preset==='month' ? from.setDate(1) : from.setDate(from.getDate()-days);
                                        setLf(p=>({...p,date_from:from.toISOString().slice(0,10),date_to:to.toISOString().slice(0,10)}));
                                    }} className="flex-1 text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap">
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={apply} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold transition-colors">
                            <IconFilter size={15}/>Terapkan
                        </button>
                    </div>
                </Card>

                {/* ── TABS ────────────────────────────────────────────── */}
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit flex-wrap">
                    {TABS.map(t=>(
                        <button key={t.key} onClick={()=>setActiveTab(t.key)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab===t.key
                                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}>{t.label}
                        </button>
                    ))}
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* RINGKASAN                                               */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='ringkasan' && (
                    <div className="space-y-5">
                        {/* P&L waterfall KPI */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <MetricCard label="Gross Sales"   value={compact(summary.grossSales)}    sub={idr(summary.grossSales)}             icon={IconMoneybag}  accent={C.info}/>
                            <MetricCard label="Total Diskon"  value={compact(summary.totalDiscount)} sub={`Rate ${pct(summary.discountRatePct)}`} icon={IconDiscount2} accent={C.warning}/>
                            <MetricCard gradient label="Net Revenue"  value={compact(summary.totalRevenue)}  sub={idr(summary.totalRevenue)}           icon={IconCash}      accent={C.primary}/>
                            <MetricCard label="Total COGS"    value={compact(summary.totalCogs)}     sub="Bahan + Packaging"                    icon={IconPackage}   accent={C.danger}/>
                            <MetricCard gradient label="Gross Profit" value={compact(summary.grossProfit)}   sub={idr(summary.grossProfit)}            icon={IconTrendingUp} accent={C.success}/>
                            <MetricCard label="Gross Margin"  value={pct(summary.grossMarginPct)}    sub={`Markup ${pct(summary.markupPct)}`}    icon={IconPercentage}
                                accent={summary.grossMarginPct>=40?C.success:summary.grossMarginPct>=25?C.warning:C.danger}/>
                        </div>

                        {/* Op metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MetricCard small label="Total Transaksi"  value={num(summary.totalTransactions)} icon={IconReceipt}    accent={C.primary}/>
                            <MetricCard small label="Avg Order Value"  value={compact(summary.avgOrderValue)} icon={IconChartBar}   accent={C.info}/>
                            <MetricCard small label="Avg Profit / Tx"  value={compact(summary.avgProfitPerTx)} icon={IconTrendingUp} accent={C.success}/>
                            <MetricCard small label="Pelanggan Unik"   value={num(summary.uniqueCustomers)}   icon={IconCircleDot}  accent={C.warning}/>
                        </div>

                        {/* P&L Statement */}
                        <Card>
                            <STitle icon={IconChartBar} sub="Profit & Loss Statement">Laporan Laba Rugi Kotor</STitle>
                            <div className="space-y-2.5">
                                {[
                                    { label:'Gross Sales (Penjualan Kotor)',     value:summary.grossSales,    color:C.info,    sign:'+' },
                                    { label:'(-) Total Diskon',                  value:summary.totalDiscount, color:C.warning, sign:'-', indent:true },
                                    { label:'= Net Revenue (Pendapatan Bersih)', value:summary.totalRevenue,  color:C.primary, bold:true, border:true },
                                    { label:'(-) COGS (Harga Pokok Penjualan)', value:summary.totalCogs,     color:C.danger,  sign:'-', indent:true },
                                    { label:'= Gross Profit',                   value:summary.grossProfit,   color:C.success, bold:true, border:true },
                                ].map((row,i)=>(
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${row.border?'bg-slate-50 dark:bg-slate-800/80':''} ${row.indent?'pl-8':''}`}>
                                        <div className="flex items-center gap-2">
                                            {row.sign&&<span className={`text-sm font-bold w-4 ${row.sign==='+'?'text-emerald-500':'text-red-500'}`}>{row.sign}</span>}
                                            <span className={`text-sm ${row.bold?'font-bold text-slate-900 dark:text-white':'text-slate-600 dark:text-slate-400'}`}>{row.label}</span>
                                        </div>
                                        <span className={`font-bold ${row.bold?'text-base':'text-sm'}`} style={{color:row.color}}>{idr(row.value)}</span>
                                    </div>
                                ))}
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <MarginGauge value={summary.grossMarginPct??0}/>
                                </div>
                            </div>
                        </Card>

                        {/* Payment + Discount */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <STitle icon={IconCash} sub="Metode pembayaran">Breakdown Pembayaran</STitle>
                                {byPayment.length>0 ? (
                                    <>
                                        <div className="space-y-3 mb-4">
                                            {byPayment.map((p,i)=>{
                                                const share = totalPaymentAmt>0 ? ((p.amount/totalPaymentAmt)*100).toFixed(1) : 0;
                                                return (
                                                    <div key={i}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full" style={{background:PALETTE[i]}}/>
                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                                                                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{p.type}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{compact(p.amount)}</p>
                                                                <p className="text-[10px] text-slate-400">{p.transactions} tx · {share}%</p>
                                                            </div>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{width:`${share}%`,background:PALETTE[i]}}/>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <ResponsiveContainer width="100%" height={140}>
                                            <PieChart>
                                                <Pie data={byPayment} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3}>
                                                    {byPayment.map((_,i)=><Cell key={i} fill={PALETTE[i]} stroke="none"/>)}
                                                </Pie>
                                                <Tooltip content={<ChartTip/>}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </>
                                ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>}
                            </Card>

                            <Card>
                                <STitle icon={IconDiscount2} sub="Analisis penggunaan promo" accent={C.warning}>Analisis Diskon</STitle>
                                {discountAnalysis.length>0 ? (
                                    <div className="space-y-3">
                                        {discountAnalysis.map((d,i)=>(
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{d.category}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-medium">{d.type}</span>
                                                        <span className="text-xs text-slate-400">{d.usage_count} kali</span>
                                                    </div>
                                                </div>
                                                <p className="text-base font-bold text-amber-600 dark:text-amber-400">{compact(d.total_amount)}</p>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total Diskon</span>
                                            <span className="text-base font-bold text-amber-600 dark:text-amber-400">{compact(summary.totalDiscount)}</span>
                                        </div>
                                    </div>
                                ) : <p className="text-sm text-slate-400 text-center py-8">Tidak ada diskon dalam periode ini</p>}
                            </Card>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* TREN & GRAFIK                                           */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='tren' && (
                    <div className="space-y-5">
                        <Card>
                            <STitle icon={IconTrendingUp} sub={`Dikelompokkan per ${groupLabel}`}>Tren Revenue, Profit & COGS</STitle>
                            <ResponsiveContainer width="100%" height={260}>
                                <ComposedChart data={trendData}>
                                    <defs>
                                        {[['aRev',C.primary],['aPro',C.success]].map(([id,color])=>(
                                            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={color} stopOpacity={0.18}/>
                                                <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700"/>
                                    <XAxis dataKey="label" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis yAxisId="left"  tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis yAxisId="right" orientation="right" tickFormatter={v=>`${v}%`} tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false} domain={[0,100]}/>
                                    <Tooltip content={<ChartTip/>}/>
                                    <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                    <Area yAxisId="left"  type="monotone" dataKey="revenue"      name="Revenue"      stroke={C.primary} strokeWidth={2.5} fill="url(#aRev)" dot={false}/>
                                    <Area yAxisId="left"  type="monotone" dataKey="gross_profit" name="Gross Profit" stroke={C.success} strokeWidth={2}   fill="url(#aPro)" dot={false}/>
                                    <Line yAxisId="left"  type="monotone" dataKey="cogs"         name="COGS"         stroke={C.danger}  strokeWidth={1.5} dot={false} strokeDasharray="4 3"/>
                                    <Line yAxisId="right" type="monotone" dataKey="margin_pct"   name="Margin %"     stroke={C.warning} strokeWidth={2}   dot={false} strokeDasharray="2 2"/>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <STitle icon={IconPercentage} sub="Fluktuasi margin" accent={C.warning}>Tren Margin (%)</STitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={dailyMargin}>
                                        <defs>
                                            <linearGradient id="aMargin" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={C.warning} stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor={C.warning} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700"/>
                                        <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                                        <YAxis domain={[0,80]} tickFormatter={v=>`${v}%`} tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <Tooltip content={<ChartTip/>}/>
                                        <ReferenceLine y={summary.grossMarginPct} stroke={C.primary} strokeDasharray="4 4"
                                            label={{value:`Avg ${pct(summary.grossMarginPct)}`,fill:C.primary,fontSize:10,position:'right'}}/>
                                        <Area type="monotone" dataKey="margin_pct" name="Margin %" stroke={C.warning} strokeWidth={2} fill="url(#aMargin)" dot={false}/>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Card>

                            <Card>
                                <STitle icon={IconChartBar} sub="Revenue vs Transaksi" accent={C.info}>Volume Transaksi</STitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <ComposedChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700"/>
                                        <XAxis dataKey="label" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <YAxis yAxisId="bar"  tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <YAxis yAxisId="line" orientation="right" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <Tooltip content={<ChartTip/>}/>
                                        <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                        <Bar  yAxisId="bar"  dataKey="transactions" name="Transaksi" fill={C.info}    radius={[3,3,0,0]} fillOpacity={0.7}/>
                                        <Line yAxisId="line" type="monotone" dataKey="avg_order" name="Avg Order" stroke={C.primary} strokeWidth={2} dot={false}/>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>

                        <Card>
                            <STitle icon={IconDiscount2} sub="Diskon vs Revenue" accent={C.warning}>Tren Diskon</STitle>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={trendData} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                    <XAxis dataKey="label" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                    <YAxis tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                    <Tooltip content={<ChartTip/>}/>
                                    <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                    <Bar dataKey="revenue"  name="Revenue" fill={C.primary} fillOpacity={0.7} radius={[3,3,0,0]}/>
                                    <Bar dataKey="discount" name="Diskon"  fill={C.warning} fillOpacity={0.85} radius={[3,3,0,0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* PRODUK                                                  */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='produk' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Intensity table */}
                            <Card>
                                <STitle icon={IconChartPie} sub="Kontribusi per konsentrasi">Keuangan by Intensity</STitle>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr>{['Intensity','Qty','Revenue','COGS','Gross Profit','Margin'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                        <tbody>
                                            {byIntensity.length>0 ? byIntensity.map((r,i)=>(
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="py-2.5 pr-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-sm" style={{background:PALETTE[i]}}/>
                                                            <span className="font-bold text-slate-900 dark:text-white">{r.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-400">{num(r.qty)}</td>
                                                    <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-white">{compact(r.revenue)}</td>
                                                    <td className="py-2.5 pr-3 text-red-600 dark:text-red-400">{compact(r.cogs)}</td>
                                                    <td className="py-2.5 pr-3 font-bold text-emerald-600 dark:text-emerald-400">{compact(r.gross_profit)}</td>
                                                    <td className="py-2.5 pr-3">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                            r.margin_pct>=50?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':
                                                            r.margin_pct>=30?'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400':
                                                                             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>{pct(r.margin_pct)}</span>
                                                    </td>
                                                </tr>
                                            )) : <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada data</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                                {byIntensity.length>0&&(
                                    <ResponsiveContainer width="100%" height={140} className="mt-4">
                                        <BarChart data={byIntensity} barSize={36}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                            <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                            <YAxis hide/>
                                            <Tooltip content={<ChartTip/>}/>
                                            <Bar dataKey="revenue"      name="Revenue"      radius={[4,4,0,0]}>{byIntensity.map((_,i)=><Cell key={i} fill={PALETTE[i]}/>)}</Bar>
                                            <Bar dataKey="gross_profit" name="Gross Profit" radius={[4,4,0,0]}>{byIntensity.map((_,i)=><Cell key={i} fill={C.success} fillOpacity={0.7}/>)}</Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Card>

                            {/* Size table */}
                            <Card>
                                <STitle icon={IconChartBar} sub="Per ukuran botol" accent={C.info}>Keuangan by Ukuran</STitle>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr>{['Ukuran','Qty','Revenue','COGS','Gross Profit','Margin'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                        <tbody>
                                            {bySize.length>0 ? bySize.map((r,i)=>(
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="py-2.5 pr-3 font-bold text-slate-900 dark:text-white">{r.name}</td>
                                                    <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-400">{num(r.qty)}</td>
                                                    <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-white">{compact(r.revenue)}</td>
                                                    <td className="py-2.5 pr-3 text-red-600 dark:text-red-400">{compact(r.cogs)}</td>
                                                    <td className="py-2.5 pr-3 font-bold text-emerald-600 dark:text-emerald-400">{compact(r.gross_profit)}</td>
                                                    <td className="py-2.5 pr-3">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                            r.margin_pct>=50?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':
                                                            r.margin_pct>=30?'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400':
                                                                             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>{pct(r.margin_pct)}</span>
                                                    </td>
                                                </tr>
                                            )) : <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada data</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>

                        {/* Top variants */}
                        <Card>
                            <STitle icon={IconTrendingUp} sub="10 varian profit tertinggi" accent={C.success}>Top Varian by Gross Profit</STitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr>{['#','Varian','Gender','Qty','Revenue','COGS','Gross Profit','Margin'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                    <tbody>
                                        {byVariant.length>0 ? byVariant.map((r,i)=>(
                                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-2.5 pr-3 text-slate-400 font-mono text-xs">{i+1}</td>
                                                <td className="py-2.5 pr-3 font-bold text-slate-900 dark:text-white">{r.name}</td>
                                                <td className="py-2.5 pr-3"><span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{r.gender}</span></td>
                                                <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-400">{num(r.qty)}</td>
                                                <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-white">{compact(r.revenue)}</td>
                                                <td className="py-2.5 pr-3 text-red-600 dark:text-red-400">{compact(r.cogs)}</td>
                                                <td className="py-2.5 pr-3 font-bold text-emerald-600 dark:text-emerald-400">{compact(r.gross_profit)}</td>
                                                <td className="py-2.5 pr-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{width:`${Math.min(r.margin_pct,100)}%`,background:r.margin_pct>=50?C.success:r.margin_pct>=30?C.warning:C.danger}}/>
                                                        </div>
                                                        <span className={`text-xs font-bold ${r.margin_pct>=50?'text-emerald-600 dark:text-emerald-400':r.margin_pct>=30?'text-amber-600 dark:text-amber-400':'text-red-600 dark:text-red-400'}`}>{pct(r.margin_pct)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan={8} className="py-8 text-center text-slate-400">Belum ada data</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* PER TOKO                                                */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='toko' && isSuperAdmin && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {byStore.map((s,i)=>(
                                <Card key={i} className="relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:PALETTE[i%PALETTE.length]}}/>
                                    <div className="flex items-center justify-between mt-1 mb-2">
                                        <IconBuildingStore size={16} className="text-slate-400"/>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${i===0?'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400':'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>#{i+1}</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{s.name}</p>
                                    <p className="text-lg font-bold mb-0.5" style={{color:PALETTE[i%PALETTE.length]}}>{compact(s.gross_profit)}</p>
                                    <p className="text-xs text-slate-400">Profit · Margin {pct(s.margin_pct)}</p>
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs text-slate-400">
                                        <span>{compact(s.revenue)}</span>
                                        <span>{num(s.transactions)} tx</span>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <Card>
                            <STitle icon={IconBuildingStore} sub="Revenue, COGS & Profit per toko">Perbandingan Keuangan Toko</STitle>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={byStore} barGap={4} barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                    <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <Tooltip content={<ChartTip/>}/>
                                    <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                    <Bar dataKey="revenue"      name="Revenue"      fill={C.primary} radius={[4,4,0,0]} fillOpacity={0.8}/>
                                    <Bar dataKey="cogs"         name="COGS"         fill={C.danger}  radius={[4,4,0,0]} fillOpacity={0.75}/>
                                    <Bar dataKey="gross_profit" name="Gross Profit" fill={C.success} radius={[4,4,0,0]} fillOpacity={0.85}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Store detail table */}
                        <Card>
                            <STitle icon={IconChartBar} sub="Tabel lengkap">Detail Keuangan per Toko</STitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr>{['#','Toko','Kode','Transaksi','Gross Sales','Diskon','Revenue','COGS','Gross Profit','Margin','AOV'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                    <tbody>
                                        {byStore.map((s,i)=>(
                                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-3 pr-3 text-lg">{'🥇🥈🥉🏅🏅🏅🏅🏅'[i]??'🏅'}</td>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{s.name}</td>
                                                <td className="py-3 pr-3 font-mono text-xs text-slate-400">{s.code}</td>
                                                <td className="py-3 pr-3 text-slate-600 dark:text-slate-400">{num(s.transactions)}</td>
                                                <td className="py-3 pr-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{compact(s.revenue+(s.discount??0))}</td>
                                                <td className="py-3 pr-3 text-amber-600 dark:text-amber-400 whitespace-nowrap">{compact(s.discount)}</td>
                                                <td className="py-3 pr-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{compact(s.revenue)}</td>
                                                <td className="py-3 pr-3 text-red-600 dark:text-red-400 whitespace-nowrap">{compact(s.cogs)}</td>
                                                <td className="py-3 pr-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{compact(s.gross_profit)}</td>
                                                <td className="py-3 pr-3">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        s.margin_pct>=50?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':
                                                        s.margin_pct>=30?'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400':
                                                                         'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>{pct(s.margin_pct)}</span>
                                                </td>
                                                <td className="py-3 pr-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{compact(s.avg_order)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {byStore.length>1&&(
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={3} className="py-3 pr-3 font-bold text-slate-700 dark:text-slate-300">TOTAL</td>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white">{num(byStore.reduce((a,b)=>a+b.transactions,0))}</td>
                                                <td colSpan={2}/>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{compact(byStore.reduce((a,b)=>a+b.revenue,0))}</td>
                                                <td className="py-3 pr-3 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{compact(byStore.reduce((a,b)=>a+(b.cogs??0),0))}</td>
                                                <td className="py-3 pr-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{compact(byStore.reduce((a,b)=>a+b.gross_profit,0))}</td>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white">{pct(summary.grossMarginPct)}</td>
                                                <td/>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* DETAIL TRANSAKSI                                        */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='detail' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MetricCard small label="Ditampilkan"      value={`${detailTransactions.length} tx`}                                         icon={IconReceipt}    accent={C.info}/>
                            <MetricCard small label="Total Revenue"    value={compact(detailTransactions.reduce((a,b)=>a+(b.revenue??b.total??0),0))}    icon={IconCash}       accent={C.primary}/>
                            <MetricCard small label="Total Gross Profit" value={compact(detailTransactions.reduce((a,b)=>a+(b.gross_profit??0),0))}       icon={IconTrendingUp} accent={C.success}/>
                            <MetricCard small label="Total Diskon"     value={compact(detailTransactions.reduce((a,b)=>a+(b.discount??0),0))}            icon={IconDiscount2}  accent={C.warning}/>
                        </div>

                        {detailTransactions.length>0 ? (
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <STitle icon={IconReceipt} sub="50 transaksi terbaru">Detail Transaksi</STitle>
                                    {detailTransactions.length>=50&&(
                                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                                            <IconAlertTriangle size={13}/>Menampilkan 50 teratas
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr>{['Invoice','Tanggal','Waktu','Toko','Pelanggan','Kasir','Gross Sales','Diskon','Revenue','COGS','Gross Profit','Margin'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                        <tbody>
                                            {detailTransactions.map((tx,i)=>(
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-2.5 pr-3 font-mono text-xs font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">{tx.invoice}</td>
                                                    <td className="py-2.5 pr-3 text-xs text-slate-500 whitespace-nowrap">{tx.date}</td>
                                                    <td className="py-2.5 pr-3 text-xs text-slate-400">{tx.time}</td>
                                                    <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{tx.store}</td>
                                                    <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-white">{tx.customer}</td>
                                                    <td className="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{tx.cashier}</td>
                                                    <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{compact(tx.gross_sales)}</td>
                                                    <td className="py-2.5 pr-3 text-amber-600 dark:text-amber-400 whitespace-nowrap">{tx.discount>0?`-${compact(tx.discount)}`:'—'}</td>
                                                    <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{compact(tx.revenue??tx.total)}</td>
                                                    <td className="py-2.5 pr-3 text-red-600 dark:text-red-400 whitespace-nowrap">{compact(tx.cogs)}</td>
                                                    <td className="py-2.5 pr-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{compact(tx.gross_profit)}</td>
                                                    <td className="py-2.5 pr-3">
                                                        <span className={`text-xs font-bold ${tx.margin_pct>=50?'text-emerald-600 dark:text-emerald-400':tx.margin_pct>=30?'text-amber-600 dark:text-amber-400':'text-red-600 dark:text-red-400'}`}>
                                                            {pct(tx.margin_pct)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={6} className="py-3 pr-3 font-bold text-slate-700 dark:text-slate-300 text-xs">SUBTOTAL ({detailTransactions.length} transaksi)</td>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{compact(detailTransactions.reduce((a,b)=>a+(b.gross_sales??0),0))}</td>
                                                <td className="py-3 pr-3 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">-{compact(detailTransactions.reduce((a,b)=>a+(b.discount??0),0))}</td>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{compact(detailTransactions.reduce((a,b)=>a+(b.revenue??b.total??0),0))}</td>
                                                <td className="py-3 pr-3 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{compact(detailTransactions.reduce((a,b)=>a+(b.cogs??0),0))}</td>
                                                <td className="py-3 pr-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{compact(detailTransactions.reduce((a,b)=>a+(b.gross_profit??0),0))}</td>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white">{pct(summary.grossMarginPct)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </Card>
                        ) : (
                            <Card>
                                <div className="text-center py-16">
                                    <IconReceipt size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3"/>
                                    <p className="text-slate-500 dark:text-slate-400">Tidak ada transaksi dalam periode dan filter yang dipilih</p>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

LaporanKeuangan.layout = (page) => <DashboardLayout children={page}/>;
