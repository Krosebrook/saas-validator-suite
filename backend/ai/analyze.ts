import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { getAuthData } from "~encore/auth";
import db from "../db";

const openaiApiKey = secret("OpenAIApiKey");
const anthropicApiKey = secret("AnthropicApiKey");

interface AnalyzeIdeaRequest {
  idea_id: number;
  track_type: "saas" | "content" | "ecom";
}

interface AnalysisResult {
  overall_score: number;
  market_potential: number;
  competition_level: number;
  technical_feasibility: number;
  monetization_potential: number;
  compliance_score: number;
  ai_analysis: string;
  cost_estimate: {
    infrastructure_cost: number;
    development_cost: number;
    operational_cost: number;
    projected_revenue: number;
    roi_estimate: number;
    break_even_months: number;
  };
}

// Analyzes an idea using AI routing between Claude and GPT
export const analyze = api<AnalyzeIdeaRequest, AnalysisResult>(
  { auth: true, expose: true, method: "POST", path: "/ai/analyze" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Get user and idea
    const user = await db.queryRow`
      SELECT id FROM users WHERE clerk_id = ${auth.userID}
    `;
    
    if (!user) {
      throw new Error("User not found");
    }

    const idea = await db.queryRow`
      SELECT * FROM ideas 
      WHERE id = ${req.idea_id} AND user_id = ${user.id}
    `;

    if (!idea) {
      throw new Error("Idea not found");
    }

    // Update idea status
    await db.exec`
      UPDATE ideas SET status = 'analyzing' WHERE id = ${req.idea_id}
    `;

    try {
      // Route to AI based on track type and availability
      const analysis = await routeToAI(idea, req.track_type);
      
      // Store scores
      await db.exec`
        INSERT INTO scores (
          idea_id, track_type, overall_score, market_potential, 
          competition_level, technical_feasibility, monetization_potential, 
          compliance_score, ai_analysis
        ) VALUES (
          ${req.idea_id}, ${req.track_type}, ${analysis.overall_score},
          ${analysis.market_potential}, ${analysis.competition_level},
          ${analysis.technical_feasibility}, ${analysis.monetization_potential},
          ${analysis.compliance_score}, ${analysis.ai_analysis}
        )
        ON CONFLICT (idea_id, track_type) DO UPDATE SET
          overall_score = EXCLUDED.overall_score,
          market_potential = EXCLUDED.market_potential,
          competition_level = EXCLUDED.competition_level,
          technical_feasibility = EXCLUDED.technical_feasibility,
          monetization_potential = EXCLUDED.monetization_potential,
          compliance_score = EXCLUDED.compliance_score,
          ai_analysis = EXCLUDED.ai_analysis
      `;

      // Store cost estimates
      await db.exec`
        INSERT INTO cost_estimates (
          idea_id, infrastructure_cost, development_cost, operational_cost,
          projected_revenue, roi_estimate, break_even_months
        ) VALUES (
          ${req.idea_id}, ${analysis.cost_estimate.infrastructure_cost},
          ${analysis.cost_estimate.development_cost}, ${analysis.cost_estimate.operational_cost},
          ${analysis.cost_estimate.projected_revenue}, ${analysis.cost_estimate.roi_estimate},
          ${analysis.cost_estimate.break_even_months}
        )
        ON CONFLICT (idea_id) DO UPDATE SET
          infrastructure_cost = EXCLUDED.infrastructure_cost,
          development_cost = EXCLUDED.development_cost,
          operational_cost = EXCLUDED.operational_cost,
          projected_revenue = EXCLUDED.projected_revenue,
          roi_estimate = EXCLUDED.roi_estimate,
          break_even_months = EXCLUDED.break_even_months
      `;

      // Update idea status
      await db.exec`
        UPDATE ideas SET status = 'completed' WHERE id = ${req.idea_id}
      `;

      return analysis;

    } catch (error) {
      // Update idea status to failed
      await db.exec`
        UPDATE ideas SET status = 'failed' WHERE id = ${req.idea_id}
      `;
      throw error;
    }
  }
);

async function routeToAI(idea: any, trackType: string): Promise<AnalysisResult> {
  // Try Claude first for detailed analysis
  try {
    return await analyzeWithClaude(idea, trackType);
  } catch (claudeError) {
    console.warn("Claude analysis failed, falling back to GPT:", claudeError);
    
    // Fallback to GPT
    try {
      return await analyzeWithGPT(idea, trackType);
    } catch (gptError) {
      console.error("Both AI providers failed:", { claudeError, gptError });
      throw new Error("AI analysis unavailable");
    }
  }
}

async function analyzeWithClaude(idea: any, trackType: string): Promise<AnalysisResult> {
  const prompt = buildAnalysisPrompt(idea, trackType);
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-sonnet-20240229",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return parseAnalysisResponse(data.content[0].text);
}

async function analyzeWithGPT(idea: any, trackType: string): Promise<AnalysisResult> {
  const prompt = buildAnalysisPrompt(idea, trackType);
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey()}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert business analyst specializing in SaaS validation.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return parseAnalysisResponse(data.choices[0].message.content);
}

function buildAnalysisPrompt(idea: any, trackType: string): string {
  return `
Analyze this ${trackType} business idea and provide scores (0-100) and cost estimates:

Title: ${idea.title}
Description: ${idea.description || "No description provided"}
Source: ${idea.source}

Please analyze and provide a JSON response with:
{
  "overall_score": 0-100,
  "market_potential": 0-100,
  "competition_level": 0-100,
  "technical_feasibility": 0-100,
  "monetization_potential": 0-100,
  "compliance_score": 0-100,
  "ai_analysis": "detailed text analysis",
  "cost_estimate": {
    "infrastructure_cost": monthly cost in USD,
    "development_cost": one-time cost in USD,
    "operational_cost": monthly cost in USD,
    "projected_revenue": monthly revenue in USD,
    "roi_estimate": percentage,
    "break_even_months": number of months
  }
}

Focus on ${trackType} specific metrics and provide realistic cost estimates.
`;
}

function parseAnalysisResponse(response: string): AnalysisResult {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields and provide defaults
    return {
      overall_score: parsed.overall_score || 50,
      market_potential: parsed.market_potential || 50,
      competition_level: parsed.competition_level || 50,
      technical_feasibility: parsed.technical_feasibility || 50,
      monetization_potential: parsed.monetization_potential || 50,
      compliance_score: parsed.compliance_score || 70,
      ai_analysis: parsed.ai_analysis || "Analysis not available",
      cost_estimate: {
        infrastructure_cost: parsed.cost_estimate?.infrastructure_cost || 100,
        development_cost: parsed.cost_estimate?.development_cost || 10000,
        operational_cost: parsed.cost_estimate?.operational_cost || 500,
        projected_revenue: parsed.cost_estimate?.projected_revenue || 1000,
        roi_estimate: parsed.cost_estimate?.roi_estimate || 20,
        break_even_months: parsed.cost_estimate?.break_even_months || 12,
      },
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    
    // Return default analysis if parsing fails
    return {
      overall_score: 50,
      market_potential: 50,
      competition_level: 50,
      technical_feasibility: 50,
      monetization_potential: 50,
      compliance_score: 70,
      ai_analysis: "Analysis parsing failed, using default scores",
      cost_estimate: {
        infrastructure_cost: 100,
        development_cost: 10000,
        operational_cost: 500,
        projected_revenue: 1000,
        roi_estimate: 20,
        break_even_months: 12,
      },
    };
  }
}
