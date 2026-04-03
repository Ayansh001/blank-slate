import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Download, 
  FileJson, 
  FileSpreadsheet,
  Calendar,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { format } from 'date-fns';

interface ExportOptions {
  dataTypes: string[];
  format: 'json' | 'csv';
  dateRange?: {
    from: Date;
    to: Date;
  };
  includeMetadata: boolean;
}

export function AIDataExporter() {
  const { user } = useAuth();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    dataTypes: [],
    format: 'json',
    includeMetadata: true
  });
  const [isExporting, setIsExporting] = useState(false);

  const dataTypeOptions = [
    { id: 'quizzes', label: 'Quiz Sessions', table: 'quiz_sessions' },
    { id: 'enhancements', label: 'Note Enhancements', table: 'note_enhancements' },
    { id: 'chats', label: 'Chat Sessions', table: 'ai_chat_sessions' },
    { id: 'messages', label: 'Chat Messages', table: 'ai_chat_messages' },
    { id: 'usage', label: 'Usage Tracking', table: 'ai_usage_tracking' }
  ];

  const handleDataTypeChange = (dataType: string, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      dataTypes: checked 
        ? [...prev.dataTypes, dataType]
        : prev.dataTypes.filter(type => type !== dataType)
    }));
  };

  const exportData = async () => {
    if (!user || exportOptions.dataTypes.length === 0) {
      toast.error('Please select at least one data type to export');
      return;
    }

    setIsExporting(true);
    try {
      const exportData: any = {};

      // Fetch data for each selected type
      for (const dataType of exportOptions.dataTypes) {
        const option = dataTypeOptions.find(opt => opt.id === dataType);
        if (!option) continue;

        let query = supabase
          .from(option.table as any)
          .select('*')
          .eq('user_id', user.id);

        // Apply date range filter if specified
        if (exportOptions.dateRange) {
          const dateField = option.table === 'ai_chat_messages' ? 'created_at' : 'created_at';
          query = query
            .gte(dateField, exportOptions.dateRange.from.toISOString())
            .lte(dateField, exportOptions.dateRange.to.toISOString());
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error(`Error fetching ${dataType}:`, error);
          continue;
        }

        exportData[dataType] = data || [];
      }

      // Add metadata if requested
      if (exportOptions.includeMetadata) {
        exportData.metadata = {
          exportDate: new Date().toISOString(),
          userId: user.id,
          dataTypes: exportOptions.dataTypes,
          format: exportOptions.format,
          totalRecords: Object.values(exportData).reduce((sum: number, arr: any) => 
            sum + (Array.isArray(arr) ? arr.length : 0), 0
          )
        };
      }

      // Generate and download file
      if (exportOptions.format === 'json') {
        downloadJSON(exportData);
      } else {
        downloadCSV(exportData);
      }

      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadJSON = (data: any) => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-data-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data: any) => {
    // Convert JSON data to CSV format
    let csvContent = '';
    
    for (const [dataType, records] of Object.entries(data)) {
      if (dataType === 'metadata' || !Array.isArray(records)) continue;
      
      const recordArray = records as any[];
      if (recordArray.length === 0) continue;

      // Add section header
      csvContent += `\n\n=== ${dataType.toUpperCase()} ===\n`;
      
      // Add column headers
      const headers = Object.keys(recordArray[0]);
      csvContent += headers.join(',') + '\n';
      
      // Add data rows
      recordArray.forEach(record => {
        const row = headers.map(header => {
          const value = record[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value).replace(/,/g, ';'); // Replace commas to avoid CSV issues
        });
        csvContent += row.join(',') + '\n';
      });
    }

    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-data-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export AI Data
        </CardTitle>
        <CardDescription>
          Export your AI interaction data for backup or analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Type Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">Select Data Types</label>
          <div className="grid grid-cols-2 gap-3">
            {dataTypeOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={exportOptions.dataTypes.includes(option.id)}
                  onCheckedChange={(checked) => handleDataTypeChange(option.id, !!checked)}
                />
                <label
                  htmlFor={option.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Export Format */}
        <div>
          <label className="text-sm font-medium mb-2 block">Export Format</label>
          <Select 
            value={exportOptions.format} 
            onValueChange={(value: 'json' | 'csv') => 
              setExportOptions(prev => ({ ...prev, format: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON
                </div>
              </SelectItem>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter - Simplified for now */}
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range (Coming Soon)
          </label>
          <p className="text-sm text-muted-foreground">Date filtering will be available in a future update</p>
        </div>

        {/* Include Metadata */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="metadata"
            checked={exportOptions.includeMetadata}
            onCheckedChange={(checked) => 
              setExportOptions(prev => ({ ...prev, includeMetadata: !!checked }))
            }
          />
          <label
            htmlFor="metadata"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Include export metadata
          </label>
        </div>

        {/* Export Button */}
        <Button 
          onClick={exportData}
          disabled={isExporting || exportOptions.dataTypes.length === 0}
          className="w-full"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}