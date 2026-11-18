/**
 * Curl Tracker — the on-device reminder.
 * Shown on Today and on the backup screen. Data never leaves this browser
 * unless the person exports a zip.
 */
export function DataNote() {
  return (
    <p class="data-note" data-testid="data-note">
      <strong>On this device only.</strong> Logs, photos, and products stay in this browser.
      Export a backup before you clear site data or switch phones.
    </p>
  )
}
