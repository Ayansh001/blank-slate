
import React, { useState, useRef, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { PieSliceTooltip } from './PieSliceTooltip';

interface DataItem {
  name: string;
  value: number;
  color: string;
}

interface EnhancedPieChartProps {
  data: DataItem[];
}

export function EnhancedPieChart({ data }: EnhancedPieChartProps) {
  const [tooltip, setTooltip] = useState<{
    isVisible: boolean;
    title: string;
    percentage: number;
    count: number;
    x: number;
    y: number;
  }>({
    isVisible: false,
    title: '',
    percentage: 0,
    count: 0,
    x: 0,
    y: 0,
  });

  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  const handleSliceEnter = useCallback((data: any, index: number, event: any) => {
    if (!chartRef.current || !event) return;

    const chartRect = chartRef.current.getBoundingClientRect();
    const centerX = chartRect.left + chartRect.width / 2;
    const centerY = chartRect.top + chartRect.height / 2;

    // Calculate slice center position
    const angle = (data.startAngle + data.endAngle) / 2;
    const radian = (angle * Math.PI) / 180;
    const radius = 90; // Approximate pie radius
    
    const sliceX = centerX + Math.cos(radian) * radius * 0.7;
    const sliceY = centerY + Math.sin(radian) * radius * 0.7;

    const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;

    setTooltip({
      isVisible: true,
      title: data.name,
      percentage,
      count: data.value,
      x: sliceX,
      y: sliceY,
    });

    setHoveredIndex(index);
  }, [totalValue]);

  const handleSliceLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, isVisible: false }));
    setHoveredIndex(null);
  }, []);

  const handleSliceClick = useCallback((data: any, index: number, event: any) => {
    // For mobile, toggle tooltip on click
    if (hoveredIndex === index && tooltip.isVisible) {
      handleSliceLeave();
    } else {
      handleSliceEnter(data, index, event);
    }
  }, [hoveredIndex, tooltip.isVisible, handleSliceEnter, handleSliceLeave]);

  return (
    <div ref={chartRef} className="relative">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            onMouseEnter={handleSliceEnter}
            onMouseLeave={handleSliceLeave}
            onClick={handleSliceClick}
          >
            {data.map((entry, index) => {
              const isHovered = hoveredIndex === index;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={isHovered ? entry.color : 'transparent'}
                  strokeWidth={isHovered ? 2 : 0}
                  style={{
                    filter: isHovered ? 'brightness(1.1)' : 'none',
                    cursor: 'pointer',
                    transformOrigin: 'center',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 160ms ease-out',
                  }}
                />
              );
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <PieSliceTooltip
        isVisible={tooltip.isVisible}
        title={tooltip.title}
        percentage={tooltip.percentage}
        count={tooltip.count}
        x={tooltip.x}
        y={tooltip.y}
        onClose={() => setTooltip(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}
