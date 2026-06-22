/**
 * Validates an Indian mobile phone number.
 * Must be exactly 10 digits and start with 6, 7, 8, or 9.
 */
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-]/g, '')
  return /^[6-9]\d{9}$/.test(cleaned)
}

/**
 * Cleans a phone number by removing spaces and dashes.
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-]/g, '')
}

/**
 * Formats a 10-digit phone number as "XXXXX XXXXX"
 */
export function formatPhone(phone: string): string {
  const cleaned = cleanPhone(phone)
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return cleaned
}
