/**
 * Test Tableau JWT (Direct Trust) Authentication
 *
 * This script tests the Direct Trust JWT authentication flow with Tableau Cloud.
 *
 * Before running, update .env with:
 * - TABLEAU_SECRET_ID (from Connected App)
 * - TABLEAU_USERNAME (your Tableau email)
 */

import dotenv from 'dotenv';
import { authenticateWithJWT } from '../services/tableauJWT.js';
import axios from 'axios';
import { buildTableauApiUrl } from '../config/tableau.js';

dotenv.config();

async function testJWTAuthentication() {
  try {
    console.log('\n🔐 Testing Tableau Direct Trust (JWT) Authentication\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Get credentials from environment
    const username = process.env.TABLEAU_USERNAME;
    const secretId = process.env.TABLEAU_SECRET_ID;
    const secretValue = process.env.TABLEAU_CLIENT_SECRET;
    const clientId = process.env.TABLEAU_CLIENT_ID;

    // Validate required fields
    if (!username || username === 'your-tableau-email@example.com') {
      console.error('❌ TABLEAU_USERNAME not configured in .env');
      console.log('   Update .env with your Tableau email address\n');
      process.exit(1);
    }

    if (!secretId || secretId === 'your-secret-id-here') {
      console.error('❌ TABLEAU_SECRET_ID not configured in .env');
      console.log('   Get this from: Tableau Cloud → Settings → Connected Apps → Secrets\n');
      process.exit(1);
    }

    if (!secretValue || !clientId) {
      console.error('❌ TABLEAU_CLIENT_ID or TABLEAU_CLIENT_SECRET not configured');
      process.exit(1);
    }

    console.log('📝 Configuration:');
    console.log(`   Server: ${process.env.TABLEAU_SERVER_URL}`);
    console.log(`   Site: ${process.env.TABLEAU_SITE_NAME}`);
    console.log(`   Username: ${username}`);
    console.log(`   Client ID: ${clientId.substring(0, 8)}...`);
    console.log(`   Secret ID: ${secretId.substring(0, 8)}...\n`);

    // Test authentication
    console.log('🔑 Generating JWT and authenticating...');
    const authResult = await authenticateWithJWT(username, secretId, secretValue, clientId);

    console.log('✅ Authentication successful!\n');
    console.log('📊 Auth Details:');
    console.log(`   Token: ${authResult.token.substring(0, 20)}...`);
    console.log(`   Site ID: ${authResult.siteId}`);
    console.log(`   User ID: ${authResult.userId}\n`);

    // Test listing workbooks
    console.log('📚 Testing workbooks access...');
    const workbooksUrl = buildTableauApiUrl(`/sites/${authResult.siteId}/workbooks`);

    const workbooksResponse = await axios.get(workbooksUrl, {
      headers: {
        'X-Tableau-Auth': authResult.token,
        'Accept': 'application/json',
      },
    });

    const workbooks = workbooksResponse.data.workbooks?.workbook || [];
    console.log(`✅ Found ${workbooks.length} workbook(s):\n`);

    if (workbooks.length === 0) {
      console.log('   ⚠️  No workbooks found in your Tableau site');
      console.log('   💡 To continue:');
      console.log('      1. Go to Tableau Cloud');
      console.log('      2. Access the Superstore sample workbook');
      console.log('      3. Or upload your own data\n');
    } else {
      workbooks.forEach((wb: any, index: number) => {
        console.log(`   ${index + 1}. ${wb.name}`);
        console.log(`      ID: ${wb.id}`);
        console.log(`      Project: ${wb.project?.name || 'Default'}`);
        console.log(`      Created: ${wb.createdAt}\n`);
      });
    }

    // Sign out
    console.log('🔓 Signing out...');
    const signOutUrl = buildTableauApiUrl('/auth/signout');
    await axios.post(signOutUrl, {}, {
      headers: {
        'X-Tableau-Auth': authResult.token,
      },
    });
    console.log('✅ Signed out successfully\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ All tests passed! JWT authentication is working.\n');
    console.log('🎯 Next steps:');
    console.log('   1. Backend is ready for Tableau integration');
    console.log('   2. Start implementing Tableau Discovery Agent');
    console.log('   3. Add frontend Tableau embedding components\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);

    if (error.response?.data) {
      console.error('\n📋 Error details:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }

    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check TABLEAU_SECRET_ID is correct (from Connected App → Secrets)');
    console.log('   2. Verify TABLEAU_USERNAME matches your Tableau account email');
    console.log('   3. Ensure TABLEAU_CLIENT_SECRET is the Secret Value (not Client Secret)');
    console.log('   4. Confirm Connected App type is "Direct Trust"\n');

    process.exit(1);
  }
}

// Run the test
testJWTAuthentication();
