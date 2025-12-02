'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  time: string;
  upload: number;
  download: number;
  youtube?: number;
}

interface Props {
  data: DataPoint[];
}

export function BandwidthChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bandwidth Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis label={{ value: 'kbps', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="upload" 
              stroke="#10b981" 
              name="Upload"
              strokeWidth={2}
            />
                  <Line
                    type="monotone"
                    dataKey="download"
                    stroke="#3b82f6"
                    name="Download"
                    strokeWidth={2}
                  />
                  {data.some(d => d.youtube && d.youtube > 0) && (
                    <Line
                      type="monotone"
                      dataKey="youtube"
                      stroke="#a855f7"
                      name="YouTube"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

