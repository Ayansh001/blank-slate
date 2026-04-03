import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, BookOpen, Target, Zap, Users, TrendingUp } from "lucide-react";
import aiBrainIcon from "@/assets/ai-brain-icon.jpg";
import studyToolsIcon from "@/assets/study-tools-icon.jpg";
import progressIcon from "@/assets/progress-icon.jpg";

const Features = () => {
  const features = [
    {
      icon: Brain,
      image: aiBrainIcon,
      title: "AI Study Assistant",
      description: "Get personalized study recommendations, instant answers to your questions, and intelligent content generation tailored to your learning style.",
      gradient: "from-academic-blue to-ai-purple",
    },
    {
      icon: BookOpen,
      image: studyToolsIcon,
      title: "Smart Study Tools",
      description: "Access flashcards, mind maps, note-taking tools, and practice tests all powered by advanced AI algorithms.",
      gradient: "from-ai-purple to-academic-blue",
    },
    {
      icon: TrendingUp,
      image: progressIcon,
      title: "AI Analytics",
      description: "Track your AI interactions, quiz performance, and enhancement history with intelligent insights to optimize your learning.",
      gradient: "from-academic-blue to-success-green",
    },
  ];

  const benefits = [
    {
      icon: Target,
      title: "Personalized Learning",
      description: "AI adapts to your unique learning style and pace",
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Get immediate responses and corrections",
    },
    {
      icon: Users,
      title: "Collaborative Study",
      description: "Connect with study groups and share knowledge",
    },
  ];

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-academic-blue-light text-academic-blue font-medium mb-4">
            Powerful Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Everything You Need to Excel
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our comprehensive AI-powered platform provides all the tools and insights you need for academic success.
          </p>
        </div>

        {/* Main Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-glow transition-all duration-300 transform hover:-translate-y-2">
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
              <CardHeader className="text-center pb-4">
                <div className="relative mx-auto mb-4">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-20 h-20 mx-auto rounded-2xl shadow-medium"
                  />
                  <div className="absolute -top-2 -right-2 p-2 bg-gradient-primary rounded-lg shadow-glow">
                    <feature.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base mb-6">
                  {feature.description}
                </CardDescription>
                <Button variant="default" size="sm" className="w-full">
                  Learn More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-4 p-6 rounded-xl bg-card border border-border hover:shadow-soft transition-shadow">
              <div className="p-3 bg-gradient-primary rounded-lg shadow-soft">
                <benefit.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;