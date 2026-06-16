import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const defaultFrom =
  process.env.RESEND_FROM_EMAIL ?? 'Church Finance <onboarding@resend.dev>'

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!resendApiKey) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(resendApiKey)
  }
  return resendClient
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  idempotencyKey?: string
}

export interface SendEmailResult {
  sent: boolean
  messageId?: string
  skipped?: boolean
  reason?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  idempotencyKey,
}: SendEmailParams): Promise<SendEmailResult> {
  const client = getResendClient()
  if (!client) {
    return { sent: false, skipped: true, reason: 'RESEND_API_KEY not configured' }
  }

  if (!to?.trim()) {
    return { sent: false, skipped: true, reason: 'No recipient email' }
  }

  const options = idempotencyKey ? { idempotencyKey } : undefined
  const { data, error } = await client.emails.send(
    {
      from: defaultFrom,
      to: [to.trim()],
      subject,
      html,
    },
    options
  )

  if (error) {
    console.error('Resend email error:', error.message)
    return { sent: false, reason: error.message }
  }

  return { sent: true, messageId: data?.id }
}

export function buildNotificationEmailHtml(params: {
  title: string
  message: string
  actionUrl?: string | null
  siteUrl?: string
}): string {
  const siteUrl = params.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const actionLink = params.actionUrl
    ? params.actionUrl.startsWith('http')
      ? params.actionUrl
      : `${siteUrl}${params.actionUrl}`
    : null
  const actionButton = actionLink
    ? `<p style="margin-top:24px"><a href="${actionLink}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">View in Church Finance</a></p>`
    : ''

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111827">
      <h2 style="font-size:20px;margin-bottom:12px">${escapeHtml(params.title)}</h2>
      <p style="line-height:1.6;color:#374151">${escapeHtml(params.message)}</p>
      ${actionButton}
      <p style="margin-top:32px;font-size:12px;color:#9ca3af">You received this because notification emails are enabled in your Church Finance preferences.</p>
    </div>
  `
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
