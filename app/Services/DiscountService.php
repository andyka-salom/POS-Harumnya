<?php

namespace App\Services;

use App\Models\DiscountType;
use App\Models\DiscountStore;
use App\Models\DiscountRequirement;
use App\Models\DiscountReward;
use App\Models\DiscountUsage;
use Illuminate\Support\Facades\DB;

class DiscountService
{
    /**
     * Get applicable discounts for cart items at specific store
     */
    public function getApplicableDiscounts(array $cartItems, $storeId)
    {
        $activeDiscounts = DiscountType::where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('start_date')
                    ->orWhere('start_date', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            })
            ->with(['requirements', 'rewards', 'stores'])
            ->orderBy('priority', 'desc')
            ->get();

        $applicableDiscounts = [];

        foreach ($activeDiscounts as $discount) {
            // Check if discount applies to this store
            if (!$this->isDiscountApplicableToStore($discount, $storeId)) {
                continue;
            }

            // Check if cart meets discount requirements
            if ($this->meetsRequirements($discount, $cartItems)) {
                $applicableDiscounts[] = [
                    'id' => $discount->id,
                    'code' => $discount->code,
                    'name' => $discount->name,
                    'type' => $discount->type,
                    'description' => $discount->description,
                    'value' => $discount->value,
                ];
            }
        }

        return $applicableDiscounts;
    }

    /**
     * Check if discount can be used for game/spin wheel
     */
    public function canPlayGame(array $cartItems, $storeId)
    {
        $gameDiscounts = DiscountType::where('is_active', true)
            ->where('is_game_reward', true)
            ->with(['requirements', 'stores'])
            ->get();

        foreach ($gameDiscounts as $discount) {
            if (!$this->isDiscountApplicableToStore($discount, $storeId)) {
                continue;
            }

            if ($this->meetsRequirements($discount, $cartItems)) {
                return [
                    'can_play' => true,
                    'discount' => [
                        'id' => $discount->id,
                        'name' => $discount->name,
                        'probability' => $discount->game_probability,
                    ],
                ];
            }
        }

        return ['can_play' => false];
    }

    /**
     * Calculate discount amount and rewards
     */
    public function calculateDiscount(DiscountType $discount, array $cartItems, $subtotal)
    {
        $discountAmount = 0;
        $rewardItems = [];

        switch ($discount->type) {
            case 'percentage':
                $discountAmount = ($subtotal * $discount->value) / 100;

                // Apply max discount if set
                if ($discount->max_discount_amount && $discountAmount > $discount->max_discount_amount) {
                    $discountAmount = $discount->max_discount_amount;
                }
                break;

            case 'fixed_amount':
                $discountAmount = min($discount->value, $subtotal);
                break;

            case 'buy_x_get_y':
                $rewardItems = $this->calculateBuyXGetY($discount, $cartItems);
                // For buy X get Y, discount is the value of free items
                $discountAmount = array_sum(array_column($rewardItems, 'discount_value'));
                break;

            case 'free_product':
                $rewardItems = $this->calculateFreeProduct($discount, $cartItems);
                $discountAmount = array_sum(array_column($rewardItems, 'discount_value'));
                break;

            default:
                $discountAmount = 0;
        }

        return [
            'discount_amount' => $discountAmount,
            'reward_items' => $rewardItems,
        ];
    }

    /**
     * Apply discount to order and record usage
     */
    public function applyDiscountToOrder($discount, $orderId, $customerId, $storeId, $originalAmount, $discountAmount, $rewardItems = [])
    {
        DiscountUsage::create([
            'discount_type_id' => $discount->id,
            'order_id' => $orderId,
            'customer_id' => $customerId,
            'store_id' => $storeId,
            'discount_amount' => $discountAmount,
            'original_amount' => $originalAmount,
            'final_amount' => $originalAmount - $discountAmount,
            'applied_to_items' => json_encode([]),
            'reward_items' => json_encode($rewardItems),
            'is_game_reward' => $discount->is_game_reward,
            'used_at' => now(),
        ]);
    }

    /**
     * Check if discount applies to store
     */
    private function isDiscountApplicableToStore($discount, $storeId)
    {
        // If no specific stores set, applies to all
        if ($discount->stores->isEmpty()) {
            return true;
        }

        // Check if this store is in the list
        return $discount->stores->contains('store_id', $storeId);
    }

    /**
     * Check if cart meets discount requirements
     */
    private function meetsRequirements(DiscountType $discount, array $cartItems)
    {
        // Check minimum purchase amount
        if ($discount->min_purchase_amount) {
            $totalAmount = array_sum(array_column($cartItems, 'price'));
            if ($totalAmount < $discount->min_purchase_amount) {
                return false;
            }
        }

        // Check minimum purchase quantity
        if ($discount->min_purchase_quantity) {
            $totalQuantity = array_sum(array_column($cartItems, 'quantity'));
            if ($totalQuantity < $discount->min_purchase_quantity) {
                return false;
            }
        }

        // Check specific requirements (variant, intensity, size)
        if ($discount->requirements->isNotEmpty()) {
            return $this->meetsSpecificRequirements($discount->requirements, $cartItems);
        }

        return true;
    }

    /**
     * Check specific product requirements
     */
    private function meetsSpecificRequirements($requirements, array $cartItems)
    {
        foreach ($requirements as $requirement) {
            $matchingItems = array_filter($cartItems, function ($item) use ($requirement) {
                $matches = true;

                if ($requirement->variant_id && $item['variant_id'] != $requirement->variant_id) {
                    $matches = false;
                }
                if ($requirement->intensity_id && $item['intensity_id'] != $requirement->intensity_id) {
                    $matches = false;
                }
                if ($requirement->size_id && $item['size_id'] != $requirement->size_id) {
                    $matches = false;
                }

                return $matches;
            });

            $totalQty = array_sum(array_column($matchingItems, 'quantity'));

            if ($totalQty < $requirement->required_quantity) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate buy X get Y rewards
     */
    private function calculateBuyXGetY(DiscountType $discount, array $cartItems)
    {
        $rewards = [];

        // Count qualifying items
        $totalQualifyingQty = array_sum(array_column($cartItems, 'quantity'));

        // Calculate how many free items customer gets
        if ($discount->buy_quantity && $totalQualifyingQty >= $discount->buy_quantity) {
            $freeQty = floor($totalQualifyingQty / $discount->buy_quantity) * $discount->get_quantity;

            if ($freeQty > 0) {
                // Get reward configuration
                $rewardConfig = $discount->rewards->first();

                if ($rewardConfig) {
                    $rewards[] = [
                        'variant_id' => $rewardConfig->variant_id,
                        'intensity_id' => $rewardConfig->intensity_id,
                        'size_id' => $rewardConfig->size_id,
                        'quantity' => $freeQty,
                        'can_choose' => $rewardConfig->customer_can_choose,
                        'discount_value' => 0, // Free item
                    ];
                }
            }
        }

        return $rewards;
    }

    /**
     * Calculate free product rewards
     */
    private function calculateFreeProduct(DiscountType $discount, array $cartItems)
    {
        $rewards = [];

        // Get all reward configurations
        foreach ($discount->rewards as $reward) {
            $rewards[] = [
                'variant_id' => $reward->variant_id,
                'intensity_id' => $reward->intensity_id,
                'size_id' => $reward->size_id,
                'quantity' => $reward->reward_quantity,
                'can_choose' => $reward->customer_can_choose,
                'discount_value' => 0,
            ];
        }

        return $rewards;
    }
}
