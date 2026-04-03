
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useOCRBatch } from '../hooks/useOCRBatch';
import { useOCR } from '../hooks/useOCR';
import { OCRProgressIndicator } from './OCRProgressIndicator';
import { FileData } from '@/hooks/useFiles';

interface BatchOCRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: FileData[];
}

export function BatchOCRDialog({ open, onOpenChange, files }: BatchOCRDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const { batchProcessOCR } = useOCRBatch();
  const { supportedLanguages, getLanguageName } = useOCR();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleBatchProcess = async () => {
    setIsProcessing(true);
    setResults([]);
    
    try {
      // Convert FileData to batch format (this would need actual file objects)
      const batchFiles = files.map(file => ({
        fileId: file.id,
        imageFile: new File([], file.name, { type: file.file_type }) // Placeholder - would need actual file
      }));

      const result = await batchProcessOCR(batchFiles, {
        language: selectedLanguage
      });
      
      setResults(result.results);
    } catch (error) {
      console.error('Batch processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch OCR Processing</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {getLanguageName(lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Files to Process ({files.length})</Label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{file.file_type}</span>
                </div>
              ))}
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Label>Processing Progress</Label>
              {files.map((file, index) => (
                <OCRProgressIndicator
                  key={file.id}
                  status={results[index] ? 'completed' : 'processing'}
                  progress={Math.round(((results.length) / files.length) * 100)}
                  fileName={file.name}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBatchProcess}
              disabled={isProcessing || files.length === 0}
            >
              {isProcessing ? 'Processing...' : `Process ${files.length} Files`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
