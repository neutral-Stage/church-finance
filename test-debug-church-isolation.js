#!/usr/bin/env node

// Test script to debug church isolation issue
// Run with: node test-debug-church-isolation.js

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

// Create service role client to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugChurchIsolation() {
  console.log('=== CHURCH ISOLATION DEBUG ===\n');

  // 1. List all churches
  console.log('1. All Churches:');
  const { data: churches, error: churchesError } = await supabase
    .from('churches')
    .select('*')
    .order('name');

  if (churchesError) {
    console.error('Churches error:', churchesError);
  } else {
    churches.forEach(church => {
      console.log(`  - ${church.name} (ID: ${church.id})`);
    });
  }

  console.log('\n2. All Funds grouped by church:');
  const { data: funds, error: fundsError } = await supabase
    .from('funds')
    .select('*, churches!inner(name)')
    .order('churches.name, name');

  if (fundsError) {
    console.error('Funds error:', fundsError);
  } else {
    const fundsByChurch = {};
    funds.forEach(fund => {
      const churchName = fund.churches.name;
      if (!fundsByChurch[churchName]) {
        fundsByChurch[churchName] = [];
      }
      fundsByChurch[churchName].push(fund);
    });

    Object.entries(fundsByChurch).forEach(([churchName, churchFunds]) => {
      console.log(`  Church: ${churchName} (${churchFunds.length} funds)`);
      churchFunds.forEach(fund => {
        console.log(`    - ${fund.name} (ID: ${fund.id}, Church ID: ${fund.church_id})`);
      });
    });
  }

  console.log('\n3. Sample transactions and their fund relationships:');
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      fund_id,
      funds!inner(name, church_id, churches!inner(name))
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (transactionsError) {
    console.error('Transactions error:', transactionsError);
  } else {
    transactions.forEach(txn => {
      console.log(`  - ${txn.description}: $${txn.amount}`);
      console.log(`    Fund: ${txn.funds.name} (Church: ${txn.funds.churches.name})`);
      console.log(`    Fund ID: ${txn.fund_id}, Church ID: ${txn.funds.church_id}`);
    });
  }

  console.log('\n4. Testing specific church filtering:');

  // Try to get a specific church
  const mainChurch = churches?.find(c => c.name === 'Main Church');
  const savarChurch = churches?.find(c => c.name === 'Savar Church');

  if (mainChurch) {
    console.log(`\nMain Church (${mainChurch.id}) funds:`);
    const { data: mainFunds } = await supabase
      .from('funds')
      .select('*')
      .eq('church_id', mainChurch.id);
    console.log(`  Found ${mainFunds?.length || 0} funds`);
  }

  if (savarChurch) {
    console.log(`\nSavar Church (${savarChurch.id}) funds:`);
    const { data: savarFunds } = await supabase
      .from('funds')
      .select('*')
      .eq('church_id', savarChurch.id);
    console.log(`  Found ${savarFunds?.length || 0} funds`);
  }

  console.log('\n5. RLS Status Check:');
  const { data: rlsStatus, error: rlsError } = await supabase
    .rpc('check_rls_status');

  if (rlsError) {
    console.error('RLS status error:', rlsError);
  } else {
    console.log('RLS status:', rlsStatus);
  }

  console.log('\n=== DEBUG COMPLETE ===');
}

debugChurchIsolation().catch(console.error);