<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PaymentMethodController extends Controller
{
    /**
     * Display a listing of payment methods.
     */
    public function index(Request $request): Response
    {
        $paymentMethods = PaymentMethod::query()
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->is_active === 'true'))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Dashboard/PaymentMethods/Index', [
            'paymentMethods' => $paymentMethods,
            'types'          => PaymentMethod::TYPES,
            'filters'        => $request->only(['search', 'type', 'is_active']),
        ]);
    }

    /**
     * Show the form for creating a new payment method.
     */
    public function create(): Response
    {
        return Inertia::render('Dashboard/PaymentMethods/Create', [
            'types' => PaymentMethod::TYPES,
        ]);
    }

    /**
     * Store a newly created payment method.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code'            => ['required', 'string', 'max:50', 'unique:payment_methods,code', 'regex:/^[a-z0-9_-]+$/'],
            'name'            => ['required', 'string', 'max:100'],
            'type'            => ['required', 'in:' . implode(',', array_keys(PaymentMethod::TYPES))],
            'has_admin_fee'   => ['boolean'],
            'admin_fee_pct'   => ['numeric', 'min:0', 'max:100'],
            'can_give_change' => ['boolean'],
            'is_active'       => ['boolean'],
            'sort_order'      => ['integer', 'min:0', 'max:255'],
        ]);

        try {
            PaymentMethod::create($validated);
        } catch (Throwable $e) {
            Log::error('PaymentMethod creation failed', ['error' => $e->getMessage()]);
            return back()->with('error', 'Gagal menambahkan metode pembayaran.');
        }

        return to_route('payment-methods.index')->with('success', 'Metode pembayaran berhasil ditambahkan.');
    }

    /**
     * Show the form for editing the specified payment method.
     */
    public function edit(PaymentMethod $paymentMethod): Response
    {
        return Inertia::render('Dashboard/PaymentMethods/Edit', [
            'paymentMethod' => $paymentMethod,
            'types'         => PaymentMethod::TYPES,
        ]);
    }

    /**
     * Update the specified payment method.
     */
    public function update(Request $request, PaymentMethod $paymentMethod): RedirectResponse
    {
        $validated = $request->validate([
            'code'            => ['required', 'string', 'max:50', "unique:payment_methods,code,{$paymentMethod->id},id", 'regex:/^[a-z0-9_-]+$/'],
            'name'            => ['required', 'string', 'max:100'],
            'type'            => ['required', 'in:' . implode(',', array_keys(PaymentMethod::TYPES))],
            'has_admin_fee'   => ['boolean'],
            'admin_fee_pct'   => ['numeric', 'min:0', 'max:100'],
            'can_give_change' => ['boolean'],
            'is_active'       => ['boolean'],
            'sort_order'      => ['integer', 'min:0', 'max:255'],
        ]);

        try {
            $paymentMethod->update($validated);
        } catch (Throwable $e) {
            Log::error('PaymentMethod update failed', ['id' => $paymentMethod->id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Gagal memperbarui metode pembayaran.');
        }

        return to_route('payment-methods.index')->with('success', 'Metode pembayaran berhasil diperbarui.');
    }

    /**
     * Toggle active status quickly (via PATCH).
     */
    public function toggle(PaymentMethod $paymentMethod): RedirectResponse
    {
        $paymentMethod->update(['is_active' => ! $paymentMethod->is_active]);

        $status = $paymentMethod->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return back()->with('success', "Metode pembayaran berhasil {$status}.");
    }

    /**
     * Remove the specified payment method.
     */
    public function destroy(PaymentMethod $paymentMethod): RedirectResponse
    {
        try {
            $paymentMethod->delete();
        } catch (Throwable $e) {
            Log::error('PaymentMethod deletion failed', ['id' => $paymentMethod->id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Gagal menghapus metode pembayaran. Mungkin sedang digunakan dalam transaksi.');
        }

        return back()->with('success', 'Metode pembayaran berhasil dihapus.');
    }
}
