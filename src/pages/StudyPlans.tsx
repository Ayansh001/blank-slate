import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  BookOpen,
  CheckCircle,
  Target,
  TrendingUp,
  Plus,
  Timer
} from 'lucide-react';
import { StudyPlanDashboard } from '@/components/study/StudyPlanDashboard';
import { EnhancedSmartStudyPlanner } from '@/components/ai/EnhancedSmartStudyPlanner';
import { StudySessionTimer } from '@/components/study/StudySessionTimer';
import { useStudyPlans, StudyPlan, DailyTask, Task } from '@/hooks/useStudyPlans';
import { toast } from 'sonner';

export default function StudyPlans() {
  const { studyPlans, isLoading } = useStudyPlans();
  const [activeTab, setActiveTab] = useState('today');

  // Get today's tasks from all active study plans
  const getTodaysTasks = () => {
    const today = new Date().toDateString();
    const todaysTasks: Array<{ task: Task; plan: StudyPlan; day: DailyTask }> = [];

    studyPlans.forEach(plan => {
      if (plan.daily_schedule && Array.isArray(plan.daily_schedule)) {
        plan.daily_schedule.forEach(day => {
          if (day.tasks && Array.isArray(day.tasks)) {
            day.tasks.forEach(task => {
              // Simple logic: show tasks from current day number based on plan creation
              const planStartDate = new Date(plan.created_at);
              const daysSinceStart = Math.floor((new Date().getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (day.day === daysSinceStart + 1 && !task.completed) {
                todaysTasks.push({ task, plan, day });
              }
            });
          }
        });
      }
    });

    return todaysTasks;
  };

  const todaysTasks = getTodaysTasks();
  const completedToday = todaysTasks.filter(item => item.task.completed).length;
  const totalTasks = todaysTasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Study Plans</h1>
          <p className="text-muted-foreground">Manage your AI-generated study schedules</p>
        </div>
        <Button onClick={() => setActiveTab('create')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      {/* Quick Stats */}
      {studyPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Active Plans</span>
              </div>
              <p className="text-2xl font-bold mt-1">{studyPlans.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Today's Tasks</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalTasks}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Completed Today</span>
              </div>
              <p className="text-2xl font-bold mt-1">{completedToday}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Progress</span>
              </div>
              <p className="text-2xl font-bold mt-1">{progressPercentage}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Today's Focus
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Manage Plans
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {totalTasks > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tasks List */}
              <div className="lg:col-span-2">
                <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        Today's Study Focus
                      </CardTitle>
                      <CardDescription>
                        Complete {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} to stay on track
                      </CardDescription>
                    </div>
                    <Badge variant={progressPercentage === 100 ? 'default' : 'secondary'}>
                      {progressPercentage}% Complete
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={progressPercentage} className="mb-4" />
                  <div className="space-y-3">
                    {todaysTasks.map(({ task, plan, day }, index) => (
                      <div key={`${plan.id}-${task.id}`} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {task.estimatedTime}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {plan.title}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Day {day.day}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Study Timer */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <StudySessionTimer 
                  taskTitle={todaysTasks[0]?.task.title}
                  estimatedTime={todaysTasks[0]?.task.estimatedTime}
                  onSessionComplete={() => {
                    toast.success("Great work! Keep up the momentum!");
                  }}
                />
              </div>
            </div>
          </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No tasks for today</h3>
                  <p className="text-muted-foreground mb-4">
                    {studyPlans.length === 0 
                      ? "Create your first study plan to get started!"
                      : "Great job! You've completed all your tasks or no plans are active today."
                    }
                  </p>
                  {studyPlans.length === 0 && (
                    <Button onClick={() => setActiveTab('create')} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Your First Study Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage">
          <StudyPlanDashboard />
        </TabsContent>

        <TabsContent value="create">
          <EnhancedSmartStudyPlanner />
        </TabsContent>
      </Tabs>
    </div>
  );
}