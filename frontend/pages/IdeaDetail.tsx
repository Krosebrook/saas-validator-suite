import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Brain, DollarSign, Shield, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';
import ScoreCard from '../components/ScoreCard';

export default function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const [trackType, setTrackType] = useState<'saas' | 'content' | 'ecom'>('saas');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  
  const backend = useBackend();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: idea, isLoading } = useQuery({
    queryKey: ['ideas', id],
    queryFn: () => backend.ideas.get({ id: parseInt(id!) }),
    enabled: !!id,
  });

  const analyzeMutation = useMutation({
    mutationFn: (trackType: 'saas' | 'content' | 'ecom') => 
      backend.ai.analyze({ idea_id: parseInt(id!), track_type: trackType }),
    onSuccess: () => {
      toast({
        title: "Analysis complete",
        description: "Your idea has been analyzed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['ideas', id] });
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const complianceMutation = useMutation({
    mutationFn: () => backend.compliance.scan({ idea_id: parseInt(id!) }),
    onSuccess: () => {
      toast({
        title: "Compliance scan complete",
        description: "Your idea has been scanned for compliance issues.",
      });
      queryClient.invalidateQueries({ queryKey: ['ideas', id] });
    },
    onError: (error) => {
      console.error('Compliance scan error:', error);
      toast({
        title: "Compliance scan failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: (feedback: { feedback_type: string; notes?: string }) =>
      backend.scoring.submitFeedback({
        idea_id: parseInt(id!),
        feedback_type: feedback.feedback_type as any,
        notes: feedback.notes,
      }),
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });
      setFeedbackNotes('');
    },
    onError: (error) => {
      console.error('Feedback error:', error);
      toast({
        title: "Failed to submit feedback",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground">Idea not found</h2>
        <p className="text-muted-foreground">The idea you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{idea.title}</h1>
          {idea.description && (
            <p className="text-muted-foreground">{idea.description}</p>
          )}
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{idea.source}</Badge>
            <Badge className={idea.status === 'completed' ? 'bg-green-100 text-green-800' : ''}>
              {idea.status}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Select value={trackType} onValueChange={(value: any) => setTrackType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="ecom">E-commerce</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => analyzeMutation.mutate(trackType)}
              disabled={analyzeMutation.isPending}
            >
              <Brain className="h-4 w-4 mr-2" />
              {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
          <Button 
            variant="outline"
            onClick={() => complianceMutation.mutate()}
            disabled={complianceMutation.isPending}
            className="w-full"
          >
            <Shield className="h-4 w-4 mr-2" />
            {complianceMutation.isPending ? 'Scanning...' : 'Compliance Scan'}
          </Button>
        </div>
      </div>

      {/* Scores */}
      {idea.score && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Validation Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <ScoreCard
              title="Overall Score"
              score={idea.score.overall_score || 0}
              className="md:col-span-2"
            />
            <ScoreCard
              title="Market Potential"
              score={idea.score.market_potential || 0}
            />
            <ScoreCard
              title="Competition"
              score={100 - (idea.score.competition_level || 0)}
            />
            <ScoreCard
              title="Tech Feasibility"
              score={idea.score.technical_feasibility || 0}
            />
            <ScoreCard
              title="Monetization"
              score={idea.score.monetization_potential || 0}
            />
          </div>
        </div>
      )}

      {/* Cost Estimates */}
      {idea.cost_estimate && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Cost Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Development Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${idea.cost_estimate.development_cost?.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">One-time investment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${(idea.cost_estimate.infrastructure_cost || 0) + (idea.cost_estimate.operational_cost || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Infrastructure + Operations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Break-even
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {idea.cost_estimate.break_even_months} months
                </div>
                <p className="text-xs text-muted-foreground">
                  ROI: {idea.cost_estimate.roi_estimate}%
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {idea.score?.ai_analysis && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {idea.score.ai_analysis}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Provide Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => feedbackMutation.mutate({ feedback_type: 'thumbs_up' })}
              disabled={feedbackMutation.isPending}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Helpful
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => feedbackMutation.mutate({ feedback_type: 'thumbs_down' })}
              disabled={feedbackMutation.isPending}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Not Helpful
            </Button>
          </div>
          
          <div className="space-y-2">
            <Textarea
              placeholder="Add notes about this analysis..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              rows={3}
            />
            <Button
              onClick={() => feedbackMutation.mutate({ 
                feedback_type: 'note', 
                notes: feedbackNotes 
              })}
              disabled={!feedbackNotes.trim() || feedbackMutation.isPending}
              size="sm"
            >
              Submit Notes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
