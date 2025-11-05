import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sphere } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { MapPin } from 'lucide-react';

import { useStore, type Post } from '../../lib/store';
import type { CommunityActivity } from '../../lib/communities/types';
import { calculateUserStats } from '../../lib/leaderboard';
import { CAMPUS_COORDINATES } from '../../lib/campusCoordinates';

const ACTIVITY_WEIGHTS: Record<CommunityActivity['type'], number> = {
  post: 4,
  comment: 3,
  reaction: 1,
  join: 2,
  moderation: 1,
};

type Vec3 = [number, number, number];

const latLngToVec3 = (lat: number, lng: number, radius: number): Vec3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return [x, y, z];
};

interface MarkerBase {
  id: string;
  code: string;
  slug: string;
  name: string;
  position: Vec3;
  memberCount: number;
  postCount: number;
  activityScore: number;
  voiceScore: number;
  engagementScore: number;
  baseIntensity: number;
}

interface MarkerData extends MarkerBase {
  intensity: number;
}

interface GlobeMarkerProps {
  marker: MarkerData;
  onClick: (code: string) => void;
}

function GlobeMarker({ marker, onClick }: GlobeMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseSeed = useRef(Math.random() * Math.PI * 2);
  const [isHovered, setIsHovered] = useState(false);

  const baseScale = useMemo(() => 0.6 + marker.intensity * 0.9, [marker.intensity]);
  const color = useMemo(() => {
    const hue = 0.58 - marker.intensity * 0.25;
    return new THREE.Color().setHSL(hue, 0.9, 0.55 + marker.intensity * 0.25);
  }, [marker.intensity]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = 0.9 + Math.sin(state.clock.getElapsedTime() * 2 + pulseSeed.current) * 0.12;
    const scale = baseScale * pulse;
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <group position={marker.position}>
      <mesh
        ref={meshRef}
        onClick={(event) => {
          event.stopPropagation();
          onClick(marker.code);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.05, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8 + marker.intensity * 0.6}
        />
      </mesh>
      {isHovered && (
        <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="glass px-3 py-2 rounded-lg text-xs text-white whitespace-nowrap shadow-xl border border-white/20">
            <div className="font-semibold">{marker.name}</div>
            <div className="text-blue-200 mt-1">
              {marker.memberCount.toLocaleString()} members
            </div>
            <div className="text-blue-200">
              {marker.postCount.toLocaleString()} posts
            </div>
            <div className="text-blue-200">
              Voice score: {Math.round(marker.voiceScore).toLocaleString()}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

interface Globe3DProps {
  markers: MarkerData[];
  onMarkerClick: (code: string) => void;
}

function Globe3D({ markers, onMarkerClick }: Globe3DProps) {
  const globeGroup = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!globeGroup.current) return;
    globeGroup.current.rotation.y += delta * 0.08;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[8, 8, 6]} intensity={1.4} />
      <pointLight position={[-6, -6, -4]} intensity={0.4} />

      <group ref={globeGroup}>
        <Sphere args={[1, 72, 72]}>
          <meshStandardMaterial color="#143d7a" metalness={0.35} roughness={0.75} />
        </Sphere>
        <Sphere args={[1.04, 72, 72]}>
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.12} side={THREE.BackSide} />
        </Sphere>

        {markers.map((marker) => (
          <GlobeMarker key={marker.code} marker={marker} onClick={onMarkerClick} />
        ))}
      </group>

      <OrbitControls enablePan={false} enableZoom minDistance={1.6} maxDistance={4.2} />
    </>
  );
}

interface Map2DFallbackProps {
  markers: MarkerData[];
  onMarkerClick: (code: string) => void;
}

function Map2DFallback({ markers, onMarkerClick }: Map2DFallbackProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - 68) / (97 - 68)) * 100;
    const y = ((35 - lat) / (35 - 8)) * 100;
    return { x, y };
  };

  return (
    <div
      data-testid="globe-fallback"
      className="relative w-full h-full bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-xl overflow-hidden"
    >
      <div className="absolute inset-0 opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <path
            d="M 50,10 L 55,15 L 60,12 L 65,18 L 70,20 L 75,25 L 78,35 L 75,45 L 72,55 L 68,65 L 62,75 L 55,82 L 50,85 L 45,82 L 40,78 L 35,72 L 30,65 L 28,55 L 27,45 L 28,35 L 32,25 L 38,18 L 43,15 Z"
            fill="none"
            stroke="white"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {markers.map((marker) => {
        const coordinates = CAMPUS_COORDINATES[marker.code];
        if (!coordinates) return null;
        const { x, y } = projectCoords(coordinates.lat, coordinates.lng);
        const size = 18 + marker.intensity * 22;

        return (
          <div
            key={marker.code}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onMarkerClick(marker.code)}
            onMouseEnter={() => setHovered(marker.code)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="relative flex items-center justify-center animate-pulse" style={{ width: size, height: size }}>
              <MapPin className="text-yellow-400 drop-shadow-lg" size={size} fill="currentColor" />
            </div>
            {hovered === marker.code && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 glass px-3 py-2 rounded-lg text-xs text-white whitespace-nowrap shadow-xl border border-white/20">
                <div className="font-semibold">{marker.name}</div>
                <div className="text-blue-200 mt-1">
                  {marker.memberCount.toLocaleString()} members
                </div>
                <div className="text-blue-200">
                  {marker.postCount.toLocaleString()} posts
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const getMatches = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(max-width: 768px)').matches;
};

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const listener = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(listener);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', listener);
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(listener);
      }
    };
  }, []);

  return isMobile;
}

