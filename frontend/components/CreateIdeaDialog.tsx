import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';

export default function CreateIdeaDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source: '',
    source_url: ''
  });
  
  const backend = useBackend();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return backend.ideas.create(data);
    },
    onSuccess: () => {
      toast({
        title: "Idea created successfully",
        description: "Your idea has been added for validation.",
      });
      setOpen(false);
      setFormData({ title: '', description: '', source: '', source_url: '' });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
    onError: (error) => {
      console.error('Error creating idea:', error);
      toast({
        title: "Error creating idea",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.source) {
      toast({
        title: "Missing required fields",
        description: "Please fill in the title and source.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Idea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Idea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter idea title"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your idea"
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="source">Source *</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reddit">Reddit</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="producthunt">Product Hunt</SelectItem>
                <SelectItem value="g2">G2</SelectItem>
                <SelectItem value="crunchbase">Crunchbase</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="patents">Patents</SelectItem>
                <SelectItem value="manual">Manual Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="source_url">Source URL</Label>
            <Input
              id="source_url"
              type="url"
              value={formData.source_url}
              onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
              placeholder="https://..."
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Idea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
