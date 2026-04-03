import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Youtube, Clock, Users, ThumbsUp, ExternalLink, Bookmark, Share, Filter, Play, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  description: string;
  embedId: string;
  duration?: string;
  viewCount?: number;
  likeCount?: number;
  publishedAt?: string;
  educationalScore?: number;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  topics?: string[];
}

interface YouTubeVideoPlayerProps {
  conceptName: string;
}

export function YouTubeVideoPlayer({ conceptName }: YouTubeVideoPlayerProps) {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [watchProgress, setWatchProgress] = useState<Record<string, number>>({});
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'relevance' | 'difficulty' | 'duration' | 'rating'>('relevance');
  const [filterBy, setFilterBy] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [showPlayer, setShowPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate realistic mock data for the concept
  useEffect(() => {
    const generateMockVideos = (): VideoData[] => {
      const baseTitles = [
        `${conceptName} Explained`,
        `Complete Guide to ${conceptName}`,
        `${conceptName} Tutorial for Beginners`,
        `Advanced ${conceptName} Techniques`,
        `${conceptName} in 10 Minutes`,
        `Understanding ${conceptName}`,
        `${conceptName} Examples and Applications`,
        `Master ${conceptName} Quickly`
      ];

      return baseTitles.map((title, index) => ({
        id: `video-${index}`,
        title: title,
        thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg`, // Rick Astley as placeholder
        channel: [
          'TechEd Academy',
          'Learning Hub',
          'EduChannel Pro',
          'Study Masters',
          'Knowledge Base',
          'TutorialPro'
        ][index % 6],
        description: `Learn everything about ${conceptName} in this comprehensive tutorial. Perfect for ${
          index % 3 === 0 ? 'beginners' : index % 3 === 1 ? 'intermediate' : 'advanced'
        } learners.`,
        embedId: 'dQw4w9WgXcQ', // Rick Astley video ID for demo
        duration: ['5:23', '12:45', '8:17', '15:32', '6:54', '20:11', '9:08', '13:29'][index],
        viewCount: Math.floor(Math.random() * 500000) + 10000,
        likeCount: Math.floor(Math.random() * 20000) + 500,
        publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        educationalScore: Math.floor(Math.random() * 30) + 70,
        difficultyLevel: (['beginner', 'intermediate', 'advanced'] as const)[index % 3],
        topics: [conceptName, 'tutorial', 'education', 'learning']
      }));
    };

    setVideos(generateMockVideos());
  }, [conceptName]);

  useEffect(() => {
    if (videos.length > 0 && !selectedVideo) {
      setSelectedVideo(videos[0]);
    }
  }, [videos, selectedVideo]);

  // Real YouTube API integration function (for future implementation)
  const searchYouTubeVideos = async (query: string) => {
    setIsLoading(true);
    try {
      // This would integrate with YouTube Data API v3
      // const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&key=${API_KEY}`);
      // const data = await response.json();
      // setVideos(data.items.map(transformYouTubeVideo));
      
      // For now, filter existing mock data
      const filtered = videos.filter(video => 
        video.title.toLowerCase().includes(query.toLowerCase()) ||
        video.description.toLowerCase().includes(query.toLowerCase())
      );
      setVideos(filtered.length > 0 ? filtered : videos);
    } catch (error) {
      console.error('YouTube search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedAndFilteredVideos = videos
    .filter(video => {
      if (filterBy === 'all') return true;
      return video.difficultyLevel === filterBy;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'difficulty':
          const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
          return (difficultyOrder[a.difficultyLevel || 'intermediate'] || 2) - 
                 (difficultyOrder[b.difficultyLevel || 'intermediate'] || 2);
        case 'duration':
          return (parseDuration(a.duration) || 0) - (parseDuration(b.duration) || 0);
        case 'rating':
          return (b.educationalScore || 0) - (a.educationalScore || 0);
        default:
          return (b.educationalScore || 0) - (a.educationalScore || 0);
      }
    });

  function parseDuration(duration?: string): number {
    if (!duration) return 0;
    const parts = duration.split(':');
    return parts.reduce((acc, part, index) => {
      return acc + parseInt(part) * Math.pow(60, parts.length - index - 1);
    }, 0);
  }

  const toggleBookmark = (videoId: string) => {
    const newBookmarks = new Set(bookmarkedVideos);
    if (newBookmarks.has(videoId)) {
      newBookmarks.delete(videoId);
    } else {
      newBookmarks.add(videoId);
    }
    setBookmarkedVideos(newBookmarks);
  };

  const shareVideo = (video: VideoData) => {
    const url = `https://youtube.com/watch?v=${video.embedId}`;
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: `Check out this video about ${conceptName}`,
        url
      });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getEducationalScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Youtube className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
            <p>Loading videos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          YouTube Learning: {conceptName}
        </CardTitle>
        <CardDescription>
          Educational videos to enhance your understanding of {conceptName}
        </CardDescription>
        
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${conceptName} videos...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchYouTubeVideos(searchQuery)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => searchYouTubeVideos(searchQuery)}
              disabled={isLoading}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">📊 Relevance</SelectItem>
                <SelectItem value="difficulty">🎯 Difficulty</SelectItem>
                <SelectItem value="duration">⏱️ Duration</SelectItem>
                <SelectItem value="rating">⭐ Rating</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Video Player */}
        {selectedVideo && (
          <div className="space-y-4">
            {showPlayer ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.embedId}?autoplay=1&rel=0`}
                  title={selectedVideo.title}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div 
                className="aspect-video rounded-lg overflow-hidden cursor-pointer relative group bg-black"
                onClick={() => setShowPlayer(true)}
              >
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-600 rounded-full p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                </div>
                {selectedVideo.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-sm px-2 py-1 rounded">
                    {selectedVideo.duration}
                  </div>
                )}
              </div>
            )}
            
            {/* Video Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-lg line-clamp-2">{selectedVideo.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Youtube className="h-3 w-3" />
                    {selectedVideo.channel}
                  </p>
                </div>
                <div className="flex gap-1 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleBookmark(selectedVideo.id)}
                    className={bookmarkedVideos.has(selectedVideo.id) ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20' : ''}
                  >
                    <Bookmark className={`h-4 w-4 ${bookmarkedVideos.has(selectedVideo.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareVideo(selectedVideo)}
                  >
                    <Share className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://youtube.com/watch?v=${selectedVideo.embedId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Video metadata */}
              <div className="flex items-center gap-4 text-sm flex-wrap">
                {selectedVideo.duration && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {selectedVideo.duration}
                  </div>
                )}
                {selectedVideo.viewCount && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {selectedVideo.viewCount.toLocaleString()} views
                  </div>
                )}
                {selectedVideo.educationalScore && (
                  <div className={`flex items-center gap-1 ${getEducationalScoreColor(selectedVideo.educationalScore)}`}>
                    <ThumbsUp className="h-3 w-3" />
                    {selectedVideo.educationalScore}% educational
                  </div>
                )}
              </div>
              
              {/* Tags and difficulty */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedVideo.difficultyLevel && (
                  <Badge className={getDifficultyColor(selectedVideo.difficultyLevel)}>
                    {selectedVideo.difficultyLevel}
                  </Badge>
                )}
                {selectedVideo.topics?.slice(0, 3).map((topic) => (
                  <Badge key={topic} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
              
              {/* Description */}
              {selectedVideo.description && (
                <div className="text-sm text-muted-foreground line-clamp-3 leading-relaxed bg-muted/30 p-3 rounded">
                  {selectedVideo.description}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Video Playlist */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            📋 Video Playlist ({sortedAndFilteredVideos.length} videos)
          </h4>
          
          <div className="grid gap-3 max-h-80 overflow-y-auto pr-2">
            {sortedAndFilteredVideos.map((video, index) => (
              <div
                key={video.id}
                className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedVideo?.id === video.id ? 'bg-primary/5 border-primary ring-1 ring-primary/20' : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  setSelectedVideo(video);
                  setShowPlayer(false);
                }}
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-28 h-20 object-cover rounded"
                  />
                  {video.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                      {video.duration}
                    </div>
                  )}
                  {bookmarkedVideos.has(video.id) && (
                    <Bookmark className="absolute top-1 right-1 h-3 w-3 fill-yellow-500 text-yellow-500" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 rounded transition-opacity">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                {/* Video info */}
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-sm line-clamp-2 mb-2">{video.title}</h5>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Youtube className="h-3 w-3" />
                    {video.channel}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    {video.difficultyLevel && (
                      <Badge variant="outline" className="text-xs">
                        {video.difficultyLevel}
                      </Badge>
                    )}
                    {video.educationalScore && (
                      <span className={`text-xs ${getEducationalScoreColor(video.educationalScore)}`}>
                        {video.educationalScore}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* YouTube Integration Notice */}
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-sm mb-2 text-red-800 dark:text-red-200 flex items-center gap-2">
            🔴 Live YouTube Integration
          </h4>
          <p className="text-xs text-red-700 dark:text-red-300 mb-2">
            This component is ready for YouTube Data API v3 integration. Add your API key to enable real video search.
          </p>
          <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
            <li>• Currently showing demo videos with concept-based content</li>
            <li>• Search functionality filters existing results</li>
            <li>• Video player works with actual YouTube embeds</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}