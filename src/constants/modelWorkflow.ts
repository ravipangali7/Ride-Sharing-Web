/**
 * Canonical status / enum strings aligned with server/core/models.py and docs/models_logic.md.
 * Use in admin mock pages and future API clients to avoid drift from Django choices.
 */

export const RIDE_BOOKING_STATUSES = [
  'searching',
  'bargaining',
  'accepted',
  'arrived',
  'started',
  'completed',
  'cancelled',
] as const;
export type RideBookingStatus = (typeof RIDE_BOOKING_STATUSES)[number];

export const PARCEL_BOOKING_STATUSES = [
  'searching',
  'bargaining',
  'accepted',
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled',
] as const;
export type ParcelBookingStatus = (typeof PARCEL_BOOKING_STATUSES)[number];

export const FOOD_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
  'cancelled',
] as const;
export type FoodOrderStatus = (typeof FOOD_ORDER_STATUSES)[number];

export const ECOMMERCE_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'packed',
  'picked_up',
  'delivered',
  'cancelled',
] as const;
export type EcommerceOrderStatus = (typeof ECOMMERCE_ORDER_STATUSES)[number];

export const WALLET_TOPUP_STATUSES = ['initiated', 'pending', 'success', 'failed'] as const;
export const RIDER_PAYOUT_STATUSES = ['pending', 'approved', 'paid', 'rejected'] as const;
