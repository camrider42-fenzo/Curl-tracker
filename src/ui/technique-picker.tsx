/**
 * Curl Tracker — technique multi-select.
 * Presets ship with the app. A custom name is stored permanently and
 * shows up on the next log.
 */
import { useState } from 'preact/hooks'
import { TECHNIQUE_GROUPS, presetsInGroup } from '../data/techniques.ts'
import { errorMessage } from '../lib/errors.ts'
import type { CustomTechnique, TechniqueRef } from '../types.ts'

export function TechniquePicker(props: {
  custom: CustomTechnique[]
  selected: TechniqueRef[]
  onChange: (next: TechniqueRef[]) => void
  onCreate: (name: string) => Promise<CustomTechnique>
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selectedIds = new Set(props.selected.map((item) => item.id))
  const known = new Set<string>([
    ...TECHNIQUE_GROUPS.flatMap((group) => presetsInGroup(group).map((item) => item.id)),
    ...props.custom.map((item) => item.id),
  ])
  const missing = props.selected.filter((item) => !known.has(item.id))

  function toggle(technique: TechniqueRef) {
    props.onChange(
      selectedIds.has(technique.id)
        ? props.selected.filter((item) => item.id !== technique.id)
        : [...props.selected, technique],
    )
  }

  async function add(event: Event) {
    event.preventDefault()
    setError(null)
    try {
      const created = await props.onCreate(name)
      props.onChange([...props.selected, { id: created.id, name: created.name, custom: true }])
      setName('')
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <div class="stack">
      {TECHNIQUE_GROUPS.map((group) => (
        <fieldset key={group}>
          <legend>{group}</legend>
          <div class="chip-row">
            {presetsInGroup(group).map((technique) => (
              <label key={technique.id} class={selectedIds.has(technique.id) ? 'chip is-on' : 'chip'}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(technique.id)}
                  onChange={() => toggle({ id: technique.id, name: technique.name, custom: false })}
                />
                <span>{technique.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {props.custom.length > 0 ? (
        <fieldset>
          <legend>Yours</legend>
          <div class="chip-row">
            {props.custom.map((technique) => (
              <label key={technique.id} class={selectedIds.has(technique.id) ? 'chip is-on' : 'chip'}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(technique.id)}
                  onChange={() => toggle({ id: technique.id, name: technique.name, custom: true })}
                />
                <span>{technique.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {missing.length > 0 ? (
        <fieldset>
          <legend>On this log</legend>
          <div class="chip-row">
            {missing.map((technique) => (
              <label key={technique.id} class="chip is-on">
                <input type="checkbox" checked onChange={() => toggle(technique)} />
                <span>{technique.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <form class="inline-form" onSubmit={(event) => void add(event)}>
        <label>
          Custom technique
          <input
            value={name}
            placeholder="e.g. Denman brush"
            onInput={(event) => setName((event.currentTarget as HTMLInputElement).value)}
          />
        </label>
        <button type="submit" class="btn btn-ghost">
          Add technique
        </button>
      </form>
      {error ? (
        <p class="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
