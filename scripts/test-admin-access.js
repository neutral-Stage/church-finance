#!/usr/bin/env node

/**
 * Test Admin Access Script
 *
 * This script tests if the admin permissions are working correctly
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAdminAccess() {
  console.log('🧪 Testing Admin Access Configuration...\n')

  try {
    // 1. Check if roles exist
    console.log('1️⃣ Checking if admin roles exist...')
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('name, display_name, is_active')
      .in('name', ['super_admin', 'church_admin'])

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message)
      return
    }

    console.log('   Roles found:')
    roles.forEach(role => {
      console.log(`   - ${role.display_name} (${role.name}) - ${role.is_active ? 'Active' : 'Inactive'}`)
    })

    const superAdminRole = roles.find(r => r.name === 'super_admin')
    if (!superAdminRole) {
      console.error('❌ Super admin role not found!')
      return
    }

    // 2. Check if there are any super admin users
    console.log('\n2️⃣ Checking for super admin users...')

    // First get the super admin role ID
    const { data: superAdminRoleData, error: roleIdError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'super_admin')
      .single()

    if (roleIdError) {
      console.error('❌ Error fetching super admin role ID:', roleIdError.message)
      return
    }

    // Then get user church roles with that role ID
    const { data: userRoles, error: adminError } = await supabase
      .from('user_church_roles')
      .select('user_id, is_active, church_id')
      .eq('role_id', superAdminRoleData.id)
      .eq('is_active', true)

    if (adminError) {
      console.error('❌ Error fetching admin user roles:', adminError.message)
      return
    }

    // Get user details separately
    let adminUsers = []
    if (userRoles.length > 0) {
      const userIds = userRoles.map(ur => ur.user_id)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds)

      if (!usersError) {
        adminUsers = users.map(user => ({
          ...user,
          church_id: userRoles.find(ur => ur.user_id === user.id)?.church_id
        }))
      }
    }

    if (adminError) {
      console.error('❌ Error fetching admin users:', adminError.message)
      return
    }

    if (adminUsers.length === 0) {
      console.log('⚠️  No active super admin users found!')
      return
    }

    console.log('   Super Admin Users:')
    adminUsers.forEach((user, index) => {
      const scope = user.church_id ? `Church: ${user.church_id}` : 'Global'
      console.log(`   ${index + 1}. ${user.email} (${user.full_name || 'No name'}) - ${scope}`)
    })

    // 3. Test permission function
    console.log('\n3️⃣ Testing permission checking function...')
    const testUserId = adminUsers[0].id

    // Use raw SQL to test the permission function
    const { data: permissionTest, error: permError } = await supabase.rpc('user_has_admin_permission', {
      user_id: testUserId,
      permission_path: 'admin.churches.read'
    })

    if (permError) {
      console.error('❌ Error testing permissions:', permError.message)
    } else {
      console.log(`   User ${adminUsers[0].email} has admin.churches.read permission: ${permissionTest ? '✅' : '❌'}`)
    }

    // 4. Test API endpoints (basic structure check)
    console.log('\n4️⃣ Testing API endpoint accessibility...')

    // Test if the endpoint returns proper error for unauthenticated access
    try {
      const response = await fetch('http://localhost:3000/api/admin/churches/financial')
      const data = await response.json()

      if (response.status === 401 && data.error.includes('Unauthorized')) {
        console.log('   ✅ API properly rejects unauthenticated requests')
      } else {
        console.log('   ⚠️  API response unexpected:', response.status, data)
      }
    } catch (fetchError) {
      console.log('   ⚠️  Could not test API endpoint (server might not be running)')
    }

    console.log('\n🎉 Admin access test completed!')
    console.log('\n💡 Next steps to test full functionality:')
    console.log('   1. Start the development server: npm run dev')
    console.log('   2. Sign in with an admin account')
    console.log('   3. Navigate to: http://localhost:3000/admin/churches')
    console.log('   4. You should see the church financial dashboard')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAdminAccess()