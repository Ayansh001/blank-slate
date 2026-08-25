import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';

interface KnowledgeGraphNode {
  id: string;
  name: string;
  type: 'central' | 'connected' | 'prerequisite' | 'advanced';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
  x?: number;
  y?: number;
}

interface InteractiveKnowledgeGraphProps {
  centralConcept: string;
  nodes: KnowledgeGraphNode[];
  onNodeClick?: (concept: string) => void;
}

export function InteractiveKnowledgeGraph({ 
  centralConcept, 
  nodes, 
  onNodeClick 
}: InteractiveKnowledgeGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [processedNodes, setProcessedNodes] = useState<KnowledgeGraphNode[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Create improved force-directed layout with collision detection
    const centerX = 250;
    const centerY = 200;
    
    const connectedNodes = nodes.filter(n => n.type !== 'central');
    
    // Calculate text width for proper node spacing
    const getTextWidth = (text: string): number => {
      return Math.max(60, text.length * 8 + 20);
    };
    
    // Group nodes by difficulty with improved spacing
    const beginnerNodes = connectedNodes.filter(n => n.difficulty === 'beginner');
    const intermediateNodes = connectedNodes.filter(n => n.difficulty === 'intermediate');
    const advancedNodes = connectedNodes.filter(n => n.difficulty === 'advanced');
    const otherNodes = connectedNodes.filter(n => !n.difficulty);
    
    const positioned: KnowledgeGraphNode[] = [];
    
    // Collision detection function
    const checkCollision = (x: number, y: number, width: number, existingNodes: KnowledgeGraphNode[]): boolean => {
      return existingNodes.some(node => {
        if (!node.x || !node.y) return false;
        const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
        const minDistance = Math.max(width, getTextWidth(node.name)) + 30;
        return distance < minDistance;
      });
    };
    
    // Position beginner nodes in inner ring with collision avoidance
    beginnerNodes.forEach((node, index) => {
      let attempts = 0;
      let x, y;
      do {
        const angle = (index * 2 * Math.PI) / Math.max(beginnerNodes.length, 1) + (attempts * 0.3);
        const radius = 80 + (attempts * 10);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
        attempts++;
      } while (checkCollision(x, y, getTextWidth(node.name), positioned) && attempts < 10);
      
      positioned.push({ ...node, x, y });
    });
    
    // Position intermediate nodes in middle ring
    intermediateNodes.forEach((node, index) => {
      let attempts = 0;
      let x, y;
      do {
        const angle = (index * 2 * Math.PI) / Math.max(intermediateNodes.length, 1) + (attempts * 0.2);
        const radius = 130 + (attempts * 15);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
        attempts++;
      } while (checkCollision(x, y, getTextWidth(node.name), positioned) && attempts < 10);
      
      positioned.push({ ...node, x, y });
    });
    
    // Position advanced nodes in outer ring
    advancedNodes.forEach((node, index) => {
      let attempts = 0;
      let x, y;
      do {
        const angle = (index * 2 * Math.PI) / Math.max(advancedNodes.length, 1) + (attempts * 0.15);
        const radius = 180 + (attempts * 20);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
        attempts++;
      } while (checkCollision(x, y, getTextWidth(node.name), positioned) && attempts < 10);
      
      positioned.push({ ...node, x, y });
    });
    
    // Position other nodes with adaptive spacing
    otherNodes.forEach((node, index) => {
      let attempts = 0;
      let x, y;
      do {
        const angle = (index * 2 * Math.PI) / Math.max(otherNodes.length, 1) + Math.PI / 4 + (attempts * 0.25);
        const radius = 100 + (index % 3) * 30 + (attempts * 12);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
        attempts++;
      } while (checkCollision(x, y, getTextWidth(node.name), positioned) && attempts < 10);
      
      positioned.push({ ...node, x, y });
    });

    setProcessedNodes(positioned);
  }, [nodes]);

  const handleNodeClick = (node: KnowledgeGraphNode) => {
    setSelectedNode(node.id);
    onNodeClick?.(node.name);
  };

  const getNodeColor = (type: string, difficulty?: string) => {
    if (type === 'central') return 'hsl(var(--primary))';
    
    switch (difficulty) {
      case 'beginner': return 'hsl(120, 60%, 50%)';
      case 'intermediate': return 'hsl(45, 100%, 50%)';
      case 'advanced': return 'hsl(0, 70%, 50%)';
      default: return 'hsl(210, 100%, 50%)';
    }
  };

  const getNodeRadius = (type: string) => {
    return type === 'central' ? 35 : 25;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          Knowledge Graph
        </CardTitle>
        <CardDescription>
          Explore how {centralConcept} connects to related concepts
        </CardDescription>
        
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(zoom + 0.2, 2))}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(1)}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="relative h-80 bg-gradient-to-br from-background to-muted/10 rounded-lg overflow-hidden border">
          <svg 
            ref={svgRef}
            className="w-full h-full cursor-pointer"
            viewBox="0 0 500 400"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Connection lines */}
            {processedNodes.map((node) => (
              <line
                key={`line-${node.id}`}
                x1={250}
                y1={200}
                x2={node.x}
                y2={node.y}
                stroke={selectedNode === node.id ? getNodeColor(node.type, node.difficulty) : 'hsl(var(--muted-foreground))'}
                strokeWidth={selectedNode === node.id ? 3 : 1.5}
                opacity={selectedNode && selectedNode !== node.id ? 0.3 : 0.7}
                className="transition-all duration-300"
              />
            ))}

            {/* Central node */}
            <g 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleNodeClick({ id: 'central', name: centralConcept, type: 'central' })}
            >
              <circle
                cx={250}
                cy={200}
                r={getNodeRadius('central')}
                fill={getNodeColor('central')}
                stroke="hsl(var(--background))"
                strokeWidth="3"
                className={selectedNode === 'central' ? 'drop-shadow-lg' : ''}
              />
              <text
                x={250}
                y={205}
                textAnchor="middle"
                className="fill-primary-foreground text-xs font-bold pointer-events-none"
              >
                {centralConcept.length > 10 ? centralConcept.substring(0, 10) + '...' : centralConcept}
              </text>
            </g>

            {/* Connected nodes */}
            {processedNodes.map((node) => (
              <g 
                key={node.id}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleNodeClick(node)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={getNodeRadius(node.type)}
                  fill={getNodeColor(node.type, node.difficulty)}
                  stroke={selectedNode === node.id ? 'hsl(var(--primary))' : 'hsl(var(--background))'}
                  strokeWidth={selectedNode === node.id ? 3 : 2}
                  opacity={selectedNode && selectedNode !== node.id ? 0.6 : 1}
                  className={selectedNode === node.id ? 'drop-shadow-lg' : ''}
                />
                <text
                  x={node.x}
                  y={node.y! + 4}
                  textAnchor="middle"
                  className="fill-white text-xs font-medium pointer-events-none"
                >
                  {node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            Central
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(120, 60%, 50%)' }}></div>
            Beginner
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(45, 100%, 50%)' }}></div>
            Intermediate
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 70%, 50%)' }}></div>
            Advanced
          </Badge>
        </div>

        {/* Selected node info */}
        {selectedNode && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Selected Node
              </h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedNode(null)}
              >
                Clear
              </Button>
            </div>
            
            {(() => {
              const node = selectedNode === 'central' 
                ? { id: 'central', name: centralConcept, type: 'central' as const }
                : processedNodes.find(n => n.id === selectedNode);
              
              if (!node) return null;
              
              return (
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-lg">{node.name}</span>
                    {'difficulty' in node && node.difficulty && (
                      <Badge variant="outline" className="ml-2">
                        {node.difficulty}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {'description' in node && node.description 
                      ? node.description 
                      : (node.id === 'central' 
                        ? 'This is the central concept you are learning about.'
                        : 'Click to explore this concept further')}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onNodeClick?.(node.name)}
                    className="w-full"
                  >
                    Explore {node.name}
                  </Button>
                </div>
              );
            })()}
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          💡 Click on any node to explore that concept in detail
        </div>
      </CardContent>
    </Card>
  );
}