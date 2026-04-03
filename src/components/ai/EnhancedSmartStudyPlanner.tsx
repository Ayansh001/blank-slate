import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  BookOpen,
  CheckCircle,
  Loader2,
  Target,
  Search,
  Plus,
  X,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { useStudyPlans, SelectedNote, DailyTask, Task } from '@/hooks/useStudyPlans';
import { toast } from 'sonner';

export function EnhancedSmartStudyPlanner() {
  const { user } = useAuth();
  const { notes } = useNotes();
  const { studyPlans, createStudyPlan, updateProgress, isCreating } = useStudyPlans();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<'select' | 'describe' | 'configure' | 'generate' | 'view'>('select');
  
  // Form state
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [noteDescriptions, setNoteDescriptions] = useState<Record<string, string>>({});
  const [planTitle, setPlanTitle] = useState('');
  const [totalDays, setTotalDays] = useState<number>(7);
  const [hoursPerDay, setHoursPerDay] = useState<number>(2);
  
  // Generated plan state
  const [generatedPlan, setGeneratedPlan] = useState<DailyTask[] | null>(null);
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.content && note.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleNoteSelection = (noteId: string, checked: boolean) => {
    if (checked) {
      setSelectedNoteIds(prev => [...prev, noteId]);
    } else {
      setSelectedNoteIds(prev => prev.filter(id => id !== noteId));
      setNoteDescriptions(prev => {
        const { [noteId]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleDescriptionChange = (noteId: string, description: string) => {
    setNoteDescriptions(prev => ({ ...prev, [noteId]: description }));
  };

  const generateStudyPlan = async () => {
    if (!user || selectedNoteIds.length === 0) {
      toast.error('Please select at least one note');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedNotes: SelectedNote[] = selectedNoteIds.map(id => {
        const note = notes.find(n => n.id === id);
        return {
          id,
          title: note?.title || '',
          content: note?.content || '',
          description: noteDescriptions[id] || ''
        };
      });

      // Create prompt for AI
      const notesContext = selectedNotes.map(note => 
        `**${note.title}**\nContent: ${note.content.slice(0, 500)}...\nStudy Focus: ${note.description || 'General study'}`
      ).join('\n\n');

      const prompt = `📌 Flow: Notes → Contextual Chat → Study Planner

You are a smart AI study planner. Create a structured day-wise study plan based on the following:

**Study Parameters:**
- Total days: ${totalDays}
- Hours per day: ${hoursPerDay}
- Selected notes with custom descriptions:

${notesContext}

**Instructions:**
Create a day-wise schedule where each day includes:
- Topic title (from notes)
- Study description (based on user's custom descriptions)
- Detailed explanation for each task (what to study, how to approach it, key points to focus on)
- Estimated time allocation
- Clear daily objectives
- Specific learning outcomes expected
- Study methods and techniques to use

**Return JSON format:**
{
  "dailySchedule": [
    {
      "day": 1,
      "date": "Day 1",
      "tasks": [
        {
          "id": "task_1",
          "title": "Topic from Note",
          "description": "Brief study description",
          "detailedExplanation": "Comprehensive explanation of what to study, key concepts to focus on, specific learning objectives, study methods to use, and expected outcomes",
          "estimatedTime": "2 hours",
          "completed": false,
          "noteReference": "note_id"
        }
      ],
      "completed": false
    }
  ]
}

Ensure all ${totalDays} days are covered and time allocations sum to approximately ${hoursPerDay} hours per day.`;

      const { data, error } = await supabase.functions.invoke('universal-ai-handler', {
        body: {
          prompt,
          mode: 'study-plan',
          options: {
            response_format: 'json',
            total_days: totalDays,
            hours_per_day: hoursPerDay
          }
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Failed to generate study plan: ${error.message || 'Unknown error'}`);
      }

      if (data?.success && data?.result) {
        let result = data.result;
        
        // Handle different response formats with better error handling
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result);
          } catch (parseError) {
            console.error('Failed to parse result string:', parseError);
            // Create fallback plan if parsing fails
            result = createFallbackPlan(selectedNotes, totalDays, hoursPerDay);
          }
        }
        
        // Extract daily schedule with multiple fallback patterns
        let dailySchedule = result?.dailySchedule || 
                          result?.daily_schedule || 
                          result?.schedule ||
                          result;
        
        // Validate and fix the schedule structure
        if (!Array.isArray(dailySchedule)) {
          console.warn('Invalid schedule format, creating fallback:', dailySchedule);
          dailySchedule = createFallbackPlan(selectedNotes, totalDays, hoursPerDay).dailySchedule;
        }
        
        // Ensure each day has the required structure
        dailySchedule = dailySchedule.map((day: any, index: number) => ({
          day: day.day || index + 1,
          date: day.date || `Day ${index + 1}`,
          tasks: Array.isArray(day.tasks) ? day.tasks.map((task: any, taskIndex: number) => ({
            id: task.id || `task_${index + 1}_${taskIndex + 1}`,
            title: task.title || selectedNotes[taskIndex % selectedNotes.length]?.title || 'Study Session',
            description: task.description || noteDescriptions[selectedNotes[taskIndex % selectedNotes.length]?.id] || 'Complete assigned study tasks',
            detailedExplanation: task.detailedExplanation || `Study ${selectedNotes[taskIndex % selectedNotes.length]?.title || 'this topic'} thoroughly. Focus on understanding key concepts, practice examples, and create summaries. ${noteDescriptions[selectedNotes[taskIndex % selectedNotes.length]?.id] || 'Review all materials and take notes on important points.'}`,
            estimatedTime: task.estimatedTime || `${Math.round(hoursPerDay / Math.max(day.tasks?.length || 1, 1))} hours`,
            completed: false,
            noteReference: task.noteReference || selectedNotes[taskIndex % selectedNotes.length]?.id || null
          })) : [{
            id: `task_${index + 1}_1`,
            title: selectedNotes[index % selectedNotes.length]?.title || 'Study Session',
            description: noteDescriptions[selectedNotes[index % selectedNotes.length]?.id] || 'Study the selected materials',
            detailedExplanation: `Study ${selectedNotes[index % selectedNotes.length]?.title || 'this topic'} thoroughly. Focus on understanding key concepts, practice examples, and create summaries. ${noteDescriptions[selectedNotes[index % selectedNotes.length]?.id] || 'Review all materials and take notes on important points.'}`,
            estimatedTime: `${hoursPerDay} hours`,
            completed: false,
            noteReference: selectedNotes[index % selectedNotes.length]?.id || null
          }],
          completed: false
        }));
        
        setGeneratedPlan(dailySchedule);
        setCurrentStep('view');
        
        // Save to database with actual form values
        const finalTitle = planTitle.trim() || `Study Plan - ${new Date().toLocaleDateString()}`;
        
        // Create the study plan and capture the result
        try {
          createStudyPlan({
            title: finalTitle,
            totalDays: totalDays,
            hoursPerDay: hoursPerDay,
            selectedNotes,
            dailySchedule
          });
          
          // We'll set the plan ID after the plan is successfully created
          // For now, we'll use a timeout to get the latest plan
          setTimeout(() => {
            if (studyPlans.length > 0) {
              setGeneratedPlanId(studyPlans[0].id);
            }
          }, 1000);
        } catch (error) {
          console.error('Failed to create study plan:', error);
        }
        
        toast.success('Study plan generated successfully!');
      } else {
        console.error('Invalid AI response:', data);
        throw new Error(data?.error || 'No valid response received from AI service');
      }
    } catch (error: any) {
      console.error('Study plan generation failed:', error);
      toast.error('Failed to generate study plan: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const createFallbackPlan = (notes: SelectedNote[], days: number, hours: number) => {
    const dailySchedule = [];
    for (let day = 1; day <= days; day++) {
      const note = notes[(day - 1) % notes.length];
      dailySchedule.push({
        day,
        date: `Day ${day}`,
        tasks: [{
          id: `fallback_task_${day}`,
          title: note?.title || `Study Session ${day}`,
          description: noteDescriptions[note?.id] || `Study the materials for ${note?.title || 'this topic'}`,
          detailedExplanation: `Study ${note?.title || 'this topic'} thoroughly. Focus on understanding key concepts, practice examples, and create summaries. ${noteDescriptions[note?.id] || 'Review all materials and take notes on important points.'}`,
          estimatedTime: `${hours} hours`,
          completed: false,
          noteReference: note?.id || null
        }],
        completed: false
      });
    }
    return { dailySchedule };
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const resetPlanner = () => {
    setCurrentStep('select');
    setSelectedNoteIds([]);
    setNoteDescriptions({});
    setPlanTitle('');
    setGeneratedPlan(null);
    setGeneratedPlanId(null);
    setExpandedTasks(new Set());
  };

  const getSelectedNotes = () => {
    return selectedNoteIds.map(id => notes.find(n => n.id === id)).filter(Boolean);
  };

  // Step 1: Note Selection
  if (currentStep === 'select') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Smart Study Planner
          </CardTitle>
          <CardDescription>
            Step 1: Select notes from your collection to build a personalized study plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredNotes.map(note => (
              <div key={note.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox
                  checked={selectedNoteIds.includes(note.id)}
                  onCheckedChange={(checked) => handleNoteSelection(note.id, checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{note.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {note.plainText?.slice(0, 150)}...
                  </p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {note.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedNoteIds.length > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Selected Notes: {selectedNoteIds.length}</p>
              <div className="flex flex-wrap gap-2">
                {getSelectedNotes().map(note => (
                  <Badge key={note?.id} variant="secondary" className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {note?.title}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => handleNoteSelection(note?.id || '', false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => setCurrentStep('describe')}
            disabled={selectedNoteIds.length === 0}
            className="w-full"
          >
            Next: Add Descriptions
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Add Descriptions
  if (currentStep === 'describe') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Smart Study Planner
          </CardTitle>
          <CardDescription>
            Step 2: Add custom study descriptions for each selected note
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {getSelectedNotes().map(note => (
            <div key={note?.id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h4 className="font-medium">{note?.title}</h4>
              </div>
              <Textarea
                placeholder="How do you want to study this topic? (e.g., 'Read thoroughly and practice examples', 'Create flashcards for key terms')"
                value={noteDescriptions[note?.id || ''] || ''}
                onChange={(e) => handleDescriptionChange(note?.id || '', e.target.value)}
                className="min-h-20"
              />
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentStep('select')} className="flex-1">
              Back
            </Button>
            <Button onClick={() => setCurrentStep('configure')} className="flex-1">
              Next: Configure Plan
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Configure Plan
  if (currentStep === 'configure') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Smart Study Planner
          </CardTitle>
          <CardDescription>
            Step 3: Configure your study plan parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Plan Title</label>
            <Input
              placeholder="Enter a title for your study plan"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
            />
          </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Days</label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={totalDays}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setTotalDays(Math.max(1, Math.min(365, value)));
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hours per Day</label>
                <Input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0.5;
                    setHoursPerDay(Math.max(0.5, Math.min(24, value)));
                  }}
                />
              </div>
            </div>

          <Separator />

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-3">Plan Summary</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Notes:</strong> {selectedNoteIds.length} selected</p>
              <p><strong>Duration:</strong> {totalDays} {totalDays === 1 ? 'day' : 'days'}</p>
              <p><strong>Daily Time:</strong> {hoursPerDay} {hoursPerDay === 1 ? 'hour' : 'hours'}</p>
              <p><strong>Total Study Time:</strong> {(totalDays * hoursPerDay).toFixed(1)} hours</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentStep('describe')} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={generateStudyPlan} 
              disabled={isGenerating || isCreating}
              className="flex-1"
            >
              {isGenerating || isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Generate Study Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 4: View Generated Plan
  if (currentStep === 'view' && generatedPlan) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Study Plan Generated
                </CardTitle>
                <CardDescription>
                  📌 Flow: Notes → Contextual Chat → Study Planner
                </CardDescription>
              </div>
              <Button variant="outline" onClick={resetPlanner}>
                Create New Plan
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          {generatedPlan.map((day, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  🗓️ Day {day.day} {day.completed ? '✅' : '⬜'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {day.tasks.map((task) => {
                    const isExpanded = expandedTasks.has(task.id);
                    return (
                      <div key={task.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-start gap-3 p-3">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) => {
                              // Find the correct study plan ID
                              const currentPlanId = generatedPlanId || studyPlans.find(plan => 
                                plan.daily_schedule?.some((d: any) => 
                                  d.tasks?.some((t: any) => t.id === task.id)
                                )
                              )?.id;
                              
                              if (currentPlanId) {
                                updateProgress({
                                  planId: currentPlanId,
                                  taskId: task.id,
                                  completed: checked as boolean
                                });
                              } else {
                                toast.error('Unable to update progress - study plan not found');
                              }
                            }}
                          />
                          <div className="flex-1">
                            <div 
                              className="cursor-pointer"
                              onClick={() => toggleTaskExpansion(task.id)}
                            >
                              <h4 className="font-medium flex items-center gap-2">
                                {task.title}
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                  {isExpanded ? '▼' : '▶'}
                                </Button>
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            </div>
                            
                            {isExpanded && (task as any).detailedExplanation && (
                              <div className="mt-3 p-3 bg-muted rounded-lg">
                                <h5 className="font-medium text-sm mb-2">📚 Detailed Study Guide:</h5>
                                <p className="text-sm leading-relaxed">{(task as any).detailedExplanation}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.estimatedTime}
                              </Badge>
                              {task.noteReference && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  From Notes
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                Click to {isExpanded ? 'collapse' : 'expand'} details
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Default state
  return (
    <Alert>
      <Target className="h-4 w-4" />
      <AlertDescription>
        Ready to create your personalized study plan based on your notes!
      </AlertDescription>
    </Alert>
  );
}