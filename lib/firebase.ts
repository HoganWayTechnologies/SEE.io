import { initializeApp, FirebaseApp, getApps } from 'firebase/app'
import { getAuth, signInWithCustomToken, User } from 'firebase/auth'

const resolveEnv = () => {
  if (typeof process !== 'undefined' && process.env) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    }
  }
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined
  if (metaEnv) {
    return {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY || metaEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || metaEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || metaEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: metaEnv.VITE_FIREBASE_APP_ID || metaEnv.NEXT_PUBLIC_FIREBASE_APP_ID
    }
  }
  return {
    apiKey: undefined,
    authDomain: undefined,
    projectId: undefined,
    appId: undefined
  }
}

let app: FirebaseApp | null = null

export function initFirebase() {
  if (getApps().length) return
  const config = resolveEnv()
  if (!config.apiKey) {
    throw new Error('Firebase config missing. Set NEXT_PUBLIC_FIREBASE_* or VITE_FIREBASE_* env vars.')
  }
  initializeApp(config)
}

export async function signInWithFirebaseCustomToken(customToken: string) {
  initFirebase()
  const auth = getAuth()
  const result = await signInWithCustomToken(auth, customToken)
  return result.user as User
}

export function getFirebaseAuth() {
  initFirebase()
  return getAuth()
}
