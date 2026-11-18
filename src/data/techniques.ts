/**
 * Curl Tracker — preset techniques.
 *
 * Presets live in code so a backup does not have to carry them. Custom
 * techniques are stored in IndexedDB and survive until the person deletes them.
 * A log snapshots `{ id, name, custom }` at save time.
 */
export const TECHNIQUE_GROUPS = ['Wash', 'Style', 'Dry', 'Finish'] as const

export type TechniqueGroup = (typeof TECHNIQUE_GROUPS)[number]

export interface PresetTechnique {
  id: string
  name: string
  group: TechniqueGroup
}

function preset(group: TechniqueGroup, slug: string, name: string): PresetTechnique {
  return { id: `preset:${slug}`, name, group }
}

export const PRESET_TECHNIQUES: readonly PresetTechnique[] = [
  preset('Wash', 'shampoo', 'Shampoo'),
  preset('Wash', 'cowash', 'Co-wash'),
  preset('Wash', 'rinse-out', 'Rinse-out conditioner'),
  preset('Wash', 'deep-condition', 'Deep condition'),
  preset('Wash', 'protein', 'Protein treatment'),
  preset('Wash', 'clarify', 'Clarify'),
  preset('Wash', 'pre-poo', 'Pre-poo'),
  preset('Wash', 'scalp-scrub', 'Scalp scrub'),
  preset('Wash', 'acv', 'Apple cider vinegar rinse'),
  preset('Style', 'detangle', 'Detangle'),
  preset('Style', 'section', 'Section'),
  preset('Style', 'squish-to-condish', 'Squish to condish'),
  preset('Style', 'rake-and-shake', 'Rake and shake'),
  preset('Style', 'praying-hands', 'Praying hands'),
  preset('Style', 'scrunch', 'Scrunch'),
  preset('Style', 'rope', 'Rope'),
  preset('Style', 'finger-coil', 'Finger coil'),
  preset('Style', 'brush-style', 'Brush style'),
  preset('Style', 'shingling', 'Shingling'),
  preset('Style', 'glaze', 'Glaze'),
  preset('Style', 'bowl-method', 'Bowl method'),
  preset('Dry', 'plop', 'Plop'),
  preset('Dry', 'micro-plop', 'Micro-plop'),
  preset('Dry', 'diffuse', 'Diffuse'),
  preset('Dry', 'pixie-diffuse', 'Pixie diffuse'),
  preset('Dry', 'hover-diffuse', 'Hover diffuse'),
  preset('Dry', 'air-dry', 'Air dry'),
  preset('Dry', 'root-clip', 'Root clip'),
  preset('Dry', 'hooded-dryer', 'Hooded dryer'),
  preset('Finish', 'sotc', 'Scrunch out the crunch'),
  preset('Finish', 'refresh', 'Refresh'),
  preset('Finish', 'pineapple', 'Pineapple'),
  preset('Finish', 'loc', 'LOC'),
  preset('Finish', 'lco', 'LCO'),
  preset('Finish', 'oil-seal', 'Oil seal'),
]

export function presetsInGroup(group: TechniqueGroup): PresetTechnique[] {
  return PRESET_TECHNIQUES.filter((technique) => technique.group === group)
}
