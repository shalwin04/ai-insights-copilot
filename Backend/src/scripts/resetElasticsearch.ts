import { esClient, INDICES } from '../config/elasticsearch.js';

/**
 * Reset Elasticsearch indices - WARNING: Deletes all data
 */
async function resetElasticsearch() {
  try {
    console.log('🔧 Resetting Elasticsearch indices...');

    // Delete datasets index
    const datasetsExists = await esClient.indices.exists({ index: INDICES.DATASETS });
    if (datasetsExists) {
      console.log(`🗑️  Deleting ${INDICES.DATASETS} index...`);
      await esClient.indices.delete({ index: INDICES.DATASETS });
      console.log(`✅ Deleted ${INDICES.DATASETS} index`);
    }

    // Delete files index
    const filesExists = await esClient.indices.exists({ index: INDICES.FILES });
    if (filesExists) {
      console.log(`🗑️  Deleting ${INDICES.FILES} index...`);
      await esClient.indices.delete({ index: INDICES.FILES });
      console.log(`✅ Deleted ${INDICES.FILES} index`);
    }

    // Delete chat history index
    const chatExists = await esClient.indices.exists({ index: INDICES.CHAT_HISTORY });
    if (chatExists) {
      console.log(`🗑️  Deleting ${INDICES.CHAT_HISTORY} index...`);
      await esClient.indices.delete({ index: INDICES.CHAT_HISTORY });
      console.log(`✅ Deleted ${INDICES.CHAT_HISTORY} index`);
    }

    // Delete insights index
    const insightsExists = await esClient.indices.exists({ index: INDICES.INSIGHTS });
    if (insightsExists) {
      console.log(`🗑️  Deleting ${INDICES.INSIGHTS} index...`);
      await esClient.indices.delete({ index: INDICES.INSIGHTS });
      console.log(`✅ Deleted ${INDICES.INSIGHTS} index`);
    }

    console.log('✅ All indices deleted successfully');
    console.log('💡 Restart the server to recreate indices with updated mappings');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting Elasticsearch:', error);
    process.exit(1);
  }
}

resetElasticsearch();
