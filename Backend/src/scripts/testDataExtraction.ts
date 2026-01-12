import { tableauService } from '../services/tableau.js';
import { authenticateWithJWT } from '../services/tableauJWT.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test data extraction from Tableau views
 * This helps diagnose why data extraction is failing
 */
async function testDataExtraction() {
  try {
    console.log('\n🧪 Testing Tableau Data Extraction\n');

    // Step 1: Authenticate
    console.log('1️⃣  Authenticating with JWT...');
    const username = process.env.TABLEAU_USERNAME!;
    const secretId = process.env.TABLEAU_SECRET_ID!;
    const secretValue = process.env.TABLEAU_CLIENT_SECRET!;
    const clientId = process.env.TABLEAU_CLIENT_ID!;

    const authCredentials = await authenticateWithJWT(username, secretId, secretValue, clientId);
    console.log('✅ Authentication successful');
    console.log(`   Token: ${authCredentials.token.substring(0, 20)}...`);
    console.log(`   Site ID: ${authCredentials.siteId}`);

    // Set auth in service
    tableauService.setAuth(authCredentials.token, authCredentials.siteId);

    // Step 2: List workbooks
    console.log('\n2️⃣  Listing workbooks...');
    const workbooks = await tableauService.listWorkbooks();
    console.log(`✅ Found ${workbooks.length} workbooks:`);
    workbooks.forEach((wb, i) => {
      console.log(`   ${i + 1}. ${wb.name} (${wb.id})`);
    });

    // Step 3: Get views from first workbook
    console.log('\n3️⃣  Getting views from first workbook...');
    const firstWorkbook = workbooks[0];
    if (!firstWorkbook) {
      throw new Error('No workbooks found');
    }

    const views = await tableauService.getWorkbookViews(firstWorkbook.id);
    console.log(`✅ Found ${views.length} views:`);
    views.forEach((view, i) => {
      console.log(`   ${i + 1}. ${view.name} (${view.id})`);
    });

    // Step 4: Try to extract data from first view
    console.log('\n4️⃣  Attempting to extract data from first view...');
    const firstView = views[0];
    if (!firstView) {
      throw new Error('No views found');
    }

    console.log(`   View: ${firstView.name}`);
    console.log(`   View ID: ${firstView.id}`);
    console.log(`   Workbook: ${firstWorkbook.name}`);

    try {
      const viewData = await tableauService.getViewData(firstView.id);
      console.log('✅ Data extraction successful!');
      console.log(`   Columns: ${viewData.columns.length}`);
      console.log(`   Rows: ${viewData.totalRowCount}`);
      console.log(`   Sample columns: ${viewData.columns.slice(0, 5).join(', ')}`);
      console.log(`\n📊 Sample data (first 3 rows):`);
      viewData.data.slice(0, 3).forEach((row, i) => {
        console.log(`   Row ${i + 1}: ${row.slice(0, 5).join(', ')}...`);
      });
      console.log('\n✅ SUCCESS: Data extraction is working!');
      console.log('   You can now use Tableau data for custom visualizations.');
    } catch (error: any) {
      console.log('❌ Data extraction failed!');
      console.log(`   Error: ${error.message}`);

      if (error.message.includes('401')) {
        console.log('\n🔍 Diagnosis: 401 Unauthorized');
        console.log('   Possible causes:');
        console.log('   1. Sample workbooks may have restricted data access');
        console.log('   2. Connected App needs additional permissions');
        console.log('   3. User role doesn\'t allow data extraction');
        console.log('\n💡 Solution for hackathon:');
        console.log('   Option 1: Create your own workbook (not a Tableau Sample)');
        console.log('   Option 2: Download CSV from Tableau Cloud manually');
        console.log('   Option 3: Use Tableau Hyper API with downloaded .hyper file');
      } else if (error.message.includes('404')) {
        console.log('\n🔍 Diagnosis: 404 Not Found');
        console.log('   The view exists but data endpoint returned 404');
        console.log('   This view might not support CSV data export');
      }

      throw error;
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDataExtraction();
