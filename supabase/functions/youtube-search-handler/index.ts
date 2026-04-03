import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 3 } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Search query is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get YouTube API key
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!youtubeApiKey) {
      console.warn('YouTube API key not configured, returning mock data');
      
      // Return mock educational videos as fallback
      const mockVideos = [
        {
          id: "mock1",
          title: `${query} - Educational Tutorial`,
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
          channel: "Educational Channel",
          description: `Comprehensive explanation of ${query} with examples and practical applications.`,
          embedId: "dQw4w9WgXcQ"
        },
        {
          id: "mock2", 
          title: `Understanding ${query} - Complete Guide`,
          thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg",
          channel: "Learning Academy",
          description: `In-depth tutorial covering all aspects of ${query} for students and professionals.`,
          embedId: "9bZkp7q19f0"
        },
        {
          id: "mock3",
          title: `${query} Explained Simply`,
          thumbnail: "https://img.youtube.com/vi/BROWqjuTM0g/mqdefault.jpg", 
          channel: "Simple Learning",
          description: `Easy-to-understand explanation of ${query} with visual examples and demonstrations.`,
          embedId: "BROWqjuTM0g"
        }
      ];

      return new Response(JSON.stringify({ 
        success: true, 
        videos: mockVideos.slice(0, maxResults)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhanced search query for educational content
    const enhancedQuery = `${query} tutorial education explained`;
    
    // Search for videos using YouTube Data API v3
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(enhancedQuery)}&type=video&maxResults=${maxResults}&order=relevance&videoDuration=medium&key=${youtubeApiKey}`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', response.status, errorText);
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        videos: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Transform YouTube API response to our format
    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channel: item.snippet.channelTitle,
      description: item.snippet.description,
      embedId: item.id.videoId
    }));

    // Filter for educational content based on channel names and titles
    const educationalKeywords = [
      'khan academy', 'crash course', 'ted-ed', 'coursera', 'edx', 'mit', 'stanford', 
      'harvard', 'berkeley', 'tutorial', 'explained', 'education', 'learning',
      'academy', 'university', 'college', 'lecture', 'course'
    ];

    const educationalVideos = videos.filter((video: any) => {
      const searchText = `${video.title} ${video.channel} ${video.description}`.toLowerCase();
      return educationalKeywords.some(keyword => searchText.includes(keyword));
    });

    // Return educational videos first, then others if needed
    const finalVideos = educationalVideos.length >= maxResults 
      ? educationalVideos.slice(0, maxResults)
      : [...educationalVideos, ...videos.filter((v: any) => !educationalVideos.includes(v))].slice(0, maxResults);

    return new Response(JSON.stringify({ 
      success: true, 
      videos: finalVideos 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('YouTube search error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});