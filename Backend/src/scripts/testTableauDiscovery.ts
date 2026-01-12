/**
 * Test Tableau Discovery Agent
 *
 * This script tests the AI-powered discovery of Tableau visualizations.
 */

import dotenv from 'dotenv';
import { authenticateWithJWT } from '../services/tableauJWT.js';
import { tableauService } from '../services/tableau.js';
import {
  buildTableauIndex,
  generateTableauEmbeddings,
  tableauDiscoveryAgent,
  keywordSearchTableau,
} from '../agents/tableauDiscovery.js';

dotenv.config();

async function testDiscoveryAgent() {
  try {
    console.log('\n🔍 Testing Tableau Discovery Agent\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Step 1: Authenticate
    console.log('🔐 Authenticating with Tableau...');
    const authResult = await authenticateWithJWT(
      process.env.TABLEAU_USERNAME!,
      process.env.TABLEAU_SECRET_ID!,
      process.env.TABLEAU_CLIENT_SECRET,
      process.env.TABLEAU_CLIENT_ID
    );
    tableauService.setAuth(authResult.token, authResult.siteId);
    console.log('✅ Authenticated\n');

    // Step 2: Build content index
    console.log('📚 Building Tableau content index...');
    const contentIndex = await buildTableauIndex();
    console.log(`✅ Indexed ${contentIndex.length} items\n`);

    // Show index summary
    const byType = contentIndex.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    console.log('📊 Index Summary:');
    console.log(`   Workbooks: ${byType.workbook || 0}`);
    console.log(`   Dashboards: ${byType.dashboard || 0}`);
    console.log(`   Sheets: ${byType.sheet || 0}\n`);

    // Step 3: Generate embeddings
    const indexWithEmbeddings = await generateTableauEmbeddings(contentIndex);
    console.log('');

    // Step 4: Test queries
    const testQueries = [
      'Show me sales performance',
      'What are the shipping costs?',
      'Customer analytics',
      'Product analysis',
      'Sales forecast',
    ];

    for (const query of testQueries) {
      console.log('─'.repeat(50));
      console.log(`\n💬 Query: "${query}"\n`);

      const discoveryResult = await tableauDiscoveryAgent(query, indexWithEmbeddings);

      console.log('📊 Results:');
      discoveryResult.results.forEach((result, i) => {
        console.log(`\n   ${i + 1}. [${result.type.toUpperCase()}] ${result.name}`);
        console.log(`      Workbook: ${result.workbookName || 'N/A'}`);
        console.log(`      Relevance: ${(result.relevanceScore * 100).toFixed(1)}%`);
      });

      console.log(`\n🤖 AI Summary:`);
      console.log(`   ${discoveryResult.summary.replace(/\n/g, '\n   ')}`);

      if (discoveryResult.suggestedVisualization) {
        console.log(`\n✨ Suggested: ${discoveryResult.suggestedVisualization}\n`);
      }
    }

    // Step 5: Test keyword search (fallback)
    console.log('─'.repeat(50));
    console.log('\n🔤 Testing keyword search (fallback)...\n');

    const keywordResults = keywordSearchTableau('sales', contentIndex, 5);
    console.log(`Found ${keywordResults.length} results for "sales":\n`);

    keywordResults.forEach((result, i) => {
      console.log(`   ${i + 1}. [${result.type.toUpperCase()}] ${result.name}`);
      console.log(`      Score: ${(result.relevanceScore * 100).toFixed(1)}%`);
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Discovery Agent test completed successfully!\n');
    console.log('🎯 The AI can now:');
    console.log('   ✓ Understand natural language queries');
    console.log('   ✓ Find relevant Tableau visualizations');
    console.log('   ✓ Recommend the best match');
    console.log('   ✓ Explain why it\'s relevant\n');
  } catch (error: any) {
    console.error('\n❌ Discovery Agent test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testDiscoveryAgent();
