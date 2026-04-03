import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, BookOpen } from "lucide-react";
import heroImage from "@/assets/hero-studyvault.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="AI-powered study platform" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-90"></div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <BookOpen className="h-8 w-8 text-white/30" />
      </div>
      <div className="absolute top-40 right-20 animate-float" style={{animationDelay: '1s'}}>
        <Sparkles className="h-6 w-6 text-white/30" />
      </div>
      <div className="absolute bottom-40 left-20 animate-float" style={{animationDelay: '2s'}}>
        <Sparkles className="h-10 w-10 text-white/20" />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium">
            <Sparkles className="h-4 w-4 mr-2" />
            AI-Powered Learning Revolution
          </span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Transform Your
          <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
            Study Experience
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
          Harness the power of AI to accelerate your learning, organize your studies, 
          and achieve academic excellence like never before.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button variant="default" size="lg" className="text-lg px-8 py-4">
            Start Learning Free
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-4 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20">
            Watch Demo
          </Button>
        </div>
        
        <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/60">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">10M+</div>
            <div className="text-sm">Students Helped</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">95%</div>
            <div className="text-sm">Grade Improvement</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">50%</div>
            <div className="text-sm">Time Saved</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;