import { Link } from 'react-router-dom'
import Page from '../components/Page'

export default function ComingSoon({ title }) {
  return (
    <Page>
      <div className="page-title"><h1>{title.toUpperCase()}</h1></div>
      <section className="page-body" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', marginBottom: 32 }}>This page is built in the next stage.</p>
        <Link className="btn btn-gold" to="/">Back home</Link>
      </section>
    </Page>
  )
}
