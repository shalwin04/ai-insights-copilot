import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testTableauConnection() {
  try {
    console.log('🔐 Authenticating with Tableau...');
    console.log(`   Server: ${process.env.TABLEAU_SERVER_URL}`);
    console.log(`   Site: ${process.env.TABLEAU_SITE_NAME}`);

    // Sign in with Personal Access Token
    const authResponse = await axios.post(
      `${process.env.TABLEAU_SERVER_URL}/api/${process.env.TABLEAU_API_VERSION}/auth/signin`,
      {
        credentials: {
          personalAccessTokenName: process.env.TABLEAU_TOKEN_NAME,
          personalAccessTokenSecret: process.env.TABLEAU_TOKEN_SECRET,
          site: {
            contentUrl: process.env.TABLEAU_SITE_NAME
          }
        }
      }
    );

    const token = authResponse.data.credentials.token;
    const siteId = authResponse.data.credentials.site.id;
    const userId = authResponse.data.credentials.user.id;

    console.log('✅ Authentication successful!');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   Site ID: ${siteId}`);
    console.log(`   User ID: ${userId}`);

    // List workbooks
    console.log('\n📊 Fetching workbooks...');
    const workbooksResponse = await axios.get(
      `${process.env.TABLEAU_SERVER_URL}/api/${process.env.TABLEAU_API_VERSION}/sites/${siteId}/workbooks`,
      {
        headers: {
          'X-Tableau-Auth': token
        }
      }
    );

    const workbooks = workbooksResponse.data.workbooks.workbook || [];
    console.log(`✅ Found ${workbooks.length} workbooks:`);

    if (workbooks.length === 0) {
      console.log('   ⚠️  No workbooks found. Upload sample data to Tableau Cloud first!');
    } else {
      workbooks.forEach((wb: any) => {
        console.log(`   - ${wb.name} (ID: ${wb.id})`);
        console.log(`     Project: ${wb.project.name}`);
        console.log(`     Created: ${wb.createdAt}`);
      });
    }

    // List data sources
    console.log('\n💾 Fetching data sources...');
    const dataSourcesResponse = await axios.get(
      `${process.env.TABLEAU_SERVER_URL}/api/${process.env.TABLEAU_API_VERSION}/sites/${siteId}/datasources`,
      {
        headers: {
          'X-Tableau-Auth': token
        }
      }
    );

    const dataSources = dataSourcesResponse.data.datasources.datasource || [];
    console.log(`✅ Found ${dataSources.length} data sources:`);

    if (dataSources.length > 0) {
      dataSources.forEach((ds: any) => {
        console.log(`   - ${ds.name} (ID: ${ds.id})`);
        console.log(`     Type: ${ds.type}`);
      });
    }

    // Sign out
    await axios.post(
      `${process.env.TABLEAU_SERVER_URL}/api/${process.env.TABLEAU_API_VERSION}/auth/signout`,
      {},
      {
        headers: {
          'X-Tableau-Auth': token
        }
      }
    );

    console.log('\n✅ Test completed successfully!');
    console.log('\n🎯 Next Steps:');
    console.log('   1. If no workbooks found, upload sample_sales_data.csv to Tableau Cloud');
    console.log('   2. Create a simple dashboard in Tableau');
    console.log('   3. Run this test again to verify');
    console.log('   4. Ready to implement full OAuth integration!');

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check your .env file has correct TABLEAU_* variables');
    console.error('   2. Verify Personal Access Token is valid');
    console.error('   3. Ensure TABLEAU_SITE_NAME matches your Tableau Cloud site');
    console.error('   4. Check API version (3.22 is current)');
  }
}

testTableauConnection();
