// Sample hairstyles shown in the Services gallery.
// They are keyed by the EXISTING service name (the services table),
// so price, duration and description always come from the real service record.
//
// Every hairstyle has its OWN picture in /public/assets/, named after the hairstyle itself
// (never after its parent service). `img` is the exact path of that file.
// If a file is missing, the card shows a labelled placeholder with the missing filename
// (see HairstyleGallery.jsx) instead of silently reusing another picture.
const A = '/assets/'

export const hairstyles = [
  // Taper Fade
  { id: 'low-taper', service: 'Taper Fade', name: 'Low Taper', img: `${A}low-taper.jpg` },
  { id: 'mid-taper', service: 'Taper Fade', name: 'Mid Taper', img: `${A}mid-taper.jpg` },
  { id: 'classic-taper', service: 'Taper Fade', name: 'Classic Taper', img: `${A}classic-taper.jfif` },
  // Skin Fade  (no image files exist yet -> placeholders that name the missing file)
  { id: 'low-skin-fade', service: 'Skin Fade', name: 'Low Skin Fade', img: `${A}low-skin-fade.png` },
  { id: 'mid-skin-fade', service: 'Skin Fade', name: 'Mid Skin Fade', img: `${A}mid-skin-fade.png` },
  { id: 'high-skin-fade', service: 'Skin Fade', name: 'High Skin Fade', img: `${A}high-skin-fade.png` },
  // Undercut Fade  (no image files exist yet -> placeholders that name the missing file)
  { id: 'disconnected-undercut', service: 'Undercut Fade', name: 'Disconnected Undercut', img: `${A}disconnected-undercut.png` },
  { id: 'textured-undercut', service: 'Undercut Fade', name: 'Textured Undercut', img: `${A}textured-undercut.png` },
  { id: 'slicked-undercut', service: 'Undercut Fade', name: 'Slicked Undercut', img: `${A}slicked-undercut.png` },
  // Buzz Cut
  { id: 'classic-buzz', service: 'Buzz Cut', name: 'Classic Buzz', img: `${A}classic-buzz.png` }, // MISSING on disk
  { id: 'butch-cut', service: 'Buzz Cut', name: 'Butch Cut', img: `${A}butch-cut.jpg` },
  { id: 'induction-cut', service: 'Buzz Cut', name: 'Induction Cut', img: `${A}induction-cut.jpg` },
  // Slick Back
  { id: 'classic-slick-back', service: 'Slick Back', name: 'Classic Slick Back', img: `${A}classic-slick-back.jpg` },
  { id: 'pompadour', service: 'Slick Back', name: 'Pompadour', img: `${A}pompadour.jpg` },
  { id: 'side-swept-slick', service: 'Slick Back', name: 'Side-Swept Slick', img: `${A}side-swept-slick.jpg` },
  // Modern Mullet
  { id: 'classic-mullet', service: 'Modern Mullet', name: 'Classic Modern Mullet', img: `${A}classic-modern-mullet.jpg` },
  { id: 'textured-mullet', service: 'Modern Mullet', name: 'Textured Mullet', img: `${A}textured-mullet.jpg` },
  { id: 'mullet-fade', service: 'Modern Mullet', name: 'Mullet Fade', img: `${A}mullet-fade.jpg` },
  // Wolf Cut
  { id: 'classic-wolf', service: 'Wolf Cut', name: 'Classic Wolf Cut', img: `${A}classic-wolf-cut.jpg` },
  { id: 'short-wolf', service: 'Wolf Cut', name: 'Short Wolf Cut', img: `${A}short-wolf-cut.jpg` },
  { id: 'curly-wolf', service: 'Wolf Cut', name: 'Curly Wolf Cut', img: `${A}curly-wolf-cut.jpg` },
  // Blowout Taper
  { id: 'blowout-taper', service: 'Blowout Taper', name: 'Classic Blowout Taper', img: `${A}classic-blowout-taper.jpg` },
  { id: 'textured-blowout', service: 'Blowout Taper', name: 'Textured Blowout', img: `${A}textured-blowout.jpg` },
  { id: 'curly-blowout', service: 'Blowout Taper', name: 'Curly Blowout', img: `${A}curly-blowout.jpg` },
  // Crew Cut
  { id: 'classic-crew', service: 'Crew Cut', name: 'Classic Crew Cut', img: `${A}classic-crew-cut.jpg` },
  { id: 'ivy-league', service: 'Crew Cut', name: 'Ivy League', img: `${A}ivy-league.jpg` },
  { id: 'high-and-tight', service: 'Crew Cut', name: 'High and Tight', img: `${A}high-and-tight.jpg` },
  // Low Drop Fade
  { id: 'burst-fade', service: 'Low Drop Fade', name: 'Burst Fade', img: `${A}burst-fade.jfif` },
  { id: 'low-fade', service: 'Low Drop Fade', name: 'Low Fade', img: `${A}low-fade.jpg` },
  { id: 'drop-fade-curls', service: 'Low Drop Fade', name: 'Drop Fade with Curls', img: `${A}drop-fade-with-curls.jpg` },
]