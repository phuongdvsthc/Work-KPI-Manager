import { AIPromptDefinition } from '../../types/ai';

/**
 * Central AI Prompt Registry
 * 
 * Manages versions, system instructions, and schemas for all AI interactions.
 * Keeps React components clear of large prompt strings.
 */
export const aiPromptRegistry: Record<string, AIPromptDefinition> = {
  kpi_summary_v1: {
    key: 'kpi_summary',
    version: '1.0',
    purpose: 'Analyze KPI performance for a specific organizational unit',
    systemInstruction: `You are an expert school performance analyst. 
Based on the provided KPI assignments and metrics context, generate a professional summary in Vietnamese.
Focus on identifying underperforming targets and highlighting completion risks.
Do not invent data outside the provided context.`,
    expectedSchema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        highlights: { type: "array", items: { type: "string" } },
        risks: { 
          type: "array", 
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              severity: { type: "string", enum: ["low", "medium", "high"] }
            }
          }
        },
        suggested_actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              assigneeRole: { type: "string" }
            }
          }
        },
        evidence: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              id: { type: "string" }
            }
          }
        }
      },
      required: ["summary", "highlights", "risks", "suggested_actions"]
    }
  }
};
