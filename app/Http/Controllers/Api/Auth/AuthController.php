<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    /**
     * Login & issue token
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $throttleKey = Str::lower($request->input('email')).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return $this->errorResponse(
                'Too many login attempts.',
                Response::HTTP_TOO_MANY_REQUESTS,
                ['retry_after' => $seconds]
            );
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, 60);
            return $this->errorResponse(
                'The provided credentials are incorrect.',
                Response::HTTP_UNAUTHORIZED
            );
        }

        RateLimiter::clear($throttleKey);

        // Revoke previous tokens for this device (optional)
        if ($request->boolean('single_session')) {
            $user->tokens()->delete();
        }

        $tokenName   = $request->input('device_name', 'api-token');
        $expiresAt   = now()->addDays(config('sanctum.token_expiry_days', 30));

        $token = $user->createToken($tokenName, ['*'], $expiresAt);

        return $this->successResponse('Login successful.', [
            'user'         => new UserResource($user),
            'access_token' => $token->plainTextToken,
            'token_type'   => 'Bearer',
            'expires_at'   => $expiresAt->toIso8601String(),
        ]);
    }

    /**
     * Get authenticated user info
     */
    public function me(Request $request): JsonResponse
    {
        return $this->successResponse('User retrieved.', [
            'user' => new UserResource($request->user()),
        ]);
    }

    /**
     * Logout current device
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->successResponse('Logged out successfully.');
    }

    /**
     * Logout all devices
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return $this->successResponse('Logged out from all devices.');
    }

    /**
     * Refresh token — revoke current, issue new
     */
    public function refresh(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        // Find token hash
        [$id, $token] = explode('|', $request->token, 2);
        $accessToken  = \Laravel\Sanctum\PersonalAccessToken::find($id);

        if (! $accessToken || ! hash_equals($accessToken->token, hash('sha256', $token))) {
            return $this->errorResponse('Invalid token.', Response::HTTP_UNAUTHORIZED);
        }

        $user      = $accessToken->tokenable;
        $expiresAt = now()->addDays(config('sanctum.token_expiry_days', 30));
        $newToken  = $user->createToken($accessToken->name, ['*'], $expiresAt);

        $accessToken->delete();

        return $this->successResponse('Token refreshed.', [
            'access_token' => $newToken->plainTextToken,
            'token_type'   => 'Bearer',
            'expires_at'   => $expiresAt->toIso8601String(),
        ]);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private function successResponse(string $message, array $data = [], int $status = Response::HTTP_OK): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    private function errorResponse(string $message, int $status, array $extra = []): JsonResponse
    {
        return response()->json(array_merge([
            'success' => false,
            'message' => $message,
            'data'    => null,
        ], $extra), $status);
    }
}
