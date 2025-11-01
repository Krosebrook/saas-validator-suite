import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Idea } from '~backend/ideas/list';

export default function Compare() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: ideas } = useQuery({
    queryKey: ['ideas'],
    queryFn: async () => {
      const response = await backend.ideas.list();
      return response.ideas;
    }
  });

  const { data: comparison, isLoading: isComparing } = useQuery({
    queryKey: ['compare', selectedIds],
    queryFn: async () => {
      if (selectedIds.length < 2) return null;
      return backend.compare.compare({ ideaIds: selectedIds });
    },
    enabled: selectedIds.length >= 2
  });

  const toggleIdea = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const exportToCSV = () => {
    if (!comparison) return;

    const headers = ['Title', 'Score', 'Validation', 'Market Potential', 'Competition'];
    const rows = comparison.ideas.map(idea => [
      idea.title,
      idea.metrics.score ?? 'N/A',
      idea.metrics.validationScore ?? 'N/A',
      idea.metrics.marketPotential ?? 'N/A',
      idea.metrics.competitionLevel ?? 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'idea-comparison.csv';
    a.click();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Compare Ideas
        </h1>
        <p className="text-muted-foreground">
          Select 2 or more ideas to compare their metrics side-by-side
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-6">
          <h2 className="text-xl font-semibold mb-4">Select Ideas</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {ideas?.map(idea => (
              <label
                key={idea.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(idea.id)}
                  onCheckedChange={() => toggleIdea(idea.id)}
                />
                <span className="text-sm">{idea.title}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Comparison Matrix</h2>
            {comparison && (
              <Button onClick={exportToCSV} variant="outline" size="sm">
                Export CSV
              </Button>
            )}
          </div>

          {selectedIds.length < 2 && (
            <div className="text-center py-12 text-muted-foreground">
              Select at least 2 ideas to compare
            </div>
          )}

          {isComparing && (
            <div className="text-center py-12 text-muted-foreground">
              Loading comparison...
            </div>
          )}

          {comparison && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 sticky left-0 bg-background">
                      Metric
                    </th>
                    {comparison.ideas.map(idea => (
                      <th key={idea.id} className="text-left p-3 min-w-32">
                        {idea.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(comparison.ideas[0]?.metrics || {}).map(metric => (
                    <tr key={metric} className="border-b hover:bg-accent">
                      <td className="p-3 font-medium sticky left-0 bg-background capitalize">
                        {metric.replace(/([A-Z])/g, ' $1').trim()}
                      </td>
                      {comparison.ideas.map(idea => (
                        <td key={idea.id} className="p-3">
                          {formatMetric(idea.metrics[metric])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {comparison.deltas && Object.keys(comparison.deltas).length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-3">Deltas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(comparison.deltas).map(([metric, delta]: [string, any]) => (
                      <div key={metric} className="text-sm">
                        <div className="text-muted-foreground capitalize mb-1">
                          {metric.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="font-medium">
                          Range: {delta.range.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg: {delta.avg.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatMetric(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') return value.toFixed(2);
  return String(value);
}
