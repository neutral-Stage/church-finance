#!/usr/bin/env node

/**
 * Apply Admin Migration Script
 *
 * This script applies the admin permission migration without needing Docker/Supabase CLI
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('🚀 Applying admin permission migration...')

  try {
    // 1. Create/update default roles
    console.log('📝 Creating default roles...')

    const roles = [
      {
        name: 'super_admin',
        display_name: 'Super Administrator',
        description: 'Full system access across all churches',
        is_system_role: true,
        permissions: {
          admin: {
            global: true,
            churches: { read: true, create: true, update: true, delete: true },
            users: { read: true, create: true, update: true, delete: true },
            roles: { read: true, create: true, update: true, delete: true }
          },
          funds: { read: true, create: true, update: true, delete: true },
          transactions: { read: true, create: true, update: true, delete: true },
          offerings: { read: true, create: true, update: true, delete: true },
          bills: { read: true, create: true, update: true, delete: true },
          advances: { read: true, create: true, update: true, delete: true }
        },
        is_active: true
      },
      {
        name: 'church_admin',
        display_name: 'Church Administrator',
        description: 'Full administrative access to assigned churches',
        is_system_role: true,
        permissions: {
          admin: {
            churches: { read: true, update: true }
          },
          funds: { read: true, create: true, update: true, delete: true },
          transactions: { read: true, create: true, update: true, delete: true },
          offerings: { read: true, create: true, update: true, delete: true },
          bills: { read: true, create: true, update: true, delete: true },
          advances: { read: true, create: true, update: true, delete: true }
        },
        is_active: true
      }
    ]

    for (const role of roles) {
      const { data, error } = await supabase
        .from('roles')
        .upsert(role, { onConflict: 'name' })

      if (error) {
        console.error(`❌ Error creating role ${role.name}:`, error.message)
      } else {
        console.log(`✅ Role ${role.name} created/updated`)
      }
    }

    // 2. Get super admin role ID
    const { data: superAdminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'super_admin')
      .single()

    if (roleError) {
      console.error('❌ Error fetching super admin role:', roleError.message)
      return
    }

    console.log('🔍 Checking for existing admin users...')

    // 3. Check for existing admin users
    const { data: existingAdmins, error: adminError } = await supabase
      .from('user_church_roles')
      .select('user_id')
      .eq('role_id', superAdminRole.id)
      .eq('is_active', true)

    if (adminError) {
      console.error('❌ Error checking existing admins:', adminError.message)
      return
    }

    if (existingAdmins.length > 0) {
      console.log(`✅ Found ${existingAdmins.length} existing super admin(s)`)
    } else {
      // 4. Find first user and make them super admin
      console.log('🔧 No super admin found, promoting first user...')

      const { data: firstUser, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .order('created_at')
        .limit(1)

      if (userError || !firstUser || firstUser.length === 0) {
        console.log('⚠️  No users found in the system')
        console.log('💡 Create a user account first, then run this script again')
        return
      }

      const user = firstUser[0]
      console.log(`   Promoting user: ${user.email}`)

      // Create super admin role for this user
      const { data: roleAssignment, error: assignError } = await supabase
        .from('user_church_roles')
        .insert({
          user_id: user.id,
          church_id: null, // Global access
          role_id: superAdminRole.id,
          is_active: true,
          granted_at: new Date().toISOString()
        })

      if (assignError) {
        console.error('❌ Error assigning super admin role:', assignError.message)
      } else {
        console.log('✅ Successfully promoted user to super admin!')
      }
    }

    console.log('\n🎉 Migration completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('   1. Start your development server: npm run dev')
    console.log('   2. Sign in with your admin account')
    console.log('   3. Try accessing the admin section')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  }
}

applyMigration()