
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNotes } from '@/hooks/useNotes';
import { toast } from 'sonner';

interface SaveToNotesParams {
  text: string;
  title?: string;
  category?: string;
  tags?: string[];
}

export function useSaveToNotes() {
  const { createNote } = useNotes();
  const [isOpen, setIsOpen] = useState(false);

  const saveToNotesMutation = useMutation({
    mutationFn: async ({ text, title = 'OCR Extracted Text', category = 'OCR', tags = ['ocr'] }: SaveToNotesParams) => {
      if (!text || !text.trim()) {
        throw new Error('No text to save');
      }

      // Prepare structured note content
      const content = `<div>
        <div style="background-color: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <p><strong>📄 Extracted via OCR</strong></p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Word Count:</strong> ${text.split(/\s+/).filter(word => word.length > 0).length}</p>
        </div>
        <hr style="margin: 16px 0;" />
        <div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
          ${text.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')}
        </div>
      </div>`;

      // Create the note
      createNote({
        title,
        content,
        category,
        tags,
        skipContentCheck: true
      });
    },
    onSuccess: () => {
      toast.success('Text saved to notes successfully');
      setIsOpen(false);
    },
    onError: (error) => {
      console.error('Save to notes error:', error);
      toast.error('Failed to save to notes: ' + error.message);
    }
  });

  return {
    saveToNotes: saveToNotesMutation.mutate,
    isSaving: saveToNotesMutation.isPending,
    isOpen,
    setIsOpen
  };
}
