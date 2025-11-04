import type {
  Community,
  CommunityChannel,
  CommunityChannelKind,
  CommunitySeed,
  CommunityPostMeta,
  CommunityActivity,
  CommunityNotificationSettings,
} from './types';

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateCommunityId = (code: string): string => `community-${code.toLowerCase()}`;

const generateChannelId = (communityCode: string, kind: CommunityChannelKind): string => 
  `channel-${communityCode.toLowerCase()}-${kind}`;

interface ChannelDefinition {
  kind: CommunityChannelKind;
  name: string;
  description: string;
  icon: string;
  order: number;
  isDefault: boolean;
  isLocked: boolean;
}

const CHANNEL_DEFINITIONS: ChannelDefinition[] = [
  {
    kind: 'general',
    name: 'General',
    description: 'General campus discussions and community hangout',
    icon: '💬',
    order: 1,
    isDefault: true,
    isLocked: false,
  },
  {
    kind: 'announcements',
    name: 'Announcements',
    description: 'Important campus news and official announcements',
    icon: '📢',
    order: 2,
    isDefault: false,
    isLocked: true,
  },
  {
    kind: 'academics',
    name: 'Academics',
    description: 'Study groups, exam prep, and course discussions',
    icon: '📚',
    order: 3,
    isDefault: false,
    isLocked: false,
  },
  {
    kind: 'mental_health',
    name: 'Mental Health',
    description: 'Safe space for mental health support and wellness',
    icon: '💚',
    order: 4,
    isDefault: false,
    isLocked: false,
  },
  {
    kind: 'events',
    name: 'Events',
    description: 'Campus events, meetups, and activity planning',
    icon: '🎉',
    order: 5,
    isDefault: false,
    isLocked: false,
  },
  {
    kind: 'career',
    name: 'Career',
    description: 'Internships, placements, and career guidance',
    icon: '💼',
    order: 6,
    isDefault: false,
    isLocked: false,
  },
  {
    kind: 'memes',
    name: 'Memes',
    description: 'Campus humor, memes, and lighthearted content',
    icon: '😂',
    order: 7,
    isDefault: false,
    isLocked: false,
  },
  {
    kind: 'resources',
    name: 'Resources',
    description: 'Study materials, notes, and helpful resources',
    icon: '📖',
    order: 8,
    isDefault: false,
    isLocked: false,
  },
  {
    kind: 'support',
    name: 'Support',
    description: 'Peer support, guidance, and helping each other',
    icon: '🤝',
    order: 9,
    isDefault: false,
    isLocked: false,
  },
];

interface CollegeData {
  code: string;
  name: string;
  city: string;
  state: string;
  description: string;
  tags: string[];
  rules: string[];
}

