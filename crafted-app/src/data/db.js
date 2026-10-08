// Sample hairstyles shown in the Services gallery.
// They are keyed by the EXISTING service name (src/data/db.js / the services table),
// so price, duration and description always come from the real service record.
// Pictures are not set here: every card shows its service's picture (public/assets/<service-name>.png,
// see src/components/ServiceImage.jsx).
export const hairstyles = [
  // Taper Fade
  { id: 'low-taper', service: 'Taper Fade', name: 'Low Taper' },
  { id: 'mid-taper', service: 'Taper Fade', name: 'Mid Taper' },
  { id: 'classic-taper', service: 'Taper Fade', name: 'Classic Taper' },
  // Skin Fade
  { id: 'low-skin-fade', service: 'Skin Fade', name: 'Low Skin Fade' },
  { id: 'mid-skin-fade', service: 'Skin Fade', name: 'Mid Skin Fade' },
  { id: 'high-skin-fade', service: 'Skin Fade', name: 'High Skin Fade' },
  // Undercut Fade
  { id: 'disconnected-undercut', service: 'Undercut Fade', name: 'Disconnected Undercut' },
  { id: 'textured-undercut', service: 'Undercut Fade', name: 'Textured Undercut' },
  { id: 'slicked-undercut', service: 'Undercut Fade', name: 'Slicked Undercut' },
  // Buzz Cut
  { id: 'classic-buzz', service: 'Buzz Cut', name: 'Classic Buzz' },
  { id: 'butch-cut', service: 'Buzz Cut', name: 'Butch Cut' },
  { id: 'induction-cut', service: 'Buzz Cut', name: 'Induction Cut' },
  // Slick Back
  { id: 'classic-slick-back', service: 'Slick Back', name: 'Classic Slick Back' },
  { id: 'pompadour', service: 'Slick Back', name: 'Pompadour' },
  { id: 'side-swept-slick', service: 'Slick Back', name: 'Side-Swept Slick' },
  // Modern Mullet
  { id: 'classic-mullet', service: 'Modern Mullet', name: 'Classic Modern Mullet' },
  { id: 'textured-mullet', service: 'Modern Mullet', name: 'Textured Mullet' },
  { id: 'mullet-fade', service: 'Modern Mullet', name: 'Mullet Fade' },
  // Wolf Cut
  { id: 'classic-wolf', service: 'Wolf Cut', name: 'Classic Wolf Cut' },
  { id: 'short-wolf', service: 'Wolf Cut', name: 'Short Wolf Cut' },
  { id: 'curly-wolf', service: 'Wolf Cut', name: 'Curly Wolf Cut' },
  // Blowout Taper
  { id: 'blowout-taper', service: 'Blowout Taper', name: 'Classic Blowout Taper' },
  { id: 'textured-blowout', service: 'Blowout Taper', name: 'Textured Blowout' },
  { id: 'curly-blowout', service: 'Blowout Taper', name: 'Curly Blowout' },
  // Crew Cut
  { id: 'classic-crew', service: 'Crew Cut', name: 'Classic Crew Cut' },
  { id: 'ivy-league', service: 'Crew Cut', name: 'Ivy League' },
  { id: 'high-and-tight', service: 'Crew Cut', name: 'High and Tight' },
  // Low Drop Fade
  { id: 'burst-fade', service: 'Low Drop Fade', name: 'Burst Fade' },
  { id: 'low-fade', service: 'Low Drop Fade', name: 'Low Fade' },
  { id: 'drop-fade-curls', service: 'Low Drop Fade', name: 'Drop Fade with Curls' },
]