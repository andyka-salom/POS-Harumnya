import React, { useState, useEffect, useRef, useCallback } from "react";
import { Head, Link } from "@inertiajs/react";
import {
    IconArrowLeft, IconPrinter, IconReceipt, IconFileInvoice,
    IconShoppingBag, IconCheck, IconBluetooth, IconBluetoothOff,
    IconBluetoothConnected, IconLoader2, IconAlertCircle,
} from "@tabler/icons-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (v=0) => Number(v||0).toLocaleString("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0});
const fmtN    = (v=0) => Number(v||0).toLocaleString("id-ID",{minimumFractionDigits:0});
const fmtDT   = (s)   => s ? new Date(s).toLocaleString("id-ID",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "-";
const fmtDate = (s)   => s ? new Date(s).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}) : "-";
const fmtTime = (s)   => s ? new Date(s).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "-";
const getQty  = (x)   => x.qty ?? x.quantity ?? 1;

const STATUS_LABELS = {
    completed:{ label:"Selesai",    cls:"bg-emerald-100 text-emerald-700" },
    cancelled: { label:"Dibatalkan", cls:"bg-red-100 text-red-700" },
    refunded:  { label:"Refund",     cls:"bg-amber-100 text-amber-700" },
    pending:   { label:"Pending",    cls:"bg-blue-100 text-blue-700" },
    draft:     { label:"Draft",      cls:"bg-slate-100 text-slate-500" },
};

// ═════════════════════════════════════════════════════════════════════════════
// ESC/POS Builder  — hanya pakai ASCII 0x00-0x7F agar aman di semua printer
// ═════════════════════════════════════════════════════════════════════════════
class EscPos {
    constructor() { this.buf = []; }

    raw(bytes)    { this.buf.push(...bytes); return this; }
    lf(n=1)       { for(let i=0;i<n;i++) this.buf.push(0x0A); return this; }
    // Encode string: karakter non-ASCII diganti '?'
    text(str) {
        for (const ch of String(str)) {
            const code = ch.charCodeAt(0);
            this.buf.push(code < 0x80 ? code : 0x3F);
        }
        return this;
    }

    // Commands
    init()       { return this.raw([0x1B,0x40]); }
    cut()        { return this.raw([0x1D,0x56,0x41,0x10]); }
    bold(on)     { return this.raw([0x1B,0x45, on?1:0]); }
    align(a)     { return this.raw([0x1B,0x61, a]); }   // 0=L 1=C 2=R
    size(w,h)    { return this.raw([0x1D,0x21,(((w-1)&7)<<4)|((h-1)&7)]); }
    lineSpacing(n){ return this.raw([0x1B,0x33,n]); }
    defaultSpacing(){ return this.raw([0x1B,0x32]); }

    // Garis pakai karakter ASCII '-' (aman semua printer)
    divider(w=48) { return this.text("-".repeat(w)); }
    // Garis titik-titik pakai '.'
    dotLine(w=48) { return this.text(".".repeat(w)); }

    // Teks tengah
    center(str,w=48) {
        const s = String(str);
        const p = Math.max(0, Math.floor((w - s.length) / 2));
        return this.text(" ".repeat(p) + s);
    }

    // 2 kolom: kiri + kanan rata kanan
    row2(left, right, w=48) {
        const l = String(left);
        const r = String(right);
        const gap = Math.max(1, w - l.length - r.length);
        return this.text(l + " ".repeat(gap) + r);
    }

    // Label kiri + titik-titik + value kanan (gaya struk profesional)
    rowDot(label, value, w=48) {
        const l = String(label);
        const v = String(value);
        const dots = Math.max(1, w - l.length - v.length);
        return this.text(l + " ".repeat(dots) + v);
    }

    toBuffer() { return new Uint8Array(this.buf).buffer; }
}

