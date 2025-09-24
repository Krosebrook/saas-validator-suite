import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { logger } from "../logging/logger";
import { handleError, NotFoundError, ExternalServiceError } from "../logging/errors";
import { validateRequired, validateNumber, validateEnum } from "../logging/validation";
import { sendNotificationToUser } from "../notifications/websocket";
import { analysisCache, generateAnalysisCacheKey } from "../cache/cache";
import { applyAiAnalysisRateLimit } from "../security/security";
import type { StartupAnalysisRequest, StartupAnalysisResult, VerdictType } from "./startup-types";

const openaiApiKey = secret("OpenAIApiKey");
const anthropicApiKey = secret("AnthropicApiKey");

// Analyzes a startup idea using the 8-dimension VC framework
export const analyzeStartup = api<StartupAnalysisRequest, StartupAnalysisResult>(
  { auth: true, expose: true, method: "POST", path: "/ai/analyze-startup" },
  async (req) => {
    try {
      const auth = getAuthData()!;
      
      logger.info("Starting startup analysis", {
        service: "ai",
        endpoint: "analyze-startup",
        userId: auth.userID,
        data: { ideaId: req.idea_id, depth: req.analysis_depth }
      });

      // Apply rate limiting
      await applyAiAnalysisRateLimit(auth.userID, "analyze-startup");

      // Validate input
      validateRequired(req.idea_id, "idea_id");
      validateNumber(req.idea_id, "idea_id", { integer: true, min: 1 });
      
      if (req.analysis_depth) {
        validateEnum(req.analysis_depth, ["standard", "deep", "executive"], "analysis_depth");
      }
      
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

      // Check cache first for existing startup analysis
      const cacheKey = generateAnalysisCacheKey(req.idea_id, "startup");
      const cachedAnalysis = await analysisCache.get<StartupAnalysisResult>(cacheKey);
      
      if (cachedAnalysis) {
        logger.info("Startup analysis served from cache", {
          service: "ai",
          endpoint: "analyze-startup",
          userId: auth.userID,
          data: { ideaId: req.idea_id }
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
        // Perform startup analysis
        const analysis = await performStartupAnalysis(idea, req.analysis_depth || "standard");
        
        // Store startup analysis in database
        await db.exec`
          INSERT INTO startup_analyses (
            idea_id, viability_score, market_verdict, competitive_verdict,
            differentiation_verdict, customer_verdict, monetization_verdict,
            execution_verdict, scalability_verdict, risk_verdict,
            strengths, concerns, pivots, next_steps, detailed_analysis
          ) VALUES (
            ${req.idea_id}, ${analysis.viability_score}, 
            ${analysis.market_analysis.verdict}, ${analysis.competitive_analysis.verdict},
            ${analysis.differentiation_analysis.verdict}, ${analysis.customer_analysis.verdict},
            ${analysis.monetization_analysis.verdict}, ${analysis.execution_analysis.verdict},
            ${analysis.scalability_analysis.verdict}, ${analysis.risk_analysis.verdict},
            ${JSON.stringify(analysis.top_strengths)}, ${JSON.stringify(analysis.top_concerns)},
            ${JSON.stringify(analysis.potential_pivots)}, ${JSON.stringify(analysis.recommended_next_steps)},
            ${JSON.stringify(analysis)}
          )
          ON CONFLICT (idea_id) DO UPDATE SET
            viability_score = EXCLUDED.viability_score,
            market_verdict = EXCLUDED.market_verdict,
            competitive_verdict = EXCLUDED.competitive_verdict,
            differentiation_verdict = EXCLUDED.differentiation_verdict,
            customer_verdict = EXCLUDED.customer_verdict,
            monetization_verdict = EXCLUDED.monetization_verdict,
            execution_verdict = EXCLUDED.execution_verdict,
            scalability_verdict = EXCLUDED.scalability_verdict,
            risk_verdict = EXCLUDED.risk_verdict,
            strengths = EXCLUDED.strengths,
            concerns = EXCLUDED.concerns,
            pivots = EXCLUDED.pivots,
            next_steps = EXCLUDED.next_steps,
            detailed_analysis = EXCLUDED.detailed_analysis
        `;

        // Update idea status
        await db.exec`
          UPDATE ideas SET status = 'completed' WHERE id = ${req.idea_id}
        `;

        // Cache the analysis result for 24 hours
        await analysisCache.set(cacheKey, analysis, 86400000);

        // Send notification that analysis completed
        await sendNotificationToUser(auth.userID, {
          type: "analysis_completed",
          data: {
            ideaId: req.idea_id,
            title: idea.title,
            overallScore: analysis.viability_score * 10, // Convert to 100-scale for notification
            timestamp: new Date().toISOString()
          }
        });

        logger.info("Startup analysis completed", {
          service: "ai",
          endpoint: "analyze-startup",
          userId: auth.userID,
          data: { ideaId: req.idea_id, viabilityScore: analysis.viability_score }
        });

        return analysis;

      } catch (error) {
        // Update idea status to failed
        await db.exec`
          UPDATE ideas SET status = 'failed' WHERE id = ${req.idea_id}
        `;
        
        logger.error("Startup analysis failed", {
          service: "ai",
          endpoint: "analyze-startup",
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
            message: error instanceof Error ? error.message : "Startup analysis failed",
            timestamp: new Date().toISOString()
          }
        });
        
        throw error;
      }
    } catch (error) {
      handleError(error, { service: "ai", endpoint: "analyze-startup" });
    }
  }
);

async function performStartupAnalysis(idea: any, depth: string): Promise<StartupAnalysisResult> {
  // Try Claude first for detailed analysis
  try {
    logger.info("Attempting startup analysis with Claude", { 
      data: { ideaId: idea.id, provider: "claude", depth } 
    });
    return await analyzeStartupWithClaude(idea, depth);
  } catch (claudeError) {
    logger.warn("Claude startup analysis failed, falling back to GPT", {
      error: claudeError instanceof Error ? claudeError : new Error(String(claudeError)),
      data: { ideaId: idea.id, provider: "claude" }
    });
    
    // Fallback to GPT
    try {
      logger.info("Attempting startup analysis with GPT", { 
        data: { ideaId: idea.id, provider: "openai", depth } 
      });
      return await analyzeStartupWithGPT(idea, depth);
    } catch (gptError) {
      logger.error("Both AI providers failed for startup analysis", {
        error: gptError instanceof Error ? gptError : new Error(String(gptError)),
        data: { ideaId: idea.id, claudeError: String(claudeError), gptError: String(gptError) }
      });
      throw new ExternalServiceError("AI startup analysis providers");
    }
  }
}

async function analyzeStartupWithClaude(idea: any, depth: string): Promise<StartupAnalysisResult> {
  const prompt = buildStartupAnalysisPrompt(idea, depth);
  
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
        max_tokens: 4000, // Increased for detailed startup analysis
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
      logger.error("Claude API error for startup analysis", {
        data: { status: response.status, statusText: response.statusText, errorText }
      });
      throw new ExternalServiceError(`Claude (${response.status}: ${response.statusText})`);
    }

    const data = await response.json() as any;
    return parseStartupAnalysisResponse(data.content[0].text);
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    logger.error("Claude startup analysis request failed", {
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw new ExternalServiceError("Claude", error instanceof Error ? error : undefined);
  }
}

async function analyzeStartupWithGPT(idea: any, depth: string): Promise<StartupAnalysisResult> {
  const prompt = buildStartupAnalysisPrompt(idea, depth);
  
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
            content: "You are StartupAnalyst-GPT, an expert in venture capital, market research, and startup mentorship specializing in 8-dimension startup validation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("OpenAI API error for startup analysis", {
        data: { status: response.status, statusText: response.statusText, errorText }
      });
      throw new ExternalServiceError(`OpenAI (${response.status}: ${response.statusText})`);
    }

    const data = await response.json() as any;
    return parseStartupAnalysisResponse(data.choices[0].message.content);
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    logger.error("OpenAI startup analysis request failed", {
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw new ExternalServiceError("OpenAI", error instanceof Error ? error : undefined);
  }
}

