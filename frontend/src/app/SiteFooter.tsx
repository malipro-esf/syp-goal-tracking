import { Link } from 'react-router-dom'

export function SiteFooter() {
  return <footer className="marketing-footer">
    <div><strong>SYP</strong><span>See Your Progress</span></div>
    <p>Progress over perfection.</p>
    <nav aria-label="Footer navigation"><Link to="/features">Features</Link><Link to="/support">Support</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><button type="button" className="footer-cookie-button" onClick={() => window.dispatchEvent(new Event('open-cookie-preferences'))}>Cookie preferences</button></nav>
  </footer>
}
