import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';

const AudioMessagePlayer = ({ src, duration = 0, isSelf = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleSpeed = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 4px',
        minWidth: '220px',
        maxWidth: '300px',
        color: isSelf ? '#FFFFFF' : 'var(--color-text-primary)',
      }}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: isSelf ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-primary)',
          color: '#FFFFFF',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
      </button>

      {/* Scrubber & Duration */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
        {/* Scrubber Track */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max={audioDuration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            style={{
              width: '100%',
              height: '4px',
              appearance: 'none',
              backgroundColor: isSelf ? 'rgba(255, 255, 255, 0.3)' : 'var(--color-border)',
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer',
              accentColor: isSelf ? '#FFFFFF' : 'var(--color-primary)',
            }}
          />
        </div>

        {/* Timestamps & Rate Control */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            opacity: 0.85,
          }}
        >
          <span>{formatTime(currentTime > 0 ? currentTime : audioDuration)}</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={toggleSpeed}
              style={{
                background: isSelf ? 'rgba(255, 255, 255, 0.2)' : 'var(--color-surface-alt)',
                border: 'none',
                borderRadius: '4px',
                padding: '1px 4px',
                fontSize: '9.5px',
                fontWeight: 700,
                color: isSelf ? '#FFFFFF' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
              title="Change playback speed"
            >
              {playbackRate}x
            </button>

            <a
              href={src}
              download="voice_note.webm"
              style={{
                color: isSelf ? '#FFFFFF' : 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                opacity: 0.8,
              }}
              title="Download audio"
            >
              <Download size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioMessagePlayer;
