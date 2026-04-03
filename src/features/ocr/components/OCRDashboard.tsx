
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { useOCR } from '../hooks/useOCR';
import { useOCRDashboard } from '../hooks/useOCRDashboard';
import { OCRSettings } from './OCRSettings';
import { OCRTextEditor } from './OCRTextEditor';
import { OCRStatsCards } from './OCRStatsCards';
import { OCRJobList } from './OCRJobList';

export function OCRDashboard() {
  const { ocrJobs, activeJobs, completedJobs } = useOCR();
  const { 
    selectedJobId, 
    setSelectedJobId, 
    selectedJobFile, 
    cancelOCR, 
    isCancelling 
  } = useOCRDashboard();
  const [showSettings, setShowSettings] = useState(false);

  const handleViewResults = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleCancel = (jobId: string) => {
    cancelOCR(jobId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OCR Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your optical character recognition tasks
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <OCRStatsCards ocrJobs={ocrJobs} />

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Jobs ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">History ({completedJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <OCRJobList
            jobs={activeJobs}
            onCancel={handleCancel}
            isCancelling={isCancelling}
            emptyMessage="No active OCR jobs"
          />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <OCRJobList
            jobs={completedJobs}
            onViewResults={handleViewResults}
            emptyMessage="No completed OCR jobs"
          />
        </TabsContent>
      </Tabs>

      {showSettings && (
        <OCRSettings onClose={() => setShowSettings(false)} />
      )}

      {selectedJobId && selectedJobFile && (
        <OCRTextEditor
          text={selectedJobFile.ocr_text || ''}
          confidence={selectedJobFile.ocr_confidence || 0}
          fileName={selectedJobFile.name}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  );
}
