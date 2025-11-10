import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMentorProfile, DEFAULT_MATCHING_WEIGHTS } from '../../../lib/mentorship';
import type { MatchExplanation } from '../../../lib/mentorship';
import MatchInsightPanel from '../MatchInsightPanel';

describe('MatchInsightPanel', () => {
  const mentor = createMentorProfile(
    'student1',
    'MIT',
    ['anxiety', 'academic_pressure'],
    { monday: ['morning', 'afternoon'], friday: ['evening'] }
  );
  mentor.displayName = 'Sarah Chen';
  mentor.karma = 750;
  mentor.rating = 4.8;
  mentor.streak = 12;
  mentor.bio = 'Experienced in helping students manage anxiety.';

  const explanation: MatchExplanation = {
    topicOverlapScore: 40,
    topicOverlapReason: '2 shared topics: anxiety, academic_pressure',
    collegeScore: 20,
    collegeReason: 'Same college: MIT',
    availabilityScore: 16,
    availabilityReason: '80% schedule compatibility',
    reputationScore: 9,
    reputationReason: 'Karma: 750, Rating: 4.8/5, Streak: 12 weeks',
    totalScore: 85,
    strengths: ['Strong topic alignment', 'Same college connection', 'Good schedule compatibility'],
    considerations: [],
    weights: DEFAULT_MATCHING_WEIGHTS,
  };

  it('should display mentor information', () => {
    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    expect(screen.getByText('MIT')).toBeInTheDocument();
  });

  it('should display match score prominently', () => {
    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Match Score')).toBeInTheDocument();
  });

  it('should display mentor stats', () => {
    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument();
    expect(screen.getByText('12w')).toBeInTheDocument();
  });

  it('should display score breakdown with progress bars', () => {
    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Topic Overlap')).toBeInTheDocument();
    expect(screen.getByText('College Similarity')).toBeInTheDocument();
    expect(screen.getByText('Availability Match')).toBeInTheDocument();
    expect(screen.getByText('Reputation')).toBeInTheDocument();
  });

  it('should display strengths', () => {
    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    expect(screen.getByText('Strengths')).toBeInTheDocument();
    expect(screen.getByText(/Strong topic alignment/)).toBeInTheDocument();
    expect(screen.getByText(/Same college connection/)).toBeInTheDocument();
    expect(screen.getByText(/Good schedule compatibility/)).toBeInTheDocument();
  });

  it('should not display strengths section if empty', () => {
    const explanationNoStrengths: MatchExplanation = {
      ...explanation,
      strengths: [],
    };

    render(<MatchInsightPanel mentor={mentor} explanation={explanationNoStrengths} />);

    const strengthsHeaders = screen.queryAllByText('Strengths');
    expect(strengthsHeaders.length).toBe(0);
  });

  it('should display considerations', () => {
    const explanationWithConsiderations: MatchExplanation = {
      ...explanation,
      considerations: ['Limited scheduling window', 'Developing mentor experience'],
    };

    render(<MatchInsightPanel mentor={mentor} explanation={explanationWithConsiderations} />);

    expect(screen.getByText('Considerations')).toBeInTheDocument();
    expect(screen.getByText(/Limited scheduling window/)).toBeInTheDocument();
    expect(screen.getByText(/Developing mentor experience/)).toBeInTheDocument();
  });

  it('should display mentor bio', () => {
    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    expect(screen.getByText('Bio')).toBeInTheDocument();
    expect(screen.getByText('Experienced in helping students manage anxiety.')).toBeInTheDocument();
  });

  it('should not display bio if not available', () => {
    const mentorNoBio = createMentorProfile(
      'student1',
      'MIT',
      ['anxiety'],
      { monday: ['morning'] }
    );

    render(<MatchInsightPanel mentor={mentorNoBio} explanation={explanation} />);

    expect(screen.queryByText('Bio')).not.toBeInTheDocument();
  });

  it('should call onBookClick when book button is clicked', async () => {
    const onBookClick = vi.fn();
    const user = userEvent.setup();

    render(<MatchInsightPanel mentor={mentor} explanation={explanation} onBookClick={onBookClick} />);

    const bookButton = screen.getByText('Book Session');
    await user.click(bookButton);

    expect(onBookClick).toHaveBeenCalledOnce();
  });

  it('should not display book button if onBookClick is not provided', () => {
    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    expect(screen.queryByText('Book Session')).not.toBeInTheDocument();
  });

  it('should display score breakdown reasons', () => {
    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    expect(screen.getByText('2 shared topics: anxiety, academic_pressure')).toBeInTheDocument();
    expect(screen.getByText('Same college: MIT')).toBeInTheDocument();
    expect(screen.getByText('80% schedule compatibility')).toBeInTheDocument();
  });

  it('should handle high match scores with appropriate color', () => {
    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    const scoreText = screen.getByText('85');
    expect(scoreText.closest('div')).toHaveClass('text-green-600');
  });

  it('should handle medium match scores with appropriate color', () => {
    const mediumExplanation: MatchExplanation = {
      ...explanation,
      totalScore: 70,
    };

    render(<MatchInsightPanel mentor={mentor} explanation={mediumExplanation} />);

    const scoreText = screen.getByText('70');
    expect(scoreText.closest('div')).toHaveClass('text-yellow-600');
  });

  it('should handle low match scores with appropriate color', () => {
    const lowExplanation: MatchExplanation = {
      ...explanation,
      totalScore: 45,
    };

    render(<MatchInsightPanel mentor={mentor} explanation={lowExplanation} />);

    const scoreText = screen.getByText('45');
    expect(scoreText.closest('div')).toHaveClass('text-orange-600');
  });

  it('should display mentor capacity', () => {
    mentor.maxMentees = 5;
    mentor.currentMentees = ['mentee1', 'mentee2'];

    render(<MatchInsightPanel mentor={mentor} explanation={explanation} />);

    expect(screen.getByText('3/5')).toBeInTheDocument();
  });
});
