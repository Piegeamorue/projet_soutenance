export function formatDoctorName(fullName) {
  const name = String(fullName || '').replace(/^Dr\.?\s*/i, '').trim()
  return name ? `Dr. ${name}` : 'Dr.'
}