const ACTIVITY_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

const aggregateActivity = (activities: CommunityActivity[], now: number) => {
  const activityTotals = new Map<string, number>();

  activities.forEach((activity) => {
    if (now - activity.timestamp > ACTIVITY_LOOKBACK_MS) {
      return;
    }
    const weight = ACTIVITY_WEIGHTS[activity.type] ?? 1;
    const current = activityTotals.get(activity.communityId) ?? 0;
    activityTotals.set(activity.communityId, current + activity.count * weight);
  });

  return activityTotals;
};

const aggregateLeaderboardMetrics = (posts: Post[]) => {
  const byCommunity = new Map<string, Post[]>();

  posts.forEach((post) => {
    if (!post.communityId) return;
    const collection = byCommunity.get(post.communityId) ?? [];
    collection.push(post);
    byCommunity.set(post.communityId, collection);
  });

  const leaderboardTotals = new Map<string, { totalVoice: number; engagement: number }>();

  byCommunity.forEach((communityPosts, communityId) => {
    const statsMap = calculateUserStats(communityPosts, 'weekly');
    let totalVoice = 0;
    let engagement = 0;
    statsMap.forEach((stats) => {
      totalVoice += stats.totalVoice;
      engagement += stats.engagementScore;
    });
    leaderboardTotals.set(communityId, { totalVoice, engagement });
  });

  return leaderboardTotals;
};

