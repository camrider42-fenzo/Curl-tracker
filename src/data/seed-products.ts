/**
 * Curl Tracker — preloaded product library.
 *
 * Seeded once, the first time this browser opens the app. After that the
 * library is the person's: new products stay until deleted, and deleting a
 * seed product does not bring it back.
 *
 * Category rules (see CATEGORY_NOTE):
 *   - Creams, leave-in creams, curl creams, smoothies, and custards → Fillers.
 *   - Gels, mousses, hairsprays, and finishing oils → Sealers.
 *   - Scalp and treatment oils → Treatments/Masks.
 *   - A shampoo or conditioner that lists an oil in its name stays in that
 *     wash category. The oil is an ingredient, not the product's job.
 *   - Kinky-Curly Curling Custard is a cream/custard definition layer, so it
 *     is a Filler. Camille Rose Curl Maker is a jelly used as the hold layer,
 *     so it is a Sealer.
 */
import type { CategoryId } from './categories.ts'

export interface SeedProduct {
  id: string
  name: string
  category: CategoryId
}

function item(id: string, name: string, category: CategoryId): SeedProduct {
  return { id: `seed:${id}`, name, category }
}

export const SEED_PRODUCTS: readonly SeedProduct[] = [
  item('sheamoisture-jbco-shampoo', 'SheaMoisture Jamaican Black Castor Oil Strengthen & Restore Shampoo', 'cleansers'),
  item('pattern-hydration-shampoo', 'Pattern Hydration Shampoo', 'cleansers'),
  item('briogeo-avocado-cowash', 'Briogeo Be Gentle, Be Kind Avocado + Quinoa Co-Wash', 'cleansers'),
  item('devacurl-nopoo', 'DevaCurl No-Poo Original', 'cleansers'),
  item('innersense-hairbath', 'Innersense Hydrating Cream Hairbath', 'cleansers'),
  item('kinky-curly-come-clean', 'Kinky-Curly Come Clean Shampoo', 'cleansers'),
  item('as-i-am-coconut-cowash', 'As I Am Coconut Cowash', 'cleansers'),
  item('mielle-rosemary-shampoo', 'Mielle Rosemary Mint Strengthening Shampoo', 'cleansers'),
  item('ouidad-water-works', 'Ouidad Water Works Clarifying Shampoo', 'cleansers'),
  item('giovanni-tea-tree-shampoo', 'Giovanni Tea Tree Triple Treat Invigorating Shampoo', 'cleansers'),

  item('sheamoisture-jbco-conditioner', 'SheaMoisture Jamaican Black Castor Oil Strengthen & Restore Conditioner', 'conditioners'),
  item('pattern-heavy-conditioner', 'Pattern Heavy Conditioner', 'conditioners'),
  item('briogeo-super-moisture-conditioner', "Briogeo Don't Despair, Repair! Super Moisture Conditioner", 'conditioners'),
  item('ouidad-curl-quencher-conditioner', 'Ouidad Curl Quencher Moisturizing Conditioner', 'conditioners'),
  item('innersense-hydrating-conditioner', 'Innersense Hydrating Cream Conditioner', 'conditioners'),
  item('giovanni-smooth-as-silk', 'Giovanni Smooth As Silk Deep Moisture Conditioner', 'conditioners'),
  item('mielle-pomegranate-conditioner', 'Mielle Pomegranate & Honey Moisturizing and Detangling Conditioner', 'conditioners'),
  item('tresemme-moisture-rich', 'TRESemmé Moisture Rich Conditioner', 'conditioners'),

  item('kinky-curly-knot-today', 'Kinky-Curly Knot Today Leave-In Detangler', 'leave-ins'),
  item('sheamoisture-jbco-leave-in', 'SheaMoisture Jamaican Black Castor Oil Leave-In Conditioner', 'leave-ins'),
  item('camille-rose-honey-hydrate', 'Camille Rose Honey Hydrate Leave-In Conditioner', 'leave-ins'),
  item('its-a-10-leave-in', "It's a 10 Miracle Leave-In Plus Keratin", 'leave-ins'),
  item('giovanni-direct-leave-in', 'Giovanni Direct Leave-In Weightless Moisture', 'leave-ins'),
  item('curls-blueberry-bliss-leave-in', 'Curls Blueberry Bliss Reparative Leave-In', 'leave-ins'),
  item('aunt-jackies-quench', "Aunt Jackie's Quench Moisture Intensive Leave-In Conditioner", 'leave-ins'),
  item('mizani-25-miracle-milk', 'Mizani 25 Miracle Milk Leave-In Conditioner', 'leave-ins'),
  item('pattern-leave-in', 'Pattern Leave-In Conditioner', 'leave-ins'),
  item('briogeo-rosarco-milk', 'Briogeo Farewell Frizz Rosarco Milk', 'leave-ins'),

  item('sheamoisture-curl-smoothie', 'SheaMoisture Coconut & Hibiscus Curl Enhancing Smoothie', 'fillers'),
  item('cantu-curling-cream', 'Cantu Shea Butter Coconut Curling Cream', 'fillers'),
  item('mielle-curl-smoothie', 'Mielle Pomegranate & Honey Curl Smoothie', 'fillers'),
  item('camille-rose-almond-jai', 'Camille Rose Almond Jai Twisting Butter', 'fillers'),
  item('uncle-funkys-curly-magic', "Uncle Funky's Daughter Curly Magic Curl Stimulator", 'fillers'),
  item('pattern-styling-cream', 'Pattern Styling Cream', 'fillers'),
  item('ouidad-featherlight-cream', 'Ouidad Advanced Climate Control Featherlight Styling Cream', 'fillers'),
  item('devacurl-supercream', 'DevaCurl SuperCream Coconut Curl Styler', 'fillers'),
  item('curlsmith-air-dry-cream', 'Curlsmith Weightless Air Dry Cream', 'fillers'),
  item('briogeo-curl-charisma', 'Briogeo Curl Charisma Rice Amino + Avocado Leave-In Defining Crème', 'fillers'),
  item('ecoslay-banana-cream', 'Ecoslay Banana Cream Deep Moisture Leave-In', 'fillers'),
  item('carols-daughter-curl-butter', "Carol's Daughter Hair Milk Curl Defining Butter Cream", 'fillers'),
  item('moroccanoil-curl-cream', 'Moroccanoil Curl Defining Cream', 'fillers'),
  item('kinky-curly-curling-custard', 'Kinky-Curly Curling Custard', 'fillers'),

  item('eco-olive-oil-gel', 'ECO Styler Olive Oil Styling Gel', 'sealers'),
  item('aussie-instant-freeze', 'Aussie Instant Freeze Sculpting Gel', 'sealers'),
  item('the-doux-mousse-def', 'The Doux Mousse Def Texture Foam', 'sealers'),
  item('nym-curl-talk-mousse', "Not Your Mother's Curl Talk Activating Mousse", 'sealers'),
  item('ouidad-vitalcurl-gel', 'Ouidad VitalCurl+ Define & Shine Gel', 'sealers'),
  item('innersense-i-create-hold', 'Innersense I Create Hold', 'sealers'),
  item('camille-rose-curl-maker', 'Camille Rose Curl Maker', 'sealers'),
  item('lottabody-wrap-me-mousse', 'Lottabody Wrap Me Foaming Curl Mousse', 'sealers'),
  item('tresemme-extra-hold-spray', 'TRESemmé Extra Hold Hair Spray', 'sealers'),
  item('kenra-volume-spray-25', 'Kenra Volume Spray 25', 'sealers'),
  item('curlsmith-style-fixer', 'Curlsmith In-Shower Style Fixer', 'sealers'),
  item('flora-curl-hibiscus-gel', 'Flora & Curl Sweet Hibiscus Curl Activating Gel', 'sealers'),
  item('jessicurl-spiralicious', 'Jessicurl Spiralicious Styling Gel', 'sealers'),
  // Finishing oils seal the style, so they sit with the sealers rather than
  // in a shared "oils" bucket.
  item('ogx-argan-oil', 'OGX Renewing Argan Oil of Morocco Penetrating Oil', 'sealers'),
  item('verb-ghost-oil', 'Verb Ghost Oil', 'sealers'),
  item('sheamoisture-coconut-oil', 'SheaMoisture 100% Virgin Coconut Oil', 'sealers'),
  item('garnier-fructis-serum', 'Garnier Fructis Sleek & Shine Anti-Frizz Serum', 'sealers'),

  item('sheamoisture-manuka-masque', 'SheaMoisture Manuka Honey & Yogurt Hydrate + Repair Protein Treatment', 'treatments'),
  item('briogeo-repair-mask', "Briogeo Don't Despair, Repair! Deep Conditioning Mask", 'treatments'),
  item('pattern-treatment-mask', 'Pattern Treatment Mask', 'treatments'),
  item('aussie-3-minute-miracle', 'Aussie 3 Minute Miracle Moist Deep Conditioner', 'treatments'),
  item('camille-rose-algae-mask', 'Camille Rose Algae Renew Deep Conditioning Mask', 'treatments'),
  item('tgin-honey-miracle-mask', 'TGIN Honey Miracle Hair Mask', 'treatments'),
  item('olaplex-no-3', 'Olaplex No.3 Hair Perfector', 'treatments'),
  item('aphogee-two-step', 'Aphogee Two-Step Protein Treatment', 'treatments'),
  // Treatment oils are not the same job as a finishing oil.
  item('mielle-rosemary-mint-oil', 'Mielle Rosemary Mint Scalp & Hair Strengthening Oil', 'treatments'),
  item('jbco-treatment-oil', 'Jamaican Black Castor Oil', 'treatments'),
  item('briogeo-repair-oil', "Briogeo Don't Despair, Repair! Strength + Moisture Oil", 'treatments'),
  item('curlsmith-bond-rehab', 'Curlsmith Bond Curl Rehab Salve', 'treatments'),
  item('sheamoisture-jbco-masque', 'SheaMoisture Jamaican Black Castor Oil Strengthen & Restore Treatment Masque', 'treatments'),

  item('acv-rinse', 'Apple cider vinegar rinse', 'other'),
  item('briogeo-scalp-scrub', 'Briogeo Scalp Revival Charcoal + Tea Tree Scalp Scrub', 'other'),
  item('living-proof-dry-shampoo', 'Living Proof Perfect hair Day Dry Shampoo', 'other'),
  item('rice-water-rinse', 'Rice water rinse', 'other'),
  item('vegetable-glycerin', 'Vegetable glycerin', 'other'),
]
