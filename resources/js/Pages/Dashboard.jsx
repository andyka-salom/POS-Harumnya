import Card from '@/Components/Dashboard/Card';
import Widget from '@/Components/Dashboard/Widget';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Head, router } from '@inertiajs/react';
import {
    IconBox, IconFlask, IconMoneybag, IconUsers, IconBuildingStore,
    IconTrendingUp, IconShoppingCart, IconAlertTriangle, IconCash,
    IconDiscount2, IconStar, IconArrowUpRight, IconArrowDownRight,
    IconPackage, IconUserCheck, IconLock, IconLockOpen, IconChartBar,
    IconReceipt, IconPercentage,
} from '@tabler/icons-react';
import { useMemo, useState, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// ─── COLORS ───────────────────────────────────────────────────────────────────
const COLORS  = ['#7c3aed','#2563eb','#16a34a','#d97706','#db2777','#0891b2'];
const C = { primary:'#7c3aed', success:'#16a34a', danger:'#dc2626', warning:'#d97706', info:'#2563eb' };

// ─── FORMAT ───────────────────────────────────────────────────────────────────
const idr = (v) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(v??0);
const compact = (v) => {
    v=v??0;
    if(v>=1_000_000_000) return `Rp${(v/1_000_000_000).toFixed(1)}M`;
    if(v>=1_000_000)     return `Rp${(v/1_000_000).toFixed(1)}Jt`;
    if(v>=1_000)         return `Rp${(v/1_000).toFixed(0)}Rb`;
    return `Rp${v}`;
};
const num = (v) => new Intl.NumberFormat('id-ID').format(v??0);

// ─── CHART TOOLTIP ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[150px]">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">{label}</p>
            {payload.map((p,i) => (
                <div key={i} className="flex items-center justify-between gap-4 text-xs mb-1 last:mb-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{background:p.color}}/>
                        <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
                    </div>
                    <span className="font-bold" style={{color:p.color}}>
                        {typeof p.value==='number'&&p.value>10000 ? compact(p.value) : num(p.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── TREND BADGE ──────────────────────────────────────────────────────────────
function TrendBadge({ value }) {
    if (value === null || value === undefined) return null;
    const up = value >= 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
            up ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
               : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
            {up ? <IconArrowUpRight size={11}/> : <IconArrowDownRight size={11}/>}
            {Math.abs(value)}%
        </span>
    );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
// FIX: Ganti <p> menjadi <div> pada wrapper sub agar tidak terjadi
//      invalid DOM nesting (<div> cannot appear as a descendant of <p>)
function KpiCard({ label, value, sub, icon: Icon, accent=C.primary, gradient=false }) {
    if (gradient) return (
        <Card className="border-0 text-white" style={{background:`linear-gradient(135deg, ${accent}, ${accent}dd)`}}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium opacity-80 mb-2 uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                    {/* ✅ FIXED: was <p>, changed to <div> */}
                    {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
                </div>
                {Icon && <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Icon size={20}/></div>}
            </div>
        </Card>
    );
    return (
        <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{background:accent}}/>
            <div className="flex items-start justify-between mt-1">
                <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1.5">{label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
                    {/* ✅ FIXED: was <p>, changed to <div> */}
                    {sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</div>}
                </div>
                {Icon && (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:accent+'18'}}>
                        <Icon size={18} style={{color:accent}} strokeWidth={1.8}/>
                    </div>
                )}
            </div>
        </Card>
    );
}

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
function STitle({ icon: Icon, children, sub, accent=C.primary }) {
    return (
        <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:accent+'18'}}>
                <Icon size={15} style={{color:accent}}/>
            </div>
            <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-none">{children}</h3>
                {sub && <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider">{sub}</p>}
            </div>
        </div>
    );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
    { key:'overview',    label:'Overview'    },
    { key:'penjualan',   label:'Penjualan'   },
    { key:'produk',      label:'Produk'      },
    { key:'operasional', label:'Operasional' },
    { key:'toko',        label:'Toko'        },
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard({
    period=30, isSuperAdmin=false, currentStore=null, error=null,
    kpi={}, counts={},
    revenueTrend=[], salesByIntensity=[], salesBySize=[],
    paymentBreakdown=[], discountUsage=[],
    topVariants=[], topCustomers=[], topPackaging=[], salesPeoplePerformance=[],
    storePerformance=[],
    activeCashDrawer=null, lowStockIngredients=[], lowStockWarehouse=[],
    recentTransactions=[],
}) {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedPeriod, setSelectedPeriod] = useState(String(period));

    const changePeriod = useCallback((p) => {
        setSelectedPeriod(p);
        router.get(route('dashboard'), { period:p }, { preserveState:true, preserveScroll:true });
    }, []);

    const profitMargin = useMemo(() => {
        if (!kpi.totalRevenue) return 0;
        return (((kpi.totalProfit??0)/kpi.totalRevenue)*100).toFixed(1);
    }, [kpi]);

    const stockAlertCount = lowStockIngredients.length + lowStockWarehouse.length;

    const radarData = ['Revenue','Volume','Share'].map((m,mi) => {
        const obj = { metric:m };
        salesByIntensity.forEach(s => { obj[s.code] = mi===0 ? Math.round(s.revenue/1_000_000) : mi===1 ? s.qty : s.pct; });
        return obj;
    });

    const paymentTotal = paymentBreakdown.reduce((a,b) => a+(b.total_amount??0), 0);

    return (
        <>
            <Head title="Dashboard"/>
            <div className="space-y-5">

                {/* ── ERROR ─────────────────────────────────────────────── */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                        <IconAlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5"/>
                        <div>
                            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Terjadi Kesalahan</p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                {/* ── STORE BANNER ──────────────────────────────────────── */}
                {currentStore && (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                        <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
                            <IconBuildingStore size={18} className="text-white"/>
                        </div>
                        <div>
                            <p className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold uppercase tracking-wider">Toko Aktif</p>
                            <p className="text-sm font-bold text-primary-900 dark:text-primary-100">{currentStore.name}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Live</span>
                        </div>
                    </div>
                )}

                {/* ── TABS + PERIOD ─────────────────────────────────────── */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex-wrap">
                        {TABS.filter(t => t.key!=='toko' || isSuperAdmin).map(t => (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={`relative px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                                    activeTab===t.key
                                        ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}>
                                {t.label}
                                {t.key==='operasional' && stockAlertCount>0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                                        {stockAlertCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <select value={selectedPeriod} onChange={e => changePeriod(e.target.value)}
                        className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="7">7 Hari</option>
                        <option value="14">14 Hari</option>
                        <option value="30">30 Hari</option>
                        <option value="90">90 Hari</option>
                    </select>
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* OVERVIEW                                                */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='overview' && (
                    <div className="space-y-5">

                        {/* Count widgets */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Widget title="Varian Parfum" subtitle="Total Aktif"
                                color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                icon={<IconFlask size={20} strokeWidth={1.5}/>} total={counts.variants??0}/>
                            <Widget title="Bahan Baku" subtitle="Total Ingredient"
                                color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                icon={<IconBox size={20} strokeWidth={1.5}/>} total={counts.ingredients??0}/>
                            <Widget title="Transaksi" subtitle={`${selectedPeriod} hari`}
                                color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                icon={<IconShoppingCart size={20} strokeWidth={1.5}/>} total={kpi.totalTransactions??0}/>
                            <Widget title="Member Aktif" subtitle="Total Pelanggan"
                                color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                icon={<IconUsers size={20} strokeWidth={1.5}/>} total={counts.customers??0}/>
                        </div>

                        {/* Financial KPI */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <KpiCard gradient label="Total Pendapatan" value={compact(kpi.totalRevenue)}
                                sub={<><span className="opacity-80">{idr(kpi.totalRevenue)}</span><div className="mt-1"><TrendBadge value={kpi.trendRevenue}/></div></>}
                                icon={IconMoneybag} accent={C.primary}/>
                            <KpiCard gradient label="Total Profit" value={compact(kpi.totalProfit)}
                                sub={<><span className="opacity-80">Margin {profitMargin}%</span><div className="mt-1"><TrendBadge value={kpi.trendProfit}/></div></>}
                                icon={IconTrendingUp} accent={C.success}/>
                            <KpiCard label="Rata-rata Order" value={compact(kpi.avgOrder)} sub="Per transaksi"
                                icon={IconChartBar} accent={C.info}/>
                            <KpiCard label="Hari Ini" value={num(kpi.todayTransactions)}
                                sub={compact(kpi.todayRevenue)} icon={IconCash} accent={C.warning}/>
                        </div>

                        {/* Revenue chart */}
                        <Card>
                            <STitle icon={IconTrendingUp} sub="Revenue · Profit · COGS">Tren Keuangan</STitle>
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={revenueTrend}>
                                    <defs>
                                        {[['gRev',C.primary],['gPro',C.success]].map(([id,c])=>(
                                            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={c} stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor={c} stopOpacity={0}/>
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700"/>
                                    <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <Tooltip content={<ChartTip/>}/>
                                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke={C.primary} strokeWidth={2.5} fill="url(#gRev)" dot={false}/>
                                    <Area type="monotone" dataKey="profit"  name="Profit"  stroke={C.success} strokeWidth={2}   fill="url(#gPro)" dot={false}/>
                                    <Area type="monotone" dataKey="cogs"    name="COGS"    stroke={C.danger}  strokeWidth={1.5} fill="none"       dot={false} strokeDasharray="4 3"/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Intensity + Size + Payment */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            <Card>
                                <STitle icon={IconChartBar} sub="Distribusi konsentrasi">Sales by Intensity</STitle>
                                <ResponsiveContainer width="100%" height={140}>
                                    <PieChart>
                                        <Pie data={salesByIntensity} dataKey="pct" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={3}>
                                            {salesByIntensity.map((_,i)=><Cell key={i} fill={COLORS[i]} stroke="none"/>)}
                                        </Pie>
                                        <Tooltip content={<ChartTip/>}/>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2 mt-2">
                                    {salesByIntensity.map((s,i)=>(
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-sm" style={{background:COLORS[i]}}/>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400">{num(s.qty)}</span>
                                                <span className="text-sm font-bold" style={{color:COLORS[i]}}>{s.pct}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card>
                                <STitle icon={IconPackage} sub="Per ukuran botol" accent={C.info}>Sales by Size</STitle>
                                <ResponsiveContainer width="100%" height={140}>
                                    <BarChart data={salesBySize} barSize={28}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                        <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                        <YAxis hide/>
                                        <Tooltip content={<ChartTip/>}/>
                                        <Bar dataKey="revenue" name="Revenue" radius={[5,5,0,0]}>
                                            {salesBySize.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="flex gap-2 mt-2">
                                    {salesBySize.map((s,i)=>(
                                        <div key={i} className="flex-1 rounded-lg bg-slate-50 dark:bg-slate-800 py-2 px-1 text-center border border-slate-100 dark:border-slate-700">
                                            <p className="text-base font-bold" style={{color:COLORS[i]}}>{num(s.qty)}</p>
                                            <p className="text-[10px] text-slate-400">{s.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card>
                                <STitle icon={IconCash} sub="Metode pembayaran" accent={C.warning}>Pembayaran</STitle>
                                {paymentBreakdown.length>0 ? (
                                    <div className="space-y-3">
                                        {paymentBreakdown.map((p,i)=>{
                                            const share = paymentTotal>0 ? Math.round((p.total_amount/paymentTotal)*100) : 0;
                                            return (
                                                <div key={i}>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.method_name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400">{p.total_transactions}×</span>
                                                            <span className="text-sm font-bold" style={{color:COLORS[i%COLORS.length]}}>{share}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all" style={{width:`${share}%`,background:COLORS[i%COLORS.length]}}/>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data pembayaran</p>}
                            </Card>
                        </div>

                        {/* Top Variants + Top Customers */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <STitle icon={IconStar} sub="By revenue">Top Varian Parfum</STitle>
                                {topVariants.length>0 ? (
                                    <div className="space-y-2.5">
                                        {topVariants.map((v,i)=>(
                                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{background:COLORS[i]}}>
                                                        {i+1}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{v.name}</p>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">{v.gender}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400">{num(v.qty)} unit · margin {v.margin}%</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{compact(v.revenue)}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data penjualan</p>}
                            </Card>

                            <Card>
                                <STitle icon={IconUsers} sub="Total belanja" accent={C.success}>Top Pelanggan</STitle>
                                {topCustomers.length>0 ? (
                                    <div className="space-y-2.5">
                                        {topCustomers.map((c,i)=>(
                                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{background:COLORS[i]}}>
                                                        {i+1}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs text-slate-400">{c.total_orders} transaksi</p>
                                                            {c.tier && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${
                                                                c.tier==='platinum' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                c.tier==='gold'     ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                c.tier==='silver'   ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                                                                                      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                            }`}>{c.tier}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{compact(c.total_spending)}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data pelanggan</p>}
                            </Card>
                        </div>

                        {/* Low stock alert */}
                        {lowStockIngredients.length>0 && (
                            <Card className="border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <IconAlertTriangle size={18} className="text-amber-500"/>
                                    <STitle icon={IconAlertTriangle} sub={`${lowStockIngredients.length} item`} accent={C.warning}>Stok Bahan Menipis</STitle>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {lowStockIngredients.map((item,i)=>(
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                                                <p className="text-xs text-slate-500">Min: {num(item.minimum)} {item.unit}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-bold ${['empty','critical'].includes(item.status)?'text-red-600 dark:text-red-400':'text-amber-600 dark:text-amber-400'}`}>
                                                    {num(item.current)} {item.unit}
                                                </p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    item.status==='empty'    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    item.status==='critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                               'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>{item.status==='empty'?'Habis':item.status==='critical'?'Kritis':'Rendah'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Recent Transactions */}
                        <Card>
                            <STitle icon={IconReceipt} sub="8 terbaru">Transaksi Terbaru</STitle>
                            {recentTransactions.length>0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                {['Invoice','Tanggal','Pelanggan','Kasir','Total','Profit','Status'].map(h=>(
                                                    <th key={h} className="text-left py-2.5 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentTransactions.map((tx,i)=>(
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-2.5 px-2 font-mono text-xs font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">{tx.invoice}</td>
                                                    <td className="py-2.5 px-2 text-xs text-slate-500 whitespace-nowrap">{tx.date}</td>
                                                    <td className="py-2.5 px-2 font-medium text-slate-900 dark:text-white">{tx.customer}</td>
                                                    <td className="py-2.5 px-2 text-slate-500 dark:text-slate-400">{tx.cashier}</td>
                                                    <td className="py-2.5 px-2 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{idr(tx.total)}</td>
                                                    <td className={`py-2.5 px-2 text-xs font-bold whitespace-nowrap ${tx.gross_profit>0?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{compact(tx.gross_profit)}</td>
                                                    <td className="py-2.5 px-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                            tx.status==='completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            tx.status==='refunded'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>{tx.status==='completed'?'Selesai':tx.status==='refunded'?'Refund':'Batal'}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada transaksi</p>}
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* PENJUALAN                                               */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='penjualan' && (
                    <div className="space-y-5">
                        <Card>
                            <STitle icon={IconChartBar} sub="Revenue · Profit · COGS · Transaksi per hari">Grafik Penjualan Harian</STitle>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={revenueTrend} barGap={3} barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                    <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <Tooltip content={<ChartTip/>}/>
                                    <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                    <Bar dataKey="revenue"      name="Revenue"   fill={C.primary} radius={[4,4,0,0]} fillOpacity={0.85}/>
                                    <Bar dataKey="profit"       name="Profit"    fill={C.success} radius={[4,4,0,0]} fillOpacity={0.85}/>
                                    <Bar dataKey="cogs"         name="COGS"      fill={C.danger}  radius={[4,4,0,0]} fillOpacity={0.75}/>
                                    <Bar dataKey="transactions" name="Transaksi" fill={C.info}    radius={[4,4,0,0]} fillOpacity={0.6}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <STitle icon={IconPercentage} sub="Analisis per intensity">Radar Intensity</STitle>
                                <ResponsiveContainer width="100%" height={240}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" className="dark:stroke-slate-700"/>
                                        <PolarAngleAxis dataKey="metric" tick={{fill:'#94a3b8',fontSize:11}}/>
                                        {salesByIntensity.map((s,i)=>(
                                            <Radar key={s.code} name={s.code} dataKey={s.code} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.12} strokeWidth={2}/>
                                        ))}
                                        <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                        <Tooltip content={<ChartTip/>}/>
                                    </RadarChart>
                                </ResponsiveContainer>
                            </Card>

                            <Card>
                                <STitle icon={IconDiscount2} sub="Penggunaan diskon" accent={C.warning}>Analisis Diskon</STitle>
                                {discountUsage.length>0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {discountUsage.map((d,i)=>(
                                            <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{d.category}</p>
                                                <p className="text-lg font-bold" style={{color:COLORS[i%COLORS.length]}}>{compact(d.total_discount_given)}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{num(d.usage_count)} kali</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-slate-400 text-center py-8">Tidak ada data diskon</p>}
                            </Card>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* PRODUK                                                  */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='produk' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Card>
                                <STitle icon={IconStar} sub="Top 5 varian by revenue">Top Varian Parfum</STitle>
                                {topVariants.map((v,i)=>(
                                    <div key={i} className="mb-4 last:mb-0">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{'🥇🥈🥉🏅🏅'[i]??'🏅'}</span>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{v.name}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{v.gender}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400">{num(v.qty)} unit · margin {v.margin}%</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{compact(v.revenue)}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full" style={{width:`${(v.qty/Math.max(topVariants[0]?.qty??1,1))*100}%`,background:COLORS[i]}}/>
                                        </div>
                                    </div>
                                ))}
                            </Card>

                            <Card>
                                <STitle icon={IconChartBar} sub="Margin per varian" accent={C.success}>Margin Analisis</STitle>
                                {topVariants.length>0 && (
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={topVariants} layout="vertical" barSize={14}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} className="dark:stroke-slate-700"/>
                                            <XAxis type="number" domain={[0,80]} tickFormatter={v=>`${v}%`} tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                                            <YAxis dataKey="name" type="category" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} width={90}/>
                                            <Tooltip content={<ChartTip/>}/>
                                            <Bar dataKey="margin" name="Margin %" radius={[0,5,5,0]}>
                                                {topVariants.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Card>
                        </div>

                        <Card>
                            <STitle icon={IconPackage} sub="Top packaging add-on" accent={C.info}>Packaging Terlaris</STitle>
                            {topPackaging.length>0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                {['#','Packaging','Kode','Qty','Revenue'].map(h=>(
                                                    <th key={h} className="text-left py-2.5 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topPackaging.map((p,i)=>(
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="py-2.5 px-2 text-slate-400 font-mono text-xs">{i+1}</td>
                                                    <td className="py-2.5 px-2 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                                                    <td className="py-2.5 px-2 font-mono text-xs text-slate-400">{p.code}</td>
                                                    <td className="py-2.5 px-2 font-bold" style={{color:COLORS[i%COLORS.length]}}>{num(p.qty)}</td>
                                                    <td className="py-2.5 px-2 font-semibold text-slate-900 dark:text-white">{compact(p.revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data packaging</p>}
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* OPERASIONAL                                             */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='operasional' && (
                    <div className="space-y-5">
                        {/* Cash drawer */}
                        {activeCashDrawer ? (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <IconLockOpen size={18} className="text-emerald-600 dark:text-emerald-400"/>
                                    <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Shift Aktif — Laci Kas Terbuka</h3>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto"/>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {[
                                        { label:'Dibuka Oleh',    v:activeCashDrawer.opened_by },
                                        { label:'Sejak',          v:activeCashDrawer.opened_at },
                                        { label:'Modal Awal',     v:idr(activeCashDrawer.opening_cash) },
                                        { label:'Total Penjualan',v:idr(activeCashDrawer.total_sales) },
                                        { label:'Transaksi',      v:`${num(activeCashDrawer.transaction_count)} tx` },
                                        { label:'Gross Profit',   v:compact(activeCashDrawer.gross_profit) },
                                    ].map(({label,v})=>(
                                        <div key={label} className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2.5">
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 uppercase tracking-wider font-semibold">{label}</p>
                                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <IconLock size={18} className="text-slate-400"/>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada shift kasir yang aktif saat ini</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Low stock toko */}
                            <Card className={lowStockIngredients.length>0 ? 'border-amber-200 dark:border-amber-800' : ''}>
                                <STitle icon={IconAlertTriangle} sub={`${lowStockIngredients.length} item`} accent={lowStockIngredients.length>0?C.warning:C.success}>
                                    Stok Bahan — Toko
                                </STitle>
                                {lowStockIngredients.length>0 ? (
                                    <div className="space-y-2.5">
                                        {lowStockIngredients.map((item,i)=>(
                                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                                                    <p className="text-xs text-slate-500">Min: {num(item.minimum)} {item.unit}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${['empty','critical'].includes(item.status)?'text-red-600 dark:text-red-400':'text-amber-600 dark:text-amber-400'}`}>{num(item.current)} {item.unit}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        ['empty','critical'].includes(item.status) ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>{item.status==='empty'?'Habis':item.status==='critical'?'Kritis':'Rendah'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8"><p className="text-2xl mb-2">✅</p><p className="text-sm text-slate-400">Stok toko aman</p></div>
                                )}
                            </Card>

                            {/* Low stock gudang */}
                            <Card className={lowStockWarehouse.length>0 ? 'border-red-200 dark:border-red-800' : ''}>
                                <STitle icon={IconAlertTriangle} sub={`${lowStockWarehouse.length} item`} accent={lowStockWarehouse.length>0?C.danger:C.success}>
                                    Stok Bahan — Gudang
                                </STitle>
                                {lowStockWarehouse.length>0 ? (
                                    <div className="space-y-2.5">
                                        {lowStockWarehouse.map((item,i)=>(
                                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                                                    <p className="text-xs text-slate-500">{item.warehouse_name} · Min: {num(item.minimum)} {item.unit}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${item.status==='critical'?'text-red-600 dark:text-red-400':'text-amber-600 dark:text-amber-400'}`}>{num(item.current)} {item.unit}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status==='critical'?'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400':'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                        {item.status==='critical'?'Kritis':'Rendah'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-2xl mb-2">✅</p>
                                        <p className="text-sm text-slate-400">{isSuperAdmin?'Stok gudang aman':'Hanya Super Admin yang dapat melihat stok gudang'}</p>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Sales people */}
                        <Card>
                            <STitle icon={IconUserCheck} sub="Performa tim sales" accent={C.success}>Sales People Performance</STitle>
                            {salesPeoplePerformance.length>0 ? (
                                <div className="space-y-2.5">
                                    {salesPeoplePerformance.map((sp,i)=>(
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{'🥇🥈🥉🏅🏅'[i]??'🏅'}</span>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{sp.name}</p>
                                                    <p className="text-xs text-slate-400">{sp.code} · {num(sp.total_transactions)} transaksi</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{compact(sp.total_revenue)}</p>
                                                <p className="text-xs text-slate-400">AOV {compact(sp.avg_order)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data sales person</p>}
                        </Card>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* TOKO (Super Admin)                                      */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab==='toko' && isSuperAdmin && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {storePerformance.map((s,i)=>(
                                <Card key={i} className="relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{background:COLORS[i%COLORS.length]}}/>
                                    <div className="flex items-center justify-between mt-1 mb-2">
                                        <IconBuildingStore size={16} className="text-slate-400"/>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${i===0?'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400':'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>#{i+1}</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{s.store_name}</p>
                                    <p className="text-xl font-bold mb-0.5" style={{color:COLORS[i%COLORS.length]}}>{compact(s.total_revenue)}</p>
                                    <p className="text-xs text-slate-400">{num(s.total_transactions)} tx · margin {s.margin}%</p>
                                </Card>
                            ))}
                        </div>

                        <Card>
                            <STitle icon={IconBuildingStore} sub="Revenue & Profit per outlet">Perbandingan Toko</STitle>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={storePerformance} barGap={4} barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} className="dark:stroke-slate-700"/>
                                    <XAxis dataKey="store_name" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <YAxis tickFormatter={v=>compact(v).replace('Rp','')} tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                                    <Tooltip content={<ChartTip/>}/>
                                    <Legend formatter={v=><span className="text-xs text-slate-500">{v}</span>}/>
                                    <Bar dataKey="total_revenue" name="Revenue" radius={[4,4,0,0]}>
                                        {storePerformance.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                                    </Bar>
                                    <Bar dataKey="total_profit" name="Profit" fill={C.success} fillOpacity={0.75} radius={[4,4,0,0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <STitle icon={IconChartBar} sub="Detail per outlet">Detail Performa Toko</STitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                            {['Toko','Kode','Revenue','Profit','Transaksi','AOV','Margin','Share'].map(h=>(
                                                <th key={h} className="text-left py-2.5 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {storePerformance.map((s,i)=>{
                                            const totalRev = storePerformance.reduce((a,b)=>a+b.total_revenue,0);
                                            const share = totalRev>0 ? Math.round((s.total_revenue/totalRev)*100) : 0;
                                            return (
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">{'🥇🥈🥉🏅🏅'[i]??'🏅'} {s.store_name}</td>
                                                    <td className="py-2.5 px-2 font-mono text-xs text-slate-400">{s.store_code}</td>
                                                    <td className="py-2.5 px-2 font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">{compact(s.total_revenue)}</td>
                                                    <td className="py-2.5 px-2 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{compact(s.total_profit)}</td>
                                                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">{num(s.total_transactions)}</td>
                                                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{compact(s.avg_order)}</td>
                                                    <td className={`py-2.5 px-2 font-bold ${s.margin>=50?'text-emerald-600 dark:text-emerald-400':s.margin>=35?'text-amber-600 dark:text-amber-400':'text-red-600 dark:text-red-400'}`}>{s.margin}%</td>
                                                    <td className="py-2.5 px-2">
                                                        <div className="flex items-center gap-2 min-w-[70px]">
                                                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full" style={{width:`${share}%`,background:COLORS[i%COLORS.length]}}/>
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-500 w-6">{share}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}

Dashboard.layout = (page) => <DashboardLayout children={page}/>;
