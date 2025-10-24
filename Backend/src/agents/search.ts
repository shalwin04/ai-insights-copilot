import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { llm } from "../config/llm.js";
import type { AgentState } from "../langgraph/state.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Search Agent - Performs web searches to gather external data and context
 * Useful for:
 * - Finding industry benchmarks and trends
 * - Comparing with competitor data
 * - Getting market insights
 * - Researching external context for analysis
 */
export async function searchAgent(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║        SEARCH AGENT START              ║");
  console.log("╚════════════════════════════════════════╝");
  console.log("🔍 Input State:");
  console.log("   - Query:", state.userQuery);
  console.log("   - Search Context:", state.searchContext || "none");
  console.log("");

  try {
    const { userQuery, relevantDatasets, searchContext } = state;

    // Initialize Tavily search tool
    const tavilyApiKey = process.env.TAVILY_API_KEY;

    if (!tavilyApiKey || tavilyApiKey === "your_tavily_api_key_here") {
      console.log("⚠️  Tavily API key not configured. Skipping search.");
      return {
        searchResults: null,
        error:
          "Search functionality requires a Tavily API key. Please configure TAVILY_API_KEY in .env",
        nextAgent: "analyzer",
      };
    }

    const searchTool = new TavilySearchResults({
      apiKey: tavilyApiKey,
      maxResults: 5,
    });

    // Build search query based on user query and dataset context
    let searchQuery = userQuery;

    // If we have dataset context, enhance the search query
    if (relevantDatasets && relevantDatasets.length > 0) {
      const dataset = relevantDatasets[0];
      if (dataset) {
        const datasetInfo = `Dataset: ${dataset.name}, Type: ${dataset.type}, Rows: ${dataset.rowCount}`;

        // Use LLM to generate an optimized search query
        const queryPrompt = `Given this user query: "${userQuery}"
And this dataset context: ${datasetInfo}
${searchContext ? `Additional context: ${searchContext}` : ""}

Generate 1-2 concise search queries (separated by newlines) to find relevant external data, industry benchmarks, or market trends that would help answer the user's question.

The search queries should be:
1. Specific and focused on finding comparable data or trends
2. Include relevant industry terms or metrics
3. Target recent information (2023-2025 if applicable)

Examples:
- "global sales trends 2024 industry benchmarks"
- "retail sales growth rate comparison Q4 2024"
- "e-commerce revenue trends by region 2024"

Return only the search queries, one per line, no explanation.`;

        console.log("🔄 Generating optimized search query...");
        const queryResponse = await llm.invoke(queryPrompt);
        const optimizedQuery = (queryResponse.content as string).trim();
        const firstQuery = optimizedQuery.split("\n")[0]?.trim();
        if (firstQuery && firstQuery.length > 0) {
          searchQuery = firstQuery; // Use first query
        }
        console.log("   Optimized query:", searchQuery);
      }
    }

    // Validate search query before performing search
    if (!searchQuery || searchQuery.trim().length === 0) {
      console.log("⚠️  Empty search query. Skipping search.");
      return {
        searchResults: null,
        error: "Cannot perform search with empty query",
        nextAgent: "analyzer",
        metadata: {
          ...state.metadata,
          searchFailed: true,
        },
      };
    }

    // Clean and validate search query
    searchQuery = searchQuery.trim();

    // Perform the search
    console.log("🌐 Performing web search...");
    console.log("   Search query:", searchQuery);
    console.log("   Query length:", searchQuery.length);
    console.log("   API key (first 10 chars):", tavilyApiKey.substring(0, 10) + "...");

    let searchResults;
    try {
      searchResults = await searchTool.invoke(searchQuery);
      console.log("✅ Search completed");
      console.log("   Results found:", searchResults ? "Yes" : "No");
    } catch (searchError: any) {
      console.error("❌ Tavily API Error:");
      console.error("   Status:", searchError.response?.status);
      console.error("   Status Text:", searchError.response?.statusText);
      console.error("   Error Data:", JSON.stringify(searchError.response?.data, null, 2));
      console.error("   Message:", searchError.message);

      // Re-throw to be caught by outer try-catch
      throw new Error(
        `Tavily API error (${searchError.response?.status || "unknown"}): ${
          searchError.response?.data?.error || searchError.message
        }`
      );
    }

    // Parse search results (Tavily returns a JSON string)
    let parsedResults: any[] = [];
    try {
      if (typeof searchResults === "string") {
        parsedResults = JSON.parse(searchResults);
      } else if (Array.isArray(searchResults)) {
        parsedResults = searchResults;
      }
    } catch (e) {
      console.log("   Raw results (as string):", searchResults);
      parsedResults = [{ content: searchResults }];
    }

    // Synthesize search results with LLM
    console.log("🔄 Synthesizing search results...");
    const synthesisPrompt = `You are analyzing web search results to provide context for a data analysis query.

User Query: "${userQuery}"
${
  relevantDatasets && relevantDatasets.length > 0 && relevantDatasets[0]
    ? `Dataset Context: ${relevantDatasets[0].name}`
    : ""
}

Search Results:
${JSON.stringify(parsedResults, null, 2)}

Task: Synthesize the search results into a concise summary that:
1. Highlights key findings, trends, or benchmarks relevant to the query
2. Provides context that can be used to compare with the user's dataset
3. Cites specific numbers, statistics, or insights when available
4. Notes the sources and recency of information
5. Identifies any gaps in available external data

Keep the summary clear and actionable (3-5 paragraphs max).`;

    const synthesisResponse = await llm.invoke(synthesisPrompt);
    const searchSummary = synthesisResponse.content as string;

    console.log("✅ Search synthesis complete");
    console.log("╚════════════════════════════════════════╝\n");

    return {
      searchResults: {
        query: searchQuery,
        results: parsedResults,
        summary: searchSummary,
        timestamp: new Date().toISOString(),
      },
      nextAgent: "analyzer", // Proceed to analyzer with search context
      metadata: {
        ...state.metadata,
        hasSearchResults: true,
        searchPerformed: true,
      },
    };
  } catch (error) {
    console.error("❌ Search Agent error:", error);
    console.error("Error message:", (error as any).message);
    console.error("Error response:", (error as any).response?.data);
    console.error("Stack:", (error as Error).stack);
    console.log("╚════════════════════════════════════════╝\n");

    return {
      searchResults: null,
      error: `Search failed: ${(error as Error).message}`,
      nextAgent: "analyzer", // Continue workflow even if search fails
      metadata: {
        ...state.metadata,
        searchFailed: true,
      },
    };
  }
}
