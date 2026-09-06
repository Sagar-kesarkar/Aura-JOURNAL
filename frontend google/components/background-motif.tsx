'use client';
import { type MotifId } from '../app/journal-data';

interface CardMotifProps {
  motif?: MotifId;
  size?: number;
  className?: string;
}

export function CardMotif({ motif = 'none', size = 36, className = '' }: CardMotifProps) {
  if (!motif || motif === 'none') return null;

  return (
    <div
      className={`card-motif-overlay motif-${motif} ${className}`}
      aria-hidden="true"
    >
      <div className="card-motif-corner card-motif-tl" style={{ width: size, height: size }}>
        {renderCornerGraphic(motif, 'tl')}
      </div>
      <div className="card-motif-corner card-motif-tr" style={{ width: size, height: size }}>
        {renderCornerGraphic(motif, 'tr')}
      </div>
      <div className="card-motif-corner card-motif-bl" style={{ width: size, height: size }}>
        {renderCornerGraphic(motif, 'bl')}
      </div>
      <div className="card-motif-corner card-motif-br" style={{ width: size, height: size }}>
        {renderCornerGraphic(motif, 'br')}
      </div>
    </div>
  );
}

// Deprecated page-level motif: kept for backwards compatibility but does not render viewport corners
export function BackgroundMotif({ motif: _motif }: { motif?: MotifId }) {
  return null;
}

function renderCornerGraphic(motif: MotifId, corner: 'tl' | 'tr' | 'bl' | 'br') {
  const transform =
    corner === 'tr'
      ? 'scaleX(-1)'
      : corner === 'bl'
      ? 'scaleY(-1)'
      : corner === 'br'
      ? 'scale(-1, -1)'
      : undefined;

  switch (motif) {
    case 'botanical':
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', transform }}
        >
          {/* Main graceful vine */}
          <path
            d="M3 3 C14 10, 22 16, 42 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.92"
          />
          <path
            d="M3 3 C10 14, 16 22, 14 42"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.92"
          />
          {/* Center blossom */}
          <circle cx="20" cy="20" r="3.8" stroke="currentColor" strokeWidth="1.25" opacity="0.95" />
          <circle cx="20" cy="20" r="1.6" fill="currentColor" opacity="0.8" />
          {/* Flower petals */}
          <path
            d="M20 16.5 C18 13.5, 22 13.5, 20 16.5 Z"
            fill="currentColor"
            opacity="0.6"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path
            d="M23.5 20 C26.5 18, 26.5 22, 23.5 20 Z"
            fill="currentColor"
            opacity="0.6"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path
            d="M20 23.5 C22 26.5, 18 26.5, 20 23.5 Z"
            fill="currentColor"
            opacity="0.6"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path
            d="M16.5 20 C13.5 22, 13.5 18, 16.5 20 Z"
            fill="currentColor"
            opacity="0.6"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          {/* Leaves along stems */}
          <path
            d="M13 8 C11 5, 15 3, 17 6 C16 9, 14 9, 13 8 Z"
            fill="currentColor"
            opacity="0.6"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path
            d="M8 13 C5 11, 3 15, 6 17 C9 16, 9 14, 8 13 Z"
            fill="currentColor"
            opacity="0.6"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path
            d="M31 15 C33 12, 38 13, 36 17 C33 18, 32 16, 31 15 Z"
            fill="currentColor"
            opacity="0.55"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path
            d="M15 31 C12 33, 13 38, 17 36 C18 33, 16 32, 15 31 Z"
            fill="currentColor"
            opacity="0.55"
            stroke="currentColor"
            strokeWidth="0.9"
          />
        </svg>
      );

    case 'vintage':
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', transform }}
        >
          {/* Antique ornamental corner bracket */}
          <path
            d="M4 4 L4 26 C4 23, 7 21, 9 24 C11 27, 8 30, 6 29"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M4 4 L26 4 C23 4, 21 7, 24 9 C27 11, 30 8, 29 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          {/* Ornate inner scroll curve */}
          <path
            d="M10 10 C18 10, 24 16, 24 24 C24 28, 21 29, 19 26 C17 23, 20 20, 23 21"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M10 10 C10 18, 16 24, 24 24"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.85"
          />
          {/* Filigree corner flourish accent */}
          <circle cx="8" cy="8" r="2.2" fill="currentColor" opacity="0.85" />
          <circle cx="15" cy="15" r="1.6" fill="currentColor" opacity="0.75" />
          <path
            d="M4 4 C12 7, 7 12, 4 4 Z"
            fill="currentColor"
            opacity="0.45"
          />
        </svg>
      );

    case 'zen':
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', transform }}
        >
          {/* Concentric peaceful ripple arcs */}
          <path
            d="M4 14 C10 14, 14 10, 14 4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M4 23 C15 23, 23 15, 23 4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M4 33 C21 33, 33 21, 33 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M4 43 C26 43, 43 26, 43 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="2.5 3"
            opacity="0.8"
          />
          {/* Water droplet / lotus petal accent */}
          <path
            d="M14 14 C17 11, 20 14, 18 17 C16 19, 13 17, 14 14 Z"
            fill="currentColor"
            opacity="0.65"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <circle cx="6" cy="6" r="2" fill="currentColor" opacity="0.85" />
        </svg>
      );

    case 'celestial':
      return (
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', transform }}
        >
          {/* Defined crescent moon */}
          <path
            d="M16 7 C11.5 10.5, 11.5 17.5, 16 21 C18.5 22.8, 22 22.5, 24.5 20.8 C19 23, 14 18.5, 15 12.8 C15.5 10, 17.2 8.2, 19.5 7 C18.2 6.9, 17 6.9, 16 7 Z"
            fill="currentColor"
            opacity="0.72"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Four-point sparkling stars */}
          <path
            d="M33 9 L34.2 12.5 L37.5 13.7 L34.2 14.9 L33 18.2 L31.8 14.9 L28.5 13.7 L31.8 12.5 Z"
            fill="currentColor"
            opacity="0.88"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <path
            d="M13 29 L14.2 31.8 L17 33 L14.2 34.2 L13 37 L11.8 34.2 L9 33 L11.8 31.8 Z"
            fill="currentColor"
            opacity="0.82"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
          <path
            d="M27 25 L27.8 26.8 L29.5 27.5 L27.8 28.2 L27 30 L26.2 28.2 L24.5 27.5 L26.2 26.8 Z"
            fill="currentColor"
            opacity="0.75"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
          {/* Constellation lines & dots */}
          <circle cx="6" cy="6" r="1.8" fill="currentColor" opacity="0.9" />
          <circle cx="23" cy="7" r="1.5" fill="currentColor" opacity="0.8" />
          <circle cx="7" cy="23" r="1.5" fill="currentColor" opacity="0.8" />
          <circle cx="39" cy="24" r="1.2" fill="currentColor" opacity="0.65" />
          <circle cx="24" cy="39" r="1.2" fill="currentColor" opacity="0.65" />
          <path
            d="M6 6 L12 6.5 M6 6 L6.5 12"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeDasharray="2 2"
            opacity="0.8"
          />
        </svg>
      );

    default:
      return null;
  }
}
