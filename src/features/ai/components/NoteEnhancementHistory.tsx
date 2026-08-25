
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, Eye, Trash2, Calendar, ChevronDown, ChevronUp, File } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { format, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { HistoryRecordPreviewDialog } from './HistoryRecordPreviewDialog';
import { EnhancedDeleteDialog } from './EnhancedDeleteDialog';
import { useAIHistoryPreferences } from '@/hooks/useAIHistoryPreferences';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useHistoryFilters } from '../contexts/HistoryFilterContext';
import { useFilteredData } from '../hooks/useFilteredData';

interface NoteEnhancement {
  id: string;
  user_id: string;
  note_id: string | null;
  file_id: string | null;
  enhancement_type: string;
  is_applied: boolean;
  ai_service: string;
  model_used?: string;
  enhanced_content: any;
  created_at: string | null;
  session_id?: string;
}

interface GroupedEnhancement {
  note_id: string | null;
  file_id: string | null;
  session_id: string;
  enhancements: NoteEnhancement[];
  latest_created_at: string | null;
  enhancement_types: string[];
  latest_enhancement: NoteEnhancement;
  is_file_enhancement: boolean;
}

export function NoteEnhancementHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { filters } = useHistoryFilters();
  const [previewRecord, setPreviewRecord] = useState<NoteEnhancement | null>(null);
  const [previewSingle, setPreviewSingle] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<NoteEnhancement | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { getPreference } = useAIHistoryPreferences();

  const { data: allEnhancements = [], isLoading } = useQuery({
    queryKey: ['enhancement-history', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from('note_enhancements')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false, nullsFirst: false });

        if (error) {
          console.warn('Note enhancements table not available:', error.message);
          return [];
        }
        // Apply dashboard-only preference filter: if enhancements history is disabled,
        // only include records created before the time it was disabled
        const pref = getPreference('note_enhancements');
        let result = (data as NoteEnhancement[] | null) || [];
        if (!pref.is_enabled && 'updated_at' in pref && pref.updated_at) {
          const disabledAt = new Date(pref.updated_at);
          result = result.filter((e) => !e?.created_at || new Date(e.created_at) <= disabledAt);
        }
        return result;
      } catch (error) {
        console.warn('Error fetching note enhancements:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // Apply filters to enhancement data
  const filteredEnhancements = useFilteredData(
    allEnhancements,
    filters,
    (enhancement) => enhancement.file_id ? 'file_enhancement' : 'enhancement',
    (enhancement) => enhancement.is_applied ? 'applied' : 'pending',
    (enhancement) => enhancement.created_at,
    (enhancement) => `${enhancement.enhancement_type} ${enhancement.ai_service}`
  );

  const groupedEnhancements: GroupedEnhancement[] = filteredEnhancements.reduce((acc: GroupedEnhancement[], enhancement) => {
    // Determine if this is a file enhancement or note enhancement
    const isFileEnhancement = enhancement.file_id && !enhancement.note_id;
    const baseKey = isFileEnhancement ? enhancement.file_id : enhancement.note_id;
    
    // Skip enhancements that have neither note_id nor file_id
    if (!baseKey) {
      console.warn('Enhancement has neither note_id nor file_id:', enhancement.id);
      return acc;
    }
    
    // Create composite group key with session
    const sessionKey = enhancement.session_id || 'legacy';
    const groupKey = `${isFileEnhancement ? 'file' : 'note'}:${baseKey}::${sessionKey}`;
    
    const existingGroup = acc.find(group => {
      const existingGroupKey = `${group.is_file_enhancement ? 'file' : 'note'}:${group.is_file_enhancement ? group.file_id : group.note_id}::${group.session_id}`;
      return existingGroupKey === groupKey;
    });
    
    if (existingGroup) {
      existingGroup.enhancements.push(enhancement);
      if (!existingGroup.enhancement_types.includes(enhancement.enhancement_type)) {
        existingGroup.enhancement_types.push(enhancement.enhancement_type);
      }
      
      if (enhancement.created_at && (!existingGroup.latest_created_at || enhancement.created_at > existingGroup.latest_created_at)) {
        existingGroup.latest_created_at = enhancement.created_at;
        existingGroup.latest_enhancement = enhancement;
      }
    } else {
      acc.push({
        note_id: isFileEnhancement ? null : baseKey,
        file_id: isFileEnhancement ? baseKey : null,
        session_id: sessionKey,
        enhancements: [enhancement],
        latest_created_at: enhancement.created_at,
        enhancement_types: [enhancement.enhancement_type],
        latest_enhancement: enhancement,
        is_file_enhancement: isFileEnhancement
      });
    }
    
    return acc;
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('note_enhancements')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhancement-history'] });
      toast.success('Enhancement deleted successfully');
      setDeleteRecord(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete enhancement: ' + error.message);
    }
  });

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleMainPreview = (enhancement: NoteEnhancement) => {
    setPreviewSingle(false);
    setPreviewRecord(enhancement);
  };

  const handleIndividualPreview = (enhancement: NoteEnhancement) => {
    setPreviewSingle(true);
    setPreviewRecord(enhancement);
  };

  const handlePreviewClose = () => {
    setPreviewRecord(null);
    setPreviewSingle(false);
  };

  const getGroupId = (group: GroupedEnhancement): string => {
    const baseId = group.is_file_enhancement ? `file-${group.file_id}` : `note-${group.note_id}`;
    return `${baseId}-sess-${group.session_id}`;
  };

  const getDisplayDate = (enhancement: NoteEnhancement): string => {
    if (!enhancement.created_at) {
      return 'Unknown date';
    }

    try {
      const parsedDate = new Date(enhancement.created_at);
      if (!isValid(parsedDate)) {
        console.warn('Invalid date encountered in enhancement history:', enhancement.created_at);
        return 'Invalid date';
      }
      return format(parsedDate, 'MMM d, yyyy HH:mm');
    } catch (error) {
      console.warn('Date formatting error for enhancement:', enhancement.created_at, error);
      return 'Invalid date';
    }
  };

  const getGroupDisplayDate = (group: GroupedEnhancement): string => {
    if (!group.latest_created_at) return 'Unknown date';
    
    try {
      const parsedDate = new Date(group.latest_created_at);
      if (!isValid(parsedDate)) return 'Invalid date';
      return format(parsedDate, 'MMM d, yyyy HH:mm');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getEnhancementStatusBadges = (group: GroupedEnhancement) => {
    const appliedCount = group.enhancements.filter(e => e.is_applied).length;
    const totalCount = group.enhancements.length;
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {appliedCount}/{totalCount} applied
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {group.latest_enhancement.ai_service}
        </Badge>
      </div>
    );
  };

  const getGroupTitle = (group: GroupedEnhancement): string => {
    const sessionLabel = group.session_id === 'legacy' ? '' : ` (Session)`;
    if (group.is_file_enhancement) {
      return `File Enhancements${sessionLabel} (${group.enhancements.length})`;
    } else {
      return `Note Enhancements${sessionLabel} (${group.enhancements.length})`;
    }
  };

  const getGroupSubtitle = (group: GroupedEnhancement): string => {
    if (group.is_file_enhancement) {
      return `File ID: ${group.file_id?.slice(0, 8)}...`;
    } else {
      return `Note ID: ${group.note_id?.slice(0, 8)}...`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Enhancement History
          </CardTitle>
          <CardDescription>AI-powered note and file improvements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!groupedEnhancements.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Enhancement History
            {filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm ? (
              <Badge variant="secondary" className="ml-2">
                No matches
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>AI-powered note and file improvements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm ? 
                'No matching enhancements found' : 
                'No Enhancements Yet'
              }
            </h3>
            <p className="text-muted-foreground">
              {filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm ? 
                'Try adjusting your filters to see more results' :
                'Enhance your first note or file to see your enhancement history here'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Enhancement History
            {filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm ? (
              <Badge variant="secondary" className="ml-2">
                {groupedEnhancements.length} groups filtered
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>AI-powered note and file improvements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groupedEnhancements.map((group) => {
              const groupId = getGroupId(group);
              return (
                <Collapsible
                  key={groupId}
                  open={expandedGroups.has(groupId)}
                  onOpenChange={() => toggleGroupExpansion(groupId)}
                >
                  <div className="group relative p-4 rounded-lg border hover:shadow-md transition-all duration-200">
                    {/* Main Group Header */}
                    <div className="flex items-start justify-between pr-20">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                          {group.is_file_enhancement ? (
                            <File className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-green-500" />
                          )}
                          <h3 className="font-medium">
                            {getGroupTitle(group)}
                          </h3>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {expandedGroups.has(groupId) ? 
                                <ChevronUp className="h-3 w-3" /> : 
                                <ChevronDown className="h-3 w-3" />
                              }
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div>{getGroupSubtitle(group)}</div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {getGroupDisplayDate(group)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {[...new Set(group.enhancement_types)].map(type => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type.replace('_', ' ')}
                            </Badge>
                          ))}
                          {getEnhancementStatusBadges(group)}
                        </div>
                      </div>

                      {/* Group Actions */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMainPreview(group.latest_enhancement)}
                          className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteRecord(group.latest_enhancement)}
                          className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Individual Enhancements */}
                    <CollapsibleContent className="mt-4">
                      <div className="space-y-2 pl-6 border-l-2 border-muted">
                        <h4 className="text-sm font-medium text-muted-foreground">Individual Enhancements:</h4>
                        {group.enhancements.map((enhancement) => (
                          <div
                            key={enhancement.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs capitalize">
                                {enhancement.enhancement_type.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm">
                                {getDisplayDate(enhancement)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {enhancement.model_used || 'Unknown model'}
                              </span>
                              {enhancement.is_applied && (
                                <Badge variant="default" className="text-xs">Applied</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleIndividualPreview(enhancement)}
                                className="h-6 w-6 p-0"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteRecord(enhancement)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <HistoryRecordPreviewDialog
        open={!!previewRecord}
        onOpenChange={handlePreviewClose}
        record={previewRecord}
        recordType="enhancement"
        singleEnhancementOnly={previewSingle}
        onDelete={(id) => {
          setPreviewRecord(null);
          const recordToDelete = allEnhancements.find(e => e.id === id);
          if (recordToDelete) setDeleteRecord(recordToDelete);
        }}
        onExport={(id) => {
          const enhancementToExport = allEnhancements.find(e => e.id === id);
          if (enhancementToExport) {
            const dataStr = JSON.stringify([enhancementToExport], null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const exportFileDefaultName = `enhancement-${enhancementToExport.enhancement_type}-${format(new Date(), 'yyyy-MM-dd')}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            toast.success('Enhancement exported successfully');
          }
        }}
      />

      {/* Enhanced Delete Dialog */}
      <EnhancedDeleteDialog
        open={!!deleteRecord}
        onOpenChange={() => setDeleteRecord(null)}
        record={deleteRecord}
        recordType="enhancement"
        onConfirm={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
