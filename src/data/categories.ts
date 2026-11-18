/**
 * Curl Tracker — product categories.
 *
 * "Fillers" and "Sealers" replace the older Stylers / Hold split.
 * Fillers are the moisture and definition layer (creams, leave-in creams,
 * curl creams, smoothies). Sealers are the hold and seal layer (gels,
 * mousses, hairsprays, finishing oils). There is no Stylers category and
 * no Hold category.
 */

export const CATEGORIES = [
  { id: 'cleansers', label: 'Cleansers/Shampoo' },
  { id: 'conditioners', label: 'Conditioners' },
  { id: 'leave-ins', label: 'Leave-ins' },
  { id: 'fillers', label: 'Fillers' },
  { id: 'sealers', label: 'Sealers' },
  { id: 'treatments', label: 'Treatments/Masks' },
  { id: 'other', label: 'Other' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

/** Shown in the product library, the zip README, and data.json. */
export const CATEGORY_NOTE =
  'Creams, leave-in creams, and curl creams are Fillers. Gels, mousses, and hairsprays are Sealers. Oils are split on purpose: finishing oils that lock the style (argan, coconut, serums) are Sealers, while scalp and treatment oils (rosemary mint, Jamaican black castor, repair oils) are Treatments/Masks. A wash product that merely contains oil stays a cleanser or conditioner. There is no Stylers or Hold category.'

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && CATEGORIES.some((category) => category.id === value)
}

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find((category) => category.id === id)?.label ?? id
}

export function categoryIndex(id: CategoryId): number {
  return CATEGORIES.findIndex((category) => category.id === id)
}
