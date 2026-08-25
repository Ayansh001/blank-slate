import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Plus, X, BookOpen, AlertTriangle } from 'lucide-react';
import { AdvancedQuizConfig, AdvancedQuestionType } from '../types/advancedQuiz';

interface AdvancedQuizConfigPanelProps {
  content: string;
  onConfigComplete: (config: AdvancedQuizConfig) => void;
  initialConfig?: AdvancedQuizConfig | null;
}

const QUESTION_TYPES: { value: AdvancedQuestionType; label: string; description: string }[] = [
  { value: 'multiple_choice_extended', label: 'Extended Multiple Choice', description: 'Detailed multiple choice with 4-6 options' },
  { value: 'true_false_explained', label: 'True/False with Explanations', description: 'True/false questions with comprehensive explanations' },
  { value: 'scenario_based', label: 'Scenario-Based Questions', description: 'Real-world scenarios testing application' },
  { value: 'visual_interpretation', label: 'Visual Interpretation', description: 'Questions requiring analysis of visual data' },
  { value: 'multi_part', label: 'Multi-Part Questions', description: 'Questions with 2-3 related sub-questions' },
  { value: 'diagram_labeling', label: 'Diagram Labeling', description: 'Identify or label parts of diagrams' },
  { value: 'chart_analysis', label: 'Chart Analysis', description: 'Interpret data from charts and graphs' },
  { value: 'comparison', label: 'Comparison Questions', description: 'Compare concepts, data, or scenarios' },
  { value: 'essay_short', label: 'Short Essay', description: 'Short-answer questions requiring 2-3 sentences' }
];

const PRESET_CATEGORIES = [
  'Data Analysis', 'Critical Thinking', 'Problem Solving', 'Conceptual Understanding',
  'Application', 'Synthesis', 'Evaluation', 'Factual Recall', 'Process Understanding',
  'Case Study Analysis', 'Interpretation', 'Reasoning'
];

