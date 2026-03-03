import Card from '@/Components/Dashboard/Card';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Head, router } from '@inertiajs/react';
import {
    IconShoppingCart, IconUsers, IconBuildingStore, IconChartBar, IconChartPie,
    IconTrendingUp, IconFilter, IconDownload, IconPackage, IconClock, IconReceipt,
    IconAlertTriangle, IconStar, IconUserCheck, IconGenderBigender, IconCash,
    IconDiscount2, IconArrowDownRight,
} from '@tabler/icons-react';
import { useState, useCallback, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, ComposedChart, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line,
} from 'recharts';

const C = { primary:'#7c3aed', success:'#16a34a', danger:'#dc2626', warning:'#d97706', info:'#2563eb', pink:'#db2777' };
const PALETTE = ['#7c3aed','#2563eb','#16a34a','#d97706','#db2777','#0891b2','#ea580c','#65a30d'];

const idr = (v) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(v??0);
const compact = (v) => { v=v??0; if(v>=1_000_000_000) return `Rp${(v/1_000_000_000).toFixed(1)}M`; if(v>=1_000_000) return `Rp${(v/1_000_000).toFixed(1)}Jt`; if(v>=1_000) return `Rp${(v/1_000).toFixed(0)}Rb`; return `Rp${v}`; };
const num = (v) => new Intl.NumberFormat('id-ID').format(v??0);
const pct = (v) => `${(v??0).toFixed(1)}%`;

const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[150px]">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">{label}</p>
            {payload.map((p,i)=>(
                <div key={i} className="flex items-center justify-between gap-4 text-xs mb-1 last:mb-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{background:p.color}}/>
                        <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
                    </div>
                    <span className="font-bold" style={{color:p.color}}>{typeof p.value==='number'&&p.value>1000?compact(p.value):num(p.value)}</span>
                </div>
            ))}
        </div>
    );
};

function KpiCard({ label, value, sub, icon:Icon, accent=C.primary, small=false }) {
    return (
        <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{background:accent}}/>
            <div className="flex items-start justify-between mt-1">
                <div className="flex-1">
                    <p className={`text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1.5 ${small?'text-[10px]':'text-xs'}`}>{label}</p>
                    <p className={`font-bold text-slate-900 dark:text-white leading-none ${small?'text-lg':'text-2xl'}`}>{value}</p>
                    {sub&&<p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
                </div>
                {Icon&&(
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:accent+'18'}}>
                        <Icon size={18} style={{color:accent}} strokeWidth={1.8}/>
                    </div>
                )}
            </div>
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

