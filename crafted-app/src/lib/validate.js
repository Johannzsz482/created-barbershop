// Browser-side form rules. They mirror the backend (AuthController), so a form is rejected the same way in both places.
export const EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/
export const USERNAME = /^[A-Za-z0-9_.]{3,30}$/
export const PHONE = /^[0-9+\- ]{7,20}$/
export const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/ // at least 6 characters, a letter and a number

export const cleanUsername = (v) => v.trim().replace(/^@/, '')
export const cleanEmail = (v) => v.trim().toLowerCase() // "@GMAIL.COM" is sent as "@gmail.com"

// Each rule returns an error message, or '' when the value is fine.
export const rules = {
  firstName: (v) => (!v.trim() ? 'Enter your first name.' : v.trim().length > 50 ? 'First name can be up to 50 characters.' : ''),
  lastName: (v) => (!v.trim() ? 'Enter your last name.' : v.trim().length > 50 ? 'Last name can be up to 50 characters.' : ''),
  username: (v) => (USERNAME.test(cleanUsername(v)) ? '' : 'Username must be 3 to 30 characters: letters, numbers, dot or underscore.'),
  email: (v) => (EMAIL.test(cleanEmail(v)) && cleanEmail(v).length <= 100 ? '' : 'Enter a valid email address.'),
  phone: (v) => (!v.trim() || PHONE.test(v.trim()) ? '' : 'Enter a valid phone number.'),
  password: (v) => (PASSWORD.test(v) ? '' : 'Password must be at least 6 characters with a letter and a number.'),
}

// Returns { fieldName: message } for every field that is not valid yet
export function validateSignUp(f) {
  const errors = {}
  for (const k of Object.keys(rules)) {
    const message = rules[k](f[k] ?? '')
    if (message) errors[k] = message
  }
  if (f.confirm !== f.password) errors.confirm = 'Passwords do not match.'
  return errors
}
