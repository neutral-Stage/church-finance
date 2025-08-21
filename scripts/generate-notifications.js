#!/usr/bin/env node

/**
 * Notification Generation Script
 * 
 * This script can be run periodically (e.g., via cron job) to generate
 * real-time notifications based on database events.
 * 
 * Usage:
 *   node scripts/generate-notifications.js [type]
 * 
 * Types:
 *   - all (default): Generate all types of notifications
 *   - bills: Generate bill-related notifications
 *   - transactions: Generate transaction notifications
 *   - offerings: Generate offering notifications
 *   - advances: Generate advance notifications
 *   - cleanup: Clean up old notifications
 */

import https from 'https'
import http from 'http'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const API_ENDPOINT = '/api/notifications/generate'

// Get notification type from command line arguments
const notificationType = process.argv[2] || 'all'

const validTypes = ['all', 'bills', 'transactions', 'offerings', 'advances', 'cleanup']

if (!validTypes.includes(notificationType)) {
  console.error(`Invalid notification type: ${notificationType}`)
  console.error(`Valid types: ${validTypes.join(', ')}`)
  process.exit(1)
}

// Function to make HTTP request
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    
    const postData = JSON.stringify(data)
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = client.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData)
          resolve({ statusCode: res.statusCode, data: parsedData })
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: responseData })
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.write(postData)
    req.end()
  })
}

// Main execution
async function generateNotifications() {
  console.log(`Starting notification generation for type: ${notificationType}`)
  console.log(`API URL: ${API_BASE_URL}${API_ENDPOINT}`)
  
  try {
    const response = await makeRequest(`${API_BASE_URL}${API_ENDPOINT}`, {
      type: notificationType
    })
    
    if (response.statusCode === 200) {
      console.log('✅ Notifications generated successfully!')
      console.log('Response:', response.data)
    } else {
      console.error('❌ Failed to generate notifications')
      console.error('Status Code:', response.statusCode)
      console.error('Response:', response.data)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error generating notifications:', error.message)
    process.exit(1)
  }
}

// Add timestamp to logs
const timestamp = new Date().toISOString()
console.log(`[${timestamp}] Notification Generation Script Started`)

generateNotifications()
  .then(() => {
    const endTimestamp = new Date().toISOString()
    console.log(`[${endTimestamp}] Notification Generation Script Completed`)
    process.exit(0)
  })
  .catch((error) => {
    const errorTimestamp = new Date().toISOString()
    console.error(`[${errorTimestamp}] Notification Generation Script Failed:`, error)
    process.exit(1)
  })