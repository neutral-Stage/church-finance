/* eslint-disable no-restricted-globals */
/**
 * PWA service worker — caches offering drafts for offline treasurer entry.
 */
const CACHE_NAME = 'church-finance-v1'
const DRAFT_CACHE_KEY = '/__offering_draft__'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data?.type) return

  if (data.type === 'SAVE_OFFERING_DRAFT' && data.draft) {
    event.waitUntil(persistDraft(data.draft))
    return
  }

  if (data.type === 'CLEAR_OFFERING_DRAFT') {
    event.waitUntil(clearDraft())
    return
  }

  if (data.type === 'GET_OFFERING_DRAFT') {
    event.waitUntil(
      readDraft().then((draft) => {
        if (event.ports?.[0]) {
          event.ports[0].postMessage({ draft })
        }
      })
    )
  }
})

async function persistDraft(draft) {
  const cache = await caches.open(CACHE_NAME)
  const response = new Response(JSON.stringify(draft), {
    headers: { 'Content-Type': 'application/json' },
  })
  await cache.put(DRAFT_CACHE_KEY, response)
}

async function readDraft() {
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match(DRAFT_CACHE_KEY)
  if (!response) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function clearDraft() {
  const cache = await caches.open(CACHE_NAME)
  await cache.delete(DRAFT_CACHE_KEY)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          const clone = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => cached)
    })
  )
})
