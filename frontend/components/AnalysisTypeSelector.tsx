import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Zap, TrendingUp } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';
import { useToast } from '@/components/ui/use-toast';

interface AnalysisTypeSelectorProps {
  ideaId: number;
  ideaTitle: string;
  onAnalysisStart: () => void;
  onAnalysisComplete: (analysis: any, type: 'basic' | 'startup') => void;
}

export function AnalysisTypeSelector({ 
  ideaId, 
  ideaTitle, 
  onAnalysisStart, 
  onAnalysisComplete 
}: AnalysisTypeSelectorProps) {
  const [selectedTrackType, setSelectedTrackType] = useState<string>('saas');
  const [selectedAnalysisDepth, setSelectedAnalysisDepth] = useState<string>('standard');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const backend = useBackend();
  const { toast } = useToast();

  const handleBasicAnalysis = async () => {
    setIsAnalyzing(true);
    onAnalysisStart();
    
    try {
      console.log('Starting basic analysis...');
      const result = await backend.ai.analyze({
        idea_id: ideaId,
        track_type: selectedTrackType as "saas" | "content" | "ecom"
      });
      
      onAnalysisComplete(result, 'basic');
      toast({
        title: 'Analysis Complete',
        description: `Basic analysis completed for "${ideaTitle}"`,
      });
    } catch (error) {
      console.error('Basic analysis failed:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to complete basic analysis. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartupAnalysis = async () => {
    setIsAnalyzing(true);
    onAnalysisStart();
    
    try {
      console.log('Starting startup analysis...');
      const result = await backend.ai.analyzeStartup({
        idea_id: ideaId,
        analysis_depth: selectedAnalysisDepth as "standard" | "deep" | "executive"
      });
      
      onAnalysisComplete(result, 'startup');
      toast({
        title: 'Startup Analysis Complete',
        description: `VC-grade analysis completed for "${ideaTitle}"`,
      });
    } catch (error) {
      console.error('Startup analysis failed:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to complete startup analysis. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Choose Analysis Type
        </CardTitle>
        <p className="text-muted-foreground">
          Select the type of analysis that best fits your needs
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              Basic Analysis
            </TabsTrigger>
            <TabsTrigger value="startup" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Startup Analysis
              <Badge variant="secondary" className="text-xs">VC-Grade</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Basic Business Analysis</h3>
              <p className="text-blue-800 text-sm mb-3">
                Quick validation with numerical scores across 6 key dimensions including market potential, 
                competition, feasibility, and monetization with cost estimates.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1">
                    Business Track
                  </label>
                  <Select value={selectedTrackType} onValueChange={setSelectedTrackType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="ecom">E-commerce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleBasicAnalysis} 
                  disabled={isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Start Basic Analysis'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="startup" className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">
                VC-Grade Startup Validation
                <Badge variant="outline" className="ml-2 text-purple-700 border-purple-300">
                  Premium
                </Badge>
              </h3>
              <p className="text-purple-800 text-sm mb-3">
                Comprehensive 8-dimension analysis using venture capital frameworks. Includes market sizing, 
                competitive intelligence, customer validation, and actionable next steps.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-purple-900 mb-1">
                    Analysis Depth
                  </label>
                  <Select value={selectedAnalysisDepth} onValueChange={setSelectedAnalysisDepth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">
                        <div className="flex flex-col">
                          <span>Standard</span>
                          <span className="text-xs text-muted-foreground">Comprehensive analysis</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="deep">
                        <div className="flex flex-col">
                          <span>Deep Dive</span>
                          <span className="text-xs text-muted-foreground">In-depth market research</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="executive">
                        <div className="flex flex-col">
                          <span>Executive</span>
                          <span className="text-xs text-muted-foreground">Board-ready analysis</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleStartupAnalysis} 
                  disabled={isAnalyzing}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Start Startup Analysis'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-gray-900 mb-2">Analysis Comparison</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-800">Basic Analysis</h5>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>• 6 scoring dimensions</li>
                <li>• Cost estimates</li>
                <li>• 5-10 minute analysis</li>
                <li>• General recommendations</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-800">Startup Analysis</h5>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>• 8 VC framework dimensions</li>
                <li>• Actionable insights</li>
                <li>• Investment-grade analysis</li>
                <li>• Strategic next steps</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}