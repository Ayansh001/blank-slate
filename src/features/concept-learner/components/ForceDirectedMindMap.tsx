import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, ZoomIn, ZoomOut, RotateCcw, Plus, Save, Move, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Node {
  id: string;
  title: string;
  subtopics: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  level: number;
  radius: number;
}

interface ForceDirectedMindMapProps {
  centralConcept: string;
  initialBranches: Array<{
    topic: string;
    subtopics: string[];
  }>;
}

export function ForceDirectedMindMap({ centralConcept, initialBranches }: ForceDirectedMindMapProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSimulating, setIsSimulating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

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

  // Initialize nodes with better positioning
  useEffect(() => {
    if (initialBranches.length === 0) return;

    const containerWidth = 600;
    const containerHeight = 400;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // Create central node
    const centralNode: Node = {
      id: 'central',
      title: centralConcept,
      subtopics: [],
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      color: 'hsl(var(--primary))',
      level: 0,
      radius: 40
    };

    // Create branch nodes with random initial positions
    const branchNodes: Node[] = initialBranches.map((branch, index) => {
      const angle = (index * 2 * Math.PI) / initialBranches.length;
      const radius = 120 + Math.random() * 60;
      const x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 40;
      const y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 40;

      return {
        id: `node-${index}`,
        title: branch.topic,
        subtopics: branch.subtopics,
        x,
        y,
        vx: 0,
        vy: 0,
        color: colors[index % colors.length],
        level: 1,
        radius: 30
      };
    });

    setNodes([centralNode, ...branchNodes]);
    setIsSimulating(true);
  }, [initialBranches, centralConcept]);

  // Force-directed layout simulation
  const simulateForces = useCallback(() => {
    if (!isSimulating || nodes.length < 2) return;

    setNodes(prevNodes => {
      const newNodes = [...prevNodes];
      const alpha = 0.1;
      const centerForce = 0.02;
      const repelForce = 800;
      const linkForce = 0.1;
      const damping = 0.9;

      newNodes.forEach((node, i) => {
        if (node.id === 'central') return;

        let fx = 0;
        let fy = 0;

        // Repulsion between nodes
        newNodes.forEach((other, j) => {
          if (i === j) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0 && distance < 200) {
            const repulsion = repelForce / (distance * distance);
            fx += (dx / distance) * repulsion;
            fy += (dy / distance) * repulsion;
          }
        });

        // Attraction to center for stability
        const centerNode = newNodes.find(n => n.id === 'central');
        if (centerNode) {
          const dx = centerNode.x - node.x;
          const dy = centerNode.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const idealDistance = 150;
          
          if (distance !== idealDistance) {
            const attraction = linkForce * (distance - idealDistance);
            fx += (dx / distance) * attraction;
            fy += (dy / distance) * attraction;
          }
        }

        // Boundary forces
        const margin = 50;
        if (node.x < margin) fx += centerForce * (margin - node.x);
        if (node.x > 600 - margin) fx -= centerForce * (node.x - (600 - margin));
        if (node.y < margin) fy += centerForce * (margin - node.y);
        if (node.y > 400 - margin) fy -= centerForce * (node.y - (400 - margin));

        // Update velocity and position
        node.vx = (node.vx + fx * alpha) * damping;
        node.vy = (node.vy + fy * alpha) * damping;
        node.x += node.vx;
        node.y += node.vy;
      });

      return newNodes;
    });
  }, [nodes, isSimulating]);

  // Animation loop
  useEffect(() => {
    if (!isSimulating) return;

    const animate = () => {
      simulateForces();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    // Stop simulation after 5 seconds
    const timer = setTimeout(() => {
      setIsSimulating(false);
    }, 5000);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearTimeout(timer);
    };
  }, [simulateForces, isSimulating]);

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

  const addNode = () => {
    const centerNode = nodes.find(n => n.id === 'central');
    if (!centerNode) return;

    const angle = Math.random() * 2 * Math.PI;
    const radius = 150 + Math.random() * 50;
    const x = centerNode.x + Math.cos(angle) * radius;
    const y = centerNode.y + Math.sin(angle) * radius;
    
    const newNode: Node = {
      id: `node-${Date.now()}`,
      title: 'New Topic',
      subtopics: ['Add subtopic'],
      x,
      y,
      vx: 0,
      vy: 0,
      color: colors[nodes.length % colors.length],
      level: 1,
      radius: 30
    };
    
    setNodes([...nodes, newNode]);
    setEditingNode(newNode.id);
    setIsSimulating(true);
    
    // Auto-stop simulation
    setTimeout(() => setIsSimulating(false), 3000);
  };

  const resetLayout = () => {
    const containerWidth = 600;
    const containerHeight = 400;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    setNodes(prevNodes => {
      return prevNodes.map((node, index) => {
        if (node.id === 'central') {
          return { ...node, x: centerX, y: centerY, vx: 0, vy: 0 };
        }
        
        const angle = ((index - 1) * 2 * Math.PI) / (prevNodes.length - 1);
        const radius = 150;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        return { ...node, x, y, vx: 0, vy: 0 };
      });
    });
    
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 3000);
  };

  const updateNodeTitle = (id: string, title: string) => {
    setNodes(nodes.map(node => 
      node.id === id ? { ...node, title } : node
    ));
  };

  const removeNode = (id: string) => {
    if (id === 'central') return;
    setNodes(nodes.filter(node => node.id !== id));
    if (selectedNode === id) setSelectedNode(null);
    if (editingNode === id) setEditingNode(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          Force-Directed Mind Map
        </CardTitle>
        <CardDescription>
          Interactive mind map with physics-based layout for {centralConcept}
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
            onClick={resetLayout}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
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
          className="relative h-96 bg-gradient-to-br from-background to-muted/10 rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          <div 
            className="absolute inset-0 transition-transform duration-300"
            style={{ 
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center'
            }}
          >
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
              {nodes.map((node) => {
                if (node.id === 'central') return null;
                const centralNode = nodes.find(n => n.id === 'central');
                if (!centralNode) return null;
                
                return (
                  <line
                    key={`line-${node.id}`}
                    x1={centralNode.x}
                    y1={centralNode.y}
                    x2={node.x}
                    y2={node.y}
                    stroke={node.color}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                );
              })}
            </svg>

            {/* Node elements */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: node.x - 80,
                  top: node.y - 40,
                  width: 160,
                  zIndex: node.id === 'central' ? 10 : 5
                }}
              >
                <div 
                  className={`relative bg-background border-2 rounded-lg p-3 shadow-lg cursor-pointer transition-all hover:shadow-xl ${
                    selectedNode === node.id ? 'ring-2 ring-primary scale-105' : ''
                  } ${isSimulating ? 'pointer-events-none' : ''}`}
                  style={{ 
                    borderColor: node.color,
                    minHeight: node.id === 'central' ? '60px' : '50px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    {editingNode === node.id ? (
                      <Input
                        value={node.title}
                        onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                        onBlur={() => setEditingNode(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingNode(null)}
                        className="text-sm font-semibold h-6 border-none p-0"
                        autoFocus
                      />
                    ) : (
                      <h4 
                        className={`font-semibold text-sm cursor-pointer flex-1 ${
                          node.id === 'central' ? 'text-center text-primary' : ''
                        }`}
                        style={{ color: node.id === 'central' ? undefined : node.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNode(node.id);
                        }}
                      >
                        {node.title}
                      </h4>
                    )}
                    
                    {node.id !== 'central' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 text-destructive ml-2 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNode(node.id);
                        }}
                      >
                        ×
                      </Button>
                    )}
                  </div>

                  {node.subtopics.length > 0 && node.id !== 'central' && (
                    <div className="text-xs text-muted-foreground">
                      {node.subtopics.slice(0, 2).join(', ')}
                      {node.subtopics.length > 2 && '...'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Simulation indicator */}
          {isSimulating && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded animate-pulse">
              Organizing layout...
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <p>🔄 Physics simulation arranges nodes automatically for optimal spacing</p>
          <p>🎯 Click nodes to select, drag background to pan, use controls to zoom</p>
        </div>
      </CardContent>
    </Card>
  );
}