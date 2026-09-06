'use client';
/* oxlint-disable react/react-compiler -- Synchronizes the MediaRecorder lifecycle and its device-level meter. */
import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Square, ArrowRight, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function VoiceDialog({
  open,
  close,
  add,
}: {
  open: boolean;
  close: () => void;
  add: (s: string) => void;
}) {
  const [state, setState] = useState('ready');
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const generation = useRef(0);
  const audioUrl = useRef('');
  function cleanup() {
    generation.current++;
    if (recorder.current) {
      recorder.current.ondataavailable = null;
      recorder.current.onstop = null;
      if (recorder.current.state !== 'inactive') recorder.current.stop();
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = '';
    chunks.current = [];
  }
  useEffect(() => {
    if (open) {
      setState('ready');
      setError('');
      setSeconds(0);
      setTranscript('');
      setUrl('');
    } else cleanup();
    return () => cleanup();
  }, [open]);
  useEffect(() => {
    if (state !== 'recording') return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);
  useEffect(() => {
    if (seconds >= 180 && recorder.current?.state === 'recording') stop();
  }, [seconds]);
  useEffect(() => {
    if (
      state !== 'recording' ||
      !stream.current ||
      typeof AudioContext === 'undefined'
    ) {
      setLevel(0);
      return;
    }
    let context: AudioContext | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      const source = context.createMediaStreamSource(stream.current);
      source.connect(analyser);
      void context.resume().catch(() => {});
      const values = new Uint8Array(analyser.fftSize);
      timer = setInterval(() => {
        analyser.getByteTimeDomainData(values);
        const rms = Math.sqrt(
          values.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) /
            values.length,
        );
        setLevel(Math.min(100, Math.round(rms * 400)));
      }, 120);
    } catch {
      /* Recording still works when a level meter is unavailable. */
    }
    return () => {
      if (timer) clearInterval(timer);
      if (context && context.state !== 'closed')
        void context.close().catch(() => {});
    };
  }, [state]);
  async function start() {
    cleanup();
    const current = generation.current;
    setError('');
    setUrl('');
    setTranscript('');
    setSeconds(0);
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError(
        'Voice recording is not supported here. You can still type your reflection.',
      );
      return;
    }
    setState('permission');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (current !== generation.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      const rec = new MediaRecorder(s);
      recorder.current = rec;
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
        if (
          chunks.current.reduce((n, b) => n + b.size, 0) > 10 * 1024 * 1024 &&
          rec.state !== 'inactive'
        ) {
          rec.stop();
          setError('Recording reached the 10 MB limit.');
        }
      };
      rec.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        if (blob.size > 10 * 1024 * 1024) {
          chunks.current = [];
          setError('Recording was too large. Please record a shorter thought.');
          setState('ready');
          return;
        }
        if (blob.size === 0) {
          setError('No audio was captured. Please record again.');
          setState('ready');
          return;
        }
        audioUrl.current = URL.createObjectURL(blob);
        setUrl(audioUrl.current);
        setState('review');
      };
      rec.onerror = () => {
        cleanup();
        setError('Recording failed. Please try again or type your reflection.');
        setState('ready');
      };
      rec.start(1000);
      setState('recording');
    } catch (e) {
      cleanup();
      setState('ready');
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow microphone access in your browser, then try again.'
          : 'Could not access your microphone. Check that it is connected and available.',
      );
    }
  }
  function stop() {
    if (recorder.current?.state !== 'inactive') recorder.current?.stop();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="aura-dialog voice-dialog">
        <DialogTitle>Let your thoughts out.</DialogTitle>
        <DialogDescription>
          Record up to 3 minutes. Audio stays in memory and is discarded when
          you close this window.
        </DialogDescription>
        <div
          className={
            'voice-circle ' + (state === 'recording' ? 'recording' : '')
          }
        >
          <Mic size={36} />
        </div>
        <div className="voice-time" aria-live="off">
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:
          {String(seconds % 60).padStart(2, '0')}
        </div>
        <output>
          {state === 'recording'
            ? 'Recording · microphone is on'
            : state === 'paused'
              ? 'Paused · recording is paused'
              : state === 'permission'
                ? 'Waiting for microphone permission…'
                : state === 'review'
                  ? 'Recording ready to review'
                  : 'A moment to collect your thoughts.'}
        </output>
        {(state === 'recording' || state === 'paused') && (
          <label className="voice-level">
            Microphone level
            <meter
              min={0}
              max={100}
              value={level}
              aria-label="Microphone input level"
            />
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="voice-actions">
          {['ready', 'review'].includes(state) && (
            <button className="primary" onClick={start}>
              <Mic size={17} />
              {state === 'review' ? 'Record again' : 'Start recording'}
            </button>
          )}
          {(state === 'recording' || state === 'paused') && (
            <>
              <button
                className="secondary"
                onClick={() => {
                  if (state === 'recording') {
                    recorder.current?.pause();
                    setState('paused');
                  } else {
                    recorder.current?.resume();
                    setState('recording');
                  }
                }}
              >
                {state === 'recording' ? (
                  <Pause size={17} />
                ) : (
                  <Play size={17} />
                )}{' '}
                {state === 'recording' ? 'Pause' : 'Resume'}
              </button>
              <button className="primary" onClick={stop}>
                <Square size={15} /> Stop
              </button>
            </>
          )}
          <button className="secondary" onClick={close}>
            Cancel
          </button>
        </div>
        {state === 'review' && (
          <>
            {/* User-created audio has no automated transcript; an editable text transcript is provided directly below. */}
            {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={url} aria-label="Review your recording" />
            <div className="notice">
              Automatic transcription requires the backend. Listen to your
              recording and type a transcript below to try the rest of the flow.
            </div>
            <textarea
              aria-label="Editable transcript"
              className="followup"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Type and review your transcript…"
            />
            <button
              className="primary"
              disabled={!transcript.trim()}
              onClick={() => add(transcript.trim())}
            >
              Add transcript to journal <ArrowRight size={16} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                cleanup();
                setState('ready');
                setUrl('');
                setTranscript('');
                setSeconds(0);
              }}
            >
              <Trash2 size={15} /> Delete recording
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
