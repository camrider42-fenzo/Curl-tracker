/**
 * Curl Tracker — dialogs.
 * On a short cover screen the sheet sits at the bottom, in reach of the thumb.
 * On a tall Pixel it centers.
 */
import { useEffect } from 'preact/hooks'
import type { ComponentChildren } from 'preact'

export function Modal(props: { title: string; children: ComponentChildren; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.onClose])

  return (
    <div class="modal-back" onClick={props.onClose}>
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="modal-title">{props.title}</h2>
        {props.children}
      </div>
    </div>
  )
}

export function ConfirmDialog(props: {
  title: string
  body: string
  confirmLabel: string
  testId: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={props.title} onClose={props.onCancel}>
      <p>{props.body}</p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="button" class="btn btn-danger" data-testid={props.testId} onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
