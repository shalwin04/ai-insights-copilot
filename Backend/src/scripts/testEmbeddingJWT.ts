import { generateEmbeddingJWT } from '../services/tableauJWT.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test the embedding JWT token generation
 * This helps diagnose issues with Tableau embedding authentication
 */

console.log('\n🔍 Testing Tableau Embedding JWT Token Generation\n');
console.log('=' .repeat(60));

try {
  // Generate the token
  const token = generateEmbeddingJWT();

  console.log('\n📄 Generated JWT Token:');
  console.log(token);

  // Decode the token (without verification) to see the claims
  const parts = token.split('.');
  if (parts.length === 3 && parts[0] && parts[1]) {
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    console.log('\n📋 Token Header:');
    console.log(JSON.stringify(header, null, 2));

    console.log('\n📋 Token Payload:');
    console.log(JSON.stringify(payload, null, 2));

    console.log('\n✅ Token Analysis:');
    console.log(`   Issuer (iss): ${payload.iss}`);
    console.log(`   Subject (sub): ${payload.sub}`);
    console.log(`   Audience (aud): ${payload.aud}`);
    console.log(`   Scopes (scp): ${payload.scp?.join(', ')}`);
    console.log(`   Key ID (kid): ${header.kid}`);
    console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);

    console.log('\n⚠️  Common Issues to Check:');
    console.log('   1. Connected App must be "Direct Trust" type');
    console.log('   2. Domain must be allowlisted in Connected App settings');
    console.log('   3. Scopes must include: tableau:views:embed, tableau:views:embed_authoring');
    console.log('   4. Username (sub) must match a valid Tableau Cloud user');
    console.log('   5. Client ID (iss) and Secret ID (kid) must match your Connected App');

    console.log('\n📝 Next Steps:');
    console.log('   Go to Tableau Cloud → Settings → Connected Apps');
    console.log('   Verify your Connected App has:');
    console.log(`   - Client ID: ${payload.iss}`);
    console.log(`   - Secret ID: ${header.kid}`);
    console.log('   - Access Level: "Direct Trust"');
    console.log('   - Domain Allowlist: "localhost:5173" or your frontend URL');

  } else {
    console.error('❌ Invalid JWT token format');
  }

} catch (error) {
  console.error('\n❌ Error generating token:', error);
}

console.log('\n' + '='.repeat(60) + '\n');