// ─── Build ESC/POS receipt ────────────────────────────────────────────────────
function buildReceipt(sale, saleItems, payments, change, is58=false) {
    const W  = is58 ? 32 : 48;
    const ep = new EscPos();

    ep.init().lineSpacing(2);

    // ══ BRAND ═══════════════════════════════════════════════════════════
    ep.align(1)
      .bold(true).size(2,2)
      .center("HARUMNYA", W).lf()
      .size(1,1).bold(false)
      .lf();

    // ══ INFO TOKO ════════════════════════════════════════════════════════
    ep.bold(true)
      .center(sale.store?.name ?? "PARFUM CUSTOM", W).lf()
      .bold(false);
    if (sale.store?.address) {
        const addr = String(sale.store.address);
        for (let i=0; i<addr.length; i+=W) ep.center(addr.slice(i,i+W), W).lf();
    }
    if (sale.store?.phone) ep.center(String(sale.store.phone), W).lf();

    ep.lf()
      .divider(W).lf();

    // ══ INFO TRANSAKSI ═══════════════════════════════════════════════════
    ep.align(0).lf(0)
      .row2(fmtDate(sale.sold_at), fmtTime(sale.sold_at), W).lf()
      .row2("Receipt Number", sale.sale_number, W).lf()
      .row2("Collected By",   sale.cashier?.name ?? sale.cashier_name ?? "-", W).lf();
    if (sale.customer?.name || sale.customer_name) {
        ep.row2("Customer", sale.customer?.name ?? sale.customer_name, W).lf();
    }
    if (sale.sales_person?.name) {
        ep.align(1).bold(true)
          .center("*Sales: " + sale.sales_person.name + "*", W).lf()
          .bold(false).align(0);
    }

    ep.divider(W).lf();

    // ══ ITEMS ════════════════════════════════════════════════════════════
    saleItems.forEach(item => {
        const qty    = getQty(item);
        const isFree = Number(item.unit_price) === 0;
        const name   = String(item.product_name
            ?? [item.variant_name, item.intensity_code, item.size_ml ? item.size_ml+"ml" : null]
                .filter(Boolean).join(" ")
            ?? "Item");

        ep.bold(true);
        for (let i=0; i<name.length; i+=W) ep.text(name.slice(i,i+W)).lf();
        ep.bold(false);

        ep.row2(
            `${qty}x   @${isFree ? "0" : fmtN(item.unit_price)}`,
            isFree ? "0" : fmtN(item.subtotal),
            W
        ).lf();

        const pkgs = item.packagings ?? item.sale_item_packagings ?? [];
        pkgs.forEach(p => {
            const pqty  = getQty(p);
            const pFree = Number(p.unit_price) === 0;
            const pName = String(p.packaging_name ?? p.packaging_material?.name ?? "Kemasan");
            ep.bold(true).text(pName).lf().bold(false);
            if (pFree) ep.text("S (Free)").lf();
            ep.row2(
                `${pqty}x   @${fmtN(p.unit_price)}${pFree ? " (Free)" : ""}`,
                pFree ? "0" : fmtN(p.unit_price * pqty),
                W
            ).lf();
        });
    });

    ep.divider(W).lf();

    // ══ SUBTOTAL ═════════════════════════════════════════════════════════
    ep.row2("Subtotal", "Rp "+fmtN(sale.subtotal_perfume ?? 0), W).lf();
    if (Number(sale.subtotal_packaging) > 0)
        ep.row2("Kemasan", "Rp "+fmtN(sale.subtotal_packaging), W).lf();
    if (Number(sale.discount_amount) > 0)
        ep.row2("Diskon", "- Rp "+fmtN(sale.discount_amount), W).lf();
    if (Number(sale.points_redemption_value) > 0)
        ep.row2("Redeem Poin", "- Rp "+fmtN(sale.points_redemption_value), W).lf();

    ep.divider(W).lf();

    // ══ TOTAL ════════════════════════════════════════════════════════════
    ep.bold(true).size(1,2)
      .row2("Total", "Rp "+fmtN(sale.total), W).lf()
      .size(1,1).bold(false);

    ep.divider(W).lf();

    // ══ PEMBAYARAN ═══════════════════════════════════════════════════════
    payments.forEach(p => {
        const mName = String(p.payment_method?.name ?? p.payment_method_name ?? "Cash");
        ep.row2(mName, "Rp "+fmtN(p.amount), W).lf();
    });
    if (change > 0) ep.row2("Change", "Rp "+fmtN(change), W).lf();
    if (Number(sale.points_earned) > 0)
        ep.row2("Poin +", sale.points_earned+" poin", W).lf();

    // ══ FOOTER ═══════════════════════════════════════════════════════════
    ep.divider(W).lf()
      .lf()
      .align(1)
      .text("Terima kasih sudah berbelanja!").lf()
      .text("Harumnya").lf()
      .lf(4)
      .defaultSpacing()
      .cut();

    return ep.toBuffer();
}

// ═════════════════════════════════════════════════════════════════════════════
// Web Bluetooth — dengan auto-reconnect & cache device
// ═════════════════════════════════════════════════════════════════════════════

// UUID service printer thermal — daftar lengkap berbagai merek
const BT_SERVICES = [
    // Printer thermal umum (Xprinter, ZJ-58, GoojPrt, HOIN, dll)
    "000018f0-0000-1000-8000-00805f9b34fb",
    "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
    "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    "0000ff00-0000-1000-8000-00805f9b34fb",
    "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10 / CC41
    "0000fff0-0000-1000-8000-00805f9b34fb", // Beberapa ZJ
    "00001101-0000-1000-8000-00805f9b34fb", // SPP classic (jarang di BLE)
    "0000fef5-0000-1000-8000-00805f9b34fb",
    "0000fee7-0000-1000-8000-00805f9b34fb",
];

