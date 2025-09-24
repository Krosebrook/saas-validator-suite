import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { logger } from "../logging/logger";
import { handleError, NotFoundError, ExternalServiceError, DatabaseError } from "../logging/errors";
import { validateRequired, validateNumber, validateEnum } from "../logging/validation";
import { sendNotificationToUser } from "../notifications/websocket";
import { analysisCache, generateAnalysisCacheKey } from "../cache/cache";
import { applyAiAnalysisRateLimit } from "../security/security";

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
    try {
      const auth = getAuthData()!;
      
      logger.info("Starting AI analysis", {
        service: "ai",
        endpoint: "analyze",
        userId: auth.userID,
        data: { ideaId: req.idea_id, trackType: req.track_type }
      });

      // Apply rate limiting
      await applyAiAnalysisRateLimit(auth.userID, "analyze");

      // Validate input
      validateRequired(req.idea_id, "idea_id");
      validateNumber(req.idea_id, "idea_id", { integer: true, min: 1 });
      validateRequired(req.track_type, "track_type");
      validateEnum(req.track_type, ["saas", "content", "ecom", "startup"], "track_type");
      
      // Get user and idea
      const user = await db.queryRow`
        SELECT id FROM users WHERE clerk_id = ${auth.userID}
      `;
      
      if (!user) {
        throw new NotFoundError("User", auth.userID);
      }

      const idea = await db.queryRow`
        SELECT * FROM ideas 
        WHERE id = ${req.idea_id} AND user_id = ${user.id}
      `;

      if (!idea) {
        throw new NotFoundError("Idea", req.idea_id);
      }

      // Check cache first for existing analysis
      const cacheKey = generateAnalysisCacheKey(req.idea_id, req.track_type);
      const cachedAnalysis = await analysisCache.get<AnalysisResult>(cacheKey);
      
      if (cachedAnalysis) {
        logger.info("Analysis served from cache", {
          service: "ai",
          endpoint: "analyze",
          userId: auth.userID,
          data: { ideaId: req.idea_id, trackType: req.track_type }
        });
        return cachedAnalysis;
      }

      // Update idea status
      await db.exec`
        UPDATE ideas SET status = 'analyzing' WHERE id = ${req.idea_id}
      `;

      // Send notification that analysis started
      await sendNotificationToUser(auth.userID, {
        type: "analysis_started",
        data: {
          ideaId: req.idea_id,
          title: idea.title,
          timestamp: new Date().toISOString()
        }
      });

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

        logger.info("AI analysis completed", {
          service: "ai",
          endpoint: "analyze",
          userId: auth.userID,
          data: { ideaId: req.idea_id, overallScore: analysis.overall_score }
        });

        // Cache the analysis result for 24 hours
        await analysisCache.set(cacheKey, analysis, 86400000);

        // Send notification that analysis completed
        await sendNotificationToUser(auth.userID, {
          type: "analysis_completed",
          data: {
            ideaId: req.idea_id,
            title: idea.title,
            overallScore: analysis.overall_score,
            timestamp: new Date().toISOString()
          }
        });

        return analysis;

      } catch (error) {
        // Update idea status to failed
        await db.exec`
          UPDATE ideas SET status = 'failed' WHERE id = ${req.idea_id}
        `;
        
        logger.error("AI analysis failed", {
          service: "ai",
          endpoint: "analyze",
          userId: auth.userID,
          error: error instanceof Error ? error : new Error(String(error)),
          data: { ideaId: req.idea_id }
        });

        // Send notification that analysis failed
        await sendNotificationToUser(auth.userID, {
          type: "analysis_failed",
          data: {
            ideaId: req.idea_id,
            title: idea.title,
            message: error instanceof Error ? error.message : "Analysis failed",
            timestamp: new Date().toISOString()
          }
        });
        
        throw error;
      }
    } catch (error) {
      handleError(error, { service: "ai", endpoint: "analyze" });
    }
  }
);

