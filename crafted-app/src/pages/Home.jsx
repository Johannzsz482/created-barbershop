import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Page from '../components/Page'
import Gallery from '../components/Gallery'
import HairstyleGallery from '../components/HairstyleGallery'
import ContactForm from '../components/ContactForm'
import { useAuth } from '../context/AuthContext'

const up = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
})
const reveal = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: 'easeOut' },
}

export default function Home() {
  const { user } = useAuth()
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo({ top: 0 })
  }, [hash])

  return (
    <Page>
      <section className="hero" id="home">
        <div className="hero-bg ph"><img src="/assets/bg.png" alt="" /></div>
        <div className="hero-content">
          <motion.h1 {...up(0.1)}>CRAFTED</motion.h1>
          <motion.p className="tag" {...up(0.3)}>Made with precision.</motion.p>
          <motion.div className="cta" {...up(0.5)}>
            {user?.role !== 'Admin' && <Link className="btn btn-light" to="/book">Book Now</Link>}
            <Link className="btn btn-outline" to="/craftsmen">Our Craftsmen &rarr;</Link>
          </motion.div>
        </div>
      </section>

      <section className="section define" id="style">
        <div className="wrap">
          <motion.div {...reveal}>
            <h2>Define Your Style</h2>
            <p>A personalized consultation focused on understanding your preferences and defining a style that complements your features and individual character.</p>
            {user?.role !== 'Admin' && <Link className="btn btn-gold" to="/book">Book Now &rarr;</Link>}
          </motion.div>
          <ol className="steps">
            {['Understand your Preferences', 'Evaluate Your Features', 'Finalize Your Style'].map((s, i) => (
              <motion.li key={s} className="step" {...reveal} transition={{ ...reveal.transition, delay: i * 0.12 }}>
                <b>0{i + 1}</b><span>{s}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section gallery" id="services">
        <div className="wrap"><motion.h2 {...reveal}>Services</motion.h2></div>
        <Gallery />
        <HairstyleGallery />
      </section>

      <section className="section contact" id="contact">
        <motion.div className="contact-card" {...reveal}>
          <h2>Contact Us</h2>
          <p className="lead">Have a question or ready to book your next cut? Get in touch with the CRAFTED team.</p>
          <ContactForm />
        </motion.div>
      </section>
    </Page>
  )
}