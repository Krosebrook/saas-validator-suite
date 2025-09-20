import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreCard from '../../components/ScoreCard';

describe('ScoreCard', () => {
  it('renders score correctly', () => {
    render(
      <ScoreCard title="Test Score" score={75} description="Test description" />
    );
    
    expect(screen.getByText('Test Score')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('applies correct color for high score', () => {
    render(<ScoreCard title="High Score" score={85} />);
    
    const scoreElement = screen.getByText('85');
    expect(scoreElement).toHaveClass('text-green-600');
  });

  it('applies correct color for medium score', () => {
    render(<ScoreCard title="Medium Score" score={65} />);
    
    const scoreElement = screen.getByText('65');
    expect(scoreElement).toHaveClass('text-yellow-600');
  });

  it('applies correct color for low score', () => {
    render(<ScoreCard title="Low Score" score={45} />);
    
    const scoreElement = screen.getByText('45');
    expect(scoreElement).toHaveClass('text-red-600');
  });
});
