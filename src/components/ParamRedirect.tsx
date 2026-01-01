import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

export default function ParamRedirect({
  to
}: {
  to: (params: Record<string, string | undefined>) => string
}) {
  const params = useParams()
  return <Navigate to={to(params)} replace />
}
