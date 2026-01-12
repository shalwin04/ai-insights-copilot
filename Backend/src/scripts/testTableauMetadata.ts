/**
 * Test Tableau Metadata API
 *
 * This script tests fetching rich metadata about Tableau workbooks,
 * dashboards, and data sources using the GraphQL Metadata API.
 */

import dotenv from 'dotenv';
import { authenticateWithJWT } from '../services/tableauJWT.js';
import { tableauMetadataService } from '../services/tableauMetadata.js';

dotenv.config();

async function testMetadataAPI() {
  try {
    console.log('\n📊 Testing Tableau Metadata API\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Step 1: Authenticate
    console.log('🔐 Authenticating with Tableau...');
    const authResult = await authenticateWithJWT(
      process.env.TABLEAU_USERNAME!,
      process.env.TABLEAU_SECRET_ID!,
      process.env.TABLEAU_CLIENT_SECRET,
      process.env.TABLEAU_CLIENT_ID
    );
    console.log('✅ Authenticated\n');

    // Set auth token for metadata service
    tableauMetadataService.setAuth(authResult.token);

    // Step 2: Get all workbooks with metadata
    console.log('📚 Fetching workbooks with metadata...');
    const workbooks = await tableauMetadataService.getAllWorkbooks();
    console.log(`✅ Found ${workbooks.length} workbook(s)\n`);

    // Step 3: Display workbook details
    for (const wb of workbooks) {
      console.log(`📖 Workbook: ${wb.name}`);
      console.log(`   ID: ${wb.luid}`);
      console.log(`   Project: ${wb.projectName}`);
      console.log(`   Description: ${wb.description || 'No description'}`);
      console.log(`   Dashboards: ${wb.dashboards?.length || 0}`);
      console.log(`   Sheets: ${wb.sheets?.length || 0}`);

      if (wb.dashboards && wb.dashboards.length > 0) {
        console.log('   📊 Dashboards:');
        wb.dashboards.forEach((d, i) => {
          console.log(`      ${i + 1}. ${d.name}`);
        });
      }

      if (wb.sheets && wb.sheets.length > 0) {
        console.log('   📄 Sheets:');
        wb.sheets.slice(0, 5).forEach((s, i) => {
          console.log(`      ${i + 1}. ${s.name}`);
        });
        if (wb.sheets.length > 5) {
          console.log(`      ... and ${wb.sheets.length - 5} more`);
        }
      }

      if (wb.upstreamDatabases && wb.upstreamDatabases.length > 0) {
        console.log('   🗄️  Data Sources:');
        wb.upstreamDatabases.forEach((db, i) => {
          console.log(`      ${i + 1}. ${db.name} (${db.connectionType})`);
        });
      }

      console.log('');
    }

    // Step 4: Get detailed metadata for Superstore
    const superstoreWorkbook = workbooks.find((wb) =>
      wb.name.toLowerCase().includes('superstore')
    );

    if (superstoreWorkbook) {
      console.log('🔍 Getting detailed metadata for Superstore...');
      const detailedMetadata = await tableauMetadataService.getWorkbookMetadata(
        superstoreWorkbook.luid
      );

      console.log('✅ Superstore Details:\n');
      console.log(`   Name: ${detailedMetadata.name}`);
      console.log(`   Fields: ${detailedMetadata.fields?.length || 0}`);

      if (detailedMetadata.fields && detailedMetadata.fields.length > 0) {
        console.log('   📊 Sample Fields:');
        detailedMetadata.fields.slice(0, 10).forEach((field, i) => {
          console.log(`      ${i + 1}. ${field.name} (${field.dataType}, ${field.role})`);
          if (field.description) {
            console.log(`         Description: ${field.description}`);
          }
        });
        if (detailedMetadata.fields.length > 10) {
          console.log(`      ... and ${detailedMetadata.fields.length - 10} more fields`);
        }
      }

      if (detailedMetadata.upstreamTables && detailedMetadata.upstreamTables.length > 0) {
        console.log('\n   📋 Source Tables:');
        detailedMetadata.upstreamTables.forEach((table, i) => {
          console.log(`      ${i + 1}. ${table.fullName}`);
        });
      }
    }

    // Step 5: Build semantic index
    console.log('\n🧠 Building semantic index for AI search...');
    const semanticIndex = await tableauMetadataService.buildSemanticIndex();
    console.log(`✅ Indexed ${semanticIndex.length} items\n`);

    // Group by type
    const byType = semanticIndex.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('📊 Index Summary:');
    console.log(`   Workbooks: ${byType.workbook || 0}`);
    console.log(`   Dashboards: ${byType.dashboard || 0}`);
    console.log(`   Sheets: ${byType.sheet || 0}`);

    console.log('\n📋 Sample indexed items:');
    semanticIndex.slice(0, 5).forEach((item, i) => {
      console.log(`   ${i + 1}. [${item.type.toUpperCase()}] ${item.name}`);
      console.log(`      Description: ${item.description}`);
      console.log(`      Keywords: ${item.keywords.slice(0, 3).join(', ')}`);
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Metadata API test completed successfully!\n');
    console.log('🎯 Next steps:');
    console.log('   1. Create Tableau Discovery Agent');
    console.log('   2. Implement semantic search over Tableau content');
    console.log('   3. Enable AI to automatically find relevant visualizations\n');
  } catch (error: any) {
    console.error('\n❌ Metadata API test failed:', error.message);

    if (error.response?.data) {
      console.error('\n📋 Error details:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }

    console.log('\n💡 Note: Metadata API requires Tableau Cloud (not Server)');
    console.log('   If using Tableau Server, some features may not be available\n');

    process.exit(1);
  }
}

// Run the test
testMetadataAPI();
