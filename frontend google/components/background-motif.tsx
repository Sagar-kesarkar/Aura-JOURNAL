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
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M3 3 C10 14, 16 22, 14 42"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {/* Center blossom */}
          <circle cx="20" cy="20" r="3.5" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="20" cy="20" r="1.4" fill="currentColor" opacity="0.6" />
          {/* Flower petals */}
          <path
            d="M20 16.5 C18 13.5, 22 13.5, 20 16.5 Z"
            fill="currentColor"
            opacity="0.35"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <path
            d="M23.5 20 C26.5 18, 26.5 22, 23.5 20 Z"
            fill="currentColor"
            opacity="0.35"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <path
            d="M20 23.5 C22 26.5, 18 26.5, 20 23.5 Z"
            fill="currentColor"
            opacity="0.35"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <path
            d="M16.5 20 C13.5 22, 13.5 18, 16.5 20 Z"
            fill="currentColor"
            opacity="0.35"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          {/* Leaves along stems */}
          <path
            d="M13 8 C11 5, 15 3, 17 6 C16 9, 14 9, 13 8 Z"
            fill="currentColor"
            opacity="0.4"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <path
            d="M8 13 C5 11, 3 15, 6 17 C9 16, 9 14, 8 13 Z"
            fill="currentColor"
            opacity="0.4"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <path
            d="M31 15 C33 12, 38 13, 36 17 C33 18, 32 16, 31 15 Z"
            fill="currentColor"
            opacity="0.3"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <path
            d="M15 31 C12 33, 13 38, 17 36 C18 33, 16 32, 15 31 Z"
            fill="currentColor"
            opacity="0.3"
            stroke="currentColor"
            strokeWidth="0.8"
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
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M4 4 L26 4 C23 4, 21 7, 24 9 C27 11, 30 8, 29 6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Ornate inner scroll curve */}
          <path
            d="M10 10 C18 10, 24 16, 24 24 C24 28, 21 29, 19 26 C17 23, 20 20, 23 21"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path
            d="M10 10 C10 18, 16 24, 24 24"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
          {/* Filigree corner flourish accent */}
          <circle cx="8" cy="8" r="1.8" fill="currentColor" opacity="0.6" />
          <circle cx="15" cy="15" r="1.3" fill="currentColor" opacity="0.5" />
          <path
            d="M4 4 C12 7, 7 12, 4 4 Z"
            fill="currentColor"
            opacity="0.25"
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
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path
            d="M4 23 C15 23, 23 15, 23 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M4 33 C21 33, 33 21, 33 4"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path
            d="M4 43 C26 43, 43 26, 43 4"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />
          {/* Water droplet / lotus petal accent */}
          <path
            d="M14 14 C17 11, 20 14, 18 17 C16 19, 13 17, 14 14 Z"
            fill="currentColor"
            opacity="0.4"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <circle cx="6" cy="6" r="1.5" fill="currentColor" opacity="0.5" />
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
          {/* Delicate crescent moon */}
          <path
            d="M16 8 C12 11, 12 17, 16 20 C18 21.5, 21 21.5, 23 20 C18 22, 14 18, 15 13 C15.5 10.5, 17 9, 19 8 C18 8, 17 8, 16 8 Z"
            fill="currentColor"
            opacity="0.5"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          {/* Four-point sparkling stars */}
          <path
            d="M32 10 L33 13 L36 14 L33 15 L32 18 L31 15 L28 14 L31 13 Z"
            fill="currentColor"
            opacity="0.6"
          />
          <path
            d="M12 30 L13 32 L15 33 L13 34 L12 36 L11 34 L9 33 L11 32 Z"
            fill="currentColor"
            opacity="0.5"
          />
          <path
            d="M26 26 L26.7 27.5 L28.2 28.2 L26.7 28.9 L26 30.4 L25.3 28.9 L23.8 28.2 L25.3 27.5 Z"
            fill="currentColor"
            opacity="0.4"
          />
          {/* Constellation lines & dots */}
          <circle cx="6" cy="6" r="1.2" fill="currentColor" opacity="0.7" />
          <circle cx="22" cy="7" r="1" fill="currentColor" opacity="0.5" />
          <circle cx="7" cy="22" r="1" fill="currentColor" opacity="0.5" />
          <path
            d="M6 6 L12 7 M6 6 L7 12"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="1.5 2"
          />
        </svg>
      );

    default:
      return null;
  }
}