const INDIAN_COLLEGES: CollegeData[] = [
  {
    code: 'IIT-B',
    name: 'IIT Bombay',
    city: 'Mumbai',
    state: 'Maharashtra',
    description: 'Connect with fellow IIT Bombay students in a safe, anonymous space for mental health support and campus discussions.',
    tags: ['Engineering', 'Technology', 'Research', 'Mumbai'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'IIT-D',
    name: 'IIT Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    description: 'A supportive community for IIT Delhi students to share experiences and find peer support.',
    tags: ['Engineering', 'Technology', 'Research', 'Delhi'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'IIT-M',
    name: 'IIT Madras',
    city: 'Chennai',
    state: 'Tamil Nadu',
    description: 'Join IIT Madras students in open discussions about mental health and campus life.',
    tags: ['Engineering', 'Technology', 'Research', 'Chennai'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'IIT-K',
    name: 'IIT Kanpur',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    description: 'A welcoming space for IIT Kanpur students to seek support and connect with peers.',
    tags: ['Engineering', 'Technology', 'Research', 'Kanpur'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'IIT-KGP',
    name: 'IIT Kharagpur',
    city: 'Kharagpur',
    state: 'West Bengal',
    description: 'Connect with the IIT Kharagpur community for mental health support and academic guidance.',
    tags: ['Engineering', 'Technology', 'Research', 'West Bengal'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'BITS-P',
    name: 'BITS Pilani',
    city: 'Pilani',
    state: 'Rajasthan',
    description: 'BITS Pilani students supporting each other through academics and mental wellness.',
    tags: ['Engineering', 'Technology', 'Science', 'Pilani'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'AIIMS-D',
    name: 'AIIMS Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    description: 'A dedicated space for AIIMS Delhi medical students to find peer support and share experiences.',
    tags: ['Medical', 'Healthcare', 'Research', 'Delhi'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'DU',
    name: 'Delhi University',
    city: 'New Delhi',
    state: 'Delhi',
    description: 'Delhi University students connecting for mental health support and campus life discussions.',
    tags: ['Liberal Arts', 'Science', 'Commerce', 'Delhi'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'JNU',
    name: 'Jawaharlal Nehru University',
    city: 'New Delhi',
    state: 'Delhi',
    description: 'JNU students sharing experiences and supporting each other through academic and personal challenges.',
    tags: ['Social Sciences', 'Liberal Arts', 'Research', 'Delhi'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'BHU',
    name: 'Banaras Hindu University',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    description: 'BHU community connecting for peer support and mental wellness.',
    tags: ['Multidisciplinary', 'Research', 'Heritage', 'Varanasi'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'TISS',
    name: 'Tata Institute of Social Sciences',
    city: 'Mumbai',
    state: 'Maharashtra',
    description: 'TISS students fostering a supportive community for mental health and social causes.',
    tags: ['Social Sciences', 'Social Work', 'Research', 'Mumbai'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'NIT-T',
    name: 'NIT Trichy',
    city: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    description: 'NIT Trichy students supporting each other through academics and mental wellness.',
    tags: ['Engineering', 'Technology', 'Research', 'Tamil Nadu'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'JAMI',
    name: 'Jamia Millia Islamia',
    city: 'New Delhi',
    state: 'Delhi',
    description: 'Jamia students connecting for mental health support and campus community.',
    tags: ['Multidisciplinary', 'Liberal Arts', 'Engineering', 'Delhi'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'PUNE-U',
    name: 'Savitribai Phule Pune University',
    city: 'Pune',
    state: 'Maharashtra',
    description: 'Pune University students finding peer support and sharing campus experiences.',
    tags: ['Multidisciplinary', 'Research', 'Arts & Science', 'Pune'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
  {
    code: 'AMU',
    name: 'Aligarh Muslim University',
    city: 'Aligarh',
    state: 'Uttar Pradesh',
    description: 'AMU students connecting for mental health support and community engagement.',
    tags: ['Multidisciplinary', 'Liberal Arts', 'Engineering', 'Aligarh'],
    rules: [
      'Respect anonymity and privacy',
      'No harassment or bullying',
      'Keep content campus-appropriate',
      'Support each other with kindness',
      'Report concerning content',
    ],
  },
];

const createCommunityChannels = (communityCode: string, communityId: string, now: number): CommunityChannel[] => {
  return CHANNEL_DEFINITIONS.map((def) => ({
    id: generateChannelId(communityCode, def.kind),
    communityId,
    kind: def.kind,
    name: def.name,
    slug: def.kind.replace('_', '-'),
    description: def.description,
    icon: def.icon,
    order: def.order,
    postCount: randomInt(10, 150),
    lastActivityAt: now - randomInt(60000, 86400000 * 7),
    isDefault: def.isDefault,
    isLocked: def.isLocked,
    createdAt: now - randomInt(86400000 * 30, 86400000 * 180),
  }));
};

const createCommunityPostMeta = (channels: CommunityChannel[], communityId: string): CommunityPostMeta[] => {
  return channels.map((channel) => ({
    channelId: channel.id,
    communityId,
    postCount: channel.postCount,
    commentCount: randomInt(channel.postCount, channel.postCount * 3),
    lastPostAt: channel.lastActivityAt,
    lastCommentAt: channel.lastActivityAt + randomInt(0, 3600000),
    pinnedPostCount: randomInt(0, 3),
    activeMembers: randomInt(50, 300),
  }));
};

const createCommunityActivity = (communityId: string, channels: CommunityChannel[], now: number): CommunityActivity[] => {
  const activities: CommunityActivity[] = [];
  const activityTypes: Array<CommunityActivity['type']> = ['post', 'comment', 'reaction', 'join', 'moderation'];

  channels.slice(0, 5).forEach((channel) => {
    activityTypes.forEach((type) => {
      activities.push({
        id: crypto.randomUUID(),
        communityId,
        channelId: channel.id,
        type,
        timestamp: now - randomInt(0, 86400000 * 7),
        count: randomInt(1, 50),
      });
    });
  });

  return activities;
};

const createDefaultNotificationSettings = (communityId: string, studentId: string, now: number): CommunityNotificationSettings => ({
  communityId,
  studentId,
  notifyOnPost: false,
  notifyOnMention: true,
  notifyOnReply: true,
  muteAll: false,
  channelOverrides: {},
  updatedAt: now,
});

export const createDefaultCommunities = (studentId: string): CommunitySeed[] => {
  const now = Date.now();
  
  return INDIAN_COLLEGES.map((college) => {
    const communityId = generateCommunityId(college.code);
    const community: Community = {
      id: communityId,
      name: college.name,
      slug: college.code.toLowerCase(),
      shortCode: college.code,
      description: college.description,
      city: college.city,
      state: college.state,
      country: 'India',
      logoUrl: `/communities/${college.code.toLowerCase()}/logo.png`,
      bannerUrl: `/communities/${college.code.toLowerCase()}/banner.jpg`,
      guidelinesUrl: `/communities/${college.code.toLowerCase()}/guidelines`,
      memberCount: randomInt(200, 5000),
      postCount: randomInt(500, 10000),
      visibility: 'public',
      rules: college.rules,
      tags: college.tags,
      createdAt: now - randomInt(86400000 * 365, 86400000 * 730),
      lastActivityAt: now - randomInt(60000, 86400000),
      isVerified: true,
    };

    const channels = createCommunityChannels(college.code, communityId, now);
    const postsMeta = createCommunityPostMeta(channels, communityId);
    const activity = createCommunityActivity(communityId, channels, now);
    const notifications = createDefaultNotificationSettings(communityId, studentId, now);

    return {
      community,
      channels,
      postsMeta,
      activity,
      notifications,
    };
  });
};

export const DEFAULT_CHANNEL_KINDS: CommunityChannelKind[] = [
  'general',
  'announcements',
  'academics',
  'mental_health',
  'events',
  'career',
  'memes',
  'resources',
  'support',
];

export const DEFAULT_COMMUNITIES: CommunitySeed[] = createDefaultCommunities('seed-student');
