import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Brain, BookOpen, Target, TrendingUp, Eye } from 'lucide-react';
import { SimpleQuizGenerator } from '@/components/ai/SimpleQuizGenerator';
import { SimpleNoteEnhancer } from '@/components/ai/SimpleNoteEnhancer';
import { SimpleFileEnhancer } from '@/components/ai/SimpleFileEnhancer';
import { useFiles } from '@/hooks/useFiles';
import { useNotes } from '@/hooks/useNotes';
import { useAIHistoryData } from '@/features/ai/hooks/useAIHistoryData';

export default function Learn() {
  const { files } = useFiles();
  const { notes } = useNotes();
  const { overview } = useAIHistoryData();
  const [selectedContent, setSelectedContent] = useState<{
    type: 'file' | 'note';
    id: string;
    name: string;
    content: string;
  } | null>(null);
  const [previewContent, setPreviewContent] = useState<{
    type: 'file' | 'note';
    name: string;
    content: string;
  } | null>(null);

  const recentFiles = files; // Show all files
  const recentNotes = notes; // Show all notes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Learning Hub</h1>
            <p className="text-muted-foreground">Generate quizzes, enhance content, and improve your learning</p>
          </div>
        </div>
        
        {overview && (
          <Badge variant="secondary" className="px-3 py-1">
            {overview.totalQuizzes + overview.totalEnhancements} AI interactions
          </Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Content Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Select Content
            </CardTitle>
            <CardDescription>Choose files or notes to work with</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="files" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="files" className="space-y-2 mt-4">
                {recentFiles.map(file => (
                  <div
                    key={file.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedContent?.id === file.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedContent({
                          type: 'file',
                          id: file.id,
                          name: file.name,
                          content: file.ocr_text || ''
                        })}
                      >
                        <div className="font-medium text-sm truncate">{file.name}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {file.ocr_status === 'completed' ? 'OCR Ready' : 'Processing...'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewContent({
                            type: 'file',
                            name: file.name,
                            content: file.ocr_text || `File: ${file.name}\nType: ${file.file_type}\nSize: ${(file.file_size / 1024).toFixed(1)} KB`
                          });
                        }}
                        className="h-8 w-8 p-0 hover-scale"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-2 mt-4">
                {recentNotes.map(note => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedContent?.id === note.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedContent({
                          type: 'note',
                          id: note.id,
                          name: note.title,
                          content: note.plainText || note.content || ''
                        })}
                      >
                        <div className="font-medium text-sm truncate">{note.title}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {note.wordCount} words • {note.readingTime} min read
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewContent({
                            type: 'note',
                            name: note.title,
                            content: note.plainText || note.content || ''
                          });
                        }}
                        className="h-8 w-8 p-0 hover-scale"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* AI Tools */}
        <div className="lg:col-span-2 space-y-6">
          {selectedContent ? (
            <Tabs defaultValue="quiz" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quiz">Quiz Generator</TabsTrigger>
                <TabsTrigger value="enhance">Content Enhancer</TabsTrigger>
              </TabsList>
              
              <TabsContent value="quiz">
                <SimpleQuizGenerator
                  content={selectedContent.content}
                  source={{
                    type: selectedContent.type,
                    id: selectedContent.id,
                    name: selectedContent.name
                  }}
                />
              </TabsContent>
              
              <TabsContent value="enhance">
                {selectedContent.type === 'note' ? (
                  <SimpleNoteEnhancer
                    note={notes.find(n => n.id === selectedContent.id)!}
                    onClose={() => {}}
                  />
                ) : (
                  <SimpleFileEnhancer
                    file={files.find(f => f.id === selectedContent.id)!}
                    onClose={() => {}}
                  />
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Ready to Learn?</h3>
                <p className="text-muted-foreground mb-4">
                  Select a file or note from the sidebar to start generating quizzes and enhancements.
                </p>
                <div className="flex justify-center gap-4">
                  <Badge variant="secondary">AI Quiz Generation</Badge>
                  <Badge variant="secondary">Content Enhancement</Badge>
                  <Badge variant="secondary">Smart Analysis</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview: {previewContent?.name}
            </DialogTitle>
            <DialogDescription>
              Preview content before proceeding with AI enhancements
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="text-sm text-muted-foreground mb-2">
                Type: {previewContent?.type === 'file' ? 'File' : 'Note'}
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {previewContent?.content ? (
                  previewContent.content.length > 1000 
                    ? `${previewContent.content.slice(0, 1000)}...` 
                    : previewContent.content
                ) : (
                  <span className="text-muted-foreground italic">No content available</span>
                )}
              </div>
              {previewContent?.content && previewContent.content.length > 1000 && (
                <div className="text-xs text-muted-foreground mt-2">
                  Showing first 1000 characters of {previewContent.content.length} total
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreviewContent(null)}>
                Close
              </Button>
              <Button onClick={() => {
                if (previewContent) {
                  setSelectedContent({
                    type: previewContent.type,
                    id: previewContent.type === 'file' 
                      ? recentFiles.find(f => f.name === previewContent.name)?.id || ''
                      : recentNotes.find(n => n.title === previewContent.name)?.id || '',
                    name: previewContent.name,
                    content: previewContent.content
                  });
                }
                setPreviewContent(null);
              }}>
                Select for Enhancement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