function StatusBadge({ status }) {
    const cfg = {
        completed:{ label:'✓ Selesai', cls:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        cancelled: { label:'✕ Batal',  cls:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'                 },
        refunded:  { label:'↩ Refund', cls:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'         },
    }[status]??{ label:status, cls:'bg-slate-100 text-slate-600' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
}

function TierBadge({ tier }) {
    if (!tier) return null;
    const cls = {
        platinum:'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        gold:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        silver:  'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        bronze:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    }[tier]??'bg-slate-100 text-slate-500';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${cls}`}>{tier}</span>;
}

const TH = ({children}) => <th className="text-left py-2.5 pr-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-700">{children}</th>;
const TD = ({children, cls=''}) => <td className={`py-2.5 pr-3 border-b border-slate-100 dark:border-slate-800 ${cls}`}>{children}</td>;

// ═══════════════════════════════════════════════════════════════════════════════
export default function LaporanPenjualan({
    filters={}, stores=[], isSuperAdmin=false,
    summary={}, trendData=[], byIntensity=[], bySize=[], byGender=[],
    byVariant=[], topCustomers=[], byCashier=[], byStore=[], bySalesPerson=[],
    topPackaging=[], hourlyData=[], memberTrend=[], recentTransactions=[],
}) {
    const [activeTab, setActiveTab] = useState('ringkasan');
    const [lf, setLf] = useState({
        store_id:  filters.store_id  ?? '',
        date_from: filters.date_from ?? '',
        date_to:   filters.date_to   ?? '',
        group_by:  filters.group_by  ?? 'day',
        status:    filters.status    ?? 'completed',
    });
    const setF = (k,v) => setLf(p=>({...p,[k]:v}));

    const apply = useCallback(() => {
        router.get(route('laporan.penjualan'), {
            store_id:  lf.store_id  || undefined,
            date_from: lf.date_from || undefined,
            date_to:   lf.date_to   || undefined,
            group_by:  lf.group_by,
            status:    lf.status,
        }, { preserveState:true, preserveScroll:true });
    }, [lf]);

    const TABS = [
        { key:'ringkasan', label:'Ringkasan'       },
        { key:'tren',      label:'Tren Penjualan'  },
        { key:'produk',    label:'Produk'           },
        { key:'pelanggan', label:'Pelanggan'        },
        { key:'tim',       label:'Tim & Kasir'      },
        { key:'toko',      label:'Per Toko', hide:!isSuperAdmin },
        { key:'detail',    label:'Detail Transaksi' },
    ].filter(t=>!t.hide);

    const peakHour = useMemo(() => hourlyData.reduce((a,b)=>b.transactions>a.transactions?b:a, hourlyData[0]??{}), [hourlyData]);
    const maxHourTx = useMemo(() => Math.max(...hourlyData.map(h=>h.transactions), 1), [hourlyData]);
    const groupLabel = lf.group_by==='day'?'hari':lf.group_by==='week'?'minggu':'bulan';

    return (
        <>
            <Head title="Laporan Penjualan"/>
            <div className="space-y-5">

                {/* ── HEADER ──────────────────────────────────────────── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Penjualan</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {filters.date_from} — {filters.date_to}
                            {filters.store_id ? ` · ${stores.find(s=>String(s.id)===String(filters.store_id))?.name??''}` : ' · Semua Toko'}
                        </p>
                    </div>
                    <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <IconDownload size={15}/>Export
                    </button>
                </div>

                {/* ── FILTER ──────────────────────────────────────────── */}
                <Card>
                    <div className="flex flex-wrap items-end gap-3">
                        {isSuperAdmin&&(
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Toko</label>
                                <select value={lf.store_id} onChange={e=>setF('store_id',e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option value="">Semua Toko</option>
                                    {stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Dari</label>
                            <input type="date" value={lf.date_from} onChange={e=>setF('date_from',e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Sampai</label>
                            <input type="date" value={lf.date_to} onChange={e=>setF('date_to',e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                        </div>
                        <div className="min-w-[120px]">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Kelompokkan</label>
                            <select value={lf.group_by} onChange={e=>setF('group_by',e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="day">Per Hari</option>
                                <option value="week">Per Minggu</option>
                                <option value="month">Per Bulan</option>
                            </select>
                        </div>
                        <div className="min-w-[110px]">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
                            <select value={lf.status} onChange={e=>setF('status',e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="completed">Selesai</option>
                                <option value="cancelled">Batal</option>
                                <option value="refunded">Refund</option>
                                <option value="all">Semua</option>
                            </select>
                        </div>
                        <div className="min-w-[150px]">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Preset</label>
                            <div className="flex gap-1">
                                {[{label:'Bln',preset:'month'},{label:'7H',days:7},{label:'30H',days:30},{label:'90H',days:90}].map(({label,days,preset})=>(
                                    <button key={label} onClick={()=>{
                                        const to=new Date(), from=new Date();
                                        preset==='month'?from.setDate(1):from.setDate(from.getDate()-days);
                                        setLf(p=>({...p,date_from:from.toISOString().slice(0,10),date_to:to.toISOString().slice(0,10)}));
                                    }} className="flex-1 text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{label}</button>
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
                                activeTab===t.key?'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm':'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}>{t.label}
                        </button>
                    ))}
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* RINGKASAN                                               */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='ringkasan' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <KpiCard label="Total Transaksi"    value={num(summary.totalTransactions)}   sub={`${pct(summary.completionRate)} selesai`} icon={IconReceipt}   accent={C.primary}/>
                            <KpiCard label="Total Revenue"      value={compact(summary.totalRevenue)}    sub={idr(summary.totalRevenue)}                icon={IconCash}      accent={C.success}/>
                            <KpiCard label="Item Terjual"       value={num(summary.totalItemsSold)}      sub="Total unit"                               icon={IconPackage}   accent={C.info}/>
                            <KpiCard label="Avg Order Value"    value={compact(summary.avgOrderValue)}   sub="Per transaksi"                            icon={IconChartBar}  accent={C.primary}/>
                            <KpiCard label="Total Diskon"       value={compact(summary.totalDiscount)}   sub={`Dari ${compact(summary.grossSales)}`}    icon={IconDiscount2} accent={C.warning}/>
                            <KpiCard label="Pelanggan Unik"     value={num(summary.uniqueCustomers)}     sub={`${pct(summary.memberRate)} member`}      icon={IconUsers}     accent={C.pink}/>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <KpiCard small label="Selesai"  value={num(summary.completedCount)} sub={pct(summary.completionRate)}     icon={IconReceipt}       accent={C.success}/>
                            <KpiCard small label="Dibatalkan" value={num(summary.cancelledCount)} sub="Dari total transaksi"          icon={IconAlertTriangle} accent={C.danger}/>
                            <KpiCard small label="Refund"   value={num(summary.refundedCount)}  sub="Dari total transaksi"            icon={IconArrowDownRight} accent={C.warning}/>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Member vs Walk-in */}
                            <Card>
                                <STitle icon={IconUserCheck} sub="Tipe pelanggan">Member vs Walk-in</STitle>
                                <div className="space-y-4">
                                    {[
                                        { label:'Member',  v:summary.memberTx, pct_:summary.memberRate,       color:C.primary },
                                        { label:'Walk-in', v:summary.walkinTx, pct_:100-(summary.memberRate??0), color:C.info  },
                                    ].map(({label,v,pct_,color})=>(
                                        <div key={label}>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                                                <div className="text-right">
                                                    <span className="text-sm font-bold" style={{color}}>{num(v)}</span>
                                                    <span className="text-xs text-slate-400 ml-1.5">{pct(pct_)}</span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{width:`${pct_??0}%`,background:color}}/>
                                            </div>
                                        </div>
                                    ))}
                                    <ResponsiveContainer width="100%" height={120} className="mt-2">
                                        <PieChart>
                                            <Pie data={[{name:'Member',value:summary.memberTx??0},{name:'Walk-in',value:summary.walkinTx??0}]}
                                                dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3}>
                                                <Cell fill={C.primary} stroke="none"/>
                                                <Cell fill={C.info}    stroke="none"/>
                                            </Pie>
                                            <Tooltip content={<ChartTip/>}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* Intensity */}
                            <Card>
                                <STitle icon={IconChartPie} sub="Distribusi konsentrasi">By Intensity</STitle>
                                <ResponsiveContainer width="100%" height={130}>
                                    <PieChart>
                                        <Pie data={byIntensity} dataKey="qty" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={54} paddingAngle={3}>
                                            {byIntensity.map((_,i)=><Cell key={i} fill={PALETTE[i]} stroke="none"/>)}
                                        </Pie>
                                        <Tooltip content={<ChartTip/>}/>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2 mt-2">
                                    {byIntensity.map((r,i)=>(
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-sm" style={{background:PALETTE[i]}}/>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.name}</span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold" style={{color:PALETTE[i]}}>{num(r.qty)}</span>
                                                <span className="text-xs text-slate-400 ml-1.5">{r.pct}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Gender */}
                            <Card>
                                <STitle icon={IconGenderBigender} sub="Per gender" accent={C.pink}>By Gender</STitle>
                                <ResponsiveContainer width="100%" height={130}>
                                    <PieChart>
                                        <Pie data={byGender} dataKey="qty" nameKey="gender" cx="50%" cy="50%" innerRadius={32} outerRadius={54} paddingAngle={3}>
                                            {byGender.map((_,i)=><Cell key={i} fill={[C.info,C.pink,'#10b981'][i]??PALETTE[i]} stroke="none"/>)}
                                        </Pie>
                                        <Tooltip content={<ChartTip/>}/>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2 mt-2">
                                    {byGender.map((r,i)=>{
                                        const totalQty=byGender.reduce((a,b)=>a+b.qty,0);
                                        const gPct=totalQty>0?((r.qty/totalQty)*100).toFixed(1):0;
                                        const colors=[C.info,C.pink,'#10b981'];
                                        return (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-sm" style={{background:colors[i]??PALETTE[i]}}/>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.gender}</span>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold" style={{color:colors[i]??PALETTE[i]}}>{num(r.qty)}</span>
                                                    <span className="text-xs text-slate-400 ml-1.5">{gPct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>

                        {/* Hourly heatmap */}
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <STitle icon={IconClock} sub="Distribusi jam transaksi">Penjualan per Jam</STitle>
                                {peakHour?.label&&(
                                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Peak: <strong>{peakHour.label}</strong></span>
                                        <span className="text-xs text-slate-400">({peakHour.transactions} tx)</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-end gap-1 h-24">
                                {hourlyData.map((h,i)=>{
                                    const hPct=maxHourTx>0?(h.transactions/maxHourTx)*100:0;
                                    const isActive=h.transactions>0;
                                    const isPeak=h.hour===peakHour?.hour;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div className="w-full flex items-end" style={{height:72}}>
                                                <div title={`${h.label}: ${h.transactions} tx`} className="w-full rounded-t transition-all cursor-default"
                                                    style={{height:`${Math.max(hPct,isActive?8:2)}%`,background:isPeak?C.warning:isActive?C.primary:'#e2e8f0',opacity:isActive?1:0.4}}/>
                                            </div>
                                            <span className={`text-[9px] ${i%2===0?'text-slate-400':'text-transparent'}`}>{h.label?.slice(0,5)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{background:C.primary}}/> Aktif</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{background:C.warning}}/> Peak</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-200"/> Tidak ada</div>
                            </div>
                        </Card>

                        {/* By size */}
                        <Card>
                            <STitle icon={IconPackage} sub="Per ukuran botol" accent={C.info}>Breakdown Ukuran</STitle>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    {bySize.map((r,i)=>{
                                        const maxQty=Math.max(...bySize.map(s=>s.qty),1);
                                        return (
                                            <div key={i}>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-sm" style={{background:PALETTE[i]}}/>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold" style={{color:PALETTE[i]}}>{num(r.qty)} unit</span>
                                                        <span className="text-xs text-slate-400 ml-2">{compact(r.revenue)}</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{width:`${(r.qty/maxQty)*100}%`,background:PALETTE[i]}}/>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={bySize} barSize={32}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                        <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                        <YAxis hide/>
                                        <Tooltip content={<ChartTip/>}/>
                                        <Bar dataKey="qty" name="Qty" radius={[5,5,0,0]}>{bySize.map((_,i)=><Cell key={i} fill={PALETTE[i]}/>)}</Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* TREN PENJUALAN                                          */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='tren' && (
                    <div className="space-y-5">
                        <Card>
                            <STitle icon={IconTrendingUp} sub={`Per ${groupLabel}`}>Tren Transaksi & Revenue</STitle>
                            <ResponsiveContainer width="100%" height={260}>
                                <ComposedChart data={trendData}>
                                    <defs>
                                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={C.primary} stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor={C.primary} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700"/>
                                    <XAxis dataKey="label" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis yAxisId="rev" tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis yAxisId="tx"  orientation="right" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <Tooltip content={<ChartTip/>}/>
                                    <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                    <Area  yAxisId="rev" type="monotone" dataKey="revenue"      name="Revenue"    stroke={C.primary} strokeWidth={2.5} fill="url(#gRev)" dot={false}/>
                                    <Bar   yAxisId="tx"  dataKey="transactions" name="Transaksi" fill={C.info}    radius={[3,3,0,0]} fillOpacity={0.6}/>
                                    <Line  yAxisId="rev" type="monotone" dataKey="avg_order"    name="Avg Order"  stroke={C.warning} strokeWidth={2}   dot={false} strokeDasharray="4 3"/>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <STitle icon={IconUserCheck} sub="Member vs Walk-in per periode" accent={C.pink}>Tren Member vs Walk-in</STitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={memberTrend} barGap={2} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                        <XAxis dataKey="label" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <YAxis tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <Tooltip content={<ChartTip/>}/>
                                        <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                        <Bar dataKey="member" name="Member"  fill={C.primary} radius={[3,3,0,0]} fillOpacity={0.85}/>
                                        <Bar dataKey="walkin" name="Walk-in" fill={C.info}    radius={[3,3,0,0]} fillOpacity={0.7}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>

                            <Card>
                                <STitle icon={IconDiscount2} sub="Diskon vs Revenue" accent={C.warning}>Tren Diskon</STitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <ComposedChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                        <XAxis dataKey="label" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <YAxis tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <Tooltip content={<ChartTip/>}/>
                                        <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                        <Bar  dataKey="revenue"  name="Revenue" fill={C.primary} radius={[3,3,0,0]} fillOpacity={0.7}/>
                                        <Line dataKey="discount" name="Diskon"  stroke={C.warning} strokeWidth={2} dot={false}/>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* PRODUK                                                  */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='produk' && (
                    <div className="space-y-5">
                        <Card>
                            <STitle icon={IconChartBar} sub="15 varian paling banyak terjual">Top Varian by Qty</STitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr>{['#','Varian','Gender','Qty','Revenue','Avg Harga','Transaksi'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                    <tbody>
                                        {byVariant.length>0 ? byVariant.map((r,i)=>(
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <TD><span className="text-slate-400 font-mono text-xs">{i+1}</span></TD>
                                                <TD><span className="font-bold text-slate-900 dark:text-white">{r.name}</span></TD>
                                                <TD><span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{r.gender}</span></TD>
                                                <TD>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{width:`${(r.qty/Math.max(byVariant[0]?.qty??1,1))*100}%`,background:PALETTE[i%PALETTE.length]}}/>
                                                        </div>
                                                        <span className="font-bold" style={{color:PALETTE[i%PALETTE.length]}}>{num(r.qty)}</span>
                                                    </div>
                                                </TD>
                                                <TD><span className="font-semibold text-slate-900 dark:text-white">{compact(r.revenue)}</span></TD>
                                                <TD><span className="text-slate-500 dark:text-slate-400">{compact(r.avg_price)}</span></TD>
                                                <TD><span className="text-slate-500 dark:text-slate-400">{num(r.tx_count)}</span></TD>
                                            </tr>
                                        )) : <tr><td colSpan={7} className="py-8 text-center text-slate-400">Belum ada data</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            {byVariant.length>0&&(
                                <ResponsiveContainer width="100%" height={180} className="mt-4">
                                    <BarChart data={byVariant.slice(0,10)} layout="vertical" barSize={12}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} className="dark:stroke-slate-700"/>
                                        <XAxis type="number" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <YAxis type="category" dataKey="name" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} width={110}/>
                                        <Tooltip content={<ChartTip/>}/>
                                        <Bar dataKey="qty" name="Qty" radius={[0,5,5,0]}>{byVariant.slice(0,10).map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <STitle icon={IconChartPie} sub="Per intensitas">By Intensity</STitle>
                                <table className="w-full text-sm">
                                    <thead><tr>{['Intensity','Qty','Revenue','Transaksi','Share'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                    <tbody>
                                        {byIntensity.map((r,i)=>(
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <TD>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-sm" style={{background:PALETTE[i]}}/>
                                                        <span className="font-bold text-slate-900 dark:text-white">{r.name}</span>
                                                    </div>
                                                </TD>
                                                <TD><span className="font-bold" style={{color:PALETTE[i]}}>{num(r.qty)}</span></TD>
                                                <TD><span className="text-slate-700 dark:text-slate-300">{compact(r.revenue)}</span></TD>
                                                <TD><span className="text-slate-500">{num(r.tx_count)}</span></TD>
                                                <TD>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{width:`${r.pct}%`,background:PALETTE[i]}}/>
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-500">{r.pct}%</span>
                                                    </div>
                                                </TD>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>

                            <Card>
                                <STitle icon={IconPackage} sub="Top 10 packaging add-on" accent={C.info}>Packaging Terlaris</STitle>
                                {topPackaging.length>0 ? (
                                    <table className="w-full text-sm">
                                        <thead><tr>{['#','Packaging','Kode','Qty','Revenue'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                        <tbody>
                                            {topPackaging.map((p,i)=>(
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <TD><span className="text-slate-400 font-mono text-xs">{i+1}</span></TD>
                                                    <TD><span className="font-medium text-slate-900 dark:text-white">{p.name}</span></TD>
                                                    <TD><span className="font-mono text-xs text-slate-400">{p.code}</span></TD>
                                                    <TD><span className="font-bold" style={{color:PALETTE[i%PALETTE.length]}}>{num(p.qty)}</span></TD>
                                                    <TD><span className="font-semibold text-slate-900 dark:text-white">{compact(p.revenue)}</span></TD>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data packaging</p>}
                            </Card>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* PELANGGAN                                               */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='pelanggan' && (
                    <div className="space-y-5">
                        <Card>
                            <STitle icon={IconStar} sub="10 pelanggan total belanja tertinggi">Top 10 Pelanggan</STitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr>{['#','Nama','Tier','Telp','Order','Total Belanja','Avg Order','Poin','Terakhir Beli'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                    <tbody>
                                        {topCustomers.length>0 ? topCustomers.map((c,i)=>(
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <TD><span className="text-lg">{'🥇🥈🥉🏅🏅🏅🏅🏅🏅🏅'[i]??'🏅'}</span></TD>
                                                <TD><span className="font-bold text-slate-900 dark:text-white">{c.name}</span></TD>
                                                <TD><TierBadge tier={c.tier}/></TD>
                                                <TD><span className="text-slate-500 text-xs font-mono">{c.phone??'-'}</span></TD>
                                                <TD><span className="font-semibold text-primary-600 dark:text-primary-400">{num(c.total_orders)}</span></TD>
                                                <TD><span className="font-bold text-slate-900 dark:text-white">{compact(c.total_spending)}</span></TD>
                                                <TD><span className="text-slate-500">{compact(c.avg_order)}</span></TD>
                                                <TD>
                                                    <div className="flex items-center gap-1">
                                                        <IconStar size={11} className="text-yellow-500"/>
                                                        <span className="text-slate-600 dark:text-slate-400">{num(c.total_points)}</span>
                                                    </div>
                                                </TD>
                                                <TD><span className="text-xs text-slate-400 whitespace-nowrap">{c.last_purchase}</span></TD>
                                            </tr>
                                        )) : <tr><td colSpan={9} className="py-8 text-center text-slate-400">Belum ada data pelanggan</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* TIM & KASIR                                             */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='tim' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <STitle icon={IconUserCheck} sub="Performa per kasir">Penjualan per Kasir</STitle>
                                {byCashier.length>0 ? (
                                    <div className="space-y-2.5">
                                        {byCashier.map((c,i)=>(
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{'🥇🥈🥉🏅🏅🏅🏅🏅'[i]??'🏅'}</span>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                                                        <p className="text-xs text-slate-400">{num(c.total_transactions)} tx · {num(c.unique_customers)} pelanggan</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{compact(c.total_revenue)}</p>
                                                    <p className="text-xs text-slate-400">AOV {compact(c.avg_order)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data kasir</p>}
                            </Card>

                            <Card>
                                <STitle icon={IconTrendingUp} sub="Performa tim sales" accent={C.success}>Penjualan per Sales Person</STitle>
                                {bySalesPerson.length>0 ? (
                                    <div className="space-y-2.5">
                                        {bySalesPerson.map((sp,i)=>(
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{'🥇🥈🥉🏅🏅🏅🏅🏅'[i]??'🏅'}</span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{sp.name}</p>
                                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{sp.code}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400">{num(sp.transactions)} tx · {num(sp.unique_customers)} pelanggan</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{compact(sp.revenue)}</p>
                                                    <p className="text-xs text-slate-400">AOV {compact(sp.avg_order)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data sales person</p>}
                            </Card>
                        </div>

                        {byCashier.length>0&&(
                            <Card>
                                <STitle icon={IconChartBar} sub="Revenue per kasir">Perbandingan Kasir</STitle>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={byCashier} layout="vertical" barSize={16}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} className="dark:stroke-slate-700"/>
                                        <XAxis type="number" tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                        <YAxis type="category" dataKey="name" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} width={100}/>
                                        <Tooltip content={<ChartTip/>}/>
                                        <Bar dataKey="total_revenue" name="Revenue" radius={[0,5,5,0]}>{byCashier.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        )}
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
                                    <p className="text-xl font-bold mb-0.5" style={{color:PALETTE[i%PALETTE.length]}}>{compact(s.revenue)}</p>
                                    <p className="text-xs text-slate-400">{num(s.transactions)} tx</p>
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs text-slate-400">
                                        <span>Share {s.share_pct}%</span>
                                        <span>{num(s.unique_customers)} pelanggan</span>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <Card>
                            <STitle icon={IconBuildingStore} sub="Revenue & Transaksi per outlet">Perbandingan Toko</STitle>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={byStore} barGap={4} barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                    <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis yAxisId="rev" tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis yAxisId="tx" orientation="right" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <Tooltip content={<ChartTip/>}/>
                                    <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                    <Bar yAxisId="rev" dataKey="revenue"      name="Revenue"    radius={[4,4,0,0]} fillOpacity={0.85}>{byStore.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Bar>
                                    <Bar yAxisId="tx"  dataKey="transactions" name="Transaksi"  fill={C.info} radius={[4,4,0,0]} fillOpacity={0.5}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <STitle icon={IconChartBar} sub="Detail per outlet">Detail Penjualan per Toko</STitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr>{['Toko','Kode','Transaksi','Revenue','Avg Order','Pelanggan Unik','Member Tx','Share'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                    <tbody>
                                        {byStore.map((s,i)=>(
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <TD><span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{'🥇🥈🥉🏅🏅🏅🏅🏅'[i]??'🏅'} {s.name}</span></TD>
                                                <TD><span className="font-mono text-xs text-slate-400">{s.code}</span></TD>
                                                <TD><span className="text-slate-700 dark:text-slate-300">{num(s.transactions)}</span></TD>
                                                <TD><span className="font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">{compact(s.revenue)}</span></TD>
                                                <TD><span className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{compact(s.avg_order)}</span></TD>
                                                <TD><span className="text-slate-600 dark:text-slate-400">{num(s.unique_customers)}</span></TD>
                                                <TD><span className="text-slate-600 dark:text-slate-400">{num(s.member_tx)}</span></TD>
                                                <TD>
                                                    <div className="flex items-center gap-2 min-w-[80px]">
                                                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{width:`${s.share_pct}%`,background:PALETTE[i%PALETTE.length]}}/>
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-500 w-8">{s.share_pct}%</span>
                                                    </div>
                                                </TD>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {byStore.length>1&&(
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={2} className="py-3 pr-3 font-bold text-slate-700 dark:text-slate-300 text-xs">TOTAL</td>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white">{num(byStore.reduce((a,b)=>a+b.transactions,0))}</td>
                                                <td className="py-3 pr-3 font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">{compact(byStore.reduce((a,b)=>a+b.revenue,0))}</td>
                                                <td colSpan={4}/>
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
                            <KpiCard small label="Ditampilkan"   value={`${recentTransactions.length} tx`}                              icon={IconReceipt}   accent={C.info}/>
                            <KpiCard small label="Total Revenue" value={compact(recentTransactions.reduce((a,b)=>a+(b.total??0),0))}    icon={IconCash}      accent={C.primary}/>
                            <KpiCard small label="Total Item"    value={num(recentTransactions.reduce((a,b)=>a+(b.total_items??0),0))} icon={IconPackage}   accent={C.success}/>
                            <KpiCard small label="Total Diskon"  value={compact(recentTransactions.reduce((a,b)=>a+(b.discount??0),0))} icon={IconDiscount2} accent={C.warning}/>
                        </div>

                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <STitle icon={IconReceipt} sub="50 transaksi terbaru">Daftar Transaksi</STitle>
                                {recentTransactions.length>=50&&(
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                                        <IconAlertTriangle size={13}/>Menampilkan 50 teratas
                                    </div>
                                )}
                            </div>
                            {recentTransactions.length>0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr>{['Invoice','Tgl','Jam','Status','Toko','Pelanggan','Tier','Kasir','Sales','Items','Gross Sales','Diskon','Total'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                                        <tbody>
                                            {recentTransactions.map((tx,i)=>(
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <TD cls="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">{tx.invoice}</TD>
                                                    <TD cls="text-xs text-slate-500 whitespace-nowrap">{tx.date}</TD>
                                                    <TD cls="text-xs text-slate-400">{tx.time}</TD>
                                                    <TD><StatusBadge status={tx.status}/></TD>
                                                    <TD cls="text-slate-600 dark:text-slate-400 whitespace-nowrap">{tx.store}</TD>
                                                    <TD cls="font-medium text-slate-900 dark:text-white">{tx.customer}</TD>
                                                    <TD><TierBadge tier={tx.customer_tier}/></TD>
                                                    <TD cls="text-slate-500 dark:text-slate-400">{tx.cashier}</TD>
                                                    <TD cls="text-slate-500 dark:text-slate-400">{tx.sales_person}</TD>
                                                    <TD cls="text-slate-600 dark:text-slate-400">{tx.total_items??'-'}</TD>
                                                    <TD cls="text-slate-600 dark:text-slate-400 whitespace-nowrap">{compact(tx.gross_sales)}</TD>
                                                    <TD cls="text-amber-600 dark:text-amber-400 whitespace-nowrap">{tx.discount>0?`-${compact(tx.discount)}`:'—'}</TD>
                                                    <TD cls="font-bold text-slate-900 dark:text-white whitespace-nowrap">{compact(tx.total)}</TD>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={9} className="py-3 pr-3 font-bold text-slate-700 dark:text-slate-300 text-xs">SUBTOTAL ({recentTransactions.length})</td>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white">{num(recentTransactions.reduce((a,b)=>a+(b.total_items??0),0))}</td>
                                                <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{compact(recentTransactions.reduce((a,b)=>a+(b.gross_sales??0),0))}</td>
                                                <td className="py-3 pr-3 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">-{compact(recentTransactions.reduce((a,b)=>a+(b.discount??0),0))}</td>
                                                <td className="py-3 pr-3 font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">{compact(recentTransactions.reduce((a,b)=>a+(b.total??0),0))}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <IconReceipt size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3"/>
                                    <p className="text-slate-500 dark:text-slate-400">Tidak ada transaksi dalam periode yang dipilih</p>
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}

LaporanPenjualan.layout = (page) => <DashboardLayout children={page}/>;
