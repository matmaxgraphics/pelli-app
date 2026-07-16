/**
 * Form state shared between the room server actions and the forms that call
 * them.
 *
 * This lives outside server/room-actions.ts on purpose: a "use server" module
 * may only export async functions, so the initial-state constant cannot live
 * beside the actions it belongs to.
 */

export interface RoomFormState {
  /** A sentence to show the person. Null when nothing has gone wrong. */
  error: string | null;
}

export const EMPTY_FORM_STATE: RoomFormState = { error: null };
