export interface Helpline {
  id: string;
  name: string;
  number: string;
  hours: string;
  category: string;
  description: string;
  languages: string[];
  website?: string;
  trusted: boolean;
  badge?: string;
}

export const helplines: Helpline[] = [
  {
    id: 'aasra',
    name: 'AASRA',
    number: '+91-22-27546669',
    hours: '24/7',
    category: 'Suicide Prevention',
    description: 'Suicide prevention and emotional support hotline',
    languages: ['English', 'Hindi'],
    website: 'http://www.aasra.info',
    trusted: true,
  },
  {
    id: 'vandrevala',
    name: 'Vandrevala Foundation',
    number: '1860-2662-345',
    hours: '24/7',
    category: 'Mental Health',
    description: 'Free 24/7 mental health crisis support',
    languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Marathi'],
    website: 'https://www.vandrevalafoundation.com',
    trusted: true,
  },
  {
    id: 'kiran',
    name: 'KIRAN (Government of India)',
    number: '1800-599-0019',
    hours: '24/7',
    category: 'Mental Health',
    description: 'Ministry of Health mental health support',
    languages: ['All Indian languages'],
    website: 'https://www.mohfw.gov.in',
    trusted: true,
    badge: 'Government',
  },
  {
    id: 'sumaitri',
    name: 'Sumaitri',
    number: '011-23389090',
    hours: '2 PM - 10 PM',
    category: 'Emotional Support',
    description: 'Delhi-based emotional support helpline',
    languages: ['English', 'Hindi'],
    website: 'http://sumaitri.net',
    trusted: true,
  },
  {
    id: 'mann-talks',
    name: 'Mann Talks',
    number: '+91-8686139139',
    hours: '10 AM - 6 PM (Mon-Fri)',
    category: 'Mental Health',
    description: 'Shanthi Mahaila Sangha mental health helpline',
    languages: ['English', 'Hindi', 'Kannada'],
    website: 'https://manntalks.org',
    trusted: true,
  },
  {
    id: 'fortis-stress',
    name: 'Fortis Stress Helpline',
    number: '+91-8376804102',
    hours: '24/7',
    category: 'Stress & Anxiety',
    description: 'Professional stress and anxiety support',
    languages: ['English', 'Hindi'],
    trusted: true,
  },
  {
    id: 'mitram',
    name: 'Mitram Foundation',
    number: '+91-080-25722573',
    hours: '10 AM - 6 PM',
    category: 'Suicide Prevention',
    description: 'Bangalore-based suicide prevention helpline',
    languages: ['English', 'Kannada', 'Hindi'],
    website: 'http://www.mitramfoundation.org',
    trusted: true,
  },
  {
    id: 'parivarthan',
    number: '+91-7676602602',
    name: 'Parivarthan Counselling',
    hours: '2 PM - 7 PM',
    category: 'Counselling',
    description: 'Professional counselling support',
    languages: ['English', 'Kannada'],
    trusted: true,
  },
  {
    id: 'sneha',
    name: 'Sneha India',
    number: '044-24640050',
    hours: '24/7',
    category: 'Suicide Prevention',
    description: 'Chennai-based suicide prevention center',
    languages: ['English', 'Tamil'],
    website: 'http://snehaindia.org',
    trusted: true,
  },
  {
    id: 'cooj',
    name: 'Cooj Mental Health Foundation',
    number: '+91-8322252525',
    hours: '1 PM - 9 PM',
    category: 'Mental Health',
    description: 'Goa-based mental health support',
    languages: ['English', 'Hindi', 'Konkani'],
    website: 'http://www.cooj.org',
    trusted: true,
  },
];
