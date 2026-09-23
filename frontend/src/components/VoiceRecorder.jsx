import { useState, useEffect, useRef } from 'react';
import { Trash2, Send, Pause, Play, Square, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const VoiceRecorder = ({ onRecordingComplete, onCancel }) => {
  const { addToast } = useNotification();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);
  const previewAudioRef = useRef(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addToast('Voice recording is not supported in this browser.', 'error');
        onCancel();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[Audio Recording Permission Error]:', err);
      addToast('Microphone access was denied or not found.', 'error');
      onCancel();
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const handleTogglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSendVoiceNote = async () => {
    if (!audioBlob && isRecording) {
      // Stop and wait for onstop
      handleStopRecording();
    }

    const finalBlob = audioBlob || new Blob(audioChunksRef.current, { type: 'audio/webm' });
    if (!finalBlob || finalBlob.size === 0) {
      addToast('No audio recorded', 'warning');
      return;
    }

    try {
      setIsUploading(true);
      const ext = finalBlob.type.includes('ogg')
        ? 'ogg'
        : finalBlob.type.includes('mp4')
          ? 'm4a'
          : 'webm';
      const file = new File([finalBlob], `voice_note_${Date.now()}.${ext}`, {
        type: finalBlob.type,
      });

      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        onRecordingComplete({
          fileUrl: data.fileUrl,
          fileName: data.fileName || 'Voice Note',
          fileSize: data.fileSize,
          fileMimeType: data.fileMimeType,
          duration: recordingTime,
          type: 'audio',
        });
      }
    } catch (err) {
      console.error('[Voice Note Upload Error]:', err);
      addToast('Failed to upload voice note.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: 'var(--color-surface-alt)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-primary)',
        gap: '12px',
        width: '100%',
        animation: 'slideUp 150ms ease-out',
      }}
    >
      {/* Left: Discard / Cancel Button */}
      <button
        type="button"
        onClick={() => {
          cleanup();
          onCancel();
        }}
        className="btn btn-ghost btn-icon"
        style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }}
        title="Discard voice note"
      >
        <Trash2 size={16} />
      </button>

      {/* Middle: Recording wave or preview playback */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        {isRecording ? (
          <>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-danger)',
                animation: 'pulse 1s infinite',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--color-danger)',
                fontFamily: 'monospace',
              }}
            >
              {formatTimer(recordingTime)}
            </span>
            <span
              style={{
                fontSize: '12.5px',
                color: 'var(--color-text-secondary)',
                marginLeft: '4px',
              }}
            >
              Recording voice message...
            </span>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleTogglePreviewPlay}
              className="btn btn-primary btn-icon"
              style={{ width: '30px', height: '30px', padding: 0 }}
            >
              {isPlayingPreview ? (
                <Pause size={14} />
              ) : (
                <Play size={14} style={{ marginLeft: '2px' }} />
              )}
            </button>
            <span
              style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}
            >
              Voice Note ({formatTimer(recordingTime)})
            </span>
            {audioUrl && (
              <audio
                ref={previewAudioRef}
                src={audioUrl}
                onEnded={() => setIsPlayingPreview(false)}
                style={{ display: 'none' }}
              />
            )}
          </>
        )}
      </div>

      {/* Right: Stop Recording or Send */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isRecording && (
          <button
            type="button"
            onClick={handleStopRecording}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Stop & review recording"
          >
            <Square size={12} fill="currentColor" /> Stop
          </button>
        )}

        <button
          type="button"
          onClick={handleSendVoiceNote}
          disabled={isUploading}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
          title="Send voice note"
        >
          {isUploading ? <Loader2 size={14} className="spin" /> : <Send size={13} />}
          <span>{isUploading ? 'Sending...' : 'Send'}</span>
        </button>
      </div>
    </div>
  );
};

export default VoiceRecorder;
