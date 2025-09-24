import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Brain, DollarSign, Shield, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';
import ScoreCard from '../components/ScoreCard';
import { AnalysisTypeSelector } from '../components/AnalysisTypeSelector';
import { StartupAnalysisDisplay } from '../components/StartupAnalysisDisplay';

export default function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [basicAnalysis, setBasicAnalysis] = useState<any>(null);
  const [startupAnalysis, setStartupAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('selector');
  
  const backend = useBackend();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: idea, isLoading } = useQuery({
    queryKey: ['ideas', id],
    queryFn: () => backend.ideas.get({ id: parseInt(id!) }),
    enabled: !!id,
  });

  const handleAnalysisStart = () => {
    setIsAnalyzing(true);
  };

  const handleAnalysisComplete = (analysis: any, type: 'basic' | 'startup') => {
    setIsAnalyzing(false);
    
    if (type === 'basic') {
      setBasicAnalysis(analysis);
      setActiveTab('basic');
    } else {
      setStartupAnalysis(analysis);
      setActiveTab('startup');
    }
    
    queryClient.invalidateQueries({ queryKey: ['ideas', id] });
  };

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
          <Button 
            variant="outline"
            onClick={() => complianceMutation.mutate()}
            disabled={complianceMutation.isPending}
          >
            <Shield className="h-4 w-4 mr-2" />
            {complianceMutation.isPending ? 'Scanning...' : 'Compliance Scan'}
          </Button>
        </div>
      </div>

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="selector">Choose Analysis</TabsTrigger>
          <TabsTrigger value="basic" disabled={!basicAnalysis}>Basic Results</TabsTrigger>
          <TabsTrigger value="startup" disabled={!startupAnalysis}>Startup Results</TabsTrigger>
        </TabsList>

        <TabsContent value="selector" className="mt-6">
          <AnalysisTypeSelector
            ideaId={parseInt(id!)}
            ideaTitle={idea.title}
            onAnalysisStart={handleAnalysisStart}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </TabsContent>

        <TabsContent value="basic" className="mt-6">
          {basicAnalysis && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Basic Analysis Results</h2>
                <Badge variant="outline">Traditional Scoring</Badge>
              </div>
              
              {/* Basic Analysis Scores */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <ScoreCard
                  title="Overall Score"
                  score={basicAnalysis.overall_score || 0}
                  className="md:col-span-2"
                />
                <ScoreCard
                  title="Market Potential"
                  score={basicAnalysis.market_potential || 0}
                />
                <ScoreCard
                  title="Competition"
                  score={100 - (basicAnalysis.competition_level || 0)}
                />
                <ScoreCard
                  title="Tech Feasibility"
                  score={basicAnalysis.technical_feasibility || 0}
                />
                <ScoreCard
                  title="Monetization"
                  score={basicAnalysis.monetization_potential || 0}
                />
              </div>

              {/* Cost Estimates */}
              {basicAnalysis.cost_estimate && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Cost Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Development Cost
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                          ${basicAnalysis.cost_estimate.development_cost?.toLocaleString()}
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
                          ${(basicAnalysis.cost_estimate.infrastructure_cost || 0) + (basicAnalysis.cost_estimate.operational_cost || 0)}
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
                          {basicAnalysis.cost_estimate.break_even_months} months
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ROI: {basicAnalysis.cost_estimate.roi_estimate}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {basicAnalysis.ai_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {basicAnalysis.ai_analysis}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="startup" className="mt-6">
          {startupAnalysis && (
            <StartupAnalysisDisplay
              analysis={startupAnalysis}
              ideaTitle={idea.title}
            />
          )}
        </TabsContent>
      </Tabs>

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
