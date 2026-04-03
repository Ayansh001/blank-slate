
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, FileText, FolderOpen, Brain, Calendar, Tag, Star } from 'lucide-react';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const mockResults = [
    {
      id: 1,
      type: 'note',
      title: 'Quantum Physics - Wave Particle Duality',
      content: 'The wave-particle duality is a fundamental concept in quantum mechanics that describes how particles exhibit both wave and particle characteristics...',
      category: 'Physics',
      relevance: 95,
      lastModified: '2 hours ago'
    },
    {
      id: 2,
      type: 'file',
      title: 'Research Paper - AI Ethics.pdf',
      content: 'This paper explores the ethical implications of artificial intelligence in modern society, covering topics such as bias, privacy, and algorithmic fairness...',
      category: 'AI Research',
      relevance: 87,
      lastModified: '1 day ago'
    },
    {
      id: 3,
      type: 'ai-chat',
      title: 'Discussion about molecular structures',
      content: 'Our conversation about organic chemistry molecular structures and their bonding patterns, including examples of benzene rings and functional groups...',
      category: 'Chemistry',
      relevance: 78,
      lastModified: '3 days ago'
    }
  ];

  const filters = [
    { id: 'all', label: 'All Results', icon: Search },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'ai-chats', label: 'AI Conversations', icon: Brain }
  ];

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'note':
        return FileText;
      case 'file':
        return FolderOpen;
      case 'ai-chat':
        return Brain;
      default:
        return Search;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'note':
        return 'text-blue-500';
      case 'file':
        return 'text-green-500';
      case 'ai-chat':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Search</h1>
        <p className="text-slate-600 dark:text-slate-400">Find information across all your study materials</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input
              placeholder="Search across notes, files, and AI conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* AI-Powered Search Features */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-purple-600" />
            AI-Powered Search
          </CardTitle>
          <CardDescription>
            Our AI understands context and meaning, not just keywords
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
              <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Semantic Search</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Find related concepts even with different words</p>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
              <Search className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Cross-Reference</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Connect information across different sources</p>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
              <Tag className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Context Aware</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Understand the context of your queries</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const Icon = filter.icon;
              return (
                <Button
                  key={filter.id}
                  variant={selectedFilter === filter.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter(filter.id)}
                  className={selectedFilter === filter.id ? "bg-gradient-to-r from-blue-500 to-purple-600" : ""}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="space-y-4">
        {searchQuery ? (
          mockResults.map((result) => {
            const ResultIcon = getResultIcon(result.type);
            const iconColor = getResultColor(result.type);
            
            return (
              <Card key={result.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <ResultIcon className={`h-6 w-6 ${iconColor} mt-1 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                          {result.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full text-xs">
                            {result.relevance}% match
                          </span>
                          <Calendar className="h-4 w-4" />
                          {result.lastModified}
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                        {result.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          <Tag className="h-3 w-3 mr-1" />
                          {result.category}
                        </span>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                          Open →
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">Start searching</CardTitle>
              <CardDescription>
                Enter a query above to search through your notes, files, and AI conversations
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
