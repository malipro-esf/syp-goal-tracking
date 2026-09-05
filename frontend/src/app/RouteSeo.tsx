import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const publicMetadata: Record<string, { title: string; description: string; robots: string }> = {
  '/': {
    title: 'SYP — Smart Goal Tracking & AI Coaching',
    description: 'Turn meaningful goals into measurable plans, record actual effort, and improve with deterministic progress insights and optional AI coaching.',
    robots: 'index, follow',
  },
  '/how-it-works': {
    title: 'How SYP works | See Your Progress',
    description: 'See how SYP turns goals into measurable activities, records partial effort, and calculates deterministic progress insights.',
    robots: 'index, follow',
  },
  '/features': {
    title: 'Features | SYP Goal Tracking & Coaching',
    description: 'Explore SYP features for measurable plans, partial effort tracking, deterministic progress reports, coach collaboration, and controlled AI guidance.',
    robots: 'index, follow',
  },
  '/for-coaches': {
    title: 'Goal Coaching Platform for Coaches | SYP',
    description: 'Create reusable plan templates, invite participants, review deterministic progress, and provide scoped coaching feedback with SYP.',
    robots: 'index, follow',
  },
  '/login': {
    title: 'Sign in | SYP',
    description: 'Sign in to your private SYP goal tracking workspace.',
    robots: 'noindex, nofollow',
  },
  '/register': {
    title: 'Create your SYP account',
    description: 'Create an SYP account and start tracking progress through actual effort.',
    robots: 'noindex, nofollow',
  },
  '/support': {
    title: 'Support | SYP',
    description: 'Find answers and contact the SYP support team.',
    robots: 'index, follow',
  },
  '/privacy': {
    title: 'Privacy Policy | SYP',
    description: 'Learn what information SYP collects, how it is used, and the choices available to you.',
    robots: 'index, follow',
  },
  '/terms': {
    title: 'Terms of Service | SYP',
    description: 'Read the terms that apply when using the SYP goal tracking and coaching platform.',
    robots: 'index, follow',
  },
}

function setMeta(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.append(element)
  }
  element.content = content
}

export function RouteSeo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const metadata = publicMetadata[pathname] ?? {
      title: 'Private workspace | SYP',
      description: 'Private SYP goal tracking workspace.',
      robots: 'noindex, nofollow',
    }
    document.title = metadata.title
    setMeta('description', metadata.description)
    setMeta('robots', metadata.robots)
  }, [pathname])

  return null
}
