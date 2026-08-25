import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Clock, 
  BookOpen,
  CheckCircle,
  Edit,
  Trash2,
  Target,
  PlayCircle
} from 'lucide-react';
import { useStudyPlans, StudyPlan, DailyTask } from '@/hooks/useStudyPlans';
import { toast } from 'sonner';

export function StudyPlanDashboard() {
  const { studyPlans, updateProgress, deleteStudyPlan, isLoading } = useStudyPlans();
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);

  const calculateProgress = (plan: StudyPlan) => {
    if (!plan.daily_schedule || !Array.isArray(plan.daily_schedule)) return 0;
    
    const totalTasks = plan.daily_schedule.reduce((acc: number, day: DailyTask) => 
      acc + (day.tasks?.length || 0), 0
    );
    
    if (totalTasks === 0) return 0;
    
    const completedTasks = plan.daily_schedule.reduce((acc: number, day: DailyTask) => 
      acc + (day.tasks?.filter(task => plan.progress?.[task.id] || false).length || 0), 0
    );
    
    return Math.round((completedTasks / totalTasks) * 100);
  };

  const handleTaskToggle = (planId: string, taskId: string, completed: boolean) => {
    updateProgress({ planId, taskId, completed });
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm('Are you sure you want to delete this study plan?')) {
      deleteStudyPlan(planId);
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading study plans...</p>
        </div>
      </div>
    );
  }

  if (studyPlans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Study Plan Dashboard
          </CardTitle>
          <CardDescription>
            No study plans created yet. Create your first study plan to get started!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Study Plan Dashboard
          </CardTitle>
          <CardDescription>
            Manage and track your study plans
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Study Plans List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Study Plans</h3>
          {studyPlans.map((plan) => {
            const progress = calculateProgress(plan);
            return (
              <Card key={plan.id} className={`cursor-pointer transition-colors ${
                selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1" onClick={() => setSelectedPlan(plan)}>
                      <CardTitle className="text-base">{plan.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {plan.total_days} days • {plan.hours_per_day} hours/day
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(plan.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {Array.isArray(plan.selected_notes) ? plan.selected_notes.length : 0} notes
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Plan Details */}
        <div>
          {selectedPlan ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  {selectedPlan.title}
                </CardTitle>
                <CardDescription>
                  Daily schedule and progress tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPlan.daily_schedule && Array.isArray(selectedPlan.daily_schedule) ? (
                  selectedPlan.daily_schedule.map((day: DailyTask, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Day {day.day}
                        {day.completed && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </h4>
                      <div className="space-y-2">
                        {day.tasks?.map((task) => (
                          <div key={task.id} className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedPlan.progress?.[task.id] || false}
                              onCheckedChange={(checked) => 
                                handleTaskToggle(selectedPlan.id, task.id, checked as boolean)
                              }
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {task.estimatedTime}
                                </Badge>
                                {task.noteReference && (
                                  <Badge variant="secondary" className="text-xs">
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    Note
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )) || <p className="text-sm text-muted-foreground">No tasks for this day</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No schedule available</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2" />
                  <p>Select a study plan to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}