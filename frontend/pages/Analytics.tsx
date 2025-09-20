import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your validation insights and performance metrics.
        </p>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-6" />
          <h3 className="text-xl font-medium text-foreground mb-2">Analytics Coming Soon</h3>
          <p className="text-muted-foreground text-center max-w-md">
            We're building comprehensive analytics to help you track validation performance, 
            identify trends, and optimize your SaaS ideas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
