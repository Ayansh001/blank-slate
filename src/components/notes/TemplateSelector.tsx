
import { useState } from 'react';
import { NoteTemplate } from '@/types/note';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TemplatePreview } from './TemplatePreview';

interface TemplateSelectorProps {
  onCreateBlank: () => void;
}

const templates: NoteTemplate[] = [
  {
    id: '1',
    name: 'Meeting Notes',
    description: 'Template for meeting notes and action items',
    content: '<h2>Meeting Notes</h2><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><p><strong>Agenda:</strong> </p><ul><li></li></ul><p><strong>Action Items:</strong> </p><ul><li></li></ul>',
    category: 'Work'
  },
  {
    id: '2',
    name: 'Project Plan',
    description: 'Template for project planning and tracking',
    content: '<h2>Project Plan</h2><p><strong>Project:</strong> </p><p><strong>Goal:</strong> </p><p><strong>Timeline:</strong> </p><p><strong>Tasks:</strong> </p><ul><li></li></ul><p><strong>Resources:</strong> </p><ul><li></li></ul>',
    category: 'Work'
  },
  {
    id: '3',
    name: 'Study Notes',
    description: 'Template for academic study notes',
    content: '<h2>Study Notes</h2><p><strong>Subject:</strong> </p><p><strong>Chapter/Topic:</strong> </p><p><strong>Key Concepts:</strong> </p><ul><li></li></ul><p><strong>Important Formulas:</strong> </p><ul><li></li></ul><p><strong>Questions:</strong> </p><ul><li></li></ul>',
    category: 'Academic'
  },
  {
    id: '4',
    name: 'Daily Journal',
    description: 'Template for daily reflection and journaling',
    content: '<h2>Daily Journal</h2><p><strong>Date:</strong> </p><p><strong>Mood:</strong> </p><p><strong>Today I accomplished:</strong> </p><ul><li></li></ul><p><strong>Challenges:</strong> </p><ul><li></li></ul><p><strong>Tomorrow I will:</strong> </p><ul><li></li></ul>',
    category: 'Personal'
  }
];

export function TemplateSelector({ onCreateBlank }: TemplateSelectorProps) {
  const navigate = useNavigate();
  const [previewTemplate, setPreviewTemplate] = useState<NoteTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMainDialogOpen, setIsMainDialogOpen] = useState(false);

  const handlePreviewTemplate = (template: NoteTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleUseTemplate = (template: NoteTemplate) => {
    setIsMainDialogOpen(false);
    navigate('/notes/edit/new', { 
      state: { 
        template: {
          title: template.name,
          content: template.content,
          category: template.category
        }
      }
    });
  };

  const handleCreateBlank = () => {
    setIsMainDialogOpen(false);
    onCreateBlank();
  };

  return (
    <>
      <Dialog open={isMainDialogOpen} onOpenChange={setIsMainDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {/* Blank Note */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-dashed border-blue-300 hover:border-blue-500"
              onClick={handleCreateBlank}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-500" />
                  <CardTitle className="text-lg">Blank Note</CardTitle>
                </div>
                <CardDescription>
                  Start with a clean slate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Create a new note from scratch with our rich text editor.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Start Writing
                </Button>
              </CardContent>
            </Card>

            {/* Templates */}
            {templates.map((template) => (
              <Card 
                key={template.id}
                className="hover:shadow-lg transition-all duration-200 hover:border-blue-300"
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-green-500" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <CardDescription>
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {template.category}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handlePreviewTemplate(template)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleUseTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <TemplatePreview
        template={previewTemplate}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onUseTemplate={handleUseTemplate}
      />
    </>
  );
}
