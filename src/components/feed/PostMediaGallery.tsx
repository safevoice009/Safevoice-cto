import { useEffect, useRef, useState } from 'react';
import { Image, Music, AlertCircle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { getIPFSGatewayUrl } from '../../lib/ipfs';
import type { MediaAttachment } from '../../lib/storage/types';

interface PostMediaGalleryProps {
  mediaAttachments: MediaAttachment[];
}

interface MediaItemState {
  isLoading: boolean;
  error: boolean;
  objectUrl: string | null;
}

export default function PostMediaGallery({ mediaAttachments }: PostMediaGalleryProps) {
  const [mediaStates, setMediaStates] = useState<Map<string, MediaItemState>>(new Map());
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const { getMediaLocally, downloadFromIPFS } = useStore();

  // Initialize IntersectionObserver
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const mediaId = entry.target.getAttribute('data-media-id');
          if (mediaId && entry.isIntersecting) {
            setVisibleItems((prev) => new Set(prev).add(mediaId));
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Observe items
  useEffect(() => {
    const observer = observerRef.current;
    if (!observer) return;

    itemRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [mediaAttachments]);

  const loadMedia = async (attachment: MediaAttachment) => {
    try {
      let blob: Blob | null = null;

      if (attachment.storage === 'local') {
        blob = await getMediaLocally(attachment.mediaId);
      } else if (attachment.storage === 'ipfs' && attachment.ipfsCid) {
        const arrayBuffer = await downloadFromIPFS(attachment.ipfsCid);
        const mimeType = attachment.type === 'image' ? 'image/jpeg' : 'audio/mpeg';
        blob = new Blob([arrayBuffer], { type: mimeType });
      }

      if (!blob) {
        throw new Error('Failed to retrieve media');
      }

      const objectUrl = URL.createObjectURL(blob);
      objectUrlsRef.current.add(objectUrl);

      setMediaStates((prev) => {
        const next = new Map(prev);
        next.set(attachment.mediaId, { isLoading: false, error: false, objectUrl });
        return next;
      });
    } catch (error) {
      console.error(`Failed to load media ${attachment.mediaId}:`, error);
      setMediaStates((prev) => {
        const next = new Map(prev);
        next.set(attachment.mediaId, { isLoading: false, error: true, objectUrl: null });
        return next;
      });
    }
  };

  // Load media when items become visible
  useEffect(() => {
    visibleItems.forEach((mediaId) => {
      const attachment = mediaAttachments.find((a) => a.mediaId === mediaId);
      if (!attachment) return;

      const currentState = mediaStates.get(mediaId);
      if (currentState && (currentState.objectUrl || currentState.error)) {
        return;
      }

      setMediaStates((prev) => {
        const next = new Map(prev);
        next.set(mediaId, { isLoading: true, error: false, objectUrl: null });
        return next;
      });

      loadMedia(attachment);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems, mediaAttachments]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      objectUrls.clear();
    };
  }, []);

  if (mediaAttachments.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 mt-4">
      {mediaAttachments.map((attachment) => {
        const state = mediaStates.get(attachment.mediaId) || {
          isLoading: false,
          error: false,
          objectUrl: null,
        };

        return (
          <div
            key={attachment.mediaId}
            ref={(el) => {
              if (el) {
                itemRefs.current.set(attachment.mediaId, el);
              } else {
                itemRefs.current.delete(attachment.mediaId);
              }
            }}
            data-media-id={attachment.mediaId}
            className="glass rounded-lg overflow-hidden"
          >
            {state.isLoading && <Skeleton type={attachment.type} />}

            {state.error && (
              <div className="flex flex-col items-center justify-center p-8 space-y-2 text-red-400">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">Failed to load media</p>
                {attachment.storage === 'ipfs' && (
                  <button
                    onClick={() => {
                      const gatewayUrl = getIPFSGatewayUrl(attachment.ipfsCid || '');
                      window.open(gatewayUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-xs text-primary hover:text-primary-light underline"
                  >
                    Open in IPFS Gateway
                  </button>
                )}
              </div>
            )}

            {!state.isLoading && !state.error && state.objectUrl && (
              <>
                {attachment.type === 'image' && (
                  <img
                    src={state.objectUrl}
                    alt="Post attachment"
                    loading="lazy"
                    className="w-full h-auto object-cover max-h-96"
                  />
                )}

                {attachment.type === 'audio' && (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-text-muted text-sm">
                      <Music className="w-4 h-4" />
                      <span>Audio attachment</span>
                    </div>
                    <audio
                      controls
                      src={state.objectUrl}
                      className="w-full"
                      preload="metadata"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Skeleton({ type }: { type: 'image' | 'audio' }) {
  return (
    <div className="animate-pulse bg-surface/20 rounded-lg p-4">
      {type === 'image' ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Image className="w-12 h-12 text-text-muted/30" />
          <div className="h-4 w-32 bg-surface/30 rounded"></div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <Music className="w-10 h-10 text-text-muted/30" />
          <div className="h-4 w-40 bg-surface/30 rounded"></div>
          <div className="h-8 w-full bg-surface/30 rounded"></div>
        </div>
      )}
    </div>
  );
}