async function routeToAI(idea: any, trackType: string): Promise<AnalysisResult> {
  // Try Claude first for detailed analysis
  try {
    logger.info("Attempting Claude analysis", { data: { ideaId: idea.id, provider: "claude" } });
    return await analyzeWithClaude(idea, trackType);
  } catch (claudeError) {
    logger.warn("Claude analysis failed, falling back to GPT", {
      error: claudeError instanceof Error ? claudeError : new Error(String(claudeError)),
      data: { ideaId: idea.id, provider: "claude" }
    });
    
    // Fallback to GPT
    try {
      logger.info("Attempting GPT analysis", { data: { ideaId: idea.id, provider: "openai" } });
      return await analyzeWithGPT(idea, trackType);
    } catch (gptError) {
      logger.error("Both AI providers failed", {
        error: gptError instanceof Error ? gptError : new Error(String(gptError)),
        data: { ideaId: idea.id, claudeError: String(claudeError), gptError: String(gptError) }
      });
      throw new ExternalServiceError("AI analysis providers");
    }
  }
}

async function analyzeWithClaude(idea: any, trackType: string): Promise<AnalysisResult> {
  const prompt = buildAnalysisPrompt(idea, trackType);
  
  try {
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
      const errorText = await response.text();
      logger.error("Claude API error", {
        data: { status: response.status, statusText: response.statusText, errorText }
      });
      throw new ExternalServiceError(`Claude (${response.status}: ${response.statusText})`);
    }

    const data = await response.json() as any;
    return parseAnalysisResponse(data.content[0].text);
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    logger.error("Claude analysis request failed", {
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw new ExternalServiceError("Claude", error instanceof Error ? error : undefined);
  }
}

async function analyzeWithGPT(idea: any, trackType: string): Promise<AnalysisResult> {
  const prompt = buildAnalysisPrompt(idea, trackType);
  
  try {
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
      const errorText = await response.text();
      logger.error("OpenAI API error", {
        data: { status: response.status, statusText: response.statusText, errorText }
      });
      throw new ExternalServiceError(`OpenAI (${response.status}: ${response.statusText})`);
    }

    const data = await response.json() as any;
    return parseAnalysisResponse(data.choices[0].message.content);
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    logger.error("OpenAI analysis request failed", {
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw new ExternalServiceError("OpenAI", error instanceof Error ? error : undefined);
  }
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
      logger.warn("No JSON found in AI response", { data: { responsePreview: response.substring(0, 200) } });
      throw new Error("No JSON found in response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate score ranges
    const validateScore = (score: number, field: string): number => {
      if (typeof score !== 'number' || score < 0 || score > 100) {
        logger.warn(`Invalid score for ${field}: ${score}, using default`);
        return 50;
      }
      return score;
    };
    
    // Validate required fields and provide defaults
    const result: AnalysisResult = {
      overall_score: validateScore(parsed.overall_score, 'overall_score'),
      market_potential: validateScore(parsed.market_potential, 'market_potential'),
      competition_level: validateScore(parsed.competition_level, 'competition_level'),
      technical_feasibility: validateScore(parsed.technical_feasibility, 'technical_feasibility'),
      monetization_potential: validateScore(parsed.monetization_potential, 'monetization_potential'),
      compliance_score: validateScore(parsed.compliance_score, 'compliance_score'),
      ai_analysis: typeof parsed.ai_analysis === 'string' ? parsed.ai_analysis : "Analysis not available",
      cost_estimate: {
        infrastructure_cost: Math.max(0, parsed.cost_estimate?.infrastructure_cost || 100),
        development_cost: Math.max(0, parsed.cost_estimate?.development_cost || 10000),
        operational_cost: Math.max(0, parsed.cost_estimate?.operational_cost || 500),
        projected_revenue: Math.max(0, parsed.cost_estimate?.projected_revenue || 1000),
        roi_estimate: Math.max(-100, Math.min(1000, parsed.cost_estimate?.roi_estimate || 20)),
        break_even_months: Math.max(1, parsed.cost_estimate?.break_even_months || 12),
      },
    };
    
    logger.info("Successfully parsed AI analysis", {
      data: { overallScore: result.overall_score, hasAnalysis: result.ai_analysis.length > 0 }
    });
    
    return result;
  } catch (error) {
    logger.error("Failed to parse AI response", {
      error: error instanceof Error ? error : new Error(String(error)),
      data: { responsePreview: response.substring(0, 200) }
    });
    
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
