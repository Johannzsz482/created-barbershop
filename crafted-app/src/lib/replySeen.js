// Which admin replies has a signed-in customer/barber not opened yet?
// GET /api/contact/my already returns each message with its reply and replied_at, so no backend change is needed:
// the browser remembers, per account, the version of each reply that was shown in My messages.
// A reply counts as new when it has no remembered version or the admin has written a different one since.

// One short fingerprint of a reply (replied_at changes whenever the admin replies again; the length catches an edit in the same minute)
export const replySig = (m) => `${m.replied_at}|${m.reply.length}`

// Messages that carry an admin reply this person has not seen. `seen` is { [message_id]: replySig }.
export const unseenReplies = (rows, seen) =>
  rows.filter((m) => m.reply && seen[m.message_id] !== replySig(m))

// The new `seen` map once every reply in `rows` has been shown. Messages that no longer exist (deleted) are dropped from it.
export const markAllSeen = (rows) =>
  Object.fromEntries(rows.filter((m) => m.reply).map((m) => [m.message_id, replySig(m)]))
