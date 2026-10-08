import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.25 }}>
            <header><h2>{title}</h2><button onClick={onClose} aria-label="Close">&times;</button></header>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
