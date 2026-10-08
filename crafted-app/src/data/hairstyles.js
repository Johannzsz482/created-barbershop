// Sample hairstyles shown in the Services gallery.
// They are keyed by the EXISTING service name (src/data/db.js / the services table),
// so price, duration and description always come from the real service record.
// To use a better photo later, drop it in /public/assets/ and change the `img` path.
const FADE = '/assets/fade_b&w.png'
const CLIP = '/assets/cut 3_b&w.png'
const SCISSOR = '/assets/cut 2_b&w.png'
const KID = '/assets/kid_b&w.png'
const TREAT = '/assets/treatment_b&w.png'

export const hairstyles = [
  // Taper Fade
  { id: 'low-taper', service: 'Taper Fade', name: 'Low Taper', img: FADE, pos: '50% 30%' },
  { id: 'mid-taper', service: 'Taper Fade', name: 'Mid Taper', img: CLIP, pos: '30% 50%' },
  { id: 'classic-taper', service: 'Taper Fade', name: 'Classic Taper', img: SCISSOR, pos: '50% 20%' },
  // Skin Fade
  { id: 'low-skin-fade', service: 'Skin Fade', name: 'Low Skin Fade', img: FADE, pos: '40% 20%' },
  { id: 'mid-skin-fade', service: 'Skin Fade', name: 'Mid Skin Fade', img: CLIP, pos: '60% 50%' },
  { id: 'high-skin-fade', service: 'Skin Fade', name: 'High Skin Fade', img: FADE, pos: '70% 40%' },
  // Undercut Fade
  { id: 'disconnected-undercut', service: 'Undercut Fade', name: 'Disconnected Undercut', img: SCISSOR, pos: '50% 10%' },
  { id: 'textured-undercut', service: 'Undercut Fade', name: 'Textured Undercut', img: FADE, pos: '50% 10%' },
  { id: 'slicked-undercut', service: 'Undercut Fade', name: 'Slicked Undercut', img: KID, pos: '60% 30%' },
  // Buzz Cut
  { id: 'classic-buzz', service: 'Buzz Cut', name: 'Classic Buzz', img: CLIP, pos: '70% 40%' },
  { id: 'butch-cut', service: 'Buzz Cut', name: 'Butch Cut', img: FADE, pos: '60% 60%' },
  { id: 'induction-cut', service: 'Buzz Cut', name: 'Induction Cut', img: CLIP, pos: '20% 60%' },
  // Slick Back
  { id: 'classic-slick-back', service: 'Slick Back', name: 'Classic Slick Back', img: KID, pos: '50% 30%' },
  { id: 'pompadour', service: 'Slick Back', name: 'Pompadour', img: SCISSOR, pos: '50% 0%' },
  { id: 'side-swept-slick', service: 'Slick Back', name: 'Side-Swept Slick', img: KID, pos: '30% 40%' },
  // Modern Mullet
  { id: 'classic-mullet', service: 'Modern Mullet', name: 'Classic Modern Mullet', img: SCISSOR, pos: '70% 30%' },
  { id: 'textured-mullet', service: 'Modern Mullet', name: 'Textured Mullet', img: TREAT, pos: '60% 20%' },
  { id: 'mullet-fade', service: 'Modern Mullet', name: 'Mullet Fade', img: FADE, pos: '40% 30%' },
  // Wolf Cut
  { id: 'classic-wolf', service: 'Wolf Cut', name: 'Classic Wolf Cut', img: SCISSOR, pos: '60% 20%' },
  { id: 'short-wolf', service: 'Wolf Cut', name: 'Short Wolf Cut', img: TREAT, pos: '70% 30%' },
  { id: 'curly-wolf', service: 'Wolf Cut', name: 'Curly Wolf Cut', img: TREAT, pos: '40% 40%' },
  // Blowout Taper
  { id: 'blowout-taper', service: 'Blowout Taper', name: 'Classic Blowout Taper', img: TREAT, pos: '60% 30%' },
  { id: 'textured-blowout', service: 'Blowout Taper', name: 'Textured Blowout', img: SCISSOR, pos: '40% 20%' },
  { id: 'curly-blowout', service: 'Blowout Taper', name: 'Curly Blowout', img: FADE, pos: '50% 15%' },
  // Crew Cut
  { id: 'classic-crew', service: 'Crew Cut', name: 'Classic Crew Cut', img: CLIP, pos: '50% 50%' },
  { id: 'ivy-league', service: 'Crew Cut', name: 'Ivy League', img: KID, pos: '70% 30%' },
  { id: 'high-and-tight', service: 'Crew Cut', name: 'High and Tight', img: FADE, pos: '60% 30%' },
  // Low Drop Fade
  { id: 'burst-fade', service: 'Low Drop Fade', name: 'Burst Fade', img: FADE, pos: '30% 30%' },
  { id: 'low-fade', service: 'Low Drop Fade', name: 'Low Fade', img: CLIP, pos: '40% 40%' },
  { id: 'drop-fade-curls', service: 'Low Drop Fade', name: 'Drop Fade with Curls', img: TREAT, pos: '50% 20%' },
]
