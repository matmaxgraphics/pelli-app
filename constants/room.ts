/**
 * How many people a room holds, host included. Small on purpose: Pelli is a
 * living room, not a stadium — and sync, presence and cost are all designed
 * around a handful of people.
 *
 * The database enforces the same number (see `enforce_room_capacity` in
 * supabase/schema.sql). Change both together.
 */
export const MAX_PARTICIPANTS = 5;
