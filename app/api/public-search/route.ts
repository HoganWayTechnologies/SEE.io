import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const API_BASE = (process.env.NEXT_PUBLIC_SEE_API_URL || 'https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SEEAPI').replace(/\/$/, '')

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const params: Record<string, any> = {}
  for (const [k, v] of url.searchParams.entries()) {
    params[k] = v
  }

  if (!API_BASE) {
    return NextResponse.json({ error: 'SEE API base not configured' }, { status: 500 })
  }

  try {
    const resp = await axios.get(`${API_BASE}/v1/public/events`, { params })
    const data = resp.data
    // normalize paged result
    const items = Array.isArray(data) ? data : data?.items || data?.events || []
    const nextPageToken = data?.nextPageToken || null
    return NextResponse.json({ items, nextPageToken })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'search failed' }, { status: 502 })
  }
}
