/** Client-side offering draft shape cached for offline PWA use. */
export interface OfferingDraft {
  type: string
  amount: number
  service_date: string
  notes?: string
  churchId?: string
  savedAt: string
}

const DRAFT_STORAGE_KEY = 'church-finance-offering-draft'

export function getOfferingDraft(): OfferingDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OfferingDraft) : null
  } catch {
    return null
  }
}

export function saveOfferingDraft(draft: Omit<OfferingDraft, 'savedAt'>): OfferingDraft {
  const payload: OfferingDraft = { ...draft, savedAt: new Date().toISOString() }
  if (typeof window !== 'undefined') {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
    void syncOfferingDraftToServiceWorker(payload)
  }
  return payload
}

export function clearOfferingDraft(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DRAFT_STORAGE_KEY)
  void syncOfferingDraftToServiceWorker(null)
}

async function syncOfferingDraftToServiceWorker(draft: OfferingDraft | null): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return
  navigator.serviceWorker.controller.postMessage({
    type: draft ? 'SAVE_OFFERING_DRAFT' : 'CLEAR_OFFERING_DRAFT',
    draft,
  })
}

export async function readOfferingDraftFromServiceWorker(): Promise<OfferingDraft | null> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return getOfferingDraft()
  }

  const registration = await navigator.serviceWorker.ready
  const active = registration.active
  if (!active) return getOfferingDraft()

  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (event: MessageEvent<{ draft?: OfferingDraft | null }>) => {
      resolve(event.data?.draft ?? getOfferingDraft())
    }
    active.postMessage({ type: 'GET_OFFERING_DRAFT' }, [channel.port2])
    setTimeout(() => resolve(getOfferingDraft()), 500)
  })
}