function buildStartupAnalysisPrompt(idea: any, depth: string): string {
  const depthInstructions = {
    standard: "Provide a comprehensive but concise analysis.",
    deep: "Provide an in-depth analysis with detailed market research and competitive intelligence.",
    executive: "Provide a strategic, investment-focused analysis suitable for board presentations."
  };

  return `
You are StartupAnalyst-GPT, an expert in venture capital, market research, and startup mentorship. Analyze this startup idea using the 8-dimension validation framework.

STARTUP IDEA:
Title: ${idea.title}
Description: ${idea.description || "No description provided"}
Source: ${idea.source}
${idea.source_url ? `Source URL: ${idea.source_url}` : ""}

ANALYSIS DEPTH: ${depth} - ${depthInstructions[depth as keyof typeof depthInstructions]}

Analyze across these 8 dimensions:

1. MARKET SIZE & OPPORTUNITY (TAM, SAM, trends, growth rate)
2. COMPETITIVE LANDSCAPE (competitors, barriers to entry, competitive advantages)
3. DIFFERENTIATION ANALYSIS (unique value proposition, key differentiators, competitive moats)
4. TARGET CUSTOMER VALIDATION (personas, pain points, urgency, market validation)
5. MONETIZATION POTENTIAL (revenue streams, pricing, unit economics, timeline)
6. EXECUTION REQUIREMENTS (technical feasibility, capital needs, regulations, team)
7. SCALABILITY ASSESSMENT (growth potential, scalability factors, expansion opportunities)
8. RISK ANALYSIS (market/execution/competitive/regulatory risks, mitigation strategies)

Provide a detailed JSON response with this EXACT structure:

{
  "viability_score": 1-10,
  "market_analysis": {
    "verdict": "Strong|Moderate|Weak",
    "analysis": "detailed analysis text",
    "tam_analysis": "total addressable market analysis",
    "sam_analysis": "serviceable addressable market analysis", 
    "market_trends": ["trend1", "trend2"],
    "growth_rate": "estimated growth rate"
  },
  "competitive_analysis": {
    "verdict": "Strong|Moderate|Weak",
    "analysis": "detailed analysis text",
    "direct_competitors": ["competitor1", "competitor2"],
    "indirect_competitors": ["competitor1", "competitor2"],
    "barriers_to_entry": ["barrier1", "barrier2"],
    "competitive_advantages": ["advantage1", "advantage2"]
  },
  "differentiation_analysis": {
    "verdict": "Strong|Moderate|Weak", 
    "analysis": "detailed analysis text",
    "unique_value_proposition": "clear UVP statement",
    "key_differentiators": ["diff1", "diff2"],
    "competitive_moats": ["moat1", "moat2"]
  },
  "customer_analysis": {
    "verdict": "Strong|Moderate|Weak",
    "analysis": "detailed analysis text", 
    "target_personas": ["persona1", "persona2"],
    "pain_points": ["pain1", "pain2"],
    "urgency_level": "High|Medium|Low",
    "market_validation": "validation approach"
  },
  "monetization_analysis": {
    "verdict": "Strong|Moderate|Weak",
    "analysis": "detailed analysis text",
    "revenue_streams": ["stream1", "stream2"],
    "pricing_strategy": "pricing approach",
    "unit_economics": {
      "cac": estimated_cac_number,
      "ltv": estimated_ltv_number,
      "ltv_cac_ratio": ratio_number
    },
    "monetization_timeline": "timeline to profitability"
  },
  "execution_analysis": {
    "verdict": "Strong|Moderate|Weak",
    "analysis": "detailed analysis text",
    "technical_feasibility": "feasibility assessment",
    "capital_requirements": {
      "initial_funding": funding_amount,
      "runway_months": months_number,
      "funding_stage": "Pre-seed|Seed|Series A|etc"
    },
    "regulatory_considerations": ["reg1", "reg2"],
    "team_requirements": ["role1", "role2"]
  },
  "scalability_analysis": {
    "verdict": "Strong|Moderate|Weak",
    "analysis": "detailed analysis text",
    "growth_potential": "growth assessment",
    "scalability_factors": ["factor1", "factor2"],
    "expansion_opportunities": ["opportunity1", "opportunity2"],
    "bottlenecks": ["bottleneck1", "bottleneck2"]
  },
  "risk_analysis": {
    "verdict": "Strong|Moderate|Weak",
    "analysis": "detailed analysis text",
    "market_risks": ["risk1", "risk2"],
    "execution_risks": ["risk1", "risk2"],
    "competitive_risks": ["risk1", "risk2"],
    "regulatory_risks": ["risk1", "risk2"],
    "mitigation_strategies": ["strategy1", "strategy2"]
  },
  "top_strengths": ["strength1", "strength2", "strength3"],
  "top_concerns": ["concern1", "concern2", "concern3"],
  "potential_pivots": ["pivot1", "pivot2"],
  "recommended_next_steps": ["step1", "step2", "step3"],
  "executive_summary": "2-3 sentence investment thesis"
}

Be constructively critical but encouraging. Ground insights in real-world venture and entrepreneurial frameworks. Avoid generic advice.
`;
}

