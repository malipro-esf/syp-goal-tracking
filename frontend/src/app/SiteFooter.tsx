import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function SiteFooter() {
  const { t } = useTranslation()
  return <footer className="marketing-footer">
    <div><strong>SYP</strong><span>{t('trust.footer.name')}</span></div>
    <p>{t('trust.footer.tagline')}</p>
    <nav aria-label={t('trust.footer.navigation')}><Link to="/features">{t('trust.footer.features')}</Link><Link to="/support">{t('trust.footer.support')}</Link><Link to="/privacy">{t('trust.footer.privacy')}</Link><Link to="/terms">{t('trust.footer.terms')}</Link><button type="button" className="footer-cookie-button" onClick={() => window.dispatchEvent(new Event('open-cookie-preferences'))}>{t('trust.footer.cookies')}</button></nav>
  </footer>
}
