import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Highlighter, Search, Download, Trash2, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Highlight {
  id: string;
  text: string;
  note: string;
  category: 'important' | 'definition' | 'example' | 'question' | 'insight';
  startOffset: number;
  endOffset: number;
  timestamp: Date;
}

interface SmartTextHighlighterProps {
  content: string;
  conceptName: string;
}

export function SmartTextHighlighter({ content, conceptName }: SmartTextHighlighterProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [highlightNote, setHighlightNote] = useState('');
  const [highlightCategory, setHighlightCategory] = useState<Highlight['category']>('important');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const categoryColors = {
    important: 'hsl(45, 100%, 85%)',
    definition: 'hsl(200, 100%, 85%)', 
    example: 'hsl(120, 60%, 85%)',
    question: 'hsl(0, 100%, 85%)',
    insight: 'hsl(270, 100%, 85%)'
  };

  const categoryIcons = {
    important: '⭐',
    definition: '📖',
    example: '💡',
    question: '❓',
    insight: '🧠'
  };

  useEffect(() => {
    const saved = localStorage.getItem(`highlights-${conceptName}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHighlights(parsed.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        })));
      } catch (error) {
        console.warn('Failed to load highlights:', error);
      }
    }
  }, [conceptName]);

  const handleTextSelection = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent selection on existing highlights
    if ((e.target as HTMLElement).closest('.highlight-mark')) {
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      
      if (text.length < 3 || !contentRef.current?.contains(range.commonAncestorContainer)) {
        return;
      }

      // More robust text offset calculation
      const contentElement = contentRef.current;
      if (!contentElement) return;

      // Get text content for offset calculation
      const textContent = contentElement.textContent || '';
      const selectedText = selection.toString();
      
      // Find the start position in the full text
      const beforeSelection = range.cloneRange();
      beforeSelection.selectNodeContents(contentElement);
      beforeSelection.setEnd(range.startContainer, range.startOffset);
      const start = beforeSelection.toString().length;
      const end = start + selectedText.length;

      setSelectedText(text);
      setSelectionRange({ start, end });
      setShowPanel(true);
    }, 10);
  };

  const addHighlight = () => {
    if (!selectedText || !selectionRange) return;

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      text: selectedText,
      note: highlightNote,
      category: highlightCategory,
      startOffset: selectionRange.start,
      endOffset: selectionRange.end,
      timestamp: new Date()
    };

    const updatedHighlights = [...highlights, newHighlight].sort((a, b) => a.startOffset - b.startOffset);
    setHighlights(updatedHighlights);
    localStorage.setItem(`highlights-${conceptName}`, JSON.stringify(updatedHighlights));

    // Reset
    setSelectedText('');
    setSelectionRange(null);
    setHighlightNote('');
    setShowPanel(false);
    window.getSelection()?.removeAllRanges();
  };

  const removeHighlight = (id: string) => {
    const updated = highlights.filter(h => h.id !== id);
    setHighlights(updated);
    localStorage.setItem(`highlights-${conceptName}`, JSON.stringify(updated));
  };

  const renderHighlightedContent = () => {
    if (highlights.length === 0 || !showHighlights) {
      return (
        <div 
          ref={contentRef}
          className="prose prose-sm max-w-none leading-relaxed select-text whitespace-pre-wrap cursor-text"
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
        >
          {content}
        </div>
      );
    }

    // Create a React-based highlighting solution
    const parts: Array<{ text: string; isHighlight: boolean; highlight?: Highlight }> = [];
    let lastIndex = 0;

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

    sortedHighlights.forEach((highlight) => {
      // Add text before highlight
      if (highlight.startOffset > lastIndex) {
        parts.push({
          text: content.substring(lastIndex, highlight.startOffset),
          isHighlight: false
        });
      }

      // Add highlighted text
      parts.push({
        text: content.substring(highlight.startOffset, highlight.endOffset),
        isHighlight: true,
        highlight
      });

      lastIndex = highlight.endOffset;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        text: content.substring(lastIndex),
        isHighlight: false
      });
    }

    return (
      <div 
        ref={contentRef}
        className="prose prose-sm max-w-none leading-relaxed select-text whitespace-pre-wrap cursor-text"
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
      >
        {parts.map((part, index) => 
          part.isHighlight && part.highlight ? (
            <mark
              key={index}
              className="highlight-mark cursor-pointer rounded px-1 py-0.5 border-l-2"
              style={{ 
                backgroundColor: categoryColors[part.highlight.category],
                borderLeftColor: 'hsl(var(--primary))'
              }}
              title={part.highlight.note || part.highlight.category}
              data-highlight-id={part.highlight.id}
            >
              {part.text}
            </mark>
          ) : (
            <span key={index}>{part.text}</span>
          )
        )}
      </div>
    );
  };

  const exportHighlights = () => {
    const exportData = highlights
      .map((h, i) => `${i + 1}. ${categoryIcons[h.category]} [${h.category.toUpperCase()}]\n"${h.text}"\n${h.note ? `Note: ${h.note}\n` : ''}`)
      .join('\n');
    
    const fullExport = `# ${conceptName} - Highlights\n\nExported: ${new Date().toLocaleDateString()}\nTotal: ${highlights.length}\n\n${exportData}`;
    
    navigator.clipboard.writeText(fullExport);
  };

  const filteredHighlights = highlights.filter(h => 
    !searchTerm || 
    h.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.note.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Highlighter className="h-5 w-5 text-primary" />
            Smart Text Highlighter
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHighlights(!showHighlights)}
            >
              {showHighlights ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={exportHighlights}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Select text to create highlights with notes. Your highlights are automatically saved.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Highlight Creation Panel */}
        {showPanel && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Create Highlight</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowPanel(false)}>×</Button>
            </div>
            
            <div className="text-sm bg-background p-2 rounded border">
              <strong>Selected:</strong> "{selectedText}"
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Select 
                value={highlightCategory} 
                onValueChange={(value: Highlight['category']) => setHighlightCategory(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="important">⭐ Important</SelectItem>
                  <SelectItem value="definition">📖 Definition</SelectItem>
                  <SelectItem value="example">💡 Example</SelectItem>
                  <SelectItem value="question">❓ Question</SelectItem>
                  <SelectItem value="insight">🧠 Insight</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button onClick={addHighlight} size="sm" className="flex-1">
                  Add Highlight
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowPanel(false)}>
                  Cancel
                </Button>
              </div>
            </div>
            
            <Textarea
              placeholder="Add a note (optional)..."
              value={highlightNote}
              onChange={(e) => setHighlightNote(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-4 gap-4">
          {/* Text Content */}
          <div className="lg:col-span-3">
            <div className="p-4 bg-background border rounded-lg max-h-96 overflow-y-auto">
              {renderHighlightedContent()}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              💡 Select any text to create a highlight
            </div>
          </div>
          
          {/* Highlights Sidebar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Highlights ({filteredHighlights.length})</h4>
              {highlights.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setHighlights([]);
                    localStorage.removeItem(`highlights-${conceptName}`);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <Input
              placeholder="Search highlights..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredHighlights.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {searchTerm ? 'No matching highlights' : 'No highlights yet'}
                </div>
              ) : (
                filteredHighlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="p-3 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ backgroundColor: categoryColors[highlight.category] }}
                      >
                        {categoryIcons[highlight.category]} {highlight.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 text-destructive"
                        onClick={() => removeHighlight(highlight.id)}
                      >
                        ×
                      </Button>
                    </div>
                    
                    <div className="text-foreground line-clamp-2 mb-2">
                      "{highlight.text}"
                    </div>
                    
                    {highlight.note && (
                      <div className="text-muted-foreground text-xs italic">
                        💭 {highlight.note}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      {highlight.timestamp.toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium">Legend:</span>
          {Object.entries(categoryColors).map(([category, color]) => (
            <div key={category} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs">
                {categoryIcons[category as Highlight['category']]} {category}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}