export default function Globe() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const communities = useStore((state) => state.communities);
  const communityActivity = useStore((state) => state.communityActivity);
  const posts = useStore((state) => state.posts);
  const setCurrentCommunity = useStore((state) => state.setCurrentCommunity);

  const markerBases = useMemo<MarkerBase[]>(() => {
    const now = Date.now();
    const activityTotals = aggregateActivity(communityActivity, now);
    const leaderboardTotals = aggregateLeaderboardMetrics(posts);

    return communities
      .map((community) => {
        const coordinates = CAMPUS_COORDINATES[community.shortCode];
        if (!coordinates) return null;

        const activityScore = activityTotals.get(community.id) ?? 0;
        const leaderboard = leaderboardTotals.get(community.id) ?? { totalVoice: 0, engagement: 0 };
        const baseIntensity =
          activityScore * 1.2 + leaderboard.totalVoice * 0.55 + leaderboard.engagement * 0.65 ||
          community.memberCount * 0.04;

        return {
          id: community.id,
          code: community.shortCode,
          slug: community.slug,
          name: community.name,
          position: latLngToVec3(coordinates.lat, coordinates.lng, 1.05),
          memberCount: community.memberCount,
          postCount: community.postCount,
          activityScore,
          voiceScore: leaderboard.totalVoice,
          engagementScore: leaderboard.engagement,
          baseIntensity,
        } satisfies MarkerBase;
      })
      .filter((value): value is MarkerBase => value !== null);
  }, [communities, communityActivity, posts]);

  const [pulseOffsets, setPulseOffsets] = useState<Record<string, number>>({});

  useEffect(() => {
    setPulseOffsets((previous) => {
      const next: Record<string, number> = {};
      markerBases.forEach((marker) => {
        next[marker.code] = previous[marker.code] ?? (Math.random() - 0.5) * 0.2;
      });
      return next;
    });
  }, [markerBases]);

  useEffect(() => {
    if (markerBases.length === 0) return;
    const interval = window.setInterval(() => {
      setPulseOffsets((previous) => {
        const next: Record<string, number> = {};
        markerBases.forEach((marker) => {
          const prior = previous[marker.code] ?? 0;
          const jitter = (Math.random() - 0.5) * 0.3;
          const combined = prior * 0.6 + jitter;
          next[marker.code] = Math.max(-0.4, Math.min(0.4, combined));
        });
        return next;
      });
    }, 4500);

    return () => window.clearInterval(interval);
  }, [markerBases]);

  const markers = useMemo<MarkerData[]>(() => {
    if (markerBases.length === 0) return [];

    const dynamic = markerBases.map((marker) => {
      const offset = pulseOffsets[marker.code] ?? 0;
      const dynamicIntensity = Math.max(marker.baseIntensity * (1 + offset), marker.baseIntensity * 0.65);
      return { marker, dynamicIntensity };
    });

    const maxIntensity = Math.max(...dynamic.map((entry) => entry.dynamicIntensity), 1);

    return dynamic.map(({ marker, dynamicIntensity }) => ({
      ...marker,
      intensity: Math.min(dynamicIntensity / maxIntensity, 1),
    }));
  }, [markerBases, pulseOffsets]);

  const totalMembers = useMemo(
    () => communities.reduce((sum, community) => sum + community.memberCount, 0),
    [communities]
  );
  const totalPosts = useMemo(
    () => communities.reduce((sum, community) => sum + community.postCount, 0),
    [communities]
  );

  const handleMarkerClick = useCallback(
    (code: string) => {
      const target = markers.find((marker) => marker.code === code);
      if (target) {
        setCurrentCommunity(target.id);
        navigate('/communities', { state: { communityId: target.id } });
      } else {
        navigate('/communities');
      }
    },
    [markers, navigate, setCurrentCommunity]
  );

  return (
    <section className="relative py-24 bg-gradient-to-b from-blue-950 to-blue-900 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Connect Across Campuses</h2>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto">
            Join students from top colleges across India in a supportive, real-time SafeVoice community.
          </p>
        </div>

        <div className="relative h-[500px] rounded-xl overflow-hidden shadow-2xl">
          {isMobile ? (
            <Map2DFallback markers={markers} onMarkerClick={handleMarkerClick} />
          ) : (
            <Canvas data-testid="globe-canvas" camera={{ position: [3, 1.8, 3], fov: 45 }}>
              <Suspense fallback={null}>
                <Globe3D markers={markers} onMarkerClick={handleMarkerClick} />
              </Suspense>
            </Canvas>
          )}
        </div>

        <div className="sr-only" aria-hidden data-testid="globe-marker-data">
          {markers.map((marker) => (
            <span key={marker.code} data-testid="globe-marker-item">
              {marker.name}
            </span>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-blue-300 text-sm mb-4">Click on any college to explore their community activity</p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="glass px-4 py-2 rounded-lg">
              <div className="text-2xl font-bold text-white">{communities.length}</div>
              <div className="text-xs text-blue-200">Campuses</div>
            </div>
            <div className="glass px-4 py-2 rounded-lg">
              <div className="text-2xl font-bold text-white">{totalMembers.toLocaleString()}</div>
              <div className="text-xs text-blue-200">Students</div>
            </div>
            <div className="glass px-4 py-2 rounded-lg">
              <div className="text-2xl font-bold text-white">{totalPosts.toLocaleString()}</div>
              <div className="text-xs text-blue-200">Posts</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
