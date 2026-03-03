<?php

namespace App\Traits;

/**
 * Resolves the authenticated user's ID for writing to stock tracking columns.
 *
 * Users use standard bigint auto-increment IDs ($table->id()), so auth()->id()
 * already returns the correct integer type for last_in_by / last_out_by columns.
 *
 * Usage in controllers:
 *   use App\Traits\TracksUserAction;
 *   ...
 *   'last_in_by' => self::currentUserId(),
 */
trait TracksUserAction
{
    /**
     * Return the authenticated user's integer ID, or null if unauthenticated.
     */
    public static function currentUserId(): ?int
    {
        return auth()->id();  // safe: users.id is bigint auto-increment
    }
}
