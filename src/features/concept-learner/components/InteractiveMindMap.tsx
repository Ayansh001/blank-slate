import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, ZoomIn, ZoomOut, RotateCcw, Plus, Save, Move, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { getViewportDimensions, calculateMobilePositions, getResponsiveNodeSize } from '@/utils/responsiveUtils';

interface Node {
  id: string;
  title: string;
  subtopics: string[];
  x: number;
  y: number;
  color: string;
  level: number;
}

interface InteractiveMindMapProps {
  centralConcept: string;
  initialBranches: Array<{
    topic: string;
    subtopics: string[];
  }>;
}

export function InteractiveMindMap({ centralConcept, initialBranches }: InteractiveMindMapProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState(getViewportDimensions());
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const colors = [
    'hsl(210, 100%, 60%)',
    'hsl(120, 60%, 50%)', 
    'hsl(45, 100%, 60%)',
    'hsl(0, 100%, 60%)',
    'hsl(270, 60%, 60%)',
    'hsl(30, 100%, 60%)',
    'hsl(180, 60%, 50%)',
    'hsl(300, 60%, 60%)'
  ];

  // Enhanced collision detection with proper spacing
  const checkCollision = (x: number, y: number, existingNodes: Node[], nodeWidth = 200, nodeHeight = 100) => {
    const minSpacing = viewport.isMobile ? 40 : 60; // Minimum spacing between nodes
    return existingNodes.some(node => {
      const dx = Math.abs(x - node.x);
      const dy = Math.abs(y - node.y);
      return dx < (nodeWidth/2 + minSpacing) && dy < (nodeHeight/2 + minSpacing);
    });
  };

  // Update viewport dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setViewport(getViewportDimensions());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate positions in a balanced radial layout with collision detection
  const generateNodePosition = (existingNodes: Node[], centerX: number, centerY: number) => {
    const nodeIndex = existingNodes.length;
    const totalNodes = initialBranches.length;
    
    // Get responsive node size
    const nodeSize = getResponsiveNodeSize(viewport.isMobile);
    const nodeWidth = nodeSize.width;
    const nodeHeight = nodeSize.height;
    
    // Adaptive positioning algorithm
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let x, y;
      
      if (totalNodes <= 6) {
        // Circular layout with better spacing
        const angle = (nodeIndex * 2 * Math.PI) / totalNodes + (attempt * 0.15);
        const radius = (viewport.isMobile ? 160 : 220) + (attempt * 30);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      } else {
        // Multi-ring spiral layout with improved spacing
        const spiralTightness = viewport.isMobile ? 0.7 : 0.5;
        const baseRadius = viewport.isMobile ? 140 : 180;
        const angle = nodeIndex * spiralTightness + (attempt * 0.3);
        const radius = baseRadius + (nodeIndex * (viewport.isMobile ? 35 : 25)) + (attempt * 15);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      }
      
      // Check collision with existing nodes
      if (!checkCollision(x, y, existingNodes, nodeWidth, nodeHeight)) {
        return { x, y };
      }
    }
    
    // Fallback: force positioning if all attempts failed
    const fallbackAngle = (nodeIndex * 2.5) % (2 * Math.PI);
    const fallbackRadius = 200 + (nodeIndex * 30);
    return {
      x: centerX + Math.cos(fallbackAngle) * fallbackRadius,
      y: centerY + Math.sin(fallbackAngle) * fallbackRadius
    };
  };

  useEffect(() => {
    if (initialBranches.length === 0) return;

    // Calculate responsive center position
    const centerX = viewport.isMobile ? viewport.width / 2 : 400;
    const centerY = viewport.isMobile ? Math.min(250, viewport.height / 2) : 250;
    
    const newNodes: Node[] = [];
    
    initialBranches.forEach((branch, index) => {
      const position = generateNodePosition(newNodes, centerX, centerY);
      
      newNodes.push({
        id: `node-${index}`,
        title: branch.topic,
        subtopics: branch.subtopics,
        x: position.x,
        y: position.y,
        color: colors[index % colors.length],
        level: 1
      });
    });

    setNodes(newNodes);
  }, [initialBranches, viewport]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      setDragStart({ 
        x: e.clientX - panOffset.x, 
        y: e.clientY - panOffset.y 
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const addNode = () => {
    const centerX = 300;
    const centerY = 200;
    const position = generateNodePosition(nodes, centerX, centerY);
    
    const newNode: Node = {
      id: `node-${Date.now()}`,
      title: 'New Topic',
      subtopics: ['Add subtopic'],
      x: position.x,
      y: position.y,
      color: colors[nodes.length % colors.length],
      level: 1
    };
    
    setNodes([...nodes, newNode]);
    setEditingNode(newNode.id);
  };

  const updateNodeTitle = (id: string, title: string) => {
    setNodes(nodes.map(node => 
      node.id === id ? { ...node, title } : node
    ));
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter(node => node.id !== id));
    if (selectedNode === id) setSelectedNode(null);
    if (editingNode === id) setEditingNode(null);
  };

  const addSubtopic = (nodeId: string) => {
    setNodes(nodes.map(node => 
      node.id === nodeId 
        ? { ...node, subtopics: [...node.subtopics, 'New subtopic'] }
        : node
    ));
  };

  const updateSubtopic = (nodeId: string, index: number, value: string) => {
    setNodes(nodes.map(node => 
      node.id === nodeId 
        ? { 
            ...node, 
            subtopics: node.subtopics.map((s, i) => i === index ? value : s)
          }
        : node
    ));
  };

  const removeSubtopic = (nodeId: string, index: number) => {
    setNodes(nodes.map(node => 
      node.id === nodeId 
        ? { 
            ...node, 
            subtopics: node.subtopics.filter((_, i) => i !== index)
          }
        : node
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          Interactive Mind Map
        </CardTitle>
        <CardDescription>
          Explore connections and expand your understanding of {centralConcept}
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
            onClick={() => {
              setZoom(1);
              setPanOffset({ x: 0, y: 0 });
            }}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addNode}
          >
            <Plus className="h-3 w-3" />
            Add Node
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div 
          ref={containerRef}
          className={`relative w-full ${viewport.isMobile ? 'h-[400px]' : 'h-[500px]'} bg-gradient-to-br from-background to-muted/10 rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            className="absolute w-full h-full flex items-center justify-center"
            style={{ 
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: '50% 50%',
              minWidth: '100%',
              minHeight: '100%'
            }}
          >
            <div 
              className="relative"
              style={{ 
                width: viewport.isMobile ? `${viewport.width}px` : '800px',
                height: viewport.isMobile ? `${Math.max(400, viewport.height)}px` : '500px',
                minWidth: viewport.isMobile ? `${viewport.width}px` : '800px',
                minHeight: viewport.isMobile ? '400px' : '500px'
              }}
            >
              {/* Connection lines */}
              <svg 
                className="absolute pointer-events-none z-10" 
                style={{ 
                  overflow: 'visible',
                  width: viewport.isMobile ? `${viewport.width}px` : '800px',
                  height: viewport.isMobile ? `${Math.max(400, viewport.height)}px` : '500px',
                  left: '0',
                  top: '0'
                }}
              >
                {nodes.map((node) => {
                  const centerX = viewport.isMobile ? viewport.width / 2 : 400;
                  const centerY = viewport.isMobile ? Math.min(250, viewport.height / 2) : 250;
                  
                  return (
                    <line
                      key={`line-${node.id}`}
                      x1={centerX}
                      y1={centerY}
                      x2={node.x}
                      y2={node.y}
                      stroke={node.color}
                      strokeWidth={viewport.isMobile ? "1.5" : "2"}
                      strokeDasharray="5,5"
                      opacity="0.6"
                    />
                  );
                })}
              </svg>

              {/* Central concept */}
              {(() => {
                const centerX = viewport.isMobile ? viewport.width / 2 : 400;
                const centerY = viewport.isMobile ? Math.min(250, viewport.height / 2) : 250;
                const width = viewport.isMobile ? Math.min(140, viewport.width - 40) : 160;
                
                return (
                  <div 
                    className="absolute bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold shadow-lg border-2 border-primary-foreground/20 cursor-pointer z-50"
                    style={{ 
                      left: centerX - width/2,
                      top: centerY - 20,
                      width: width,
                      textAlign: 'center',
                      fontSize: viewport.isMobile ? '0.875rem' : '1rem',
                      lineHeight: viewport.isMobile ? '1.2' : '1.4'
                    }}
                    onClick={() => setSelectedNode('central')}
                  >
                    {centralConcept}
                  </div>
                );
              })()}

              {/* Branch nodes */}
              {nodes.map((node) => {
                const nodeSize = getResponsiveNodeSize(viewport.isMobile);
                return (
                  <div
                    key={node.id}
                    className="absolute z-20"
                    style={{
                      left: node.x - nodeSize.width/2,
                      top: node.y - nodeSize.height/2,
                      width: nodeSize.width,
                      maxHeight: nodeSize.height
                    }}
                  >
                    <div 
                      className={`bg-background border-2 rounded-lg shadow-lg cursor-pointer transition-all ${
                        selectedNode === node.id ? 'ring-2 ring-primary' : ''
                      }`}
                      style={{ 
                        borderColor: node.color,
                        padding: `${getResponsiveNodeSize(viewport.isMobile).padding}px`
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node.id);
                      }}
                    >
                      {/* Node header */}
                      <div className="flex items-center justify-between mb-2">
                        {editingNode === node.id ? (
                          <Input
                            value={node.title}
                            onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                            onBlur={() => setEditingNode(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingNode(null)}
                            className={`font-semibold h-6 ${viewport.isMobile ? 'text-xs' : 'text-sm'}`}
                            autoFocus
                          />
                        ) : (
                          <h4 
                            className={`font-semibold cursor-pointer flex-1 ${viewport.isMobile ? 'text-xs' : 'text-sm'}`}
                            style={{ color: node.color }}
                            onClick={() => setEditingNode(node.id)}
                          >
                            {node.title}
                          </h4>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNode(node.id);
                          }}
                        >
                          ×
                        </Button>
                      </div>

                      {/* Subtopics */}
                      <div className="space-y-1">
                        {node.subtopics.slice(0, 3).map((subtopic, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <div className="bg-muted rounded px-2 py-1 text-xs flex-1">
                              {subtopic}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 text-destructive"
                              onClick={() => removeSubtopic(node.id, index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        
                        {node.subtopics.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{node.subtopics.length - 3} more
                          </div>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-full text-xs"
                          onClick={() => addSubtopic(node.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Node details panel */}
        {selectedNode && selectedNode !== 'central' && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Node Details</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedNode(null)}
              >
                Close
              </Button>
            </div>
            {(() => {
              const node = nodes.find(n => n.id === selectedNode);
              return node ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Topic:</label>
                    <p className="text-sm">{node.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Subtopics ({node.subtopics.length}):</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {node.subtopics.map((subtopic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {subtopic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <p>💡 Drag the background to pan, use zoom controls to navigate</p>
          <p>🎯 Click nodes to select, click titles to edit, use + to add subtopics</p>
        </div>
      </CardContent>
    </Card>
  );
}