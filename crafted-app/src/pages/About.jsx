import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Page from '../components/Page'

const features = [
  ['Guaranteed Schedules', 'Strict appointment windows mean you get in the chair on time—no waiting around.'],
  ['Bespoke Precision', 'We tailor every fade, line, and taper to your specific face shape and hair texture, complete with hot towels and straight-razor finishes.'],
  ['Refined Space', 'An elevated, comfortable environment where you can unwind, enjoy a complimentary drink, and get back to your day looking sharp.'],
]

export default function About() {
  return (
    <Page>
      <section className="about-hero">
        <div className="about-bg"><img src="/assets/about-bg.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} /></div>
        <div className="about-inner">
          <p className="eyebrow">ABOUT</p>
          <h1>CRAFTED</h1>
          <p className="tag">MADE WITH PRECISION.</p>
          <div className="about-text">
            <p>Crafted was built to be a simple, reliable fixture in the neighborhood. Aesthetic environment, sharp tools, and a team that takes genuine pride in sending you out the door looking clean and put-together.</p>
            <p>We wanted a place that just got it right—a solid haircut, a clean shave, and a comfortable chair where you don't feel rushed out the door.</p>
            <p>No pretension. Just honest barbershop work.</p>
          </div>
        </div>
      </section>
      <section className="section about-apart">
        <div className="wrap apart-grid">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2>What Sets Crafted Apart</h2>
            <p>We skipped the rushed assembly-line cuts and overhyped salon gimmicks to bring back what a barbershop should be: reliable, high-caliber grooming.</p>
          </motion.div>
          <div className="feature-list">
            {features.map(([t, d], i) => (
              <motion.div key={t} className="feature" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.12 }}>
                <h3>{t}</h3><p>{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 64 }}><Link className="btn btn-gold" to="/#services">View Services &rarr;</Link></div>
      </section>
    </Page>
  )
}
