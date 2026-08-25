import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Brain, Tags, Files, Zap } from 'lucide-react';
import { useSmartOrganization } from '../hooks/useSmartOrganization';
import { FileData } from '@/hooks/useFiles';

interface SmartOrganizerPanelProps {
  files: FileData[];
  onClose?: () => void;
}

export function SmartOrganizerPanel({ files, onClose }: SmartOrganizerPanelProps) {
  const { 
    organizationResults, 
    analyzeFiles, 
    applySuggestions, 
    autoOrganize,
    isAnalyzing, 
    isApplying,
    isAutoOrganizing 
  } = useSmartOrganization();
  
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const handleAnalyze = () => {
    analyzeFiles(files);
  };

  const handleAutoOrganize = () => {
    autoOrganize(files);
  };

  const handleApplySelected = () => {
    const suggestions = organizationResults
      .filter(result => selectedSuggestions.has(result.fileId))
      .map(result => ({
        fileId: result.fileId,
        category: result.suggestedCategory.category,
        tags: result.suggestedTags
          .filter(tag => tag.confidence > 0.6)
          .map(tag => tag.tag)
      }));

    if (suggestions.length > 0) {
      applySuggestions(suggestions);
    }
  };

  const toggleSelection = (fileId: string) => {
    const newSelection = new Set(selectedSuggestions);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedSuggestions(newSelection);
  };

  const selectAll = () => {
    setSelectedSuggestions(new Set(organizationResults.map(r => r.fileId)));
  };

  const selectNone = () => {
    setSelectedSuggestions(new Set());
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Smart File Organization
        </CardTitle>
        <CardDescription>
          AI-powered file categorization and organization for {files.length} files
        </CardDescription>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Files'}
          </Button>
          
          <Button 
            onClick={handleAutoOrganize} 
            disabled={isAutoOrganizing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {isAutoOrganizing ? 'Auto-organizing...' : 'Auto-organize'}
          </Button>
        </div>
      </CardHeader>

      {organizationResults.length > 0 && (
        <CardContent>
          <Tabs defaultValue="suggestions" className="w-full">
            <TabsList>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
              <TabsTrigger value="related">Related Files</TabsTrigger>
            </TabsList>

            <TabsContent value="suggestions" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={selectNone}>
                    Select None
                  </Button>
                </div>
                
                <Button 
                  onClick={handleApplySelected}
                  disabled={selectedSuggestions.size === 0 || isApplying}
                  className="flex items-center gap-2"
                >
                  <Tags className="h-4 w-4" />
                  {isApplying ? 'Applying...' : `Apply Selected (${selectedSuggestions.size})`}
                </Button>
              </div>

              <div className="space-y-3">
                {organizationResults.map((result) => {
                  const file = files.find(f => f.id === result.fileId);
                  if (!file) return null;

                  return (
                    <Card key={result.fileId} className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedSuggestions.has(result.fileId)}
                          onCheckedChange={() => toggleSelection(result.fileId)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1">
                          <div className="font-medium truncate">{file.name}</div>
                          
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Category:</span>
                              <Badge variant="secondary">
                                {result.suggestedCategory.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ({Math.round(result.suggestedCategory.confidence * 100)}% confidence)
                              </span>
                            </div>
                            
                            {result.suggestedTags.length > 0 && (
                              <div className="flex items-start gap-2">
                                <span className="text-sm text-muted-foreground">Tags:</span>
                                <div className="flex flex-wrap gap-1">
                                  {result.suggestedTags
                                    .filter(tag => tag.confidence > 0.6)
                                    .map((tag) => (
                                      <Badge key={tag.tag} variant="outline" className="text-xs">
                                        {tag.tag}
                                      </Badge>
                                    ))
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="duplicates" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Files that appear to be duplicates based on content or name similarity
              </div>
              
              {organizationResults
                .filter(result => result.duplicates.length > 0)
                .map((result) => {
                  const file = files.find(f => f.id === result.fileId);
                  if (!file) return null;

                  return (
                    <Card key={result.fileId} className="p-4">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {result.duplicates.length} potential duplicate(s) found
                      </div>
                    </Card>
                  );
                })}
              
              {organizationResults.every(result => result.duplicates.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <Files className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  No duplicates found
                </div>
              )}
            </TabsContent>

            <TabsContent value="related" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Files with similar content or topics that might be related
              </div>
              
              {organizationResults
                .filter(result => result.relatedFiles.length > 0)
                .map((result) => {
                  const file = files.find(f => f.id === result.fileId);
                  if (!file) return null;

                  return (
                    <Card key={result.fileId} className="p-4">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {result.relatedFiles.length} related file(s) found
                      </div>
                    </Card>
                  );
                })}
              
              {organizationResults.every(result => result.relatedFiles.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <Files className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  No related files found
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}