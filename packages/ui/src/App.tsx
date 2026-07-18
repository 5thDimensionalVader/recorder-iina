import { CheckCircle, CircleNotch, Stop, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { ClipStatusPayload, FfmpegAvailabilityPayload } from '@recorder/contracts';
import { recorderBridge } from './bridge';
import { formatTime, timestampToSeconds } from './time';
import './recorder.css';

const EMPTY_TIME = '00:00:00';

export function App() {
  const [startPosition, setStartPosition] = useState(EMPTY_TIME);
  const [endPosition, setEndPosition] = useState('');
  const [availability, setAvailability] = useState<FfmpegAvailabilityPayload>();
  const [clipStatus, setClipStatus] = useState<ClipStatusPayload>();
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const [verticalCrop, setVerticalCrop] = useState(false);

  useEffect(() => {
    const unsubscribe = [
      recorderBridge.subscribe('currentTime', ({ time }) => {
        setStartPosition(formatTime(time));
        setEndPosition('');
        setClipStatus(undefined);
      }),
      recorderBridge.subscribe('endTime', ({ time }) => setEndPosition(formatTime(time))),
      recorderBridge.subscribe('is-ffmpeg-installed', setAvailability),
      recorderBridge.subscribe('ffmpeg-status-out', setClipStatus),
    ];

    recorderBridge.post('requestCurrentTime', undefined);
    recorderBridge.post('requestFfmpegCheck', undefined);

    return () => {
      for (const stopListening of unsubscribe) stopListening();
    };
  }, []);

  const isProcessing = clipStatus?.status === true;
  const startSeconds = timestampToSeconds(startPosition);
  const endSeconds = timestampToSeconds(endPosition);
  const hasValidRange =
    startSeconds !== undefined && endSeconds !== undefined && endSeconds > startSeconds;
  const canCreateClip = availability?.isInstalled === true && hasValidRange && !isProcessing;

  function captureEndPosition(): void {
    setClipStatus(undefined);
    recorderBridge.post('getEndTime', undefined);
  }

  function createClip(): void {
    if (!canCreateClip) return;
    recorderBridge.post('processVideoClip', {
      startPos: startPosition,
      endPos: endPosition,
      hwaccel: hardwareAcceleration,
      verticalCrop,
    });
  }

  function closeRecorder(): void {
    setEndPosition('');
    setClipStatus(undefined);
    recorderBridge.post('closeWindow', undefined);
  }

  return (
    <main className="recorder-shell">
      <header className="recorder-heading">
        <p>Recorder</p>
        <h1>Create a clip</h1>
        <span>Mark the moment. Export it cleanly.</span>
      </header>

      <section className="clip-controls" aria-labelledby="clip-range-heading">
        <div className="section-heading">
          <h2 id="clip-range-heading">Clip range</h2>
          <span>Select an end point</span>
        </div>

        <div className="time-grid">
          <div className="time-field">
            <span>Start position</span>
            <strong>{availability?.isInstalled === false ? EMPTY_TIME : startPosition}</strong>
          </div>
          <div className="time-field time-field--action">
            <span>End position</span>
            <strong>
              {availability?.isInstalled === false ? EMPTY_TIME : endPosition || '—:—:—'}
            </strong>
            <button
              type="button"
              className="stop-button"
              onClick={captureEndPosition}
              disabled={!availability?.isInstalled || isProcessing}
              aria-label="Use the current playback time as the clip end"
              title="Set clip end"
            >
              <Stop size={14} weight="fill" aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className="range-help">
          Setting the end position pauses playback so you can confirm the cut.
        </p>

        <div className="toggle-list" aria-label="Encoding options">
          <label className="option-row">
            <span className="option-copy">
              <strong>Hardware acceleration</strong>
              <small>Export with Apple VideoToolbox.</small>
            </span>
            <span className="switch-control">
              <input
                type="checkbox"
                aria-label="Use hardware acceleration"
                checked={hardwareAcceleration}
                onChange={(event) => setHardwareAcceleration(event.target.checked)}
                disabled={isProcessing}
              />
              <span aria-hidden="true" />
            </span>
          </label>

          <label className="option-row">
            <span className="option-copy">
              <strong>Vertical crop</strong>
              <small>Center the video in a 9:16 frame.</small>
            </span>
            <span className="switch-control">
              <input
                type="checkbox"
                aria-label="Create a vertical crop"
                checked={verticalCrop}
                onChange={(event) => setVerticalCrop(event.target.checked)}
                disabled={isProcessing}
              />
              <span aria-hidden="true" />
            </span>
          </label>
        </div>
      </section>

      <div className="action-grid">
        <button
          type="button"
          className="primary-button"
          onClick={createClip}
          disabled={!canCreateClip}
        >
          {isProcessing ? <CircleNotch className="spin" size={16} aria-hidden="true" /> : null}
          {isProcessing ? 'Creating…' : 'Create clip'}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={closeRecorder}
          disabled={isProcessing}
        >
          Close
        </button>
      </div>

      {clipStatus?.message ? (
        <p
          className={`clip-feedback clip-feedback--${clipStatus.tone ?? 'neutral'}`}
          aria-live="polite"
        >
          {clipStatus.message}
        </p>
      ) : null}

      <div
        className={`dependency-status dependency-status--${
          availability?.isInstalled ? 'available' : availability ? 'missing' : 'checking'
        }`}
        aria-live="polite"
      >
        {availability?.isInstalled ? (
          <CheckCircle size={16} weight="fill" aria-hidden="true" />
        ) : availability ? (
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
        ) : (
          <CircleNotch className="spin" size={16} aria-hidden="true" />
        )}
        <span>
          {availability?.isInstalled
            ? 'FFmpeg available'
            : availability
              ? 'FFmpeg unavailable'
              : 'Checking FFmpeg'}
        </span>
      </div>
    </main>
  );
}
