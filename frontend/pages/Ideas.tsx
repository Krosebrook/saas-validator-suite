import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';
import CreateIdeaDialog from '../components/CreateIdeaDialog';
import IdeaCard from '../components/IdeaCard';

export default function IdeasPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const backend = useBackend();

  const { data: ideasData, isLoading } = useQuery({
    queryKey: ['ideas', statusFilter],
    queryFn: () => backend.ideas.list({ 
      limit: 50,
      status: statusFilter === 'all' ? undefined : statusFilter 
    }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ideas</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your SaaS ideas with AI-powered validation.
          </p>
        </div>
        <CreateIdeaDialog />
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ideas</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="analyzing">Analyzing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ideas Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-4"></div>
                <div className="h-3 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : ideasData?.ideas.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideasData.ideas.map((idea) => (
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
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lightbulb className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-medium text-foreground mb-2">No ideas found</h3>
            <p className="text-muted-foreground text-center mb-6">
              {statusFilter === 'all' 
                ? "You haven't added any ideas yet. Start by creating your first SaaS idea."
                : `No ideas with status "${statusFilter}" found. Try changing the filter.`
              }
            </p>
            <CreateIdeaDialog />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