function parseStartupAnalysisResponse(response: string): StartupAnalysisResult {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("No JSON found in startup analysis response", { 
        data: { responsePreview: response.substring(0, 200) } 
      });
      throw new Error("No JSON found in response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and create the analysis result with defaults
    const result: StartupAnalysisResult = {
      viability_score: Math.max(1, Math.min(10, parsed.viability_score || 5)),
      market_analysis: {
        verdict: isValidVerdict(parsed.market_analysis?.verdict) ? parsed.market_analysis.verdict : "Moderate",
        analysis: parsed.market_analysis?.analysis || "Analysis not available",
        tam_analysis: parsed.market_analysis?.tam_analysis,
        sam_analysis: parsed.market_analysis?.sam_analysis,
        market_trends: parsed.market_analysis?.market_trends || [],
        growth_rate: parsed.market_analysis?.growth_rate
      },
      competitive_analysis: {
        verdict: isValidVerdict(parsed.competitive_analysis?.verdict) ? parsed.competitive_analysis.verdict : "Moderate",
        analysis: parsed.competitive_analysis?.analysis || "Analysis not available",
        direct_competitors: parsed.competitive_analysis?.direct_competitors || [],
        indirect_competitors: parsed.competitive_analysis?.indirect_competitors || [],
        barriers_to_entry: parsed.competitive_analysis?.barriers_to_entry || [],
        competitive_advantages: parsed.competitive_analysis?.competitive_advantages || []
      },
      differentiation_analysis: {
        verdict: isValidVerdict(parsed.differentiation_analysis?.verdict) ? parsed.differentiation_analysis.verdict : "Moderate",
        analysis: parsed.differentiation_analysis?.analysis || "Analysis not available",
        unique_value_proposition: parsed.differentiation_analysis?.unique_value_proposition,
        key_differentiators: parsed.differentiation_analysis?.key_differentiators || [],
        competitive_moats: parsed.differentiation_analysis?.competitive_moats || []
      },
      customer_analysis: {
        verdict: isValidVerdict(parsed.customer_analysis?.verdict) ? parsed.customer_analysis.verdict : "Moderate",
        analysis: parsed.customer_analysis?.analysis || "Analysis not available",
        target_personas: parsed.customer_analysis?.target_personas || [],
        pain_points: parsed.customer_analysis?.pain_points || [],
        urgency_level: parsed.customer_analysis?.urgency_level,
        market_validation: parsed.customer_analysis?.market_validation
      },
      monetization_analysis: {
        verdict: isValidVerdict(parsed.monetization_analysis?.verdict) ? parsed.monetization_analysis.verdict : "Moderate",
        analysis: parsed.monetization_analysis?.analysis || "Analysis not available",
        revenue_streams: parsed.monetization_analysis?.revenue_streams || [],
        pricing_strategy: parsed.monetization_analysis?.pricing_strategy,
        unit_economics: parsed.monetization_analysis?.unit_economics,
        monetization_timeline: parsed.monetization_analysis?.monetization_timeline
      },
      execution_analysis: {
        verdict: isValidVerdict(parsed.execution_analysis?.verdict) ? parsed.execution_analysis.verdict : "Moderate",
        analysis: parsed.execution_analysis?.analysis || "Analysis not available",
        technical_feasibility: parsed.execution_analysis?.technical_feasibility,
        capital_requirements: parsed.execution_analysis?.capital_requirements,
        regulatory_considerations: parsed.execution_analysis?.regulatory_considerations || [],
        team_requirements: parsed.execution_analysis?.team_requirements || []
      },
      scalability_analysis: {
        verdict: isValidVerdict(parsed.scalability_analysis?.verdict) ? parsed.scalability_analysis.verdict : "Moderate",
        analysis: parsed.scalability_analysis?.analysis || "Analysis not available",
        growth_potential: parsed.scalability_analysis?.growth_potential,
        scalability_factors: parsed.scalability_analysis?.scalability_factors || [],
        expansion_opportunities: parsed.scalability_analysis?.expansion_opportunities || [],
        bottlenecks: parsed.scalability_analysis?.bottlenecks || []
      },
      risk_analysis: {
        verdict: isValidVerdict(parsed.risk_analysis?.verdict) ? parsed.risk_analysis.verdict : "Moderate",
        analysis: parsed.risk_analysis?.analysis || "Analysis not available",
        market_risks: parsed.risk_analysis?.market_risks || [],
        execution_risks: parsed.risk_analysis?.execution_risks || [],
        competitive_risks: parsed.risk_analysis?.competitive_risks || [],
        regulatory_risks: parsed.risk_analysis?.regulatory_risks || [],
        mitigation_strategies: parsed.risk_analysis?.mitigation_strategies || []
      },
      top_strengths: parsed.top_strengths?.slice(0, 3) || ["Analysis pending"],
      top_concerns: parsed.top_concerns?.slice(0, 3) || ["Analysis pending"],
      potential_pivots: parsed.potential_pivots || [],
      recommended_next_steps: parsed.recommended_next_steps?.slice(0, 3) || ["Analysis pending"],
      executive_summary: parsed.executive_summary
    };
    
    logger.info("Successfully parsed startup analysis", {
      data: { 
        viabilityScore: result.viability_score,
        strengthsCount: result.top_strengths.length,
        concernsCount: result.top_concerns.length 
      }
    });
    
    return result;
  } catch (error) {
    logger.error("Failed to parse startup analysis response", {
      error: error instanceof Error ? error : new Error(String(error)),
      data: { responsePreview: response.substring(0, 300) }
    });
    
    // Return default analysis if parsing fails
    return {
      viability_score: 5,
      market_analysis: {
        verdict: "Moderate",
        analysis: "Analysis parsing failed, manual review required"
      },
      competitive_analysis: {
        verdict: "Moderate", 
        analysis: "Analysis parsing failed, manual review required"
      },
      differentiation_analysis: {
        verdict: "Moderate",
        analysis: "Analysis parsing failed, manual review required"
      },
      customer_analysis: {
        verdict: "Moderate",
        analysis: "Analysis parsing failed, manual review required"
      },
      monetization_analysis: {
        verdict: "Moderate",
        analysis: "Analysis parsing failed, manual review required"
      },
      execution_analysis: {
        verdict: "Moderate",
        analysis: "Analysis parsing failed, manual review required"
      },
      scalability_analysis: {
        verdict: "Moderate",
        analysis: "Analysis parsing failed, manual review required"
      },
      risk_analysis: {
        verdict: "Moderate",
        analysis: "Analysis parsing failed, manual review required"
      },
      top_strengths: ["Analysis parsing failed"],
      top_concerns: ["Manual review required"],
      potential_pivots: ["Re-run analysis"],
      recommended_next_steps: ["Contact support", "Review input data", "Try again"]
    };
  }
}

function isValidVerdict(verdict: any): verdict is VerdictType {
  return verdict === "Strong" || verdict === "Moderate" || verdict === "Weak";
}