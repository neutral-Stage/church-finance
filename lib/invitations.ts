import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { sendEmail } from '@/lib/email'
import { logAuditEvent } from '@/lib/audit'

const INVITATION_TTL_DAYS = 7

export interface ChurchInvitation {
  id: string
  church_id: string
  email: string
  role_id: string | null
  token: string
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface CreateInvitationParams {
  churchId: string
  email: string
  roleId: string
  invitedBy: string
}

export interface AcceptInvitationResult {
  success: boolean
  error?: string
  churchId?: string
  churchName?: string
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex')
}

export function getInvitationExpiryDate(days = INVITATION_TTL_DAYS): string {
  const expires = new Date()
  expires.setDate(expires.getDate() + days)
  return expires.toISOString()
}

function buildInviteUrl(token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return `${siteUrl}/auth/accept-invite?token=${encodeURIComponent(token)}`
}

export async function listChurchInvitations(
  supabase: SupabaseClient<Database>,
  churchId: string
): Promise<ChurchInvitation[]> {
  const { data, error } = await supabase
    .from('church_invitations')
    .select('*')
    .eq('church_id', churchId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error listing invitations:', error.message)
    return []
  }

  return (data ?? []) as ChurchInvitation[]
}

export async function createInvitation(
  supabase: SupabaseClient<Database>,
  params: CreateInvitationParams
): Promise<{ success: boolean; invitation?: ChurchInvitation; error?: string }> {
  const email = params.email.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Valid email is required' }
  }

  const { data: church } = await supabase
    .from('churches')
    .select('id, name')
    .eq('id', params.churchId)
    .single()

  if (!church) {
    return { success: false, error: 'Church not found' }
  }

  const { data: role } = await supabase
    .from('roles')
    .select('id, name, display_name')
    .eq('id', params.roleId)
    .single()

  if (!role) {
    return { success: false, error: 'Role not found' }
  }

  if (role.name === 'super_admin') {
    return { success: false, error: 'Cannot invite users as super admin' }
  }

  const { data: existing } = await supabase
    .from('church_invitations')
    .select('id')
    .eq('church_id', params.churchId)
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'A pending invitation already exists for this email' }
  }

  const token = generateInvitationToken()
  const expiresAt = getInvitationExpiryDate()

  const { data: invitation, error } = await (supabase.from('church_invitations') as any)
    .insert({
      church_id: params.churchId,
      email,
      role_id: params.roleId,
      token,
      invited_by: params.invitedBy,
      expires_at: expiresAt,
    })
    .select('*')
    .single()

  if (error || !invitation) {
    console.error('Error creating invitation:', error?.message)
    return { success: false, error: 'Failed to create invitation' }
  }

  const inviteUrl = buildInviteUrl(token)
  const roleLabel = role.display_name || role.name

  await sendEmail({
    to: email,
    subject: `You're invited to join ${church.name} on Church Finance`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111827">
        <h2 style="font-size:20px;margin-bottom:12px">Join ${church.name}</h2>
        <p style="line-height:1.6;color:#374151">
          You've been invited to join <strong>${church.name}</strong> as <strong>${roleLabel}</strong>.
        </p>
        <p style="margin-top:24px">
          <a href="${inviteUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">
            Accept Invitation
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">This invitation expires in ${INVITATION_TTL_DAYS} days.</p>
      </div>
    `,
    idempotencyKey: `invite-${invitation.id}`,
  })

  await logAuditEvent(supabase, {
    churchId: params.churchId,
    userId: params.invitedBy,
    action: 'create',
    entityType: 'church_invitation',
    entityId: invitation.id,
    newData: { email, role_id: params.roleId },
  })

  return { success: true, invitation: invitation as ChurchInvitation }
}

export async function revokeInvitation(
  supabase: SupabaseClient<Database>,
  invitationId: string,
  revokedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { data: invitation, error: fetchError } = await supabase
    .from('church_invitations')
    .select('*')
    .eq('id', invitationId)
    .single()

  if (fetchError || !invitation) {
    return { success: false, error: 'Invitation not found' }
  }

  if (invitation.accepted_at) {
    return { success: false, error: 'Invitation has already been accepted' }
  }

  const { error } = await supabase
    .from('church_invitations')
    .delete()
    .eq('id', invitationId)

  if (error) {
    console.error('Error revoking invitation:', error.message)
    return { success: false, error: 'Failed to revoke invitation' }
  }

  await logAuditEvent(supabase, {
    churchId: invitation.church_id,
    userId: revokedBy,
    action: 'delete',
    entityType: 'church_invitation',
    entityId: invitationId,
    oldData: { email: invitation.email },
  })

  return { success: true }
}

export async function acceptInvitation(
  supabase: SupabaseClient<Database>,
  token: string,
  userId: string,
  userEmail: string
): Promise<AcceptInvitationResult> {
  const normalizedEmail = userEmail.trim().toLowerCase()

  const { data: invitation, error: fetchError } = await supabase
    .from('church_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (fetchError || !invitation) {
    return { success: false, error: 'Invalid or expired invitation' }
  }

  if (invitation.accepted_at) {
    return { success: false, error: 'This invitation has already been used' }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: 'This invitation has expired' }
  }

  if (invitation.email.toLowerCase() !== normalizedEmail) {
    return {
      success: false,
      error: 'This invitation was sent to a different email address. Please sign in with the invited email.',
    }
  }

  const { data: church } = await supabase
    .from('churches')
    .select('id, name, is_active')
    .eq('id', invitation.church_id)
    .single()

  if (!church) {
    return { success: false, error: 'Church no longer exists' }
  }

  if (church.is_active === false) {
    return { success: false, error: 'This church is currently suspended' }
  }

  if (!invitation.role_id) {
    return { success: false, error: 'Invitation is missing a role assignment' }
  }

  const { data: existingRole } = await supabase
    .from('user_church_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('church_id', invitation.church_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!existingRole) {
    const { error: roleError } = await (supabase.from('user_church_roles') as any).insert({
      user_id: userId,
      church_id: invitation.church_id,
      role_id: invitation.role_id,
      granted_by: invitation.invited_by,
      is_active: true,
      notes: 'Joined via invitation',
    })

    if (roleError) {
      console.error('Error granting church role:', roleError.message)
      return { success: false, error: 'Failed to join church' }
    }
  }

  const { error: acceptError } = await supabase
    .from('church_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  if (acceptError) {
    console.error('Error marking invitation accepted:', acceptError.message)
    return { success: false, error: 'Failed to complete invitation acceptance' }
  }

  await logAuditEvent(supabase, {
    churchId: invitation.church_id,
    userId,
    action: 'update',
    entityType: 'church_invitation',
    entityId: invitation.id,
    newData: { accepted_at: new Date().toISOString() },
  })

  return {
    success: true,
    churchId: church.id,
    churchName: church.name,
  }
}
