import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <div className="brand">CRAFTED</div>
            <p>Built around precision, style, and the art of a well-made cut.</p>
          </div>
          <div>
            <h4>Navigation</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/#services">Services</Link></li>
              <li><Link to="/craftsmen">Barbers</Link></li>
              <li><Link to="/#services">Gallery</Link></li>
              <li><Link to="/#contact">Contact</Link></li>
              <li><Link to="/book">Book Now</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <address>+63 912 345 6789<br />hello@craftedbarbershop.com<br />123 Main Street, Cabuyao, Laguna</address>
          </div>
          <div>
            <h4>Hours</h4>
            <address>Mon – Sat<br />9:00 AM – 8:00 PM</address>
            <address className="gap">Sunday<br />10:00 AM – 6:00 PM</address>
          </div>
        </div>
        <p className="copy">© 2026 CRAFTED BARBERSHOP<br />All rights reserved.</p>
      </div>
    </footer>
  )
}
