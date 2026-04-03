import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  FileText, 
  List, 
  HelpCircle, 
  Settings,
  Loader2,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';
import { useAIHistoryPreferences } from '@/hooks/useAIHistoryPreferences';
import { useAIEnhancementNotifications } from '@/hooks/useAIEnhancementNotifications';
import { AIProviderFactory } from '@/features/ai/providers/AIProviderFactory';
import { EnhancementDisplay } from './EnhancementDisplay';
import { toast } from 'sonner';
import { parseAIResponse, validateEnhancementData } from '@/utils/aiResponseParser';
import { FileData } from '@/hooks/useFiles';
import { supabase } from '@/integrations/supabase/client';

interface SimpleFileEnhancerProps {
  file: FileData;
  onClose: () => void;
}

interface Enhancement {
  type: string;
  content: any;
  savedToHistory?: boolean;
}

export function SimpleFileEnhancer({ file, onClose }: SimpleFileEnhancerProps) {
  const { user } = useAuth();
  const { activeConfig } = useAIConfig();
  const { getPreference } = useAIHistoryPreferences();
  const { notifyEnhancementComplete, notifyEnhancementError } = useAIEnhancementNotifications();
  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  
  // Generate unique session ID when component mounts
  const sessionIdRef = useRef(`enh-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);

  // Check if history saving is enabled for note enhancements
  const isHistoryEnabled = () => {
    const preference = getPreference('note_enhancements');
    return preference.is_enabled;
  };

  const getFileContent = (): string => {
    // Priority: OCR text > file content based on type
    if (file.ocr_text && file.ocr_text.trim()) {
      return file.ocr_text;
    }
    
    // For text files, we could add more content extraction logic here
    return `File: ${file.name}\nType: ${file.file_type}\nSize: ${(file.file_size / 1024).toFixed(1)} KB`;
  };

  const saveFileEnhancementToDatabase = async (enhancementType: string, enhancementContent: any, originalContent: string): Promise<boolean> => {
    if (!user || !activeConfig) {
      console.log('Missing user or config for saving enhancement');
      return false;
    }

    // Check if history is enabled
    if (!isHistoryEnabled()) {
      console.log('History saving is disabled - skipping save');
      return false;
    }

    try {
      console.log('Saving file enhancement to database:', {
        file_id: file.id,
        user_id: user.id,
        enhancement_type: enhancementType,
        ai_service: activeConfig.service_name,
        model_used: activeConfig.model_name,
        session_id: sessionIdRef.current
      });

      const { data, error } = await supabase
        .from('note_enhancements')
        .insert({
          file_id: file.id,
          note_id: null, // Explicitly set to null for file enhancements
          user_id: user.id,
          enhancement_type: enhancementType,
          original_content: originalContent.substring(0, 10000), // Limit original content size
          enhanced_content: enhancementContent as any,
          ai_service: activeConfig.service_name,
          model_used: activeConfig.model_name,
          confidence_score: 85,
          is_applied: false,
          session_id: sessionIdRef.current
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Database error saving file enhancement:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('File enhancement saved successfully:', data.id);
      return true;
    } catch (error) {
      console.error('Failed to save file enhancement to database:', error);
      return false;
    }
  };

  const generateEnhancement = async (enhancementType: string) => {
    const content = getFileContent();
    
    if (!content || !user || !file.id) {
      toast.error('File content and authentication required');
      return;
    }

    if (!activeConfig) {
      toast.error('No AI service configured', {
        description: 'Please configure an AI service in settings first'
      });
      return;
    }
    
    if (content.length < 10) {
      toast.error('Not enough content', {
        description: 'This file needs more text content to generate meaningful enhancements'
      });
      return;
    }

    setIsGenerating(true);
    const historyEnabled = isHistoryEnabled();
    let savedToHistory = false;

    try {
      console.log('Starting file enhancement generation for:', enhancementType);
      console.log('Content length:', content.length);
      
      // Use direct AI provider approach like SimpleNoteEnhancer
      const provider = AIProviderFactory.createProvider({
        provider: activeConfig.service_name as 'openai' | 'gemini' | 'anthropic',
        apiKey: activeConfig.api_key,
        model: activeConfig.model_name
      });

      const prompt = `Please analyze this file content and generate a ${enhancementType.replace('_', ' ')} enhancement.

Content to analyze:
${content}

Please provide your response as valid JSON in the following format:
${getEnhancementPrompt(enhancementType)}

Ensure the response is properly formatted JSON without any markdown code blocks or additional text.`;

      const result = await provider.generateResponse({ 
        prompt,
        systemPrompt: 'You are an expert study assistant who helps improve and enhance notes for better learning. Return only valid JSON format as specified. Keep responses concise and well-structured.',
        maxTokens: 2000,
        temperature: 0.7
      });
      
      console.log('Enhancement result received:', result);
      
      if (!result || !result.content) {
        throw new Error('No response received from AI provider');
      }

      // Parse the AI response to handle JSON format
      const parsedResponse = parseAIResponse(result.content);
      
      console.log('Parsed AI response:', parsedResponse);
      
      if (!parsedResponse.success) {
        throw new Error(parsedResponse.error || 'Failed to parse enhancement response');
      }
      
      // Validate and structure the enhancement data
      const validatedContent = validateEnhancementData(parsedResponse.data, enhancementType);
      
      console.log('Validated content:', validatedContent);
      
      if (!validatedContent) {
        throw new Error('Invalid enhancement data structure');
      }

      // Save to database only if history is enabled
      if (historyEnabled) {
        savedToHistory = await saveFileEnhancementToDatabase(enhancementType, validatedContent, content);
      }

      const newEnhancement: Enhancement = {
        type: enhancementType,
        content: validatedContent,
        savedToHistory
      };

      setEnhancements(prev => [
        ...prev.filter(e => e.type !== enhancementType),
        newEnhancement
      ]);

      setActiveTab(enhancementType);

      // Notify enhancement complete
      notifyEnhancementComplete({
        type: 'file_analysis',
        itemName: file.name,
        enhancementType: enhancementType.replace('_', ' '),
        itemId: file.id
      });
      
      // Show appropriate toast based on history status
      if (historyEnabled) {
        if (savedToHistory) {
          toast.success(`${enhancementType.replace('_', ' ')} enhancement generated and saved!`);
        } else {
          toast.success(`${enhancementType.replace('_', ' ')} enhancement generated!`, {
            description: 'Note: Could not save to history'
          });
        }
      } else {
        toast.success(`${enhancementType.replace('_', ' ')} enhancement generated!`, {
          description: 'Not saved to history - history is disabled'
        });
      }
      
      console.log('Enhancement successfully added to state');
    } catch (error: any) {
      console.error('Enhancement generation failed:', error);

      // Notify enhancement error
      notifyEnhancementError({
        type: 'file_analysis',
        itemName: file.name,
        enhancementType: enhancementType.replace('_', ' '),
        itemId: file.id,
        error: error.message || 'Enhancement generation failed'
      });
      
      // Provide specific error messages based on error type
      let errorMessage = 'Enhancement generation failed';
      let description = 'Please try again';
      
      if (error.message?.includes('No active AI service')) {
        errorMessage = 'No AI service configured';
        description = 'Please configure an AI service in settings first';
      } else if (error.message?.includes('authentication')) {
        errorMessage = 'Authentication error';
        description = 'Please log in again to continue';
      } else if (error.message?.includes('API key')) {
        errorMessage = 'AI service configuration error';
        description = 'Please check your AI service settings';
      } else if (error.message?.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded';
        description = 'Please wait a moment and try again';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out';
        description = 'Try with a smaller file or check your connection';
      } else if (error.message?.includes('too long')) {
        errorMessage = 'Content too long';
        description = 'Please select a smaller file to enhance';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { description });
    } finally {
      setIsGenerating(false);
    }
  };

  const getEnhancementPrompt = (type: string): string => {
    switch (type) {
      case 'summary':
        return `{
  "summary": "A comprehensive summary analyzing the actual content provided",
  "keyTakeaways": ["Key takeaway 1", "Key takeaway 2"],
  "wordCount": {
    "original": 245,
    "summary": 67
  }
}

CRITICAL INSTRUCTIONS:
- Replace the example numbers (245, 67) with the ACTUAL word count of the original content and your generated summary
- Count the real words in the content I provided above
- Count the real words in your summary response
- Do not use placeholder or example numbers - calculate the actual counts`;
      case 'key_points':
        return `{
  "keyPoints": [
    {
      "point": "Main point",
      "details": ["Supporting detail 1", "Supporting detail 2"],
      "importance": "high"
    }
  ],
  "categories": ["Category 1", "Category 2"]
}`;
      case 'questions':
        return `{
  "studyQuestions": [
    {
      "question": "Study question",
      "answer": "Detailed educational answer that explains the concept thoroughly",
      "type": "conceptual",
      "difficulty": "medium"
    }
  ],
  "reviewQuestions": [
    {
      "question": "Quick review question",
      "answer": "Concise but complete answer explanation"
    }
  ]
}

CRITICAL INSTRUCTIONS:
- Every question MUST have a corresponding detailed answer
- Study question answers should be comprehensive and educational, explaining the concepts clearly
- Review question answers should be concise but complete and helpful
- Base all questions and answers on the actual content provided
- Answers should help students understand the material better, not just state facts`;
      default:
        return '{}';
    }
  };

  const enhancementTypes = [
    { id: 'summary', name: 'Summary', icon: FileText, description: 'Generate a concise summary' },
    { id: 'key_points', name: 'Key Points', icon: List, description: 'Extract key points and details' },
    { id: 'questions', name: 'Study Questions', icon: HelpCircle, description: 'Create study questions' }
  ];

  const content = getFileContent();
  const hasValidContent = content.length >= 50;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI File Enhancer
            </CardTitle>
            <CardDescription>
              Generate AI-powered enhancements from your file content
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* AI Configuration Check */}
          {!activeConfig && (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Please configure an AI service first to use the file enhancer. Go to Settings to set up your preferred AI service.
              </AlertDescription>
            </Alert>
          )}

          {/* File Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Selected File</div>
            <div className="text-sm text-muted-foreground mb-2">
              {file.name} ({file.file_type})
            </div>
            {hasValidContent ? (
              <>
                <div className="text-sm text-muted-foreground">
                  {content.slice(0, 150)}{content.length > 150 && '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {content.length} characters • Using {activeConfig?.service_name} ({activeConfig?.model_name})
                </div>
              </>
            ) : (
              <Alert className="mt-2">
                <AlertDescription>
                  This file doesn't have enough text content for AI enhancement. Try uploading a text file, PDF with text, or image with text that can be processed with OCR.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Enhancement Type Buttons */}
          {hasValidContent && activeConfig && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {enhancementTypes.map(type => {
                const enhancement = enhancements.find(e => e.type === type.id);
                const hasEnhancement = !!enhancement;
                const Icon = type.icon;
                
                return (
                  <Button
                    key={type.id}
                    variant={hasEnhancement ? "default" : "outline"}
                    size="lg"
                    onClick={() => generateEnhancement(type.id)}
                    disabled={isGenerating}
                    className="h-auto p-4 flex flex-col gap-2"
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-center">
                      <div className="font-medium">{type.name}</div>
                      <div className="text-xs opacity-70">{type.description}</div>
                    </div>
                    {hasEnhancement && (
                      <div className="flex items-center gap-1 text-xs bg-background/20 px-2 py-1 rounded">
                        {enhancement.savedToHistory ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Generated & Saved
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            Generated
                          </>
                        )}
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          )}

          {isGenerating && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Generating AI enhancement from file content...
              </AlertDescription>
            </Alert>
          )}

          {/* Enhancement Results */}
          {enhancements.length > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                {enhancementTypes.map(type => {
                  const hasEnhancement = enhancements.some(e => e.type === type.id);
                  return (
                    <TabsTrigger 
                      key={type.id} 
                      value={type.id}
                      disabled={!hasEnhancement}
                      className="text-xs"
                    >
                      {type.name}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {enhancementTypes.map(type => {
                const enhancement = enhancements.find(e => e.type === type.id);
                if (!enhancement) return null;

                return (
                  <TabsContent key={type.id} value={type.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span className="font-medium">{type.name}</span>
                        <div className="text-xs text-muted-foreground">
                          from {file.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {enhancement.savedToHistory ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Saved to History
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            Not saved to history
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/50">
                      <EnhancementDisplay enhancement={enhancement} type={type.id} />
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}

          {enhancements.length === 0 && !isGenerating && hasValidContent && activeConfig && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Click on any enhancement type above to generate AI-powered improvements from your file content.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
