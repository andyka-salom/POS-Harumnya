<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Store;
use App\Models\Warehouse;
use Spatie\Permission\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class UserController extends Controller
{

    /**
     * Display a listing of users with filters.
     */
    public function index(Request $request): Response
    {
        $users = User::query()
            ->with(['roles:id,name', 'store:id,name', 'warehouse:id,name'])
            // FIX: Grouped where untuk search agar OR tidak merusak filter lain
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('role'), function ($query) use ($request) {
                $query->whereHas('roles', fn ($q) => $q->where('name', $request->role));
            })
            ->when($request->filled('store_id'), function ($query) use ($request) {
                $query->where('default_store_id', $request->store_id);
            })
            ->when($request->filled('warehouse_id'), function ($query) use ($request) {
                $query->where('default_warehouse_id', $request->warehouse_id);
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Dashboard/Users/Index', [
            'users'      => $users,
            'stores'     => Store::select('id', 'name')->orderBy('name')->get(),
            'warehouses' => Warehouse::select('id', 'name')->orderBy('name')->get(),
            'roles'      => Role::pluck('name'),
            'filters'    => $request->only(['search', 'role', 'store_id', 'warehouse_id']),
        ]);
    }

    /**
     * Show the form for creating a new user.
     */
    public function create(): Response
    {
        return Inertia::render('Dashboard/Users/Create', [
            'stores'     => Store::select('id', 'name')->orderBy('name')->get(),
            'warehouses' => Warehouse::select('id', 'name')->orderBy('name')->get(),
            'roles'      => Role::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'                 => ['required', 'string', 'max:255'],
            'email'                => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password'             => ['required', 'confirmed', Password::defaults()],
            'roles'                => ['required', 'array', 'min:1'],
            'roles.*'              => ['string', 'exists:roles,name'],
            'default_store_id'     => ['nullable', 'exists:stores,id'],
            'default_warehouse_id' => ['nullable', 'exists:warehouses,id'],
        ]);

        try {
            DB::transaction(function () use ($validated) {
                $user = User::create([
                    'name'                 => $validated['name'],
                    'email'                => $validated['email'],
                    'password'             => Hash::make($validated['password']),
                    'default_store_id'     => $validated['default_store_id'] ?? null,
                    'default_warehouse_id' => $validated['default_warehouse_id'] ?? null,
                ]);

                $user->assignRole($validated['roles']);
            });
        } catch (Throwable $e) {
            Log::error('User creation failed', ['error' => $e->getMessage()]);
            return back()->with('error', 'Gagal menambahkan user. Silakan coba lagi.');
        }

        return to_route('users.index')->with('success', 'User berhasil ditambahkan.');
    }

    /**
     * Show the form for editing the specified user.
     */
    public function edit(User $user): Response
    {
        $user->load('roles:id,name');

        return Inertia::render('Dashboard/Users/Edit', [
            'user'         => $user->only(['id', 'name', 'email', 'default_store_id', 'default_warehouse_id']),
            'currentRoles' => $user->roles->pluck('name'),
            'stores'       => Store::select('id', 'name')->orderBy('name')->get(),
            'warehouses'   => Warehouse::select('id', 'name')->orderBy('name')->get(),
            'roles'        => Role::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name'                 => ['required', 'string', 'max:255'],
            'email'                => ['required', 'string', 'email', 'max:255', "unique:users,email,{$user->id}"],
            'password'             => ['nullable', 'confirmed', Password::defaults()],
            'roles'                => ['required', 'array', 'min:1'],
            'roles.*'              => ['string', 'exists:roles,name'],
            'default_store_id'     => ['nullable', 'exists:stores,id'],
            'default_warehouse_id' => ['nullable', 'exists:warehouses,id'],
        ]);

        try {
            DB::transaction(function () use ($validated, $user) {
                $data = [
                    'name'                 => $validated['name'],
                    'email'                => $validated['email'],
                    'default_store_id'     => $validated['default_store_id'] ?? null,
                    'default_warehouse_id' => $validated['default_warehouse_id'] ?? null,
                ];

                if (!empty($validated['password'])) {
                    $data['password'] = Hash::make($validated['password']);
                }

                $user->update($data);
                $user->syncRoles($validated['roles']);
            });
        } catch (Throwable $e) {
            Log::error('User update failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Gagal memperbarui user. Silakan coba lagi.');
        }

        return to_route('users.index')->with('success', 'User berhasil diperbarui.');
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user): RedirectResponse
    {
        // Cegah user menghapus dirinya sendiri
        if (auth()->id() === $user->id) {
            return back()->with('error', 'Anda tidak dapat menghapus akun sendiri.');
        }

        // Cegah penghapusan super-admin
        if ($user->hasRole('super-admin')) {
            return back()->with('error', 'User super-admin tidak dapat dihapus.');
        }

        try {
            $user->delete();
        } catch (Throwable $e) {
            Log::error('User deletion failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Gagal menghapus user. Silakan coba lagi.');
        }

        return back()->with('success', 'User berhasil dihapus.');
    }
}
