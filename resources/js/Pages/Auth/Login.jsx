import { useEffect, useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import {
    IconMail,
    IconLock,
    IconEye,
    IconEyeOff,
    IconLoader2,
    IconSpray,
    IconDroplet,
    IconSparkles,
    IconArrowRight,
    IconShield,
} from "@tabler/icons-react";

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: "",
        password: "",
        remember: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(null);

    useEffect(() => {
        return () => reset("password");
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route("login"));
    };

    return (
        <>
            <Head title="Masuk - Harumnya" />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                :root {
                    --teal:        #56B8C3;
                    --teal-deep:   #3A9DAA;
                    --teal-dark:   #1A6B77;
                    --teal-light:  #82CDD6;
                    --teal-pale:   #B8E8ED;
                    --teal-ghost:  #E4F6F8;
                    --teal-ultra:  #F0FAFB;
                    --panel-dark:  #072328;
                    --panel-mid:   #0D3339;
                    --panel-soft:  #164D56;
                    --text:        #0D2B30;
                    --text-muted:  #5A8A90;
                    --white:       #FFFFFF;
                }

                .lr-root {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    min-height: 100vh;
                    display: flex;
                    background: var(--white);
                    position: relative;
                    overflow: hidden;
                }

                /* ══════════════════════════════
                   LEFT PANEL
                ══════════════════════════════ */
                .lr-left {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 60px;
                    overflow: hidden;
                    background: linear-gradient(145deg, var(--panel-dark) 0%, var(--panel-mid) 40%, #1A5F6A 75%, var(--teal-dark) 100%);
                }

                .lr-left-overlay {
                    position: absolute; inset: 0; z-index: 1;
                    background:
                        radial-gradient(ellipse 75% 55% at 20% 15%, rgba(86,184,195,0.4) 0%, transparent 55%),
                        radial-gradient(ellipse 60% 70% at 80% 85%, rgba(58,157,170,0.3) 0%, transparent 55%),
                        radial-gradient(ellipse 40% 40% at 50% 50%, rgba(86,184,195,0.08) 0%, transparent 65%);
                }

                /* Animated grid lines */
                .lr-grid {
                    position: absolute; inset: 0; z-index: 1; pointer-events: none;
                    background-image:
                        linear-gradient(rgba(86,184,195,0.08) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(86,184,195,0.08) 1px, transparent 1px);
                    background-size: 56px 56px;
                    animation: gridMove 20s linear infinite;
                }
                @keyframes gridMove {
                    0%   { background-position: 0 0; }
                    100% { background-position: 56px 56px; }
                }

                /* Concentric rings */
                .lr-ring {
                    position: absolute; border-radius: 50%;
                    border: 1px solid rgba(86,184,195,0.18);
                    pointer-events: none; z-index: 2;
                    animation: ringPulse 6s ease-in-out infinite;
                    top: 50%; left: 50%;
                }
                .lr-ring-1 { width: 560px; height: 560px; margin: -280px 0 0 -280px; animation-delay: 0s; }
                .lr-ring-2 { width: 380px; height: 380px; margin: -190px 0 0 -190px; animation-delay: -2s; border-style: dashed; opacity: 0.5; }
                .lr-ring-3 { width: 200px; height: 200px; margin: -100px 0 0 -100px; animation-delay: -4s; }
                @keyframes ringPulse {
                    0%, 100% { transform: scale(1);    opacity: 0.4; }
                    50%       { transform: scale(1.04); opacity: 0.9; }
                }

                /* Floating blobs */
                .lr-blob {
                    position: absolute; border-radius: 50%;
                    filter: blur(70px); pointer-events: none; z-index: 2;
                    animation: blobDrift 12s ease-in-out infinite;
                }
                .lr-blob-a {
                    width: 300px; height: 300px;
                    background: rgba(86,184,195,0.22);
                    top: -80px; left: -80px; animation-delay: 0s;
                }
                .lr-blob-b {
                    width: 220px; height: 220px;
                    background: rgba(130,205,214,0.18);
                    bottom: -60px; right: -60px; animation-delay: -5s;
                }
                @keyframes blobDrift {
                    0%, 100% { transform: translate(0,0); }
                    33%  { transform: translate(20px,-28px); }
                    66%  { transform: translate(-14px,16px); }
                }

                /* Content */
                .lr-left-content {
                    position: relative; z-index: 3;
                    text-align: center;
                    animation: contentIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both;
                }
                @keyframes contentIn {
                    from { opacity: 0; transform: translateY(30px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                /* Logo showcase */
                .lr-left-logo {
                    width: 140px; height: 140px;
                    border-radius: 32px;
                    overflow: hidden;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 36px;
                    border: 1.5px solid rgba(86,184,195,0.35);
                    box-shadow:
                        0 0 0 8px rgba(86,184,195,0.07),
                        0 0 60px rgba(86,184,195,0.3),
                        0 0 120px rgba(86,184,195,0.1);
                    animation: logoFloat 7s ease-in-out infinite;
                }
                @keyframes logoFloat {
                    0%, 100% { transform: translateY(0px); }
                    50%       { transform: translateY(-14px); }
                }
                .lr-left-logo img {
                    width: 100%; height: 100%; object-fit: cover; display: block;
                }

                .lr-left-headline {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 48px; font-weight: 700;
                    color: #fff; line-height: 1.1;
                    letter-spacing: -0.5px;
                    text-shadow: 0 2px 24px rgba(0,0,0,0.25);
                }
                .lr-left-headline em {
                    font-style: italic;
                    color: var(--teal-pale);
                    display: block;
                }

                .lr-teal-divider {
                    width: 56px; height: 2px;
                    background: linear-gradient(90deg, transparent, var(--teal-light), transparent);
                    margin: 26px auto;
                }

                .lr-left-desc {
                    font-size: 13.5px; font-weight: 300;
                    color: rgba(184,232,237,0.7);
                    line-height: 1.75; max-width: 320px; margin: 0 auto;
                }

                .lr-features {
                    display: flex; flex-direction: column;
                    gap: 11px; margin-top: 32px;
                    max-width: 300px; margin-left: auto; margin-right: auto;
                    text-align: left;
                }
                .lr-feat {
                    display: flex; align-items: center; gap: 12px;
                    padding: 11px 15px; border-radius: 12px;
                    background: rgba(86,184,195,0.1);
                    border: 1px solid rgba(86,184,195,0.2);
                    backdrop-filter: blur(8px);
                    animation: featIn 0.5s ease both;
                }
                .lr-feat:nth-child(1) { animation-delay: 0.2s; }
                .lr-feat:nth-child(2) { animation-delay: 0.35s; }
                .lr-feat:nth-child(3) { animation-delay: 0.5s; }
                @keyframes featIn {
                    from { opacity: 0; transform: translateX(-18px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .lr-feat-dot {
                    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
                    background: var(--teal-light);
                    box-shadow: 0 0 8px rgba(130,205,214,0.7);
                }
                .lr-feat-text { font-size: 12px; font-weight: 500; color: rgba(184,232,237,0.85); }

                /* ══════════════════════════════
                   RIGHT PANEL
                ══════════════════════════════ */
                .lr-right {
                    width: 500px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    padding: 48px 56px;
                    background: var(--white);
                    position: relative; overflow-y: auto;
                }

                .lr-right::before {
                    content: '';
                    position: absolute; top: 0; right: 0;
                    width: 240px; height: 240px;
                    background: radial-gradient(ellipse at top right, rgba(86,184,195,0.07) 0%, transparent 65%);
                    pointer-events: none;
                }
                .lr-right::after {
                    content: '';
                    position: absolute; bottom: 0; left: 0;
                    width: 200px; height: 200px;
                    background: radial-gradient(ellipse at bottom left, rgba(86,184,195,0.05) 0%, transparent 65%);
                    pointer-events: none;
                }

                /* Teal accent bar */
                .lr-right-accent {
                    position: absolute; left: 0; top: 15%; bottom: 15%;
                    width: 3px;
                    background: linear-gradient(180deg, transparent, var(--teal) 30%, var(--teal-light) 60%, var(--teal) 85%, transparent);
                    border-radius: 0 3px 3px 0;
                }

                .lr-form-inner {
                    width: 100%; max-width: 370px;
                    animation: formIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both;
                }
                @keyframes formIn {
                    from { opacity: 0; transform: translateX(28px); }
                    to   { opacity: 1; transform: translateX(0); }
                }

                /* Brand */
                .lr-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 38px; }
                .lr-logo-link {
                    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
                    overflow: hidden;
                    border: 2px solid rgba(86,184,195,0.3);
                    box-shadow: 0 6px 24px rgba(86,184,195,0.25);
                    transition: transform 0.3s, box-shadow 0.3s;
                    text-decoration: none; display: block;
                }
                .lr-logo-link:hover { transform: rotate(-6deg) scale(1.08); box-shadow: 0 10px 32px rgba(86,184,195,0.45); }
                .lr-logo-link img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .lr-brand-name {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 26px; font-weight: 700; color: var(--text); line-height: 1; letter-spacing: -0.3px;
                }
                .lr-brand-sub {
                    font-size: 10px; font-weight: 600; letter-spacing: 2px;
                    text-transform: uppercase; color: var(--teal); margin-top: 4px;
                }

                /* Heading */
                .lr-heading { margin-bottom: 34px; }
                .lr-title {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 36px; font-weight: 700; color: var(--text);
                    line-height: 1.15; margin-bottom: 8px;
                }
                .lr-title span { color: var(--teal-deep); }
                .lr-subtitle { font-size: 13.5px; font-weight: 300; color: var(--text-muted); line-height: 1.65; }

                /* Status */
                .lr-status {
                    padding: 13px 15px; border-radius: 12px;
                    background: var(--teal-ultra);
                    border: 1px solid rgba(86,184,195,0.3);
                    color: var(--teal-deep); font-size: 13px;
                    display: flex; align-items: center; gap: 9px;
                    margin-bottom: 22px;
                }

                /* Fields */
                .lr-field { margin-bottom: 19px; }
                .lr-label {
                    display: block; margin-bottom: 8px;
                    font-size: 11px; font-weight: 700;
                    letter-spacing: 1.2px; text-transform: uppercase;
                    color: var(--text);
                }
                .lr-input-wrap { position: relative; display: flex; align-items: center; }
                .lr-input-icon {
                    position: absolute; left: 16px;
                    color: #A0C4C8; pointer-events: none; display: flex;
                    transition: color 0.2s; z-index: 1;
                }
                .lr-input-wrap:focus-within .lr-input-icon { color: var(--teal); }
                .lr-input {
                    width: 100%; height: 52px;
                    padding: 0 50px 0 50px;
                    background: var(--teal-ultra);
                    border: 2px solid #D5EFF1;
                    border-radius: 13px;
                    color: var(--text);
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    font-size: 14px; outline: none;
                    transition: all 0.25s;
                    caret-color: var(--teal);
                }
                .lr-input::placeholder { color: #A8CACF; font-size: 13.5px; }
                .lr-input:focus {
                    background: var(--white);
                    border-color: var(--teal);
                    box-shadow: 0 0 0 4px rgba(86,184,195,0.13), 0 2px 10px rgba(86,184,195,0.08);
                }
                .lr-input.lr-err { border-color: #E05252; background: #FFF5F5; }
                .lr-eye-btn {
                    position: absolute; right: 13px;
                    background: none; border: none; cursor: pointer;
                    padding: 8px; border-radius: 8px;
                    color: #A0C4C8; transition: all 0.2s; display: flex; z-index: 1;
                }
                .lr-eye-btn:hover { color: var(--teal); background: rgba(86,184,195,0.1); }
                .lr-error-msg { font-size: 12px; color: #E05252; margin-top: 5px; padding-left: 2px; }

                /* Options */
                .lr-options { display: flex; align-items: center; justify-content: space-between; margin: 22px 0; }
                .lr-remember { display: flex; align-items: center; gap: 9px; cursor: pointer; }
                .lr-check-wrap {
                    width: 20px; height: 20px; border-radius: 6px;
                    border: 2px solid #D5EFF1;
                    background: var(--teal-ultra);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.2s; flex-shrink: 0; position: relative;
                }
                .lr-check-wrap input[type="checkbox"] {
                    position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; margin: 0;
                }
                .lr-check-wrap:has(input:checked) { background: var(--teal); border-color: var(--teal); }
                .lr-check-tick {
                    width: 10px; height: 10px;
                    border-bottom: 2px solid white; border-right: 2px solid white;
                    transform: rotate(45deg) translateY(-2px);
                    opacity: 0; pointer-events: none; transition: opacity 0.15s;
                }
                .lr-check-wrap:has(input:checked) .lr-check-tick { opacity: 1; }
                .lr-remember-text { font-size: 13px; color: var(--text-muted); }
                .lr-forgot {
                    font-size: 13px; font-weight: 700; color: var(--teal-deep);
                    text-decoration: none; position: relative; transition: color 0.2s;
                }
                .lr-forgot::after {
                    content: ''; position: absolute;
                    bottom: -1px; left: 0; right: 0; height: 1.5px;
                    background: var(--teal); transform: scaleX(0); transform-origin: left;
                    transition: transform 0.25s;
                }
                .lr-forgot:hover { color: var(--teal); }
                .lr-forgot:hover::after { transform: scaleX(1); }

                /* Submit */
                .lr-submit {
                    width: 100%; height: 54px;
                    border: none; border-radius: 14px; cursor: pointer;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    font-size: 15px; font-weight: 700;
                    color: var(--white);
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    position: relative; overflow: hidden;
                    background: linear-gradient(105deg, var(--panel-mid) 0%, var(--teal-dark) 30%, var(--teal-deep) 55%, var(--teal) 80%, var(--teal-light) 100%);
                    background-size: 250% 100%;
                    background-position: 100% 0;
                    box-shadow: 0 6px 28px rgba(86,184,195,0.4), 0 1px 0 rgba(255,255,255,0.15) inset;
                    transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
                    letter-spacing: 0.2px;
                }
                .lr-submit:hover:not(:disabled) {
                    background-position: 0% 0;
                    transform: translateY(-2px);
                    box-shadow: 0 14px 40px rgba(86,184,195,0.5);
                }
                .lr-submit:active:not(:disabled) { transform: translateY(0); }
                .lr-submit:disabled { opacity: 0.65; cursor: not-allowed; }
                .lr-submit-arrow { transition: transform 0.3s; }
                .lr-submit:hover .lr-submit-arrow { transform: translateX(5px); }

                /* Divider */
                .lr-or { display: flex; align-items: center; gap: 14px; margin: 22px 0; }
                .lr-or-line { flex: 1; height: 1px; background: #E0F0F2; }
                .lr-or-text { font-size: 11px; color: #A8CACF; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }

                /* Security strip */
                .lr-security {
                    display: flex; align-items: center; gap: 12px;
                    padding: 14px 16px; border-radius: 13px;
                    background: var(--teal-ultra);
                    border: 1px solid rgba(86,184,195,0.2);
                }
                .lr-security-icon {
                    width: 36px; height: 36px; flex-shrink: 0;
                    border-radius: 10px;
                    background: linear-gradient(135deg, var(--teal-dark) 0%, var(--teal) 100%);
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px rgba(86,184,195,0.35);
                }
                .lr-security-title { font-size: 12.5px; font-weight: 700; color: var(--text); }
                .lr-security-text { font-size: 11.5px; color: var(--text-muted); font-weight: 300; margin-top: 2px; line-height: 1.4; }

                /* Footer */
                .lr-footer {
                    margin-top: 30px; padding-top: 22px;
                    border-top: 1px solid #E8F5F6;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .lr-footer-copy { font-size: 11px; color: #A8CACF; letter-spacing: 0.5px; }
                .lr-footer-badges { display: flex; gap: 7px; }
                .lr-badge-mini {
                    padding: 5px 10px; border-radius: 100px;
                    font-size: 10.5px; font-weight: 700;
                    background: var(--teal-ghost);
                    color: var(--teal-deep);
                    border: 1px solid rgba(86,184,195,0.25);
                }

                /* Spinner */
                @keyframes lr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .lr-spinner { animation: lr-spin 0.75s linear infinite; }

                /* Responsive */
                @media (max-width: 900px) {
                    .lr-left { display: none; }
                    .lr-right { width: 100%; padding: 40px 28px; }
                }
                @media (max-width: 480px) {
                    .lr-right { padding: 32px 20px; }
                    .lr-title { font-size: 28px; }
                }
            `}</style>

            <div className="lr-root">

                {/* ══ LEFT PANEL ══ */}
                <div className="lr-left">
                    <div className="lr-left-overlay"></div>
                    <div className="lr-grid"></div>
                    <div className="lr-ring lr-ring-1"></div>
                    <div className="lr-ring lr-ring-2"></div>
                    <div className="lr-ring lr-ring-3"></div>
                    <div className="lr-blob lr-blob-a"></div>
                    <div className="lr-blob lr-blob-b"></div>

                    <div className="lr-left-content">
                        <div className="lr-left-logo">
                            <img src="/Logo.png" alt="Harumnya Parfum" />
                        </div>

                        <h2 className="lr-left-headline">
                            Satu Platform
                            <em>untuk Semua</em>
                            Parfum Anda
                        </h2>

                        <div className="lr-teal-divider"></div>

                        <p className="lr-left-desc">
                            Kelola bisnis parfum custom Anda dengan mudah — dari stok bibit hingga transaksi harian
                        </p>

                        <div className="lr-features">
                            {[
                                "Manajemen stok bibit & botol real-time",
                                "Sistem varian & custom racikan parfum",
                                "Laporan transaksi & penjualan harian",
                            ].map((text, i) => (
                                <div key={i} className="lr-feat">
                                    <div className="lr-feat-dot"></div>
                                    <span className="lr-feat-text">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT PANEL ══ */}
                <div className="lr-right">
                    <div className="lr-right-accent"></div>

                    <div className="lr-form-inner">

                        {/* Brand */}
                        <div className="lr-brand">
                            <Link href="/" className="lr-logo-link">
                                <img src="/Logo.png" alt="Harumnya" />
                            </Link>
                            <div>
                                <div className="lr-brand-name">Harumnya</div>
                                <div className="lr-brand-sub">Perfume POS System</div>
                            </div>
                        </div>

                        {/* Heading */}
                        <div className="lr-heading">
                            <h1 className="lr-title">Selamat <span>Datang</span> 👋</h1>
                            <p className="lr-subtitle">Masuk ke dashboard untuk mengelola stok & transaksi parfum Anda</p>
                        </div>

                        {status && (
                            <div className="lr-status">
                                <IconSparkles size={16} color="#3A9DAA" />
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit}>
                            <div className="lr-field">
                                <label className="lr-label">Email Address</label>
                                <div className="lr-input-wrap">
                                    <span className="lr-input-icon"><IconMail size={18} /></span>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData("email", e.target.value)}
                                        onFocus={() => setFocused("email")}
                                        onBlur={() => setFocused(null)}
                                        placeholder="admin@harumnya.com"
                                        className={`lr-input${errors.email ? " lr-err" : ""}`}
                                        autoComplete="email"
                                    />
                                </div>
                                {errors.email && <div className="lr-error-msg">⚠ {errors.email}</div>}
                            </div>

                            <div className="lr-field">
                                <label className="lr-label">Password</label>
                                <div className="lr-input-wrap">
                                    <span className="lr-input-icon"><IconLock size={18} /></span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={data.password}
                                        onChange={(e) => setData("password", e.target.value)}
                                        onFocus={() => setFocused("password")}
                                        onBlur={() => setFocused(null)}
                                        placeholder="••••••••"
                                        className={`lr-input${errors.password ? " lr-err" : ""}`}
                                        autoComplete="current-password"
                                    />
                                    <button type="button" className="lr-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                    </button>
                                </div>
                                {errors.password && <div className="lr-error-msg">⚠ {errors.password}</div>}
                            </div>

                            <div className="lr-options">
                                <label className="lr-remember">
                                    <div className="lr-check-wrap">
                                        <input
                                            type="checkbox"
                                            checked={data.remember}
                                            onChange={(e) => setData("remember", e.target.checked)}
                                        />
                                        <div className="lr-check-tick"></div>
                                    </div>
                                    <span className="lr-remember-text">Ingat saya</span>
                                </label>
                                {/* {canResetPassword && (
                                    <Link href={route("password.request")} className="lr-forgot">
                                        Lupa Password?
                                    </Link>
                                )} */}
                            </div>

                            <button type="submit" disabled={processing} className="lr-submit">
                                {processing ? (
                                    <>
                                        <IconLoader2 size={21} className="lr-spinner" />
                                        <span>Memproses...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Masuk ke Dashboard</span>
                                        <span className="lr-submit-arrow"><IconArrowRight size={19} /></span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="lr-or">
                            <div className="lr-or-line"></div>
                            <span className="lr-or-text">Sistem Aman</span>
                            <div className="lr-or-line"></div>
                        </div>

                        <div className="lr-security">
                            <div className="lr-security-icon">
                                <IconShield size={18} color="#fff" />
                            </div>
                            <div>
                                <div className="lr-security-title">Koneksi Terenkripsi</div>
                                <div className="lr-security-text">Data Anda dilindungi dengan enkripsi end-to-end</div>
                            </div>
                        </div>

                        <div className="lr-footer">
                            <span className="lr-footer-copy">© 2026 Harumnya Parfum</span>
                            <div className="lr-footer-badges">
                                <span className="lr-badge-mini">v1.0</span>
                                <span className="lr-badge-mini">POS</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </>
    );
}
