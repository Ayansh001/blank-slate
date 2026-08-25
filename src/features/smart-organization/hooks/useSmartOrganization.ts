import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { FileData } from '@/hooks/useFiles';
import { AIErrorHandler } from '@/features/ai/services/AIErrorHandler';
import { aiUsageTracker } from '@/features/ai/services/AIUsageTracker';
import { toast } from 'sonner';

// Legacy format for compatibility with existing components
interface SmartOrganizationResult {
  fileId: string;
  suggestedCategory: { category: string; confidence: number };
  suggestedTags: Array<{ tag: string; confidence: number }>;
  duplicates?: string[];
  relatedFiles?: string[];
}

// New format from the edge function
interface AIOrganizationResponse {
  categories: Array<{
    name: string;
    description: string;
    items: string[];
    suggestedTags: string[];
  }>;
  folderStructure: {
    name: string;
    folders: Array<{
      name: string;
      items: string[];
      subfolders: any[];
    }>;
  };
  reasoning: string;
  duplicateItems: string[];
  improvementSuggestions: string[];
}

// Helper function to transform AI response to legacy format
function transformAIResponseToLegacyFormat(aiResponse: AIOrganizationResponse, files: FileData[]): SmartOrganizationResult[] {
  const results: SmartOrganizationResult[] = [];
  
  // Convert categories to per-file results
  aiResponse.categories.forEach(category => {
    category.items.forEach(itemId => {
      const file = files.find(f => f.id === itemId);
      if (file) {
        results.push({
          fileId: itemId,
          suggestedCategory: { 
            category: category.name, 
            confidence: 0.8 // Default confidence
          },
          suggestedTags: category.suggestedTags.map(tag => ({
            tag,
            confidence: 0.7 // Default confidence
          })),
          duplicates: aiResponse.duplicateItems.includes(itemId) ? aiResponse.duplicateItems : undefined,
          relatedFiles: [] // Could be enhanced to find related files
        });
      }
    });
  });
  
  return results;
}

export function useSmartOrganization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [organizationResults, setOrganizationResults] = useState<SmartOrganizationResult[]>([]);

  const analyzeFilesMutation = useMutation({
    mutationFn: async (files: FileData[]) => {
      if (!user) throw new Error('User not authenticated');
      
      try {
        const { data, error } = await supabase.functions.invoke('ai-smart-organizer', {
          body: {
            items: files.map(file => ({
              id: file.id,
              name: file.name,
              type: file.file_type,
              content: file.ocr_text || '',
              tags: file.tags || []
            })),
            organizationType: 'files'
          }
        });

        if (error) throw error;
        
        // Track usage
        aiUsageTracker.track({
          tokensUsed: Math.max(50, files.length * 10), // Estimate based on files
          operationType: 'smart_organization',
          serviceName: 'ai-smart-organizer'
        });

        // Transform AI response to legacy format for component compatibility
        return transformAIResponseToLegacyFormat(data.suggestions, files);
      } catch (error) {
        AIErrorHandler.handle(error, 'smart organization analysis');
        throw error;
      }
    },
    onSuccess: (results) => {
      setOrganizationResults(results);
      toast.success(`Analyzed ${results.length} files for smart organization`);
    },
    onError: (error) => {
      // Error already handled by AIErrorHandler
    }
  });

  const applySuggestionsMutation = useMutation({
    mutationFn: async (suggestions: Array<{
      fileId: string;
      category?: string;
      tags?: string[];
    }>) => {
      if (!user) throw new Error('User not authenticated');

      try {
        const updates = suggestions.map(async (suggestion) => {
          const updateData: any = {};
          if (suggestion.category) updateData.category = suggestion.category;
          if (suggestion.tags) updateData.tags = suggestion.tags;

          const { error } = await supabase
            .from('files')
            .update(updateData)
            .eq('id', suggestion.fileId)
            .eq('user_id', user.id);

          if (error) throw error;
          return suggestion.fileId;
        });

        return await Promise.all(updates);
      } catch (error) {
        AIErrorHandler.handle(error, 'applying organization suggestions');
        throw error;
      }
    },
    onSuccess: (updatedFileIds) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success(`Applied suggestions to ${updatedFileIds.length} files`);
    },
    onError: (error) => {
      // Error already handled by AIErrorHandler
    }
  });

  const autoOrganizeMutation = useMutation({
    mutationFn: async (files: FileData[]) => {
      if (!user) throw new Error('User not authenticated');
      
      try {
        // First analyze files using the edge function
        const { data, error } = await supabase.functions.invoke('ai-smart-organizer', {
          body: {
            items: files.map(file => ({
              id: file.id,
              name: file.name,
              type: file.file_type,
              content: file.ocr_text || '',
              tags: file.tags || []
            })),
            organizationType: 'files'
          }
        });

        if (error) throw error;
        
        // Track usage
        aiUsageTracker.track({
          tokensUsed: Math.max(50, files.length * 10),
          operationType: 'auto_organization',
          serviceName: 'ai-smart-organizer'
        });

        // Extract suggestions from the response
        const suggestions = data.suggestions?.categories?.flatMap((category: any) => 
          category.items.map((itemId: string) => ({
            fileId: itemId,
            category: category.name,
            tags: category.suggestedTags || []
          }))
        ) || [];

        // Apply suggestions automatically
        if (suggestions.length > 0) {
          await applySuggestionsMutation.mutateAsync(suggestions);
        }

        return { analyzed: files.length, organized: suggestions.length };
      } catch (error) {
        AIErrorHandler.handle(error, 'auto organization');
        throw error;
      }
    },
    onSuccess: (result) => {
      toast.success(`Auto-organized ${result.organized} out of ${result.analyzed} files`);
    },
    onError: (error) => {
      // Error already handled by AIErrorHandler
    }
  });

  return {
    organizationResults,
    analyzeFiles: analyzeFilesMutation.mutate,
    applySuggestions: applySuggestionsMutation.mutate,
    autoOrganize: autoOrganizeMutation.mutate,
    isAnalyzing: analyzeFilesMutation.isPending,
    isApplying: applySuggestionsMutation.isPending,
    isAutoOrganizing: autoOrganizeMutation.isPending
  };
}