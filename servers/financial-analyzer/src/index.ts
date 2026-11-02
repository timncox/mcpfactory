#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "financial-analyzer",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Tool: revenue_projection
// ---------------------------------------------------------------------------
server.tool(
  "revenue_projection",
  "Calculate annual revenue projection from monthly data. Returns annualized revenue, gap to target, required growth rate, trend analysis, and monthly run rate.",
  {
    monthly_data: z
      .string()
      .describe(
        "JSON array of objects with 'month' (YYYY-MM) and 'revenue' (number) fields"
      ),
    target: z
      .number()
      .optional()
      .describe(
        "Optional annual revenue target. If provided, calculates gap and growth needed to hit target."
      ),
  },
  async ({ monthly_data, target }) => {
    try {
      // Parse and validate the monthly data
      const parsed: unknown = JSON.parse(monthly_data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: monthly_data must be a non-empty JSON array.",
            },
          ],
        };
      }

      interface MonthlyEntry {
        month: string;
        revenue: number;
      }

      const data: MonthlyEntry[] = parsed.map((entry: unknown) => {
        const e = entry as Record<string, unknown>;
        if (
          typeof e.month !== "string" ||
          typeof e.revenue !== "number"
        ) {
          throw new Error(
            "Each entry must have a 'month' (string) and 'revenue' (number) field."
          );
        }
        return { month: e.month, revenue: e.revenue };
      });

      // Sort by month ascending
      data.sort((a, b) => a.month.localeCompare(b.month));

      const monthCount = data.length;
      const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
      const avgMonthlyRevenue = totalRevenue / monthCount;
      const annualizedRevenue = avgMonthlyRevenue * 12;
      const monthlyRunRate = data[data.length - 1].revenue;

      // Trend analysis: simple linear regression (index-based)
      const xMean = (monthCount - 1) / 2;
      const yMean = avgMonthlyRevenue;
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < monthCount; i++) {
        numerator += (i - xMean) * (data[i].revenue - yMean);
        denominator += (i - xMean) * (i - xMean);
      }
      const slope = denominator !== 0 ? numerator / denominator : 0;

      let trend: string;
      // Use a relative threshold of 1% of the average to decide trend significance
      const trendThreshold = Math.abs(yMean) * 0.01;
      if (slope > trendThreshold) {
        trend = "increasing";
      } else if (slope < -trendThreshold) {
        trend = "decreasing";
      } else {
        trend = "stable";
      }

      const monthlyGrowthRates: number[] = [];
      for (let i = 1; i < monthCount; i++) {
        if (data[i - 1].revenue !== 0) {
          monthlyGrowthRates.push(
            ((data[i].revenue - data[i - 1].revenue) / data[i - 1].revenue) *
              100
          );
        }
      }
      const avgMonthlyGrowthRate =
        monthlyGrowthRates.length > 0
          ? monthlyGrowthRates.reduce((s, r) => s + r, 0) /
            monthlyGrowthRates.length
          : 0;

      // Build result object
      const result: Record<string, unknown> = {
        months_analyzed: monthCount,
        total_revenue_in_period: round(totalRevenue),
        average_monthly_revenue: round(avgMonthlyRevenue),
        annualized_revenue: round(annualizedRevenue),
        monthly_run_rate: round(monthlyRunRate),
        annualized_run_rate: round(monthlyRunRate * 12),
        trend,
        monthly_slope: round(slope),
        average_monthly_growth_rate_pct: round(avgMonthlyGrowthRate),
      };

      if (target !== undefined) {
        const gap = target - annualizedRevenue;
        const gapPct =
          annualizedRevenue !== 0 ? (gap / annualizedRevenue) * 100 : 0;
        const remainingMonths = Math.max(12 - monthCount, 1);
        const requiredMonthlyRevenue =
          monthCount < 12
            ? (target - totalRevenue) / remainingMonths
            : target / 12;

        result.target = round(target);
        result.gap_to_target = round(gap);
        result.gap_to_target_pct = round(gapPct);
        result.on_track = gap <= 0;
        result.required_monthly_revenue_remaining = round(
          requiredMonthlyRevenue
        );
        result.required_growth_from_current_pct =
          monthlyRunRate !== 0
            ? round(
                ((requiredMonthlyRevenue - monthlyRunRate) / monthlyRunRate) *
                  100
              )
            : null;
      }

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: utilization_analysis
// ---------------------------------------------------------------------------
server.tool(
  "utilization_analysis",
  "Calculate utilization rates per person and overall. Returns individual and aggregate utilization percentages, identifies under/over-utilized resources.",
  {
    sessions: z
      .string()
      .describe(
        "JSON array of objects with 'person' (string) and 'sessions' (number) fields representing completed sessions/units"
      ),
    capacity: z
      .number()
      .describe(
        "Maximum sessions/units capacity per person for the period"
      ),
  },
  async ({ sessions, capacity }) => {
    try {
      if (capacity <= 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: capacity must be a positive number.",
            },
          ],
        };
      }

      const parsed: unknown = JSON.parse(sessions);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: sessions must be a non-empty JSON array.",
            },
          ],
        };
      }

      interface SessionEntry {
        person: string;
        sessions: number;
      }

      const data: SessionEntry[] = parsed.map((entry: unknown) => {
        const e = entry as Record<string, unknown>;
        if (
          typeof e.person !== "string" ||
          typeof e.sessions !== "number"
        ) {
          throw new Error(
            "Each entry must have a 'person' (string) and 'sessions' (number) field."
          );
        }
        return { person: e.person, sessions: e.sessions };
      });

      const UNDER_THRESHOLD = 70;
      const OVER_THRESHOLD = 100;

      interface PersonUtilization {
        person: string;
        sessions_completed: number;
        capacity: number;
        utilization_pct: number;
        status: string;
      }

      const individual: PersonUtilization[] = data.map((d) => {
        const utilPct = (d.sessions / capacity) * 100;
        let status: string;
        if (utilPct < UNDER_THRESHOLD) {
          status = "under-utilized";
        } else if (utilPct > OVER_THRESHOLD) {
          status = "over-utilized";
        } else {
          status = "optimal";
        }
        return {
          person: d.person,
          sessions_completed: d.sessions,
          capacity,
          utilization_pct: round(utilPct),
          status,
        };
      });

      const totalSessions = data.reduce((s, d) => s + d.sessions, 0);
      const totalCapacity = capacity * data.length;
      const overallUtilization = (totalSessions / totalCapacity) * 100;

      const underUtilized = individual.filter(
        (p) => p.status === "under-utilized"
      );
      const overUtilized = individual.filter(
        (p) => p.status === "over-utilized"
      );
      const optimal = individual.filter((p) => p.status === "optimal");

      const result = {
        total_people: data.length,
        capacity_per_person: capacity,
        total_capacity: totalCapacity,
        total_sessions_completed: totalSessions,
        overall_utilization_pct: round(overallUtilization),
        individual,
        summary: {
          under_utilized_count: underUtilized.length,
          optimal_count: optimal.length,
          over_utilized_count: overUtilized.length,
          under_utilized_people: underUtilized.map((p) => p.person),
          over_utilized_people: overUtilized.map((p) => p.person),
        },
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: churn_analysis
// ---------------------------------------------------------------------------
server.tool(
  "churn_analysis",
  "Analyze customer/client churn. Returns churn rate, retention rate, estimated cost of churn, and lifetime value estimates.",
  {
    new_clients: z
      .number()
      .describe("Number of new clients added in the period"),
    terminated_clients: z
      .number()
      .describe("Number of clients lost/terminated in the period"),
    base_clients: z
      .number()
      .describe("Total client base at start of period"),
    avg_revenue_per_client: z
      .number()
      .optional()
      .describe(
        "Optional average revenue per client per period. Used to calculate cost of churn and LTV."
      ),
  },
  async ({ new_clients, terminated_clients, base_clients, avg_revenue_per_client }) => {
    try {
      if (base_clients <= 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: base_clients must be a positive number.",
            },
          ],
        };
      }

      const churnRate = (terminated_clients / base_clients) * 100;
      const retentionRate = 100 - churnRate;
      const netChange = new_clients - terminated_clients;
      const endClients = base_clients + netChange;
      const netGrowthRate = (netChange / base_clients) * 100;

      const result: Record<string, unknown> = {
        base_clients,
        new_clients,
        terminated_clients,
        end_clients: endClients,
        net_change: netChange,
        churn_rate_pct: round(churnRate),
        retention_rate_pct: round(retentionRate),
        net_growth_rate_pct: round(netGrowthRate),
      };

      if (avg_revenue_per_client !== undefined) {
        const costOfChurn = terminated_clients * avg_revenue_per_client;
        const revenueFromNew = new_clients * avg_revenue_per_client;
        const netRevenueImpact = revenueFromNew - costOfChurn;

        // Estimated customer lifetime (periods) = 1 / churn rate (as fraction)
        const churnFraction = churnRate / 100;
        const estimatedLifetimePeriods =
          churnFraction > 0 ? 1 / churnFraction : null;
        const estimatedLTV =
          estimatedLifetimePeriods !== null
            ? avg_revenue_per_client * estimatedLifetimePeriods
            : null;

        // Annual churn cost projection (assuming monthly period → 12x)
        const annualChurnCostProjection = costOfChurn * 12;

        result.avg_revenue_per_client = round(avg_revenue_per_client);
        result.revenue_lost_from_churn = round(costOfChurn);
        result.revenue_gained_from_new = round(revenueFromNew);
        result.net_revenue_impact = round(netRevenueImpact);
        result.estimated_client_lifetime_periods =
          estimatedLifetimePeriods !== null
            ? round(estimatedLifetimePeriods)
            : null;
        result.estimated_ltv =
          estimatedLTV !== null ? round(estimatedLTV) : null;
        result.annualized_churn_cost = round(annualChurnCostProjection);
      }

      // Risk assessment
      let riskLevel: string;
      if (churnRate > 10) {
        riskLevel = "high";
      } else if (churnRate > 5) {
        riskLevel = "moderate";
      } else {
        riskLevel = "low";
      }
      result.risk_level = riskLevel;

      // Insight
      const insights: string[] = [];
      if (churnRate > 10) {
        insights.push(
          "Churn rate exceeds 10% — consider immediate retention initiatives."
        );
      }
      if (netChange < 0) {
        insights.push(
          "Client base is shrinking — new client acquisition is not keeping pace with churn."
        );
      }
      if (netChange > 0) {
        insights.push(
          "Client base is growing — acquisition outpaces churn."
        );
      }
      if (churnRate <= 5) {
        insights.push(
          "Churn rate is within healthy range (≤5%)."
        );
      }
      result.insights = insights;

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
