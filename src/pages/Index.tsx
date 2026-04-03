import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSimpleAIQuotes } from "@/hooks/useSimpleAIQuotes";
import { 
  Brain, 
  FileText, 
  Search, 
  Upload, 
  BarChart3, 
  Sparkles,
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Shield,
  Zap
} from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const { hasShownTodayQuote } = useSimpleAIQuotes();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Get intelligent insights and summaries from your study materials with advanced AI."
    },
    {
      icon: Search,
      title: "Semantic Search",
      description: "Find information across all your notes and files using natural language queries."
    },
    {
      icon: FileText,
      title: "Smart Note-Taking",
      description: "Create rich, organized notes with markdown support and automatic categorization."
    },
    {
      icon: Upload,
      title: "File Management",
      description: "Upload and organize PDFs, images, and documents with OCR text extraction."
    },
    {
      icon: BarChart3,
      title: "Study Analytics",
      description: "Track your progress with detailed insights and personalized study recommendations."
    },
    {
      icon: Sparkles,
      title: "Personalized AI Chat",
      description: "Chat with an AI assistant trained on your personal knowledge base."
    }
  ];

  const benefits = [
    "Organize all study materials in one place",
    "AI-powered content analysis and summarization",
    "Semantic search across your entire knowledge base",
    "Track study progress with detailed analytics",
    "OCR text extraction from images and PDFs",
    "Personalized study recommendations"
  ];

  const stats = [
    { number: "10K+", label: "Active Students" },
    { number: "50K+", label: "Notes Created" },
    { number: "95%", label: "Success Rate" },
    { number: "24/7", label: "AI Support" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">SV</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              StudyVault
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {!hasShownTodayQuote && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      ✨ Daily motivation ready
                    </span>
                  </div>
                )}
                <Link to="/dashboard">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth/register">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Your AI-Powered
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Study Companion
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Transform your study experience with intelligent note-taking, semantic search, 
            and AI-powered insights. Organize, analyze, and excel in your academic journey.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link to="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg">
                Start Learning Free
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="px-8 py-3 text-lg">
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">{stat.number}</div>
                <div className="text-slate-600 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Powerful Features for Modern Students</h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Everything you need to organize, analyze, and excel in your studies, powered by cutting-edge AI technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-xl transition-all duration-300 border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Why Choose StudyVault?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join thousands of students who have transformed their study habits with our AI-powered platform.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <span className="text-white text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-center mb-6">
                <Star className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Student Success Stories</h3>
                <p className="text-blue-100">See what our users are saying</p>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-white italic mb-2">
                    "StudyVault helped me organize my research and improved my grades significantly!"
                  </p>
                  <p className="text-blue-200 text-sm">- Sarah, PhD Student</p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-white italic mb-2">
                    "The AI search feature is incredible. I can find any information instantly."
                  </p>
                  <p className="text-blue-200 text-sm">- Mike, Engineering Student</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Studies?</h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
            Join thousands of successful students who use StudyVault to organize their learning 
            and achieve academic excellence with AI-powered tools.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 text-lg">
                Start Your Journey
                <Zap className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Free to start • No credit card required
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">SV</span>
                </div>
                <span className="text-xl font-bold">StudyVault</span>
              </div>
              <p className="text-slate-400">
                Your AI-powered study companion for academic excellence.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-slate-400">
                <li>AI Analysis</li>
                <li>Smart Search</li>
                <li>Note Taking</li>
                <li>File Management</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li>Help Center</li>
                <li>Documentation</li>
                <li>Contact Us</li>
                <li>Community</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li>About</li>
                <li>Privacy</li>
                <li>Terms</li>
                <li>Blog</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2024 StudyVault. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
