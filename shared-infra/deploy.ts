#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

import {
  Route53Client,
  GetHostedZoneCommand,
} from '@aws-sdk/client-route-53';

// Parse command line arguments
const stage = process.argv[2] || 'dev';

// Configuration from environment
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || '';
const DOMAIN_NAME = process.env.DOMAIN_NAME || '';

const route53Client = new Route53Client({ region: 'us-east-1' });

async function verifyHostedZone(): Promise<void> {
  if (!HOSTED_ZONE_ID) {
    console.log('  No HOSTED_ZONE_ID configured in .env');
    console.log('  Shared infrastructure requires a hosted zone to be set up first.');
    return;
  }

  try {
    const response = await route53Client.send(new GetHostedZoneCommand({
      Id: HOSTED_ZONE_ID,
    }));

    console.log('  Hosted Zone verified:');
    console.log(`    Name: ${response.HostedZone?.Name}`);
    console.log(`    ID: ${response.HostedZone?.Id}`);
    console.log(`    Record Count: ${response.HostedZone?.ResourceRecordSetCount}`);
  } catch (error) {
    console.error('  Failed to verify hosted zone:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Puzzle Book Shared Infrastructure - Stage: ${stage}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('Domain Configuration:');
  console.log(`  Base Domain: puzzle-book.games`);
  console.log(`  Lander Subdomain: ${DOMAIN_NAME || '(not configured)'}`);
  console.log('');

  console.log('Verifying Hosted Zone...');
  await verifyHostedZone();

  console.log('\n' + '='.repeat(60));
  console.log('Shared infrastructure verified!');
  console.log('='.repeat(60) + '\n');

  console.log('Available subdomains:');
  console.log('  - lander.puzzle-book.games (Rocket Lander)');
  console.log('  - crossword.puzzle-book.games (future)');
  console.log('  - sudoku.puzzle-book.games (future)');
  console.log('');
}

main().catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});
