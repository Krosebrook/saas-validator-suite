import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, DollarSign, Users } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';
import ScoreCard from '../components/ScoreCard';
import IdeaCard from '../components/IdeaCard';

export default function Dashboard() {
  const backend = useBackend();

  const { data: userProfile } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => backend.users.getProfile(),
  });

  const { data: recentIdeas } = useQuery({
    queryKey: ['ideas', 'recent'],
    queryFn: () => backend.ideas.list({ limit: 6 }),
  });

  const stats = [
    {
      title: 'Total Ideas',
      value: recentIdeas?.total || 0,
      icon: Lightbulb,
      description: 'Ideas analyzed',
    },
    {
      title: 'Average Score',
      value: recentIdeas?.ideas.length 
        ? Math.round(recentIdeas.ideas.reduce((acc, idea) => acc + (idea.overall_score || 0), 0) / recentIdeas.ideas.length)
        : 0,
      icon: TrendingUp,
      description: 'Across all ideas',
    },
    {
      title: 'Credits Remaining',
      value: userProfile?.credits_remaining || 0,
      icon: DollarSign,
      description: 'Analysis credits',
    },
    {
      title: 'Plan',
      value: userProfile?.plan || 'Free',
      icon: Users,
      description: 'Current subscription',
      isText: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your SaaS validation journey.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stat.isText ? stat.value : typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Ideas */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Ideas</h2>
        {recentIdeas?.ideas.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentIdeas.ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                id={idea.id}
                title={idea.title}
                description={idea.description}
                source={idea.source}
                status={idea.status}
                overallScore={idea.overall_score}
                createdAt={idea.created_at}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No ideas yet</h3>
              <p className="text-muted-foreground text-center">
                Start by adding your first SaaS idea to get AI-powered validation insights.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