// Cari semua primary services lalu temukan characteristic writable
// Strategi: pakai getPrimaryServices() (tanpa UUID) agar dapat SEMUA service,
// lalu filter yang punya writable char.
// Fallback ke BT_SERVICES jika getPrimaryServices() tidak didukung.
async function findWritableChar(server) {
    await new Promise(r => setTimeout(r, 400)); // tunggu GATT stabil

    // ── Strategi 1: scan semua service (paling kompatibel) ──
    try {
        const services = await server.getPrimaryServices();
        for (const svc of services) {
            try {
                await new Promise(r => setTimeout(r, 80));
                const chars = await svc.getCharacteristics();
                const char  = chars.find(c =>
                    c.properties.writeWithoutResponse || c.properties.write
                );
                if (char) {
                    console.log("[BT] Found service:", svc.uuid, "char:", char.uuid);
                    return char;
                }
            } catch(_) {}
        }
    } catch(_) {
        console.log("[BT] getPrimaryServices() not supported, trying known UUIDs...");
    }

    // ── Strategi 2: coba UUID yang dikenal satu per satu ──
    for (const uuid of BT_SERVICES) {
        try {
            const svc   = await server.getPrimaryService(uuid);
            await new Promise(r => setTimeout(r, 100));
            const chars = await svc.getCharacteristics();
            const char  = chars.find(c =>
                c.properties.writeWithoutResponse || c.properties.write
            );
            if (char) {
                console.log("[BT] Matched known UUID:", uuid);
                return char;
            }
        } catch(_) {}
    }

    return null;
}

function useBluetooth() {
    const [device,  setDevice]  = useState(null);
    const [status,  setStatus]  = useState("idle"); // idle|connecting|connected|error|reconnecting
    const [error,   setError]   = useState(null);
    const [devName, setDevName] = useState(() => {
        try { return localStorage.getItem("bt_printer_name") || null; } catch(_) { return null; }
    });

    const charRef    = useRef(null);
    const deviceRef  = useRef(null); // ref ke BluetoothDevice agar bisa reconnect tanpa state
    const supported  = typeof navigator !== "undefined" && !!navigator.bluetooth;

    // ── Internal: connect GATT & cari characteristic ────────────────────
    const connectGatt = useCallback(async (dev) => {
        // Jika sudah connected, skip
        if (dev.gatt.connected) {
            if (charRef.current) return true;
        }
        const server = await dev.gatt.connect();
        // Tunggu GATT stabil sebelum request service
        await new Promise(r => setTimeout(r, 500));
        const char = await findWritableChar(server);
        if (!char) {
            let hint = "";
            try {
                const svcs = await server.getPrimaryServices();
                hint = " | Services: " + svcs.map(s => s.uuid.slice(4,8)).join(", ");
            } catch(_) {}
            throw new Error("Printer tidak merespon" + hint + ". Matikan & nyalakan printer, lalu coba lagi.");
        }
        charRef.current = char;
        return true;
    }, []);

    // ── Auto-reconnect handler saat GATT disconnect ─────────────────────
    const handleDisconnect = useCallback(async (dev) => {
        charRef.current = null;
        // Jika device masih tersimpan, coba reconnect otomatis
        if (deviceRef.current && deviceRef.current.id === dev.id) {
            setStatus("reconnecting");
            let retries = 3;
            while (retries-- > 0) {
                await new Promise(r => setTimeout(r, 1000));
                try {
                    await connectGatt(dev);
                    setStatus("connected");
                    return;
                } catch(_) {}
            }
            // Gagal reconnect setelah 3x
            setStatus("idle");
            setDevice(null);
            deviceRef.current = null;
        } else {
            setStatus("idle");
            setDevice(null);
            deviceRef.current = null;
        }
    }, [connectGatt]);

    // ── Connect: scan device baru ────────────────────────────────────────
    const connect = useCallback(async () => {
        if (!supported) {
            setError("Butuh Chrome di Android/Desktop + HTTPS untuk Web Bluetooth.");
            setStatus("error");
            return;
        }
        setStatus("connecting"); setError(null);
        try {
            const dev = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                // optionalServices wajib dideklarasikan agar Chrome izinkan akses service-nya
                optionalServices: [
                    ...BT_SERVICES,
                    // Tambahan: izinkan akses ke service apapun (diperlukan untuk getPrimaryServices())
                ],
            });

            // Pasang listener disconnect sekali saja
            dev.addEventListener("gattserverdisconnected", () => handleDisconnect(dev));

            await connectGatt(dev);

            deviceRef.current = dev;
            setDevice(dev);
            setDevName(dev.name || "Printer BT");
            // Simpan nama untuk tampilan reconnect
            try { localStorage.setItem("bt_printer_name", dev.name || "Printer BT"); } catch(_) {}
            setStatus("connected");
        } catch(err) {
            if (err.name === "NotFoundError") {
                setStatus("idle"); // User cancel pilih device
            } else {
                setError(err.message);
                setStatus("error");
            }
        }
    }, [supported, connectGatt, handleDisconnect]);

    // ── Reconnect: pakai device yang sudah pernah dipilih ───────────────
    // (Hanya works jika session masih sama — Web BT tidak persist antar session)
    const reconnect = useCallback(async () => {
        if (!deviceRef.current) { connect(); return; }
        setStatus("connecting"); setError(null);
        try {
            await connectGatt(deviceRef.current);
            setStatus("connected");
        } catch(err) {
            setError(err.message);
            setStatus("error");
        }
    }, [connect, connectGatt]);

    const disconnect = useCallback(() => {
        charRef.current  = null;
        deviceRef.current = null;
        device?.gatt?.disconnect();
        setDevice(null);
        setStatus("idle");
    }, [device]);

    // ── Print: kirim buffer ke printer ──────────────────────────────────
    const printBuffer = useCallback(async (buffer) => {
        // Jika koneksi drop saat print, coba reconnect sekali
        if (!charRef.current || !deviceRef.current?.gatt?.connected) {
            if (deviceRef.current) {
                await connectGatt(deviceRef.current);
            } else {
                throw new Error("Printer belum terhubung. Tap 'Hubungkan' dulu.");
            }
        }
        const data  = new Uint8Array(buffer);
        const CHUNK = 512;
        for (let i = 0; i < data.length; i += CHUNK) {
            const chunk = data.slice(i, i + CHUNK);
            try {
                if (charRef.current.properties.writeWithoutResponse) {
                    await charRef.current.writeValueWithoutResponse(chunk);
                } else {
                    await charRef.current.writeValue(chunk);
                }
            } catch(writeErr) {
                // Coba reconnect lalu kirim ulang chunk ini
                await connectGatt(deviceRef.current);
                if (charRef.current.properties.writeWithoutResponse) {
                    await charRef.current.writeValueWithoutResponse(chunk);
                } else {
                    await charRef.current.writeValue(chunk);
                }
            }
            await new Promise(r => setTimeout(r, 40));
        }
    }, [connectGatt]);

    // ── Scan UUIDs: bantu debug printer baru ────────────────────────────
    const [foundUuids, setFoundUuids] = useState([]);
    const scanUuids = useCallback(async () => {
        if (!supported) return;
        setError(null);
        try {
            const dev = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: BT_SERVICES,
            });
            const server = await dev.gatt.connect();
            await new Promise(r => setTimeout(r, 500));
            const svcs = await server.getPrimaryServices();
            const result = [];
            for (const svc of svcs) {
                try {
                    const chars = await svc.getCharacteristics();
                    const writableChar = chars.find(c => c.properties.writeWithoutResponse || c.properties.write);
                    const flag = writableChar ? " ✓ WRITABLE" : "";
                    result.push(svc.uuid + flag);
                    if (writableChar) {
                        // Langsung pakai kalau ketemu
                        dev.addEventListener("gattserverdisconnected", () => handleDisconnect(dev));
                        charRef.current  = writableChar;
                        deviceRef.current = dev;
                        setDevice(dev);
                        setDevName(dev.name || "Printer BT");
                        setStatus("connected");
                        try { localStorage.setItem("bt_printer_name", dev.name||"Printer BT"); } catch(_) {}
                    }
                } catch(_) { result.push(svc.uuid + " (char error)"); }
            }
            setFoundUuids(result);
            if (result.length === 0) setError("Tidak ada service ditemukan. Printer mungkin belum di-pair.");
        } catch(err) {
            if (err.name !== "NotFoundError") setError(err.message);
        }
    }, [supported, handleDisconnect]);

    return { supported, device, devName, status, error, connect, reconnect, disconnect, printBuffer, scanUuids, foundUuids };
}

