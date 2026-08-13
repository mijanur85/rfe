import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  X,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Info,
  Clock,
  Gauge,
  Film,
} from 'lucide-react';
import { MediaItem, ThemeConfig } from '../types';

interface Props {
  media: MediaItem | null;
  onClose: () => void;
  theme: ThemeConfig;
}

export const VideoPlayerModal: React.FC<Props> = ({ media, onClose, theme }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  if (!media) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || media.durationSec || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (timeInSec: number) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-between p-2 sm:p-6 ${theme.viewerBg}`}>
      {/* Top Controls Bar */}
      <div className="z-10 flex items-center justify-between p-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
              {media.title}
            </h3>
            <p className="text-[11px] font-mono text-zinc-400">
              {media.resolution || '1080p MP4'} • {media.sizeMb.toFixed(1)} MB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed selector */}
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="bg-black/80 text-white text-xs px-2 py-1 rounded-xl border border-white/20 font-mono"
          >
            <option value={0.5}>0.5x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2.0x</option>
          </select>

          <button
            onClick={() => setShowInfo((prev) => !prev)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Content Stage */}
      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          src={media.url}
          poster={media.thumbnailUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          className="max-h-[70vh] w-auto object-contain cursor-pointer"
        />

        {/* Center Play Overlay Icon when paused */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className={`absolute p-5 rounded-full border shadow-2xl transition-all scale-105 hover:scale-110 ${
              theme.id === 'cyber-neon'
                ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_30px_#00f0ff]'
                : theme.id === 'luxury-gold'
                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_30px_#d4af37]'
                : 'bg-white text-black'
            }`}
          >
            <Play className="w-8 h-8 fill-current translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Bottom Timeline Scrubber & Controls */}
      <div className="z-10 p-4 rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/10 space-y-2">
        {/* Scrubber bar */}
        <div className="flex items-center gap-3 font-mono text-xs text-zinc-300">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Player controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className={`p-3 rounded-xl font-bold transition-all ${
                theme.id === 'cyber-neon'
                  ? 'bg-cyan-400 text-black shadow-[0_0_15px_#00f0ff]'
                  : theme.id === 'luxury-gold'
                  ? 'bg-amber-400 text-black shadow-[0_0_15px_#d4af37]'
                  : 'bg-white text-black'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={toggleMute}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Film className="w-4 h-4 text-cyan-400" />
            <span>{media.cameraModel || '4K Ultra HD'}</span>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="absolute top-20 right-6 z-30 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-white text-xs space-y-2 shadow-2xl max-w-xs">
          <h4 className="font-bold text-cyan-400 uppercase tracking-wider">Video Details</h4>
          <p>Title: {media.title}</p>
          <p>Mime: {media.mimeType}</p>
          <p>Duration: {media.durationSec || 0} seconds</p>
          <p>Size: {media.sizeMb} MB</p>
        </div>
      )}
    </div>
  );
};
