#!/usr/bin/env node

/**
 * Setup Admin User Script
 *
 * This script helps set up admin users for the church finance system.
 * It can be run to grant super admin permissions to existing users.
 *
 * Usage:
 *   node scripts/setup-admin.js --email user@example.com
 *   node scripts/setup-admin.js --list-users
 *   node scripts/setup-admin.js --check-permissions user@example.com
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function listUsers() {
  console.log('📋 Listing all users...\n')

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, full_name, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (users.length === 0) {
      console.log('   No users found in the system.')
      return
    }

    console.table(users.map(user => ({
      Email: user.email,
      Name: user.full_name || 'N/A',
      'Legacy Role': user.role || 'N/A',
      'Created': new Date(user.created_at).toLocaleDateString()
    })))

    // Check for admin roles
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_church_roles')
      .select(`
        user_id,
        is_active,
        roles!inner(name, display_name)
      `)
      .eq('is_active', true)

    if (!rolesError && adminRoles.length > 0) {
      console.log('\n👑 Users with admin roles:')

      const adminUsers = adminRoles
        .filter(ur => ur.roles.name === 'super_admin' || ur.roles.name === 'church_admin')
        .map(ur => {
          const user = users.find(u => u.id === ur.user_id)
          return {
            email: user?.email || 'Unknown',
            role: ur.roles.display_name
          }
        })

      if (adminUsers.length > 0) {
        console.table(adminUsers)
      } else {
        console.log('   No admin users found.')
      }
    }

  } catch (error) {
    console.error('❌ Error listing users:', error.message)
  }
}

async function grantAdminAccess(email) {
  console.log(`🔐 Granting super admin access to: ${email}`)

  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.error(`❌ User with email ${email} not found.`)
      console.log('💡 Make sure the user has signed up and their profile exists in the users table.')
      return
    }

    console.log(`   Found user: ${user.full_name || user.email}`)

    // Use the database function to grant super admin role
    const { data, error } = await supabase.rpc('grant_super_admin_role', {
      user_email: email
    })

    if (error) {
      console.error('❌ Error granting admin access:', error.message)
      return
    }

    if (data) {
      console.log('✅ Successfully granted super admin access!')
      console.log(`   ${email} now has full administrative privileges.`)
    } else {
      console.log('⚠️  Function completed but returned false. Check the logs.')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function checkPermissions(email) {
  console.log(`🔍 Checking permissions for: ${email}`)

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.error(`❌ User with email ${email} not found.`)
      return
    }

    console.log(`   User: ${user.full_name || user.email}`)
    console.log(`   Legacy Role: ${user.role || 'N/A'}`)

    // Check user church roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_church_roles')
      .select(`
        church_id,
        is_active,
        expires_at,
        granted_at,
        roles!inner(name, display_name, permissions)
      `)
      .eq('user_id', user.id)

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message)
      return
    }

    if (roles.length === 0) {
      console.log('   No church roles assigned.')
      return
    }

    console.log('\n📋 Church Roles:')
    roles.forEach((role, index) => {
      console.log(`   ${index + 1}. ${role.roles.display_name} (${role.roles.name})`)
      console.log(`      Church: ${role.church_id || 'Global'}`)
      console.log(`      Active: ${role.is_active}`)
      console.log(`      Granted: ${new Date(role.granted_at).toLocaleDateString()}`)
      if (role.expires_at) {
        console.log(`      Expires: ${new Date(role.expires_at).toLocaleDateString()}`)
      }
    })

    // Check admin permissions
    const hasAdminRole = roles.some(r =>
      r.is_active && (r.roles.name === 'super_admin' || r.roles.name === 'church_admin')
    )

    if (hasAdminRole) {
      console.log('\n✅ User has administrative access!')
    } else {
      console.log('\n⚠️  User does not have administrative access.')
    }

  } catch (error) {
    console.error('❌ Error checking permissions:', error.message)
  }
}

async function runMigrations() {
  console.log('🚀 Running admin setup migration...')

  try {
    // Run the setup migration
    const migrationSql = `
      -- Run the admin permission setup
      SELECT grant_super_admin_role(email) as result
      FROM users
      WHERE role IN ('admin', 'super_admin')
      LIMIT 1;
    `

    const { data, error } = await supabase.rpc('exec', { sql: migrationSql })

    if (error) {
      console.error('❌ Migration error:', error.message)
    } else {
      console.log('✅ Migration completed successfully!')
    }

  } catch (error) {
    console.error('❌ Error running migration:', error.message)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help')) {
  console.log(`
Church Finance Admin Setup Tool

Usage:
  node scripts/setup-admin.js [options]

Options:
  --email <email>         Grant super admin access to user
  --list-users           List all users and their roles
  --check <email>        Check permissions for a user
  --migrate              Run admin setup migration
  --help                 Show this help

Examples:
  node scripts/setup-admin.js --email admin@church.com
  node scripts/setup-admin.js --list-users
  node scripts/setup-admin.js --check admin@church.com
`)
  process.exit(0)
}

// Handle commands
async function main() {
  if (args.includes('--list-users')) {
    await listUsers()
  } else if (args.includes('--email')) {
    const emailIndex = args.indexOf('--email')
    const email = args[emailIndex + 1]
    if (!email) {
      console.error('❌ Please provide an email address after --email')
      process.exit(1)
    }
    await grantAdminAccess(email)
  } else if (args.includes('--check')) {
    const checkIndex = args.indexOf('--check')
    const email = args[checkIndex + 1]
    if (!email) {
      console.error('❌ Please provide an email address after --check')
      process.exit(1)
    }
    await checkPermissions(email)
  } else if (args.includes('--migrate')) {
    await runMigrations()
  } else {
    console.error('❌ Unknown command. Use --help for usage information.')
    process.exit(1)
  }
}

main().catch(console.error)