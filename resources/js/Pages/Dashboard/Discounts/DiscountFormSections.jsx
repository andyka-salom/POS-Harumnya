/**
 * DiscountFormSections.jsx
 * Shared form section components for Create and Edit pages.
 *
 * Product structure: Variant (perfume name) × Intensity (EDT/EDP/EXT) × Size (ml)
 *
 * FIXES:
 *  - Dropdown SearchableSelect: portal ke document.body agar tidak terpotong overflow-hidden
 *  - EmptyState, Row, SectionCard, dll. dipertahankan
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    IconPlus,
    IconTrash,
    IconPackage,
    IconGift,
    IconListCheck,
    IconSearch,
    IconX,
    IconChevronDown,
    IconAlertCircle,
} from "@tabler/icons-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const optionLabel = (o) => {
    if (!o) return "";
    if (o.volume_ml) return `${o.name} (${o.volume_ml}ml)`;
    if (o.code)      return `${o.name} (${o.code})`;
    return o.name ?? "";
};

// UUID comparison — normalise ke string lowercase agar tidak gagal karena tipe/case
const sameId = (a, b) => {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return String(a).toLowerCase().trim() === String(b).toLowerCase().trim();
};

// ─── SearchableSelect ─────────────────────────────────────────────────────────
// FIX: Dropdown dirender via React Portal ke document.body agar tidak terpotong
// oleh overflow-hidden / overflow-y-auto pada parent card manapun.

function SearchableSelect({
    label,
    value,
    onChange,
    options = [],
    nullable = true,
    placeholder = "Cari...",
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [dropdownStyle, setDropdownStyle] = useState({});
    const buttonRef = useRef(null);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    const selected = options.find((o) => sameId(o.id, value)) ?? null;
    const filtered = query.trim()
        ? options.filter((o) =>
              optionLabel(o).toLowerCase().includes(query.toLowerCase())
          )
        : options;

    // Hitung posisi dropdown — position:fixed pakai koordinat VIEWPORT (tanpa scroll offset)
    const updateDropdownPosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 260;

        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setDropdownStyle({
            position: "fixed",
            // FIX: fixed positioning pakai viewport coords, TANPA scrollX/scrollY
            left: rect.left,
            width: Math.max(rect.width, 220),
            zIndex: 9999,
            ...(openUpward
                ? { bottom: window.innerHeight - rect.top, top: "auto" }
                : { top: rect.bottom + 4, bottom: "auto" }),
        });
    }, []);

    // Tutup dropdown saat klik di luar
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (
                buttonRef.current &&
                !buttonRef.current.contains(e.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Update posisi saat scroll atau resize
    useEffect(() => {
        if (!open) return;
        const handler = () => updateDropdownPosition();
        window.addEventListener("scroll", handler, true);
        window.addEventListener("resize", handler);
        return () => {
            window.removeEventListener("scroll", handler, true);
            window.removeEventListener("resize", handler);
        };
    }, [open, updateDropdownPosition]);

    useEffect(() => {
        if (open) {
            updateDropdownPosition();
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [open, updateDropdownPosition]);

    const select = useCallback(
        (id) => {
            onChange(id);
            setOpen(false);
            setQuery("");
        },
        [onChange]
    );

    const clear = useCallback(
        (e) => {
            e.stopPropagation();
            onChange(null);
            setQuery("");
        },
        [onChange]
    );

    const dropdown = open
        ? createPortal(
              <div
                  ref={dropdownRef}
                  style={dropdownStyle}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden"
              >
                  {/* Search input */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <IconSearch
                          size={12}
                          className="text-slate-400 flex-shrink-0"
                      />
                      <input
                          ref={inputRef}
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={placeholder}
                          className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400"
                      />
                      {query && (
                          <button
                              type="button"
                              onMouseDown={(e) => {
                                  e.preventDefault();
                                  setQuery("");
                              }}
                              className="text-slate-300 hover:text-slate-500"
                          >
                              <IconX size={10} />
                          </button>
                      )}
                  </div>
                  {/* Options */}
                  <ul className="max-h-48 overflow-y-auto py-1">
                      {nullable && (
                          <li>
                              <button
                                  type="button"
                                  onMouseDown={(e) => {
                                      e.preventDefault();
                                      select(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                                      value === null
                                          ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold"
                                          : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 italic"
                                  }`}
                              >
                                  Semua
                              </button>
                          </li>
                      )}
                      {filtered.length === 0 ? (
                          <li className="px-3 py-4 text-xs text-center text-slate-400">
                              Tidak ditemukan &quot;{query}&quot;
                          </li>
                      ) : (
                          filtered.map((o) => (
                              <li key={o.id}>
                                  <button
                                      type="button"
                                      onMouseDown={(e) => {
                                          e.preventDefault();
                                          select(o.id);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                                          sameId(value, o.id)
                                              ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
                                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                      }`}
                                  >
                                      {optionLabel(o)}
                                  </button>
                              </li>
                          ))
                      )}
                  </ul>
              </div>,
              document.body
          )
        : null;

    return (
        <div className="relative">
            {label && (
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    {label}
                </label>
            )}

            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`w-full flex items-center justify-between gap-2 text-sm rounded-lg border py-2 px-3 text-left transition-all ${
                    open
                        ? "border-slate-400 dark:border-slate-500 ring-2 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
            >
                <span
                    className={
                        selected
                            ? "text-slate-800 dark:text-slate-100 font-medium truncate"
                            : "text-slate-400 dark:text-slate-600"
                    }
                >
                    {selected
                        ? optionLabel(selected)
                        : nullable
                        ? "Semua"
                        : placeholder}
                </span>
                <span className="flex items-center gap-1 flex-shrink-0">
                    {selected && nullable && (
                        <span
                            role="button"
                            onClick={clear}
                            className="p-0.5 rounded text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            <IconX size={11} />
                        </span>
                    )}
                    <IconChevronDown
                        size={13}
                        className={`text-slate-400 transition-transform duration-150 ${
                            open ? "rotate-180" : ""
                        }`}
                    />
                </span>
            </button>

            {dropdown}
        </div>
    );
}

// ─── Select ───────────────────────────────────────────────────────────────────

function Select({
    label,
    value,
    onChange,
    options = [],
    nullable = true,
    className = "",
}) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    {label}
                </label>
            )}
            <select
                value={value ?? ""}
                onChange={(e) =>
                    onChange(e.target.value === "" ? null : e.target.value)
                }
                className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-transparent py-2 px-3 transition-all"
            >
                {nullable && <option value="">Semua</option>}
                {options.map((o) => (
                    <option key={o.id} value={o.id}>
                        {optionLabel(o)}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ─── NumberInput ──────────────────────────────────────────────────────────────

function NumberInput({
    label,
    value,
    onChange,
    min = 0,
    placeholder = "0",
    error,
}) {
    return (
        <div>
            {label && (
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    {label}
                </label>
            )}
            <input
                type="number"
                min={min}
                value={value ?? ""}
                onChange={(e) =>
                    onChange(
                        e.target.value === "" ? null : Number(e.target.value)
                    )
                }
                placeholder={placeholder}
                className={`w-full text-sm rounded-lg border bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:border-transparent py-2 px-3 transition-all ${
                    error
                        ? "border-red-400 dark:border-red-500 focus:ring-red-200 dark:focus:ring-red-900"
                        : "border-slate-200 dark:border-slate-700 focus:ring-slate-300 dark:focus:ring-slate-600"
                }`}
            />
            {error && (
                <p className="mt-1 text-[11px] text-red-500">{error}</p>
            )}
        </div>
    );
}

// ─── TextInput ────────────────────────────────────────────────────────────────

function TextInput({ label, value, onChange, placeholder = "" }) {
    return (
        <div>
            {label && (
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    {label}
                </label>
            )}
            <input
                type="text"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-transparent py-2 px-3 transition-all"
            />
        </div>
    );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({
    title,
    icon,
    description,
    children,
    onAdd,
    addLabel = "Tambah",
}) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-visible">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                        {icon} {title}
                    </h3>
                    {description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
                {onAdd && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all"
                    >
                        <IconPlus size={12} /> {addLabel}
                    </button>
                )}
            </div>
            {/* FIX: overflow-visible agar dropdown portal tidak di-clip */}
            <div className="p-5 overflow-visible">{children}</div>
        </div>
    );
}

// ─── RemoveBtn ────────────────────────────────────────────────────────────────

function RemoveBtn({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all flex-shrink-0"
            title="Hapus"
        >
            <IconTrash size={14} />
        </button>
    );
}

// ─── DimensionFilters ─────────────────────────────────────────────────────────

function DimensionFilters({
    item,
    index,
    onUpdate,
    variants,
    intensities,
    sizes,
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SearchableSelect
                label="Variant"
                value={item.variant_id}
                onChange={(v) => onUpdate(index, "variant_id", v)}
                options={variants}
                placeholder="Cari variant..."
            />
            <Select
                label="Intensity"
                value={item.intensity_id}
                onChange={(v) => onUpdate(index, "intensity_id", v)}
                options={intensities}
            />
            <Select
                label="Size"
                value={item.size_id}
                onChange={(v) => onUpdate(index, "size_id", v)}
                options={sizes}
            />
        </div>
    );
}

// ─── Row wrapper ──────────────────────────────────────────────────────────────

function Row({ children, className = "" }) {
    return (
        <div
            className={`p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3 overflow-visible ${className}`}
        >
            {children}
        </div>
    );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ text }) {
    return (
        <p className="text-xs text-slate-400 dark:text-slate-600 italic text-center py-4">
            {text}
        </p>
    );
}

// ─── PoolItems ────────────────────────────────────────────────────────────────

function PoolItems({ pools, onChange }) {
    const def = {
        label: "",
        product_id: null,
        variant_id: null,
        intensity_id: null,
        size_id: null,
        fixed_price: 0,
        probability: null,
        image_url: null,
        is_active: true,
        sort_order: 0,
    };

    const add = () =>
        onChange([...pools, { ...def, sort_order: pools.length }]);
    const remove = (i) => onChange(pools.filter((_, idx) => idx !== i));
    const update = (i, key, val) =>
        onChange(pools.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

    return (
        <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Pilihan Pool
                </span>
                <button
                    type="button"
                    onClick={add}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    <IconPlus size={11} /> Tambah
                </button>
            </div>
            {pools.length === 0 && (
                <EmptyState text="Belum ada pilihan pool." />
            )}
            {pools.map((pool, i) => (
                <div
                    key={i}
                    className="flex gap-2 items-start p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                    <div className="grid grid-cols-3 gap-2 flex-1">
                        <TextInput
                            label="Label"
                            value={pool.label}
                            onChange={(v) => update(i, "label", v)}
                            placeholder="Travel Size 10ml"
                        />
                        <NumberInput
                            label="Harga (0=gratis)"
                            value={pool.fixed_price}
                            onChange={(v) => update(i, "fixed_price", v)}
                            min={0}
                        />
                        <NumberInput
                            label="Bobot Plinko"
                            value={pool.probability}
                            onChange={(v) => update(i, "probability", v)}
                            min={1}
                            placeholder="1–100"
                        />
                    </div>
                    <RemoveBtn onClick={() => remove(i)} />
                </div>
            ))}
        </div>
    );
}

// ─── ApplicabilitiesSection ───────────────────────────────────────────────────

export function ApplicabilitiesSection({
    items,
    onChange,
    variants,
    intensities,
    sizes,
}) {
    const def = { variant_id: null, intensity_id: null, size_id: null };
    const add = () => onChange([...items, { ...def }]);
    const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
    const update = (i, key, val) =>
        onChange(
            items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it))
        );

    return (
        <SectionCard
            title="Berlaku untuk Produk"
            icon={<IconPackage size={15} className="text-slate-400" />}
            description="Kosong = berlaku semua produk. Tambah filter untuk membatasi produk tertentu."
            onAdd={add}
            addLabel="Tambah Filter"
        >
            {items.length === 0 ? (
                <EmptyState text="Tidak ada filter — diskon berlaku untuk semua produk." />
            ) : (
                <div className="space-y-2">
                    {items.map((item, i) => (
                        <Row key={i}>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <DimensionFilters
                                        item={item}
                                        index={i}
                                        onUpdate={update}
                                        variants={variants}
                                        intensities={intensities}
                                        sizes={sizes}
                                    />
                                </div>
                                <RemoveBtn onClick={() => remove(i)} />
                            </div>
                        </Row>
                    ))}
                </div>
            )}
        </SectionCard>
    );
}

// ─── RequirementsSection ──────────────────────────────────────────────────────

export function RequirementsSection({
    items,
    onChange,
    variants,
    intensities,
    sizes,
}) {
    const def = {
        variant_id: null,
        intensity_id: null,
        size_id: null,
        required_quantity: 1,
        matching_mode: "all",
        group_key: null,
    };
    const add = () => onChange([...items, { ...def }]);
    const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
    const update = (i, key, val) =>
        onChange(
            items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it))
        );

    return (
        <SectionCard
            title="Syarat Pembelian Produk"
            icon={<IconListCheck size={15} className="text-slate-400" />}
            description="Produk yang harus ada di cart. Group Key sama = kondisi OR."
            onAdd={add}
            addLabel="Tambah Syarat"
        >
            {items.length === 0 ? (
                <EmptyState text="Tidak ada syarat produk — diskon berlaku tanpa syarat produk spesifik." />
            ) : (
                <div className="space-y-2">
                    {items.map((item, i) => (
                        <Row key={i}>
                            <DimensionFilters
                                item={item}
                                index={i}
                                onUpdate={update}
                                variants={variants}
                                intensities={intensities}
                                sizes={sizes}
                            />
                            <div className="grid grid-cols-3 gap-3 items-end">
                                <NumberInput
                                    label="Min Qty"
                                    value={item.required_quantity}
                                    onChange={(v) =>
                                        update(i, "required_quantity", v)
                                    }
                                    min={1}
                                    placeholder="1"
                                />
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                                        Mode
                                    </label>
                                    <select
                                        value={item.matching_mode ?? "all"}
                                        onChange={(e) =>
                                            update(
                                                i,
                                                "matching_mode",
                                                e.target.value
                                            )
                                        }
                                        className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-transparent py-2 px-3 transition-all"
                                    >
                                        <option value="all">
                                            AND — semua
                                        </option>
                                        <option value="any">
                                            ANY — salah satu
                                        </option>
                                    </select>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <TextInput
                                        label="Group Key (OR)"
                                        value={item.group_key}
                                        onChange={(v) =>
                                            update(i, "group_key", v || null)
                                        }
                                        placeholder="mis: grp_a"
                                    />
                                    <RemoveBtn onClick={() => remove(i)} />
                                </div>
                            </div>
                            {item.group_key && (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                                    <IconAlertCircle size={11} />
                                    Group{" "}
                                    <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">
                                        {item.group_key}
                                    </code>{" "}
                                    dievaluasi secara OR
                                </div>
                            )}
                        </Row>
                    ))}
                </div>
            )}
        </SectionCard>
    );
}

// ─── RewardsSection ───────────────────────────────────────────────────────────

export function RewardsSection({
    items,
    onChange,
    variants,
    intensities,
    sizes,
}) {
    const def = {
        variant_id: null,
        intensity_id: null,
        size_id: null,
        reward_quantity: 1,
        customer_can_choose: false,
        is_pool: false,
        max_choices: 1,
        discount_percentage: 100,
        fixed_price: null,
        priority: 0,
        pools: [],
    };
    const add = () => onChange([...items, { ...def }]);
    const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
    const update = (i, key, val) =>
        onChange(
            items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it))
        );

    return (
        <SectionCard
            title="Reward / Produk Gratis"
            icon={<IconGift size={15} className="text-slate-400" />}
            description="Produk gratis jika syarat terpenuhi. Kosongkan variant untuk mengikuti produk yang dibeli."
            onAdd={add}
            addLabel="Tambah Reward"
        >
            {items.length === 0 ? (
                <EmptyState text="Belum ada reward dikonfigurasi." />
            ) : (
                <div className="space-y-3">
                    {items.map((item, i) => (
                        <Row key={i}>
                            <DimensionFilters
                                item={item}
                                index={i}
                                onUpdate={update}
                                variants={variants}
                                intensities={intensities}
                                sizes={sizes}
                            />

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                                <NumberInput
                                    label="Qty Reward"
                                    value={item.reward_quantity}
                                    onChange={(v) =>
                                        update(i, "reward_quantity", v)
                                    }
                                    min={1}
                                />
                                <NumberInput
                                    label="Diskon %"
                                    value={item.discount_percentage}
                                    onChange={(v) =>
                                        update(i, "discount_percentage", v)
                                    }
                                    min={0}
                                    placeholder="100"
                                />
                                <NumberInput
                                    label="Harga Override (Rp)"
                                    value={item.fixed_price}
                                    onChange={(v) =>
                                        update(i, "fixed_price", v)
                                    }
                                    min={0}
                                    placeholder="—"
                                />
                                <NumberInput
                                    label="Prioritas"
                                    value={item.priority}
                                    onChange={(v) => update(i, "priority", v)}
                                    min={0}
                                />
                            </div>

                            <div className="flex flex-wrap gap-5 items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={item.customer_can_choose}
                                        onChange={(e) =>
                                            update(
                                                i,
                                                "customer_can_choose",
                                                e.target.checked
                                            )
                                        }
                                        className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                                    />
                                    Pelanggan pilih variant
                                </label>
                                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={item.is_pool}
                                        onChange={(e) =>
                                            update(i, "is_pool", e.target.checked)
                                        }
                                        className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                                    />
                                    Gunakan Pool (Plinko)
                                </label>
                                {item.is_pool && (
                                    <div className="w-32">
                                        <NumberInput
                                            label="Max Pilihan"
                                            value={item.max_choices}
                                            onChange={(v) =>
                                                update(i, "max_choices", v)
                                            }
                                            min={1}
                                        />
                                    </div>
                                )}
                                <div className="ml-auto">
                                    <RemoveBtn onClick={() => remove(i)} />
                                </div>
                            </div>

                            {item.is_pool && (
                                <PoolItems
                                    pools={item.pools ?? []}
                                    onChange={(pools) =>
                                        update(i, "pools", pools)
                                    }
                                />
                            )}
                        </Row>
                    ))}
                </div>
            )}
        </SectionCard>
    );
}
