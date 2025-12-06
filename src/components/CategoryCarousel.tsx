import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

interface CategoryItem {
  id?: string
  name: string
  tags?: string[]
}

const iconMap: Record<string, string> = {
  Music: '🎵',
  'Food & Drink': '🍽️',
  Sports: '🏅',
  'Art & Culture': '🎨',
  Tech: '💻',
  Business: '💼',
  Community: '🤝',
  Family: '👪',
  Education: '📚',
  Outdoors: '🌲',
  Fitness: '🧘‍♂️',
  Nightlife: '🌙'
}

type CategoryCarouselProps = {
  headline?: string
  subhead?: string
  limit?: number
}

export default function CategoryCarousel({ headline = 'Browse by category', subhead = 'Jump straight into events you love.', limit = 12 }: CategoryCarouselProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const auth = useAuth()
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([])

  const userId = useMemo(
    () => auth.profile?.uid || auth.profile?.id || auth.profile?.userId || auth.profile?.localId,
    [auth.profile]
  )

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const resp = await api.fetchCategories()
        setCategories(Array.isArray(resp) ? resp : [])
        setError(null)
      } catch (err) {
        console.error('Failed to load categories', err)
        setCategories([])
        setError('Categories are unavailable right now.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadPreferences = async () => {
      if (!userId || !auth.idToken) return
      try {
        const prefs = await api.fetchUserPreferences(userId, auth.idToken)
        if (Array.isArray(prefs.categories)) setFavoriteCategories(prefs.categories)
      } catch (err) {
        console.debug('category preferences unavailable', err)
      }
    }
    loadPreferences()
  }, [auth.idToken, userId])

  const prioritizedCategories = useMemo(() => {
    if (!categories.length) return []
    const preferredSet = new Set(favoriteCategories)
    const prioritized: CategoryItem[] = []
    categories.forEach(cat => {
      if (preferredSet.has(cat.name) && prioritized.length < limit) prioritized.push(cat)
    })
    categories.forEach(cat => {
      if (prioritized.length < limit && !prioritized.includes(cat)) prioritized.push(cat)
    })
    return prioritized.slice(0, limit)
  }, [categories, favoriteCategories, limit])

  const handleSelect = (category: CategoryItem) => {
    const identifier = encodeURIComponent(category.id || category.name)
    navigate(`/categories/${identifier}`, { state: { category } })
  }
  const trackRef = useRef<HTMLDivElement | null>(null)
  const scrollBy = (dir: number) => {
    const node = trackRef.current
    if (!node) return
    const distance = Math.max(node.clientWidth * 0.85, 240)
    node.scrollBy({ left: dir * distance, behavior: 'smooth' })
  }

  return (
    <section className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-body">
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{headline}</h3>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--gray-600)' }}>{subhead}</p>
        </div>
        {loading && (
          <div style={{ padding: '1rem', color: 'var(--gray-600)' }}>Loading categories…</div>
        )}
        {error && !loading && (
          <div style={{ padding: '1rem', color: 'var(--gray-600)' }}>{error}</div>
        )}
        {!loading && !error && (
          <div className="category-carousel-wrapper">
            <button
              className="category-nav-btn"
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollBy(-1)}
            >
              ←
            </button>
            <div className="category-carousel" ref={trackRef}>
              {prioritizedCategories.map(category => {
                const icon =
                  iconMap[category.name] ||
                  iconMap[category.tags?.find(tag => iconMap[tag])]
                    || '✨'
                return (
                  <button
                    key={category.id || category.name}
                    className="category-pill"
                    type="button"
                    onClick={() => handleSelect(category)}
                  >
                    <span className="category-icon" aria-hidden>
                      {icon}
                    </span>
                    <span>{category.name}</span>
                  </button>
                )
              })}
            </div>
            <button
              className="category-nav-btn"
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollBy(1)}
            >
              →
            </button>
          </div>
        )}
      </div>
      <style>{`
        .category-carousel-wrapper {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 0.5rem;
          align-items: center;
        }
        .category-carousel {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(160px, 1fr);
          gap: 0.75rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scrollbar-width: none;
        }
        .category-carousel::-webkit-scrollbar { display: none; }
        .category-nav-btn {
          border: 1px solid var(--gray-200);
          background: #fff;
          border-radius: 999px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.1rem;
          color: var(--gray-700);
          transition: border-color 0.2s ease, color 0.2s ease;
        }
        .category-nav-btn:hover {
          border-color: var(--primary-blue);
          color: var(--primary-blue);
        }
        .category-pill {
          border: 1px solid var(--gray-200);
          background: #fff;
          border-radius: 999px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .category-pill:hover {
          border-color: var(--primary-blue);
          box-shadow: 0 8px 20px rgba(15,23,42,0.1);
        }
        .category-icon {
          font-size: 1.25rem;
          line-height: 1;
        }
        @media (max-width: 640px) {
          .category-carousel {
            grid-auto-columns: minmax(140px, 1fr);
          }
        }
      `}</style>
    </section>
  )
}
