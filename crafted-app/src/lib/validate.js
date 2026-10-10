// Browser-side form rules. They mirror the backend (AuthController), so a form is rejected the same way in both places.
export const EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/
export const USERNAME = /^[A-Za-z0-9_.]{3,30}$/
export const PHONE = /^[0-9+\- ]{7,20}$/
export const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/ // at least 6 characters, a letter and a number

export const cleanUsername = (v) => v.trim().replace(/^@/, '')

// First and last name on the sign-up form: letters (any language) and plain spaces only, starting with a letter.
// Mirrors AccountRules.validPersonName in the backend.
export const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M} ]*$/u

// One clear message per problem, checked in the same order as AccountRules.usernameProblem in the backend.
export const usernameError = (v) => {
  const u = cleanUsername(v)
  if (!u) return 'Enter a username.'
  if (u.length < 3) return 'Username must be at least 3 characters.'
  if (u.length > 30) return 'Username can be up to 30 characters.'
  if (!USERNAME.test(u)) return 'Username can only contain letters, numbers, dots and underscores (no spaces or other symbols).'
  return ''
}
export const cleanEmail = (v) => v.trim().toLowerCase() // "@GMAIL.COM" is sent as "@gmail.com"

// Each rule returns an error message, or '' when the value is fine.
export const rules = {
  firstName: (v) => (!v.trim() ? 'Enter your first name.' : v.trim().length > 50 ? 'First name can be up to 50 characters.' : ''),
  lastName: (v) => (!v.trim() ? 'Enter your last name.' : v.trim().length > 50 ? 'Last name can be up to 50 characters.' : ''),
  username: usernameError,
  email: (v) => (EMAIL.test(cleanEmail(v)) && cleanEmail(v).length <= 100 ? '' : 'Enter a valid email address.'),
  phone: (v) => (!v.trim() || PHONE.test(v.trim()) ? '' : 'Enter a valid phone number.'),
  password: (v) => (PASSWORD.test(v) ? '' : 'Password must be at least 6 characters with a letter and a number.'),
}

// Sign-up uses the same rules plus the stricter name check. (Edit profile keeps using `rules`, so people whose saved
// name has a hyphen or apostrophe can still change their phone or email.)
const nameRule = (label, base) => (v) => base(v) || (PERSON_NAME.test(v.trim()) ? '' : `${label} can only contain letters and spaces.`)
export const signUpRules = {
  ...rules,
  firstName: nameRule('First name', rules.firstName),
  lastName: nameRule('Last name', rules.lastName),
}

// Returns { fieldName: message } for every field that is not valid yet
export function validateSignUp(f) {
  const errors = {}
  for (const k of Object.keys(signUpRules)) {
    const message = signUpRules[k](f[k] ?? '')
    if (message) errors[k] = message
  }
  if (f.confirm !== f.password) errors.confirm = 'Passwords do not match.'
  return errors
}

// Contact Us form. Signed-in people use their account details (checked again by the server), so only the message is judged.
// Guests need a name and at least one valid contact method: an email or a phone number.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u
export const contactPhoneOk = (v) => PHONE.test(v.trim()) && (v.match(/\d/g) || []).length >= 7
export function validateContact(f, signedIn = false) {
  const errors = {}
  if (!f.msg.trim()) errors.msg = 'Enter a message.'
  else if (f.msg.trim().length > 5000) errors.msg = 'Your message can be up to 5000 characters.'
  if (signedIn) return errors
  for (const k of ['firstName', 'lastName']) {
    const v = f[k].trim()
    if (!v || v.length > 50 || !NAME.test(v)) errors[k] = 'Use letters only.'
  }
  const email = f.email.trim(), phone = f.phone.trim()
  if (!email && !phone) errors.contact = 'Enter an email address or a phone number so we can get back to you.'
  if (!email && !phone) { errors.email = errors.contact; errors.phone = errors.contact }
  if (email && !(EMAIL.test(cleanEmail(email)) && cleanEmail(email).length <= 100)) errors.email = 'Enter a valid email address.'
  if (phone && !contactPhoneOk(phone)) errors.phone = 'Enter a valid phone number.'
  return errors
}
