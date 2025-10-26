import type { Post, TopicKey, PostLifetimeOption } from '../types/post';
import { generatePostId, generateStudentId } from './utils';

export const helplines = [
  { name: 'Aasra Suicide Prevention Helpline', phone: '91-9820466726' },
  { name: 'Kiran Mental Health Helpline', phone: '1800-599-0019' },
  { name: 'Snehi 24x7 Helpline', phone: '91-9582208181' },
  { name: 'iCall Psychosocial Helpline', phone: '9152987821' },
];

export const colleges = [
  'IIT Delhi',
  'IIT Bombay',
  'BITS Pilani',
  'DU (Delhi University)',
  'JNU (Jawaharlal Nehru University)',
  'NIT Trichy',
  'IIT Madras',
  'VIT Vellore',
  'Manipal Institute of Technology',
  'AIIMS Delhi',
];

export const topics: TopicKey[] = [
  'Mental Health',
  'Academic Pressure',
  'Social Issues',
  'Ragging',
  'Corruption/Whistleblowing',
  'Other',
];

export const topicColors: Record<TopicKey, string> = {
  'Mental Health': 'bg-purple-500 text-white',
  'Academic Pressure': 'bg-blue-500 text-white',
  'Social Issues': 'bg-green-500 text-white',
  Ragging: 'bg-red-500 text-white',
  'Corruption/Whistleblowing': 'bg-orange-500 text-white',
  Other: 'bg-gray-500 text-white',
};

