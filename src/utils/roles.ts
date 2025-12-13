export const isAuthenticated = (idToken?: string | null) => Boolean(idToken)

export const isBusiness = (profile: any, primaryBusinessId?: string | null, memberships?: any[]) => {
  const roles = normalizeRoles(profile)
  if (roles.has('business') || roles.has('publisher') || roles.has('host')) return true
  if (primaryBusinessId) return true
  if (Array.isArray(memberships) && memberships.length > 0) return true
  if (profile?.businessId || profile?.business?.id || profile?.publisher?.businessId) return true
  return false
}

export const isAdmin = (profile: any) => {
  const roles = normalizeRoles(profile)
  if (roles.has('admin') || roles.has('superadmin')) return true
  if (profile?.isAdmin) return true
  if (profile?.claims?.admin) return true
  return false
}

const normalizeRoles = (profile: any): Set<string> => {
  const roles = new Set<string>()
  const list = profile?.roles || profile?.Roles || profile?.claims?.roles
  if (Array.isArray(list)) {
    list.forEach((role: any) => {
      if (typeof role === 'string') roles.add(role.toLowerCase())
    })
  } else if (typeof list === 'string') {
    list.split(',').forEach((role: string) => roles.add(role.trim().toLowerCase()))
  }
  if (profile?.role) roles.add(String(profile.role).toLowerCase())
  return roles
}
