import { supabase } from '@/integrations/supabase/client';

interface UsageMetrics {
  tokensUsed: number;
  operationType: string;
  serviceName: string;
  costEstimate?: number;
}

export class AIUsageTracker {
  private static instance: AIUsageTracker;
  private usageQueue: UsageMetrics[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  static getInstance(): AIUsageTracker {
    if (!AIUsageTracker.instance) {
      AIUsageTracker.instance = new AIUsageTracker();
    }
    return AIUsageTracker.instance;
  }

  private constructor() {
    // Flush usage every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushUsage();
    }, 30000);
  }

  track(metrics: UsageMetrics): void {
    this.usageQueue.push({
      ...metrics,
      costEstimate: this.estimateCost(metrics.serviceName, metrics.tokensUsed)
    });

    // Flush immediately if queue gets large
    if (this.usageQueue.length >= 10) {
      this.flushUsage();
    }
  }

  private estimateCost(serviceName: string, tokens: number): number {
    // Cost estimates per 1K tokens (approximate)
    const costs = {
      'openai': 0.00015, // GPT-4o-mini input cost
      'gemini': 0.000075, // Gemini Pro cost (often free)
      'anthropic': 0.00025
    };

    const costPer1K = costs[serviceName as keyof typeof costs] || 0.0001;
    return (tokens / 1000) * costPer1K;
  }

  private async flushUsage(): Promise<void> {
    if (this.usageQueue.length === 0) return;

    const batch = [...this.usageQueue];
    this.usageQueue = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const records = batch.map(metrics => ({
        user_id: user.id,
        tokens_used: metrics.tokensUsed,
        operation_type: metrics.operationType,
        service_name: metrics.serviceName,
        cost_estimate: metrics.costEstimate || 0
      }));

      const { error } = await supabase
        .from('ai_usage_tracking')
        .insert(records);

      if (error) {
        console.error('Failed to track usage:', error);
        // Put failed records back in queue for retry
        this.usageQueue.unshift(...batch);
      }
    } catch (error) {
      console.error('Usage tracking error:', error);
      // Put failed records back in queue for retry
      this.usageQueue.unshift(...batch);
    }
  }

  async getUsageStats(days: number = 30): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate stats
      const stats = {
        totalTokens: 0,
        totalCost: 0,
        operationCounts: {} as Record<string, number>,
        serviceCounts: {} as Record<string, number>,
        dailyUsage: {} as Record<string, number>
      };

      data?.forEach(record => {
        stats.totalTokens += record.tokens_used;
        stats.totalCost += record.cost_estimate || 0;
        
        stats.operationCounts[record.operation_type] = 
          (stats.operationCounts[record.operation_type] || 0) + 1;
        
        stats.serviceCounts[record.service_name] = 
          (stats.serviceCounts[record.service_name] || 0) + 1;
        
        const date = new Date(record.created_at!).toDateString();
        stats.dailyUsage[date] = (stats.dailyUsage[date] || 0) + record.tokens_used;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushUsage(); // Final flush
  }
}

// Auto-initialize singleton
export const aiUsageTracker = AIUsageTracker.getInstance();