#!/usr/bin/env node

/**
 * Demo Account Setup Script
 * Creates demo accounts for the Church Finance Management App
 * 
 * Usage: node scripts/setup-demo-accounts.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Supabase configuration
const supabaseUrl = 'https://apfjyghvbkgucylipmdf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZmp5Z2h2YmtndWN5bGlwbWRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU0MzgzMCwiZXhwIjoyMDcwMTE5ODMwfQ.WX_hGqsui95qb3v6qRk54uWYZkjVTAkuY5RZ1u2PR9A'

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Demo accounts configuration
const demoAccounts = [
  {
    email: 'admin@church.com',
    password: 'admin123',
    role: 'Admin',
    full_name: 'Church Administrator'
  },
  {
    email: 'treasurer@church.com',
    password: 'treasurer123',
    role: 'Treasurer',
    full_name: 'Church Treasurer'
  },
  {
    email: 'viewer@church.com',
    password: 'viewer123',
    role: 'Viewer',
    full_name: 'Church Viewer'
  }
]

async function createDemoAccount(account) {
  try {
    console.log(`Creating demo account: ${account.email}...`)
    
    // Create user with Supabase Auth Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: account.role,
        full_name: account.full_name
      }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`✓ Account ${account.email} already exists`)
        return true
      }
      throw error
    }

    console.log(`✓ Successfully created ${account.email} with role: ${account.role}`)
    return true
  } catch (error) {
    console.error(`✗ Failed to create ${account.email}:`, error.message)
    return false
  }
}

async function setupDemoAccounts() {
  console.log('🚀 Setting up demo accounts for Church Finance Management App...\n')
  
  let successCount = 0
  let totalCount = demoAccounts.length

  for (const account of demoAccounts) {
    const success = await createDemoAccount(account)
    if (success) successCount++
    console.log('') // Add spacing
  }

  console.log('📊 Setup Summary:')
  console.log(`✓ Successfully processed: ${successCount}/${totalCount} accounts`)
  
  if (successCount === totalCount) {
    console.log('\n🎉 All demo accounts are ready!')
    console.log('\nYou can now login with:')
    console.log('• Admin: admin@church.com / admin123')
    console.log('• Treasurer: treasurer@church.com / treasurer123')
    console.log('• Viewer: viewer@church.com / viewer123')
  } else {
    console.log('\n⚠️  Some accounts failed to create. Please check the errors above.')
    process.exit(1)
  }
}

// Run the setup
setupDemoAccounts().catch((error) => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})