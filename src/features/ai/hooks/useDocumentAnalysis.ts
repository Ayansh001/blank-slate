// Document Analysis Hook - Manages AI document analysis operations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DocumentAnalysis, AIAnalysisRequest } from '../types';
import { DocumentAnalysisService } from '../services/DocumentAnalysisService';
import { toast } from 'sonner';

export function useDocumentAnalysis(fileId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const analysisService = DocumentAnalysisService.getInstance();

  // Get analyses for a specific file
  const { data: fileAnalyses = [], isLoading: isLoadingFile } = useQuery({
    queryKey: ['document-analyses', fileId, user?.id],
    queryFn: () => analysisService.getDocumentAnalyses(fileId!, user?.id || ''),
    enabled: !!user && !!fileId
  });

  // Get all user analyses
  const { data: userAnalyses = [], isLoading: isLoadingUser } = useQuery({
    queryKey: ['user-analyses', user?.id],
    queryFn: () => analysisService.getUserAnalyses(user?.id || '', 50),
    enabled: !!user
  });

  // Create new analysis
  const analyzeDocumentMutation = useMutation({
    mutationFn: async (request: AIAnalysisRequest) => {
      if (!user) throw new Error('User not authenticated');
      return analysisService.analyzeDocument(request, user.id);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['document-analyses'] });
        queryClient.invalidateQueries({ queryKey: ['user-analyses'] });
        toast.success('Document analysis completed successfully');
      } else {
        toast.error(result.error || 'Analysis failed');
      }
    },
    onError: (error) => {
      console.error('Document analysis error:', error);
      toast.error('Failed to analyze document: ' + (error as Error).message);
    }
  });

  const getAnalysisByType = (type: DocumentAnalysis['analysis_type']) => {
    return fileAnalyses.find(analysis => analysis.analysis_type === type);
  };

  const hasAnalysis = (type: DocumentAnalysis['analysis_type']) => {
    return fileAnalyses.some(analysis => analysis.analysis_type === type);
  };

  const getRecentAnalyses = (limit: number = 10) => {
    return userAnalyses.slice(0, limit);
  };

  return {
    fileAnalyses,
    userAnalyses,
    isLoading: isLoadingFile || isLoadingUser,
    analyzeDocument: analyzeDocumentMutation.mutate,
    isAnalyzing: analyzeDocumentMutation.isPending,
    getAnalysisByType,
    hasAnalysis,
    getRecentAnalyses
  };
}