// ═════════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════════
export default function Print({ sale, fromTransaction }) {
    const [mode,        setMode]        = useState("thermal80");
    const [showSuccess, setShowSuccess] = useState(!!fromTransaction);
    const [printing,    setPrinting]    = useState(false);
    const [printMsg,    setPrintMsg]    = useState(null);
    const bt = useBluetooth();

    useEffect(() => {
        if (fromTransaction) {
            const t = setTimeout(() => setShowSuccess(false), 4000);
            return () => clearTimeout(t);
        }
    }, [fromTransaction]);

    if (!sale) return null;

    const saleItems = sale.sale_items ?? sale.items ?? [];
    const payments  = sale.sale_payments ?? sale.payments ?? [];
    const totalPaid = payments.reduce((s,p) => s + Number(p.amount??0), 0);
    const change    = Number(sale.change_amount??0) || Math.max(0, totalPaid - Number(sale.total??0));
    const is58      = mode === "thermal58";
    const statusInfo = STATUS_LABELS[sale.status] ?? { label:sale.status, cls:"bg-slate-100 text-slate-500" };

    const handleBtPrint = async () => {
        setPrinting(true); setPrintMsg(null);
        try {
            const buf = buildReceipt(sale, saleItems, payments, change, is58);
            await bt.printBuffer(buf);
            setPrintMsg({ ok:true, text:"Berhasil dikirim ke printer!" });
        } catch(err) {
            setPrintMsg({ ok:false, text: err.message });
        } finally { setPrinting(false); }
    };

    const BT_UI = {
        idle:         { icon:<IconBluetooth size={15}/>,                             label: bt.devName ? `Hubungkan Ulang (${bt.devName})` : "Hubungkan Printer BT", cls:"bg-blue-500 hover:bg-blue-600 text-white" },
        connecting:   { icon:<IconLoader2 size={15} className="animate-spin"/>,      label:"Menghubungkan...",  cls:"bg-blue-400 text-white cursor-wait" },
        reconnecting: { icon:<IconLoader2 size={15} className="animate-spin"/>,      label:"Menyambung ulang...", cls:"bg-amber-400 text-white cursor-wait" },
        connected:    { icon:<IconBluetoothConnected size={15}/>,                    label: bt.device?.name ?? bt.devName ?? "Terhubung", cls:"bg-emerald-500 hover:bg-emerald-600 text-white" },
        error:        { icon:<IconBluetoothOff size={15}/>,                          label:"Gagal — Coba Lagi", cls:"bg-red-500 hover:bg-red-600 text-white" },
    }[bt.status] ?? { icon:<IconBluetooth size={15}/>, label:"Hubungkan", cls:"bg-blue-500 hover:bg-blue-600 text-white" };

    const btOnClick = bt.status === "connected"   ? bt.disconnect
                    : bt.status === "idle" && bt.devName ? bt.reconnect
                    : bt.connect;

    return (
        <>
            <Head title={`Struk ${sale.sale_number}`}/>
            <style>{`
                @media print {
                    body * { visibility:hidden !important; }
                    #print-area, #print-area * { visibility:visible !important; }
                    #print-area { position:fixed; inset:0; display:flex; justify-content:center; }
                    .no-print { display:none !important; }
                }
            `}</style>

            <div className="min-h-screen bg-slate-100 dark:bg-slate-950">

                {/* ── Sticky Top Bar ── */}
                <div className="no-print sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="max-w-2xl mx-auto px-4 py-3 space-y-2.5">

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {fromTransaction && (
                                    <Link href={route("transactions.index")}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-sm font-semibold text-white shadow shadow-primary-500/30">
                                        <IconShoppingBag size={15}/> Transaksi Baru
                                    </Link>
                                )}
                                <Link href={route("transactions.history")}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50">
                                    <IconArrowLeft size={15}/> Riwayat
                                </Link>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
                                    {[
                                        {key:"invoice",   label:"Invoice", Icon:IconFileInvoice},
                                        {key:"thermal80", label:"80mm",    Icon:IconReceipt},
                                        {key:"thermal58", label:"58mm",    Icon:IconReceipt},
                                    ].map(({key,label,Icon}) => (
                                        <button key={key} onClick={() => setMode(key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                                                mode===key ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow"
                                                           : "text-slate-500 hover:text-slate-700"}`}>
                                            <Icon size={13}/> {label}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => window.print()}
                                    title="Cetak via browser"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 hover:bg-slate-50">
                                    <IconPrinter size={15}/>
                                </button>
                            </div>
                        </div>

                        {/* Bluetooth bar — hanya thermal */}
                        {(mode === "thermal80" || mode === "thermal58") && (
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">

                                {/* Panduan pairing — tampil selama belum connected */}
                                {bt.status !== "connected" && bt.supported && (
                                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                        <span className="text-base leading-none mt-0.5">📋</span>
                                        <div className="space-y-0.5">
                                            <p className="font-semibold">Sebelum connect, pastikan sudah pairing dulu:</p>
                                            <p>1. Buka <strong>Pengaturan → Bluetooth</strong> di tablet/HP</p>
                                            <p>2. Cari nama printer → Tap <strong>Pasangkan</strong></p>
                                            <p>3. Masukkan PIN: <strong>0000</strong> atau <strong>1234</strong></p>
                                            <p>4. Kembali ke sini → tap <strong>Hubungkan Printer BT</strong></p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={btOnClick}
                                        disabled={bt.status === "connecting" || bt.status === "reconnecting"}
                                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${BT_UI.cls}`}>
                                        {BT_UI.icon} {BT_UI.label}
                                    </button>

                                    {bt.status === "connected" && (
                                        <button onClick={handleBtPrint} disabled={printing}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white disabled:opacity-60">
                                            {printing
                                                ? <><IconLoader2 size={14} className="animate-spin"/> Mengirim...</>
                                                : <><IconPrinter size={14}/> Cetak Bluetooth</>}
                                        </button>
                                    )}

                                    {bt.error && (
                                        <div className="flex flex-col gap-1 w-full">
                                            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                                                <IconAlertCircle size={13}/> {bt.error}
                                            </span>
                                            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg space-y-1">
                                                <p>💡 <strong>Langkah troubleshoot:</strong></p>
                                                <p>1. Settings Bluetooth Android → hapus/forget printer</p>
                                                <p>2. Pairing ulang — masukkan PIN <strong>0000</strong> atau <strong>1234</strong></p>
                                                <p>3. Pastikan lampu printer berkedip (mode pairing)</p>
                                                <p>4. Klik tombol <strong>"Scan UUID"</strong> di bawah untuk cek service printer</p>
                                            </div>
                                            <button onClick={bt.scanUuids}
                                                className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-medium text-slate-700">
                                                🔍 Scan UUID Printer
                                            </button>
                                            {bt.foundUuids.length > 0 && (
                                                <div className="text-xs bg-slate-800 text-green-400 px-3 py-2 rounded-lg font-mono">
                                                    <p className="text-slate-400 mb-1">Services ditemukan:</p>
                                                    {bt.foundUuids.map((u,i) => <p key={i}>{u}</p>)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {printMsg && (
                                        <span className={`text-xs px-3 py-1.5 rounded-lg ${printMsg.ok ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                                            {printMsg.ok ? "✓" : "✗"} {printMsg.text}
                                        </span>
                                    )}
                                    {!bt.supported && (
                                        <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                                            ⚠️ Web Bluetooth butuh Chrome + HTTPS
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Success Banner */}
                {showSuccess && (
                    <div className="no-print max-w-2xl mx-auto px-4 pt-4">
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <IconCheck size={16} className="text-white"/>
                            </div>
                            <div>
                                <p className="font-semibold text-emerald-800 text-sm">Transaksi berhasil!</p>
                                <p className="text-xs text-emerald-600">{sale.sale_number} · {fmt(sale.total)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Print Area */}
                <div id="print-area" className="max-w-2xl mx-auto px-4 py-5">
                    {mode === "invoice" && (
                        <InvoiceView sale={sale} saleItems={saleItems} payments={payments}
                            totalPaid={totalPaid} change={change} statusInfo={statusInfo}/>
                    )}
                    {(mode === "thermal80" || mode === "thermal58") && (
                        <div className="flex justify-center py-2">
                            <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 w-full ${is58 ? "max-w-[220px]" : "max-w-sm"}`}>
                                <ReceiptPreview sale={sale} saleItems={saleItems}
                                    payments={payments} change={change} is58={is58}/>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Receipt Preview — tampilan preview struk di layar (mirip struk fisik)
// ═════════════════════════════════════════════════════════════════════════════
function ReceiptPreview({ sale, saleItems, payments, change, is58 }) {
    const fs   = is58 ? 9  : 11;
    const fsXL = is58 ? 18 : 22;
    const fsSM = is58 ? 8  : 10;
    const font = "'Courier New', Courier, monospace";

    const base  = { fontFamily:font, fontSize:fs,   lineHeight:1.8,  color:"#111" };
    const sm    = { fontFamily:font, fontSize:fsSM, lineHeight:1.6,  color:"#555" };

    // 2 kolom: kiri flex, kanan shrink
    const Row2 = ({ left, right, bold=false, large=false }) => (
        <div style={{ display:"flex", justifyContent:"space-between", gap:4,
            fontFamily:font, fontSize:large?(fs+2):fs, lineHeight:1.8,
            fontWeight:bold?"bold":"normal", color:"#111" }}>
            <span style={{ flex:1 }}>{left}</span>
            <span style={{ flexShrink:0 }}>{right}</span>
        </div>
    );

    // Garis solid tipis
    const Line  = () => <div style={{ borderTop:"1px solid #888", margin:"6px 0" }}/>;
    // Garis putus-putus
    const Dash  = () => <div style={{ borderTop:"1px dashed #aaa", margin:"6px 0" }}/>;
    const Gap   = ({h=6}) => <div style={{ height:h }}/>;

    return (
        <div style={{ padding:"20px 16px", ...base, background:"#fff" }}>

            {/* ══ BRAND ══ */}
            <div style={{ textAlign:"center", marginBottom:6 }}>
                <div style={{ fontFamily:font, fontSize:fsXL, fontWeight:"900",
                              letterSpacing:2, color:"#111", lineHeight:1.2 }}>
                    HARUMNYA
                </div>
            </div>

            <Line/>

            {/* ══ INFO TOKO ══ */}
            <div style={{ textAlign:"center", marginBottom:6 }}>
                <div style={{ fontWeight:"bold", fontSize:fs+1, fontFamily:font }}>
                    {sale.store?.name ?? "PARFUM CUSTOM"}
                </div>
                {sale.store?.address && (
                    <div style={{ ...sm, marginTop:2, lineHeight:1.5 }}>
                        {sale.store.address}
                    </div>
                )}
                {sale.store?.phone && (
                    <div style={sm}>{sale.store.phone}</div>
                )}
            </div>

            <Line/>
            <Gap/>

            {/* ══ INFO TRANSAKSI ══ */}
            <Row2 left={fmtDate(sale.sold_at)} right={fmtTime(sale.sold_at)}/>
            <Row2 left="Receipt Number" right={sale.sale_number}/>
            <Row2 left="Collected By"   right={sale.cashier?.name ?? sale.cashier_name ?? "-"}/>
            {(sale.customer?.name || sale.customer_name) && (
                <Row2 left="Customer" right={sale.customer?.name ?? sale.customer_name}/>
            )}
            {sale.sales_person?.name && (
                <>
                    <Gap h={4}/>
                    <div style={{ textAlign:"center", fontWeight:"bold", fontFamily:font, fontSize:fs }}>
                        *Sales: {sale.sales_person.name}*
                    </div>
                </>
            )}

            <Gap/>
            <Dash/>

            {/* ══ ITEMS ══ */}
            {saleItems.map((item, i) => {
                const qty    = getQty(item);
                const isFree = Number(item.unit_price) === 0;
                const pkgs   = item.packagings ?? item.sale_item_packagings ?? [];
                const name   = String(item.product_name
                    ?? [item.variant_name, item.intensity_code, item.size_ml ? item.size_ml+"ml" : null]
                        .filter(Boolean).join(" ")
                    ?? "Item");

                return (
                    <div key={i} style={{ marginBottom:8 }}>
                        {/* Nama produk bold */}
                        <div style={{ fontWeight:"bold", fontFamily:font, fontSize:fs,
                                      lineHeight:1.5, wordBreak:"break-word" }}>
                            {name}
                        </div>
                        <Row2
                            left={`${qty}x   @${isFree ? "0" : fmtN(item.unit_price)}`}
                            right={isFree ? "0" : fmtN(item.subtotal)}
                        />
                        {pkgs.map((p, j) => {
                            const pqty  = getQty(p);
                            const pFree = Number(p.unit_price) === 0;
                            const pName = String(p.packaging_name ?? p.packaging_material?.name ?? "Kemasan");
                            return (
                                <div key={j} style={{ marginTop:3 }}>
                                    <div style={{ fontWeight:"bold", fontFamily:font, fontSize:fs }}>
                                        {pName}
                                    </div>
                                    {pFree && (
                                        <div style={{ fontFamily:font, fontSize:fs }}>S (Free)</div>
                                    )}
                                    <Row2
                                        left={`${pqty}x   @${fmtN(p.unit_price)}${pFree ? " (Free)" : ""}`}
                                        right={pFree ? "0" : fmtN(p.unit_price * pqty)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            <Dash/>

            {/* ══ SUBTOTAL ══ */}
            <Row2 left="Subtotal" right={"Rp " + fmtN(sale.subtotal_perfume ?? 0)}/>
            {Number(sale.subtotal_packaging) > 0 && (
                <Row2 left="Kemasan" right={"Rp " + fmtN(sale.subtotal_packaging)}/>
            )}
            {Number(sale.discount_amount) > 0 && (
                <Row2 left="Diskon" right={"- Rp " + fmtN(sale.discount_amount)}/>
            )}
            {Number(sale.points_redemption_value) > 0 && (
                <Row2 left="Redeem Poin" right={"- Rp " + fmtN(sale.points_redemption_value)}/>
            )}

            <Dash/>

            {/* ══ TOTAL — lebih besar ══ */}
            <Row2 left="Total" right={"Rp " + fmtN(sale.total)} bold large/>

            <Dash/>

            {/* ══ PEMBAYARAN ══ */}
            {payments.map((p, i) => {
                const mName = String(p.payment_method?.name ?? p.payment_method_name ?? "Cash");
                return <Row2 key={i} left={mName} right={"Rp " + fmtN(p.amount)}/>;
            })}
            {change > 0 && <Row2 left="Change" right={"Rp " + fmtN(change)}/>}
            {Number(sale.points_earned) > 0 && (
                <Row2 left="Poin +" right={sale.points_earned + " poin"}/>
            )}

            <Dash/>
            <Gap h={8}/>

            {/* ══ FOOTER ══ */}
            <div style={{ textAlign:"center", fontFamily:font, fontSize:fsSM, color:"#555", lineHeight:1.8 }}>
                <div>Terima kasih sudah berbelanja!</div>
                <div style={{ fontWeight:"bold", fontSize:fs, color:"#111", marginTop:2 }}>Harumnya</div>
            </div>

            <Gap h={8}/>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Invoice View
// ═════════════════════════════════════════════════════════════════════════════
function InvoiceView({ sale, saleItems, payments, totalPaid, change, statusInfo }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-6 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Invoice</p>
                        <p className="text-xl font-bold font-mono break-all">{sale.sale_number}</p>
                        <p className="text-sm text-slate-300 mt-1">{fmtDT(sale.sold_at)}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">{sale.store?.name ?? "-"}</p>
                        {sale.store?.address && <p className="text-xs text-slate-400 mt-0.5 max-w-[180px]">{sale.store.address}</p>}
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${statusInfo.cls}`}>{statusInfo.label}</span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-sm">
                <div>
                    <p className="text-xs text-slate-400 mb-0.5">Kasir</p>
                    <p className="font-medium">{sale.cashier?.name ?? sale.cashier_name ?? "-"}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-400 mb-0.5">Pelanggan</p>
                    <p className="font-medium">{sale.customer?.name ?? sale.customer_name ?? "Umum"}</p>
                    {sale.customer?.phone && <p className="text-xs text-slate-400">{sale.customer.phone}</p>}
                </div>
                {sale.sales_person?.name && (
                    <div>
                        <p className="text-xs text-slate-400 mb-0.5">Sales</p>
                        <p className="font-medium">{sale.sales_person.name}</p>
                    </div>
                )}
            </div>
            <div className="px-6 py-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Item Pembelian</p>
                {saleItems.map((item, i) => {
                    const qty    = getQty(item);
                    const isFree = Number(item.unit_price) === 0;
                    const pkgs   = item.packagings ?? item.sale_item_packagings ?? [];
                    const name   = item.product_name
                        ?? [item.variant_name, item.intensity_code, item.size_ml ? item.size_ml+"ml" : null].filter(Boolean).join(" - ")
                        ?? "Item";
                    return (
                        <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="flex items-start justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">{name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {qty} × {isFree ? <span className="text-emerald-600 font-semibold">GRATIS</span> : fmt(item.unit_price)}
                                    </p>
                                </div>
                                <p className="font-bold text-sm flex-shrink-0">{fmt(item.subtotal)}</p>
                            </div>
                            {pkgs.length > 0 && (
                                <div className="px-4 py-2 space-y-1 border-t border-slate-100 dark:border-slate-800">
                                    {pkgs.map((p, j) => {
                                        const pqty  = getQty(p);
                                        const pFree = Number(p.unit_price) === 0;
                                        return (
                                            <div key={j} className="flex justify-between text-xs text-slate-500">
                                                <span>📦 {p.packaging_name ?? p.packaging_material?.name ?? "Kemasan"} ×{pqty}</span>
                                                <span className={pFree?"text-emerald-600 font-semibold":""}>{pFree?"GRATIS":fmt(p.unit_price*pqty)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-sm">
                {Number(sale.subtotal_perfume)  > 0 && <IRow label="Sub Parfum"  val={fmt(sale.subtotal_perfume)}/>}
                {Number(sale.subtotal_packaging)> 0 && <IRow label="Sub Kemasan" val={fmt(sale.subtotal_packaging)}/>}
                {Number(sale.discount_amount)   > 0 && <IRow label={`Diskon${sale.discount_type_name?` (${sale.discount_type_name})`:""}`} val={`− ${fmt(sale.discount_amount)}`} cls="text-red-500"/>}
                {Number(sale.points_redemption_value) > 0 && <IRow label="Redeem Poin" val={`− ${fmt(sale.points_redemption_value)}`} cls="text-amber-600"/>}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-base">Total</span>
                    <span className="font-bold text-xl">{fmt(sale.total)}</span>
                </div>
                {payments.map((p,i) => (
                    <IRow key={i} label={`Bayar (${p.payment_method?.name ?? p.payment_method_name ?? "Cash"})`} val={fmt(p.amount)} cls="text-slate-500"/>
                ))}
                {change > 0 && (
                    <div className="flex justify-between font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">
                        <span>Kembalian</span><span>{fmt(change)}</span>
                    </div>
                )}
            </div>
            {Number(sale.cogs_total) > 0 && (
                <div className="mx-6 mb-4 px-4 py-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Internal — HPP</p>
                    {Number(sale.cogs_perfume)  > 0 && <IRow label="HPP Parfum"  val={fmt(sale.cogs_perfume)}/>}
                    {Number(sale.cogs_packaging)> 0 && <IRow label="HPP Kemasan" val={fmt(sale.cogs_packaging)}/>}
                    <IRow label="Total HPP"   val={fmt(sale.cogs_total)}    cls="font-semibold text-slate-500 border-t border-slate-200 pt-1"/>
                    <IRow label="Gross Profit" val={`${fmt(sale.gross_profit)} (${parseFloat(sale.gross_margin_pct??0).toFixed(1)}%)`}
                        cls={`font-bold ${Number(sale.gross_profit)>=0?"text-emerald-600":"text-red-500"}`}/>
                </div>
            )}
            {Number(sale.points_earned) > 0 && (
                <div className="mx-6 mb-4 flex justify-between items-center px-4 py-2.5 bg-amber-50 rounded-xl border border-amber-100 text-sm">
                    <span className="text-amber-700">⭐ Poin diperoleh</span>
                    <span className="font-bold text-amber-700">+{sale.points_earned} poin</span>
                </div>
            )}
            <div className="px-6 py-4 text-center border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-widest">Terima kasih telah berbelanja 🌸</p>
            </div>
        </div>
    );
}

function IRow({ label, val, cls="" }) {
    return (
        <div className={`flex justify-between ${cls || "text-slate-500 dark:text-slate-400"}`}>
            <span>{label}</span><span>{val}</span>
        </div>
    );
}