export const postLifetimeOptions: PostLifetimeOption[] = [
  { label: '1 hour', value: '1h', durationMs: 60 * 60 * 1000 },
  { label: '6 hours', value: '6h', durationMs: 6 * 60 * 60 * 1000 },
  { label: '24 hours', value: '24h', durationMs: 24 * 60 * 60 * 1000 },
  { label: '7 days', value: '7d', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', value: '30d', durationMs: 30 * 24 * 60 * 60 * 1000 },
  { label: 'Custom date', value: 'custom' },
  { label: 'Never', value: 'never' },
];

export const reactionEmojis = [
  { type: 'heart' as const, emoji: '❤️', label: 'Heart' },
  { type: 'fire' as const, emoji: '🔥', label: 'Fire' },
  { type: 'clap' as const, emoji: '👏', label: 'Clap' },
  { type: 'sad' as const, emoji: '😢', label: 'Sad' },
  { type: 'angry' as const, emoji: '😡', label: 'Angry' },
  { type: 'laugh' as const, emoji: '😂', label: 'Laugh' },
];

const samplePostsData: Array<{
  content: string;
  topic: TopicKey;
  college: string;
  imageUrl?: string;
}> = [
  {
    content:
      "Feeling overwhelmed with semester exams. Can't sleep, can't focus. Is anyone else going through this?",
    topic: 'Mental Health',
    college: 'IIT Delhi',
  },
  {
    content:
      'Been dealing with anxiety for months. Too scared to tell my parents. Anyone know good counselors near campus?',
    topic: 'Mental Health',
    college: 'VIT Vellore',
    imageUrl:
      'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?auto=format&fit=crop&w=900&q=80',
  },
  {
    content:
      'Failed my second year twice. Parents think I party all day. Truth is I can barely get out of bed most mornings.',
    topic: 'Mental Health',
    college: 'BITS Pilani',
  },
  {
    content:
      "Haven't left my hostel room in 3 days. Missing classes because I have zero energy. Feels like I'm drowning in silence.",
    topic: 'Mental Health',
    college: 'DU (Delhi University)',
    imageUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  },
  {
    content:
      "Found out my best friend attempted suicide last week. They're in hospital now. I had no idea they were struggling. Feel so guilty.",
    topic: 'Mental Health',
    college: 'IIT Bombay',
  },
  {
    content:
      "CGPA dropped from 8.5 to 6.2 this semester. Parents will disown me. Can't handle the pressure anymore.",
    topic: 'Academic Pressure',
    college: 'IIT Bombay',
  },
  {
    content:
      'Lost my scholarship due to low grades. Working part-time to pay fees now. Balancing work and studies is killing me.',
    topic: 'Academic Pressure',
    college: 'JNU (Jawaharlal Nehru University)',
  },
  {
    content:
      'Got placed in a good company but completely burnt out. Four years of constant anxiety. Was it worth it?',
    topic: 'Academic Pressure',
    college: 'NIT Trichy',
    imageUrl:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
  },
  {
    content:
      'Struggling to keep up with five major projects at once. Professors act like we have infinite time and no personal lives.',
    topic: 'Academic Pressure',
    college: 'IIT Delhi',
  },
  {
    content:
      'Got 42/100 in a core subject even after studying all night for weeks. Scared I will lose the semester.',
    topic: 'Academic Pressure',
    college: 'Manipal Institute of Technology',
  },
  {
    content:
      "Broke up with my girlfriend. She's spreading false rumors about me. Entire hostel thinks I'm a creep now.",
    topic: 'Social Issues',
    college: 'IIT Madras',
  },
  {
    content:
      'Being bullied for my appearance. People call me ugly everyday. Started skipping meals to lose weight. This hurts so much.',
    topic: 'Social Issues',
    college: 'Manipal Institute of Technology',
  },
  {
    content:
      'Came out as gay to my roommate. Now they want to change rooms. Feel so alone and unwanted here.',
    topic: 'Social Issues',
    college: 'IIT Madras',
    imageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  },
  {
    content:
      'Friends stopped talking to me after I skipped one party. Feels like if I set boundaries I will lose everyone.',
    topic: 'Social Issues',
    college: 'VIT Vellore',
  },
  {
    content:
      'Cultural fest committee keeps ignoring first-year students. Tried to volunteer thrice; they laughed at my accent.',
    topic: 'Social Issues',
    college: 'DU (Delhi University)',
  },
  {
    content:
      'Senior students forced me to strip and dance. Threatened to release videos if I complain. I am broken.',
    topic: 'Ragging',
    college: 'NIT Trichy',
  },
  {
    content:
      'Hostel seniors made me drink until I blacked out. Woke up with injuries. Too ashamed to report. This ragging culture needs to end.',
    topic: 'Ragging',
    college: 'VIT Vellore',
    imageUrl:
      'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=900&q=80',
  },
  {
    content:
      'Seniors locked me in a room for six hours during ragging. Had a panic attack. Parents want me to change college but I have nowhere else to go.',
    topic: 'Ragging',
    college: 'IIT Bombay',
  },
  {
    content:
      "Professor asked for 'extra fees' to clear viva. This corruption needs to stop. How do we report this safely?",
    topic: 'Corruption/Whistleblowing',
    college: 'DU (Delhi University)',
  },
  {
    content:
      'Professor takes bribes to give good grades. Rich students paying 50k for assignments while we struggle with honest work.',
    topic: 'Corruption/Whistleblowing',
    college: 'Manipal Institute of Technology',
  },
  {
    content:
      'Preparing for GATE while attending daily labs is destroying my sleep cycle. Living on caffeine and panic.',
    topic: 'Academic Pressure',
    college: 'IIT Madras',
    imageUrl:
      'https://images.unsplash.com/photo-1512299287104-07aa577c7e17?auto=format&fit=crop&w=900&q=80',
  },
];

const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

const weightedCount = () => Math.floor(Math.pow(Math.random(), 1.4) * 500);

export const generateSamplePosts = (): Post[] => {
  return samplePostsData.map((data) => {
    const createdAt = Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);

    return {
      id: generatePostId(),
      studentId: generateStudentId(),
      content: data.content,
      college: data.college,
      topic: data.topic,
      reactions: {
        heart: weightedCount(),
        fire: weightedCount(),
        clap: weightedCount(),
        sad: weightedCount(),
        angry: weightedCount(),
        laugh: weightedCount(),
      },
      comments: [],
      commentCount: 0,
      createdAt,
      expiresAt: createdAt + thirtyDaysMs,
      imageUrl: data.imageUrl ?? null,
    };
  });
};
