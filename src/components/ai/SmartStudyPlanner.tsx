
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  Target,
  BookOpen,
  Brain,
  CheckCircle,
  Loader2,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';
import { toast } from 'sonner';

interface SmartStudyPlannerProps {
  subjects?: string[];
}

interface StudyPlan {
  title: string;
  duration: string;
  description: string;
  dailySchedule: DailySchedule[];
  studyTips: string[];
  milestones: Milestone[];
}

interface DailySchedule {
  day: number;
  date: string;
  tasks: StudyTask[];
  estimatedTime: string;
}

interface StudyTask {
  subject: string;
  topic: string;
  type: 'study' | 'practice' | 'review' | 'quiz';
  duration: string;
  priority: 'high' | 'medium' | 'low';
  resources: string[];
}

interface Milestone {
  week: number;
  title: string;
  description: string;
  completionCriteria: string[];
}

export function SmartStudyPlanner({ subjects = [] }: SmartStudyPlannerProps) {
  const { user } = useAuth();
  const { activeConfig } = useAIConfig();
  const [topic, setTopic] = useState('');
  const [timeFrame, setTimeFrame] = useState('1_week');
  const [studyLevel, setStudyLevel] = useState('intermediate');
  const [hoursPerDay, setHoursPerDay] = useState('2');
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateStudyPlan = async () => {
    if (!topic.trim() || !user) {
      toast.error('Please enter a topic to create a study plan');
      return;
    }

    if (!activeConfig) {
      toast.error('Please configure an AI service first');
      return;
    }

    setIsGenerating(true);
    try {
      const timeFrameMap = {
        '1_week': '1 week',
        '2_weeks': '2 weeks',
        '1_month': '1 month',
        '3_months': '3 months'
      };

      const prompt = `Create a comprehensive study plan for "${topic}" over ${timeFrameMap[timeFrame as keyof typeof timeFrameMap]} with ${hoursPerDay} hours per day at ${studyLevel} level.

Please provide a detailed study plan with:
1. Daily schedule with specific tasks
2. Study milestones and goals
3. Study tips and recommendations

Format as JSON with this structure:
{
  "title": "Study plan title",
  "duration": "timeframe",
  "description": "brief description",
  "dailySchedule": [
    {
      "day": 1,
      "date": "Day 1",
      "tasks": [
        {
          "subject": "${topic}",
          "topic": "specific topic",
          "type": "study",
          "duration": "2 hours",
          "priority": "high",
          "resources": ["textbook", "online course"]
        }
      ],
      "estimatedTime": "2 hours"
    }
  ],
  "studyTips": ["tip 1", "tip 2"],
  "milestones": [
    {
      "week": 1,
      "title": "Week 1 Goal",
      "description": "What to achieve",
      "completionCriteria": ["criteria 1", "criteria 2"]
    }
  ]
}`;

      console.log('Sending study plan request...');
      
      const { data, error } = await supabase.functions.invoke('universal-ai-handler', {
        body: {
          prompt,
          mode: 'study-plan',
          options: {
            response_format: 'json',
            study_duration: timeFrame,
            study_level: studyLevel,
            hours_per_day: hoursPerDay,
            topic: topic
          }
        }
      });

      console.log('Universal AI handler response:', data);

      if (error) {
        console.error('Study plan generation error:', error);
        throw new Error(`API Error: ${error.message}`);
      }

      if (data?.success && data?.result) {
        let parsedResult;
        try {
          // Try to parse as JSON first
          if (typeof data.result === 'string') {
            parsedResult = JSON.parse(data.result);
          } else {
            parsedResult = data.result;
          }
          
          // Ensure we have the required structure
          if (!parsedResult.title) {
            parsedResult.title = `${topic} Study Plan`;
          }
          if (!parsedResult.duration) {
            parsedResult.duration = timeFrameMap[timeFrame as keyof typeof timeFrameMap];
          }
          if (!parsedResult.description) {
            parsedResult.description = `Comprehensive study plan for ${topic}`;
          }
          if (!parsedResult.dailySchedule) {
            parsedResult.dailySchedule = [];
          }
          if (!parsedResult.studyTips) {
            parsedResult.studyTips = [];
          }
          if (!parsedResult.milestones) {
            parsedResult.milestones = [];
          }
          
          setStudyPlan(parsedResult);
          toast.success('Study plan generated successfully!');
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          // Fallback: create basic structure from text response
          setStudyPlan({
            title: `${topic} Study Plan`,
            duration: timeFrameMap[timeFrame as keyof typeof timeFrameMap],
            description: typeof data.result === 'string' ? data.result : 'Study plan generated',
            dailySchedule: [],
            studyTips: ['Review material regularly', 'Take breaks between study sessions', 'Practice active recall'],
            milestones: []
          });
          toast.success('Study plan generated (simplified format)!');
        }
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error: any) {
      console.error('Study plan generation failed:', error);
      toast.error('Study plan generation failed', {
        description: error.message || 'Please try again'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'study': return BookOpen;
      case 'practice': return Target;
      case 'review': return Clock;
      case 'quiz': return Brain;
      default: return BookOpen;
    }
  };

  return (
    <div className="w-full max-w-none">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            AI Study Planner
          </CardTitle>
          <CardDescription>
            Generate personalized study plans with daily schedules and milestones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Topic/Subject</label>
              <Input
                placeholder="Enter subject or exam to study for"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Frame</label>
              <Select value={timeFrame} onValueChange={setTimeFrame} disabled={isGenerating}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_week">1 Week</SelectItem>
                  <SelectItem value="2_weeks">2 Weeks</SelectItem>
                  <SelectItem value="1_month">1 Month</SelectItem>
                  <SelectItem value="3_months">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Study Level</label>
              <Select value={studyLevel} onValueChange={setStudyLevel} disabled={isGenerating}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Hours per Day</label>
              <Select value={hoursPerDay} onValueChange={setHoursPerDay} disabled={isGenerating}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="2">2 Hours</SelectItem>
                  <SelectItem value="3">3 Hours</SelectItem>
                  <SelectItem value="4">4 Hours</SelectItem>
                  <SelectItem value="6">6 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={generateStudyPlan} 
            className="w-full"
            disabled={!topic.trim() || isGenerating || !activeConfig}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Study Plan...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Generate Study Plan
              </>
            )}
          </Button>

          {!activeConfig && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Please configure an AI service in the settings first to generate study plans.
              </AlertDescription>
            </Alert>
          )}

          {isGenerating && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Creating your personalized study plan... This may take a moment.
              </AlertDescription>
            </Alert>
          )}

          {studyPlan && (
            <div className="space-y-6">
              {/* Plan Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{studyPlan.title}</CardTitle>
                  <CardDescription>
                    Duration: {studyPlan.duration} • {hoursPerDay} hours/day • {studyLevel} level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{studyPlan.description}</p>
                </CardContent>
              </Card>

              {/* Daily Schedule */}
              {studyPlan.dailySchedule && studyPlan.dailySchedule.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5" />
                      Daily Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {studyPlan.dailySchedule.map((day, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                            <h4 className="font-medium">Day {day.day} - {day.date}</h4>
                            <Badge variant="outline">{day.estimatedTime}</Badge>
                          </div>
                          <div className="space-y-2">
                            {day.tasks.map((task, taskIndex) => {
                              const TaskIcon = getTaskIcon(task.type);
                              return (
                                <div key={taskIndex} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-2 bg-muted rounded">
                                  <TaskIcon className="h-4 w-4 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{task.topic}</div>
                                    <div className="text-xs text-muted-foreground">{task.subject}</div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant={getPriorityColor(task.priority) as any} className="text-xs">
                                      {task.priority}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">{task.duration}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Milestones */}
              {studyPlan.milestones && studyPlan.milestones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5" />
                      Milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {studyPlan.milestones.map((milestone, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <h4 className="font-medium">Week {milestone.week}: {milestone.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{milestone.description}</p>
                          <div className="space-y-1">
                            <span className="text-sm font-medium">Completion Criteria:</span>
                            <ul className="text-sm text-muted-foreground">
                              {milestone.completionCriteria.map((criteria, criteriaIndex) => (
                                <li key={criteriaIndex} className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3" />
                                  {criteria}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Study Tips */}
              {studyPlan.studyTips && studyPlan.studyTips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Brain className="h-5 w-5" />
                      Study Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {studyPlan.studyTips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!studyPlan && !isGenerating && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Enter a topic above to generate a personalized study plan with daily schedules and milestones.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
