
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ExpandableContentProps {
  content: string;
  maxLines?: number;
  maxLength?: number;
  className?: string;
  showExpandButton?: boolean;
  minExpandThreshold?: number;
}

export function ExpandableContent({ 
  content, 
  maxLines = 3, 
  maxLength = 200,
  className,
  showExpandButton = true,
  minExpandThreshold = 150
}: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content) {
    return <div className="text-muted-foreground italic">No content available</div>;
  }

  // Only show expand/collapse if content is longer than minimum threshold
  const shouldTruncate = content.length > maxLength && content.length > minExpandThreshold;
  const truncatedContent = shouldTruncate ? content.substring(0, maxLength) + '...' : content;
  
  // If content is short or expansion is disabled, just show the content
  if (!shouldTruncate || !showExpandButton) {
    return (
      <div className={cn("whitespace-pre-wrap", className)}>
        {content}
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn("space-y-2", className)}>
        <div 
          className={cn(
            "whitespace-pre-wrap transition-all duration-200",
            !isExpanded && maxLines && `line-clamp-${maxLines}`
          )}
        >
          {isExpanded ? content : truncatedContent}
        </div>
        
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp className="h-3 w-3 ml-1" />
              </>
            ) : (
              <>
                Show More <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
    </Collapsible>
  );
}
