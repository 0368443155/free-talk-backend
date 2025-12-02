'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  data: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

const COLORS: Record<string, string> = {
  excellent: '#10b981',
  good: '#3b82f6',
  fair: '#f59e0b',
  poor: '#ef4444',
};

export function QualityDistribution({ data }: Props) {
  const chartData = [
    { name: 'Excellent', value: data.excellent },
    { name: 'Good', value: data.good },
    { name: 'Fair', value: data.fair },
    { name: 'Poor', value: data.poor },
  ].filter(d => d.value > 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Quality Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase()]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

