/**
 * Public demo / fixture mode. When enabled, the app uses local mock data and
 * short-circuits API routes (see middleware). Never enable against production data.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}
