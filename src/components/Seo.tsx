import React, { useEffect, useMemo, useRef } from 'react'

type JsonLd = Record<string, any> | Record<string, any>[]

export interface SeoProps {
  title?: string
  description?: string
  canonical?: string
  image?: string
  structuredData?: JsonLd
}

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')
const DEFAULT_TITLE = 'SEE.io | Discover Amazing Events Near You'
const DEFAULT_DESCRIPTION =
  'SEE.io surfaces the best concerts, nightlife, food festivals, and local happenings with curated playlists and personalized discovery.'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`

const setMetaTag = (selector: { name?: string; property?: string }, content: string) => {
  if (!content) return
  const attr = selector.name ? 'name' : 'property'
  const key = selector.name ?? selector.property!
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

const setCanonical = (href: string) => {
  if (!href) return
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

const serializeJsonLd = (data: JsonLd) => JSON.stringify(data, null, 2)

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image = DEFAULT_IMAGE,
  structuredData
}: SeoProps) {
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const computedTitle = title ? `${title} | SEE.io` : DEFAULT_TITLE
  const computedCanonical = canonical || `${SITE_URL}${window.location.pathname}`

  useEffect(() => {
    document.title = computedTitle
    setMetaTag({ name: 'description' }, description)
    setMetaTag({ property: 'og:title' }, computedTitle)
    setMetaTag({ property: 'og:description' }, description)
    setMetaTag({ property: 'og:url' }, computedCanonical)
    setMetaTag({ property: 'og:image' }, image)
    setMetaTag({ name: 'twitter:title' }, computedTitle)
    setMetaTag({ name: 'twitter:description' }, description)
    setMetaTag({ name: 'twitter:image' }, image)
    setCanonical(computedCanonical)
  }, [computedTitle, description, computedCanonical, image])

  useEffect(() => {
    if (!structuredData) {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current)
        scriptRef.current = null
      }
      return
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = serializeJsonLd(structuredData)
    document.head.appendChild(script)
    scriptRef.current = script
    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current)
        scriptRef.current = null
      }
    }
  }, [structuredData])

  return null
}
