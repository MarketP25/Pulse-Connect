// Chart Components for Pulsco Admin Governance System
// Built with Recharts for data visualization

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { Card } from '@pulsco/admin-ui-core';

export interface ChartDataPoint {
  [key: string]: any;
}

export interface ChartProps {
  data: ChartDataPoint[];
  width?: number | string;
  height?: number | string;
  className?: string;
}

export interface LineChartProps extends ChartProps {
  xKey: string;
  yKeys: string[];
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
}

export const MetricLineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  yKeys,
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'],
  width = '100%',
  height = 300,
  showGrid = true,
  showLegend = true,
  className = ''
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          {yKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface AreaChartProps extends ChartProps {
  xKey: string;
  yKeys: string[];
  colors?: string[];
  stacked?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
}

export const MetricAreaChart: React.FC<AreaChartProps> = ({
  data,
  xKey,
  yKeys,
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'],
  stacked = false,
  width = '100%',
  height = 300,
  showGrid = true,
  showLegend = true,
  className = ''
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <AreaChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          {yKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId={stacked ? '1' : undefined}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface BarChartProps extends ChartProps {
  xKey: string;
  yKeys: string[];
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
}

export const MetricBarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKeys,
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'],
  width = '100%',
  height = 300,
  showGrid = true,
  showLegend = true,
  className = ''
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          {yKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface PieChartProps extends ChartProps {
  dataKey: string;
  nameKey: string;
  colors?: string[];
}

export const MetricPieChart: React.FC<PieChartProps> = ({
  data,
  dataKey,
  nameKey,
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000', '#00ff00'],
  width = '100%',
  height = 300,
  className = ''
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface ScatterChartProps extends ChartProps {
  xKey: string;
  yKey: string;
  zKey?: string;
  color?: string;
  showGrid?: boolean;
}

export const MetricScatterChart: React.FC<ScatterChartProps> = ({
  data,
  xKey,
  yKey,
  zKey,
  color = '#8884d8',
  width = '100%',
  height = 300,
  showGrid = true,
  className = ''
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <ScatterChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis dataKey={yKey} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter
            dataKey={zKey || yKey}
            fill={color}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon,
  className = ''
}) => {
  const changeColor = change?.type === 'increase' ? 'text-green-600' :
                     change?.type === 'decrease' ? 'text-red-600' : 'text-gray-600';

  const changeIcon = change?.type === 'increase' ? '↑' :
                    change?.type === 'decrease' ? '↓' : '→';

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${changeColor}`}>
              {changeIcon} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export interface HeatmapProps {
  data: number[][];
  xLabels: string[];
  yLabels: string[];
  colors?: string[];
  className?: string;
}

export const MetricHeatmap: React.FC<HeatmapProps> = ({
  data,
  xLabels,
  yLabels,
  colors = ['#f7fbff', '#08306b'],
  className = ''
}) => {
  const maxValue = Math.max(...data.flat());
  const minValue = Math.min(...data.flat());

  const getColor = (value: number) => {
    const intensity = (value - minValue) / (maxValue - minValue);
    const colorIndex = Math.floor(intensity * (colors.length - 1));
    return colors[colorIndex];
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="inline-block min-w-full">
        <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${xLabels.length}, 1fr)` }}>
          <div></div>
          {xLabels.map((label, index) => (
            <div key={index} className="text-xs font-medium text-gray-600 text-center p-2">
              {label}
            </div>
          ))}
          {yLabels.map((yLabel, yIndex) => (
            <React.Fragment key={yIndex}>
              <div className="text-xs font-medium text-gray-600 p-2 flex items-center">
                {yLabel}
              </div>
              {data[yIndex].map((value, xIndex) => (
                <div
                  key={xIndex}
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: getColor(value) }}
                  title={`${yLabel} - ${xLabels[xIndex]}: ${value}`}
                ></div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
