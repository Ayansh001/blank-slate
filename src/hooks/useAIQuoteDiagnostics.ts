import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticResult {
  hasActiveAIService: boolean;
  hasQuotesToday: boolean;
  quotesGenerated: number;
  unreadQuotes: number;
  lastError: string | null;
  aiServiceConfig: any | null;
}

interface AIServiceConfig {
  id: string;
  service_name: string;
  model_name: string;
  is_active: boolean;
  api_key_configured: boolean;
}

export function useAIQuoteDiagnostics() {
  const { user } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult>({
    hasActiveAIService: false,
    hasQuotesToday: false,
    quotesGenerated: 0,
    unreadQuotes: 0,
    lastError: null,
    aiServiceConfig: null
  });
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = useCallback(async () => {
    if (!user) {
      console.log('🔍 No user authenticated, skipping diagnostics');
      return;
    }

    setIsRunning(true);
    console.log('🔍 Starting AI Quote System Diagnostics...');
    
    const result: DiagnosticResult = {
      hasActiveAIService: false,
      hasQuotesToday: false,
      quotesGenerated: 0,
      unreadQuotes: 0,
      lastError: null,
      aiServiceConfig: null
    };

    try {
      // Step 1: Check for active AI service configuration
      console.log('🔍 Step 1: Checking AI service configuration...');
      const { data: aiConfigs, error: aiConfigError } = await supabase
        .from('ai_service_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (aiConfigError) {
        console.error('❌ Error fetching AI configs:', aiConfigError);
        result.lastError = `AI Config Error: ${aiConfigError.message}`;
      } else if (aiConfigs && aiConfigs.length > 0) {
        result.hasActiveAIService = true;
        result.aiServiceConfig = aiConfigs[0];
        console.log('✅ Active AI service found:', aiConfigs[0].service_name);
      } else {
        console.log('⚠️ No active AI service configuration found');
        result.lastError = 'No active AI service configured';
      }

      // Step 2: Check today's quotes
      console.log('🔍 Step 2: Checking today\'s quotes...');
      const today = new Date().toISOString().split('T')[0];
      
      const { data: todayQuotes, error: quotesError } = await supabase
        .from('ai_daily_quotes')
        .select('*')
        .eq('user_id', user.id)
        .eq('generated_date', today);

      if (quotesError) {
        console.error('❌ Error fetching quotes:', quotesError);
        result.lastError = `Quotes Error: ${quotesError.message}`;
      } else {
        result.hasQuotesToday = todayQuotes ? todayQuotes.length > 0 : false;
        result.quotesGenerated = todayQuotes ? todayQuotes.length : 0;
        result.unreadQuotes = todayQuotes ? todayQuotes.filter(q => !q.is_read).length : 0;
        
        console.log(`📊 Found ${result.quotesGenerated} quotes for today, ${result.unreadQuotes} unread`);
      }

      // Step 3: Test database RPC function
      console.log('🔍 Step 3: Testing database RPC function...');
      const { data: rpcTest, error: rpcError } = await supabase
        .rpc('insert_daily_quote', {
          _user_id: user.id,
          _quote_text: 'Test quote - please ignore',
          _category: 'test',
          _ai_service: 'test',
          _model_used: 'test',
          _generated_date: '1900-01-01' // Use old date so it doesn't interfere
        });

      if (rpcError) {
        console.error('❌ RPC function test failed:', rpcError);
        result.lastError = `RPC Error: ${rpcError.message}`;
      } else {
        console.log('✅ RPC function test passed');
        
        // Clean up test quote
        await supabase
          .from('ai_daily_quotes')
          .delete()
          .eq('user_id', user.id)
          .eq('generated_date', '1900-01-01');
      }

    } catch (error) {
      console.error('❌ Diagnostics error:', error);
      result.lastError = `System Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    setDiagnostics(result);
    setIsRunning(false);
    
    console.log('🔍 Diagnostics complete:', result);
    return result;
  }, [user]);

  const generateTestQuotes = useCallback(async () => {
    if (!user) return;

    console.log('🧪 Generating test quotes...');
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-quote-generator', {
        body: { userId: user.id },
      });

      if (error) {
        console.error('❌ Test quote generation failed:', error);
        toast.error(`Quote generation failed: ${error.message}`);
        return false;
      }

      console.log('✅ Test quote generation result:', data);
      
      if (data?.success) {
        toast.success(`✨ Generated ${data.quotesGenerated} quotes successfully!`);
        // Re-run diagnostics to update state
        await runDiagnostics();
        return true;
      } else {
        toast.error('Quote generation failed - check console for details');
        return false;
      }
    } catch (error) {
      console.error('❌ Test quote generation error:', error);
      toast.error('Failed to generate test quotes');
      return false;
    }
  }, [user, runDiagnostics]);

  // Remove auto-run to prevent spam - diagnostics now manual only

  return {
    diagnostics,
    isRunning,
    runDiagnostics,
    generateTestQuotes
  };
}