export function AdvancedQuizConfigPanel({ content, onConfigComplete, initialConfig }: AdvancedQuizConfigPanelProps) {
  const [config, setConfig] = useState<AdvancedQuizConfig>({
    contentType: 'mixed',
    questionTypes: ['multiple_choice_extended', 'true_false_explained'],
    difficulty: 'intermediate',
    questionCount: 5,
    questionDepth: 'medium',
    categories: ['Critical Thinking'],
    customKeywords: [],
    includeExplanations: true,
    enableMultiPart: false,
    visualContentSupport: false,
    ...initialConfig
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [questionCountInput, setQuestionCountInput] = useState(String(config.questionCount));
  const [questionCountError, setQuestionCountError] = useState<string | null>(null);

  // Debug logging
  console.log('AdvancedQuizConfigPanel - config:', config);
  console.log('AdvancedQuizConfigPanel - questionCountInput:', questionCountInput);

  const updateConfig = (updates: Partial<AdvancedQuizConfig>) => {
    console.log('AdvancedQuizConfigPanel - updating config with:', updates);
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleQuestionCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('AdvancedQuizConfigPanel - question count input change:', value);
    setQuestionCountInput(value);
    setQuestionCountError(null);

    // Allow empty input for user typing
    if (value === '') {
      setQuestionCountError('Please enter a number between 1 and 50');
      return;
    }

    const numValue = parseInt(value, 10);
    
    // Validate the input
    if (isNaN(numValue)) {
      setQuestionCountError('Please enter a valid number');
      return;
    }

    if (numValue < 1) {
      setQuestionCountError('Minimum 1 question required');
      return;
    }

    if (numValue > 50) {
      setQuestionCountError('Maximum 50 questions allowed');
      return;
    }

    // Valid input - update config
    console.log('AdvancedQuizConfigPanel - Valid question count, updating config:', numValue);
    updateConfig({ questionCount: numValue });
  };

  const toggleQuestionType = (type: AdvancedQuestionType) => {
    updateConfig({
      questionTypes: config.questionTypes.includes(type)
        ? config.questionTypes.filter(t => t !== type)
        : [...config.questionTypes, type]
    });
  };

  const addCategory = (category: string) => {
    if (!config.categories.includes(category)) {
      updateConfig({ categories: [...config.categories, category] });
    }
  };

  const removeCategory = (category: string) => {
    updateConfig({ categories: config.categories.filter(c => c !== category) });
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !config.customKeywords.includes(newKeyword.trim())) {
      updateConfig({ customKeywords: [...config.customKeywords, newKeyword.trim()] });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    updateConfig({ customKeywords: config.customKeywords.filter(k => k !== keyword) });
  };

  const handleSubmit = () => {
    console.log('AdvancedQuizConfigPanel - handleSubmit called with config:', config);
    
    // Final validation before submission
    if (config.questionTypes.length === 0) {
      setQuestionCountError('Please select at least one question type');
      return;
    }

    if (config.questionCount < 1 || config.questionCount > 50) {
      setQuestionCountError('Question count must be between 1 and 50');
      return;
    }

    if (questionCountError) {
      console.log('AdvancedQuizConfigPanel - Validation error:', questionCountError);
      return;
    }

    console.log('AdvancedQuizConfigPanel - Submitting valid config:', config);
    onConfigComplete(config);
  };

  const getEstimatedTime = () => {
    return Math.round(config.questionCount * 2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Advanced Quiz Configuration</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {/* Content Preview */}
            <div className="space-y-2">
              <Label>Source Content</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">Content Preview</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {content.slice(0, 200)}{content.length > 200 && '...'}
                </p>
                <div className="text-xs text-muted-foreground mt-2">
                  {content.length.toLocaleString()} characters available
                </div>
              </div>
            </div>

            {/* Basic Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={config.contentType} onValueChange={(value: any) => updateConfig({ contentType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Only</SelectItem>
                    <SelectItem value="visual">Visual Focus</SelectItem>
                    <SelectItem value="mixed">Mixed Content</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <Select value={config.difficulty} onValueChange={(value: any) => updateConfig({ difficulty: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Question Depth</Label>
                <Select value={config.questionDepth} onValueChange={(value: any) => updateConfig({ questionDepth: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shallow">Surface Level</SelectItem>
                    <SelectItem value="medium">Moderate Depth</SelectItem>
                    <SelectItem value="deep">Deep Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Question Count - Enhanced with better validation display */}
            <div className="space-y-2">
              <Label>Number of Questions</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={questionCountInput}
                      onChange={handleQuestionCountChange}
                      className={`w-32 ${questionCountError ? 'border-red-500' : ''}`}
                      placeholder="Enter 1-50"
                    />
                    {questionCountError && (
                      <div className="absolute top-full left-0 mt-1 text-sm text-red-600 flex items-center gap-1 whitespace-nowrap">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        {questionCountError}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Estimated time: {getEstimatedTime()} minutes
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Current: {config.questionCount}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Recommended: 5-15 questions for optimal learning experience. Maximum: 50 questions.
                </div>
              </div>
            </div>

            <Separator />

            {/* Question Types */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Question Types</Label>
                <div className="text-xs text-muted-foreground">
                  Note: Visual types require appropriate content
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {QUESTION_TYPES.map(type => (
                  <div
                    key={type.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      config.questionTypes.includes(type.value)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => toggleQuestionType(type.value)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Checkbox
                        checked={config.questionTypes.includes(type.value)}
                        onCheckedChange={() => toggleQuestionType(type.value)}
                      />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                ))}
              </div>
              {config.questionTypes.length === 0 && (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Please select at least one question type
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="space-y-4">
              <Label>Question Categories</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_CATEGORIES.map(category => (
                  <Badge
                    key={category}
                    variant={config.categories.includes(category) ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => config.categories.includes(category) ? removeCategory(category) : addCategory(category)}
                  >
                    {category}
                    {config.categories.includes(category) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              {config.categories.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium mb-2">Selected Categories:</div>
                  <div className="flex flex-wrap gap-1">
                    {config.categories.map(category => (
                      <Badge key={category} variant="default" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Keywords */}
            <div className="space-y-4">
              <Label>Custom Keywords</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add specific terms or concepts"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                />
                <Button onClick={addKeyword} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {config.customKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.customKeywords.map(keyword => (
                    <Badge key={keyword} variant="outline" className="cursor-pointer">
                      {keyword}
                      <X className="h-3 w-3 ml-1" onClick={() => removeKeyword(keyword)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Advanced Options */}
            <div className="space-y-4">
              <Label>Advanced Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="explanations"
                    checked={config.includeExplanations}
                    onCheckedChange={(checked) => updateConfig({ includeExplanations: !!checked })}
                  />
                  <label htmlFor="explanations" className="text-sm">
                    Include detailed explanations for each answer
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="multipart"
                    checked={config.enableMultiPart}
                    onCheckedChange={(checked) => updateConfig({ enableMultiPart: !!checked })}
                  />
                  <label htmlFor="multipart" className="text-sm">
                    Enable multi-part questions
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="visual"
                    checked={config.visualContentSupport}
                    onCheckedChange={(checked) => updateConfig({ visualContentSupport: !!checked })}
                  />
                  <label htmlFor="visual" className="text-sm">
                    Support visual content analysis (when available)
                  </label>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSubmit}
                disabled={config.questionTypes.length === 0 || !!questionCountError}
                size="lg"
                className="w-full md:w-auto"
              >
                Generate Advanced Quiz ({config.questionCount} questions)
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
