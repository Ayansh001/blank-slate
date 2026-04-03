import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, ZoomIn, ZoomOut, RotateCcw, Info, GitBranch, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { measureText, calculateOptimalTextWidth } from '@/utils/textMeasurement';

interface KnowledgeGraphNode {
  id: string;
  name: string;
  type: 'central' | 'connected' | 'prerequisite' | 'advanced';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
  x?: number;
  y?: number;
  level?: number;
}

interface HierarchicalKnowledgeGraphProps {
  centralConcept: string;
  nodes: KnowledgeGraphNode[];
  onNodeClick?: (concept: string) => void;
}

export function HierarchicalKnowledgeGraph({ 
  centralConcept, 
  nodes, 
  onNodeClick 
}: HierarchicalKnowledgeGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [processedNodes, setProcessedNodes] = useState<KnowledgeGraphNode[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [nodeSummary, setNodeSummary] = useState<string>('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Create hierarchical tree layout with better dimensions
    const centerX = 300;
    const centerY = 70;
    
    const connectedNodes = nodes.filter(n => n.type !== 'central');
    
    // Group nodes by difficulty level
    const beginnerNodes = connectedNodes.filter(n => n.difficulty === 'beginner');
    const intermediateNodes = connectedNodes.filter(n => n.difficulty === 'intermediate');
    const advancedNodes = connectedNodes.filter(n => n.difficulty === 'advanced');
    const otherNodes = connectedNodes.filter(n => !n.difficulty);
    
    const positioned: KnowledgeGraphNode[] = [];
    
    // Level 1: Beginner nodes with proper spacing
    const level1Y = centerY + 90;
    beginnerNodes.forEach((node, index) => {
      // Calculate optimal width for each node
      const nodeWidth = calculateOptimalTextWidth(node.name, 140, 80, 11);
      const totalWidth = beginnerNodes.reduce((sum, n) => sum + calculateOptimalTextWidth(n.name, 140, 80, 11) + 20, 0);
      const spacing = Math.max(nodeWidth + 20, Math.min(180, 450 / Math.max(beginnerNodes.length, 1)));
      const startX = centerX - (beginnerNodes.length - 1) * spacing / 2;
      positioned.push({
        ...node,
        x: startX + index * spacing,
        y: level1Y,
        level: 1
      });
    });
    
    // Level 2: Intermediate nodes with better spacing
    const level2Y = level1Y + 100;
    intermediateNodes.forEach((node, index) => {
      const nodeWidth = calculateOptimalTextWidth(node.name, 140, 80, 11);
      const spacing = Math.max(nodeWidth + 25, Math.min(190, 500 / Math.max(intermediateNodes.length, 1)));
      const startX = centerX - (intermediateNodes.length - 1) * spacing / 2;
      positioned.push({
        ...node,
        x: startX + index * spacing,
        y: level2Y,
        level: 2
      });
    });
    
    // Level 3: Advanced nodes with maximum spacing
    const level3Y = level2Y + 100;
    advancedNodes.forEach((node, index) => {
      const nodeWidth = calculateOptimalTextWidth(node.name, 140, 80, 11);
      const spacing = Math.max(nodeWidth + 30, Math.min(200, 550 / Math.max(advancedNodes.length, 1)));
      const startX = centerX - (advancedNodes.length - 1) * spacing / 2;
      positioned.push({
        ...node,
        x: startX + index * spacing,
        y: level3Y,
        level: 3
      });
    });
    
    // Place other nodes on the sides
    otherNodes.forEach((node, index) => {
      const isLeft = index % 2 === 0;
      const side = isLeft ? -1 : 1;
      const yOffset = Math.floor(index / 2) * 70;
      positioned.push({
        ...node,
        x: centerX + side * 200,
        y: centerY + 60 + yOffset,
        level: 0
      });
    });

    setProcessedNodes(positioned);
  }, [nodes]);

  const handleNodeClick = async (node: KnowledgeGraphNode) => {
    setSelectedNode(node.id);
    setNodeSummary('');
    
    if (node.id !== 'central') {
      setSummaryLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('concept-summary-handler', {
          body: { concept: node.name }
        });

        if (error) throw error;

        if (data?.success && data?.summary) {
          setNodeSummary(data.summary);
        } else {
          setNodeSummary(`${node.name} is a related concept in your learning path.`);
        }
      } catch (err: any) {
        console.error('Summary generation error:', err);
        setNodeSummary(`${node.name} is a related concept in your learning path.`);
        toast.error('Failed to generate summary');
      } finally {
        setSummaryLoading(false);
      }
    }
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

  const getConnectionPaths = () => {
    const connections = [];
    
    // Connect central to level 1 (beginners)
    processedNodes.filter(n => n.level === 1).forEach(node => {
      connections.push({
        from: { x: 300, y: 70 },
        to: { x: node.x!, y: node.y! },
        type: 'primary'
      });
    });
    
    // Connect level 1 to level 2 (intermediate)
    const level1Nodes = processedNodes.filter(n => n.level === 1);
    const level2Nodes = processedNodes.filter(n => n.level === 2);
    level2Nodes.forEach((node, index) => {
      const parentIndex = Math.floor(index * level1Nodes.length / level2Nodes.length);
      const parent = level1Nodes[parentIndex];
      if (parent) {
        connections.push({
          from: { x: parent.x!, y: parent.y! },
          to: { x: node.x!, y: node.y! },
          type: 'secondary'
        });
      }
    });
    
    // Connect level 2 to level 3 (advanced)
    const level3Nodes = processedNodes.filter(n => n.level === 3);
    level3Nodes.forEach((node, index) => {
      const parentIndex = Math.floor(index * level2Nodes.length / level3Nodes.length);
      const parent = level2Nodes[parentIndex];
      if (parent) {
        connections.push({
          from: { x: parent.x!, y: parent.y! },
          to: { x: node.x!, y: node.y! },
          type: 'tertiary'
        });
      }
    });
    
    // Connect side nodes to center
    processedNodes.filter(n => n.level === 0).forEach(node => {
      connections.push({
        from: { x: 300, y: 70 },
        to: { x: node.x!, y: node.y! },
        type: 'side'
      });
    });
    
    return connections;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          Hierarchical Knowledge Graph
        </CardTitle>
        <CardDescription>
          Explore the learning path for {centralConcept} from basics to advanced
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
        <div className="relative h-[450px] bg-gradient-to-br from-background to-muted/10 rounded-lg overflow-hidden border">
          <svg 
            ref={svgRef}
            className="w-full h-full cursor-pointer"
            viewBox="0 0 600 450"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Connection lines */}
            {getConnectionPaths().map((connection, index) => (
              <line
                key={`connection-${index}`}
                x1={connection.from.x}
                y1={connection.from.y}
                x2={connection.to.x}
                y2={connection.to.y}
                stroke={
                  connection.type === 'primary' ? 'hsl(var(--primary))' :
                  connection.type === 'secondary' ? 'hsl(120, 60%, 50%)' :
                  connection.type === 'tertiary' ? 'hsl(0, 70%, 50%)' :
                  'hsl(var(--muted-foreground))'
                }
                strokeWidth={
                  connection.type === 'primary' ? 3 :
                  connection.type === 'secondary' ? 2 :
                  1.5
                }
                opacity={0.7}
                className="transition-all duration-300"
                markerEnd={connection.type === 'side' ? '' : 'url(#arrowhead)'}
              />
            ))}

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="hsl(var(--primary))"
                />
              </marker>
            </defs>

            {/* Central node */}
            <g 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleNodeClick({ id: 'central', name: centralConcept, type: 'central', level: 0 })}
            >
              {(() => {
                const width = calculateOptimalTextWidth(centralConcept, 160, 100, 12);
                return (
                  <>
                    <rect
                      x={300 - width/2}
                      y={70 - 20}
                      width={width}
                      height={40}
                      rx={8}
                      fill={getNodeColor('central')}
                      stroke="hsl(var(--background))"
                      strokeWidth="3"
                      className={selectedNode === 'central' ? 'drop-shadow-lg' : ''}
                    />
                    <text
                      x={300}
                      y={77}
                      textAnchor="middle"
                      className="fill-primary-foreground text-xs font-bold pointer-events-none"
                    >
                      {centralConcept}
                    </text>
                  </>
                );
              })()}
            </g>

            {/* Connected nodes */}
            {processedNodes.map((node) => {
              const width = calculateOptimalTextWidth(node.name, 140, 80, 11);
              return (
                <g 
                  key={node.id}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleNodeClick(node)}
                >
                  <rect
                    x={node.x! - width/2}
                    y={node.y! - 15}
                    width={width}
                    height={30}
                    rx={6}
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
                    {node.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-3 h-2 rounded bg-primary"></div>
            Central Concept
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(120, 60%, 50%)' }}></div>
            Beginner
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(45, 100%, 50%)' }}></div>
            Intermediate
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(0, 70%, 50%)' }}></div>
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
                ? { id: 'central', name: centralConcept, type: 'central' as const, level: 0 }
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
                  {summaryLoading && node.id !== 'central' ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating summary...
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {node.id === 'central' 
                        ? 'This is the central concept you are learning about.'
                        : (nodeSummary || `${node.name} is a related concept in your learning path.`)}
                    </p>
                  )}
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
          💡 This graph shows the learning progression from beginner to advanced concepts
        </div>
      </CardContent>
    </Card>
  );
}