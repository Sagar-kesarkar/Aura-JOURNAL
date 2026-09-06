'use client';
import { type MotifId } from '../app/journal-data';

export function BackgroundMotif({ motif = 'none' }: { motif?: MotifId }) {
  if (!motif || motif === 'none') return null;

  return (
    <div className={`journal-motif-container motif-${motif}`} aria-hidden="true">
      {motif === 'botanical' && <BotanicalMotif />}
      {motif === 'vintage' && <VintageMotif />}
      {motif === 'zen' && <ZenMotif />}
      {motif === 'celestial' && <CelestialMotif />}
    </div>
  );
}

function BotanicalMotif() {
  return (
    <>
      {/* Top Left Floral Branch */}
      <svg
        className="motif-art motif-top-left"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 10 C 45 40, 80 50, 150 45 C 170 43, 190 35, 195 20"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M10 10 C 25 60, 40 110, 45 180"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Flower Blossom 1 */}
        <circle cx="85" cy="48" r="8" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="85" cy="48" r="3.5" fill="currentColor" opacity="0.5" />
        <path
          d="M85 40 C 80 30, 90 30, 85 40 M93 48 C 103 45, 103 55, 93 48 M85 56 C 90 66, 80 66, 85 56 M77 48 C 67 52, 67 42, 77 48"
          stroke="currentColor"
          strokeWidth="1"
        />
        {/* Leaves */}
        <path
          d="M50 35 C 40 25, 45 15, 60 22 C 65 30, 58 36, 50 35 Z"
          fill="currentColor"
          opacity="0.25"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M115 46 C 125 36, 140 38, 135 50 C 128 55, 120 52, 115 46 Z"
          fill="currentColor"
          opacity="0.25"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M28 80 C 15 75, 12 90, 25 95 C 33 93, 34 85, 28 80 Z"
          fill="currentColor"
          opacity="0.25"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M42 120 C 55 125, 60 140, 48 145 C 40 142, 38 130, 42 120 Z"
          fill="currentColor"
          opacity="0.25"
          stroke="currentColor"
          strokeWidth="0.8"
        />
      </svg>

      {/* Top Right Olive Branch */}
      <svg
        className="motif-art motif-top-right"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M190 10 C 155 40, 120 50, 50 45 C 30 43, 10 35, 5 20"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M190 10 C 175 60, 160 110, 155 180"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Flower Blossom */}
        <circle cx="115" cy="48" r="8" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="115" cy="48" r="3.5" fill="currentColor" opacity="0.5" />
        <path
          d="M115 40 C 110 30, 120 30, 115 40 M123 48 C 133 45, 133 55, 123 48 M115 56 C 120 66, 110 66, 115 56 M107 48 C 97 52, 97 42, 107 48"
          stroke="currentColor"
          strokeWidth="1"
        />
        {/* Leaves */}
        <path
          d="M150 35 C 160 25, 155 15, 140 22 C 135 30, 142 36, 150 35 Z"
          fill="currentColor"
          opacity="0.25"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M85 46 C 75 36, 60 38, 65 50 C 72 55, 80 52, 85 46 Z"
          fill="currentColor"
          opacity="0.25"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M172 80 C 185 75, 188 90, 175 95 C 167 93, 166 85, 172 80 Z"
          fill="currentColor"
          opacity="0.25"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M158 120 C 145 125, 140 140, 152 145 C 160 142, 162 130, 158 120 Z"
          fill="currentColor"
          opacity="0.25"
          stroke="currentColor"
          strokeWidth="0.8"
        />
      </svg>

      {/* Bottom Right Lush Botanical Bouquet */}
      <svg
        className="motif-art motif-bottom-right"
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M230 230 C 180 200, 140 160, 90 90"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M230 230 C 200 170, 170 120, 120 50"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M230 230 C 170 205, 110 190, 40 175"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Peony / Large Flower */}
        <circle cx="110" cy="115" r="14" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="110" cy="115" r="8" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
        <circle cx="110" cy="115" r="4" fill="currentColor" opacity="0.4" />
        <path
          d="M110 95 C 100 80, 120 80, 110 95 M130 115 C 145 105, 145 125, 130 115 M110 135 C 120 150, 100 150, 110 135 M90 115 C 75 125, 75 105, 90 115"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        {/* Rosebud */}
        <circle cx="145" cy="70" r="7" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.15" />
        <path
          d="M145 63 C 140 55, 150 55, 145 63 M152 70 C 160 67, 160 75, 152 70"
          stroke="currentColor"
          strokeWidth="1"
        />
        {/* Fern Fronds & Foliage */}
        <path
          d="M160 170 C 145 150, 155 130, 175 145 C 185 155, 180 170, 160 170 Z"
          fill="currentColor"
          opacity="0.22"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M185 195 C 170 185, 175 170, 195 180 C 200 188, 195 198, 185 195 Z"
          fill="currentColor"
          opacity="0.22"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M80 180 C 65 175, 60 160, 80 165 C 90 170, 92 182, 80 180 Z"
          fill="currentColor"
          opacity="0.22"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      {/* Bottom Left Subtle Sprout */}
      <svg
        className="motif-art motif-bottom-left"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 150 C 40 130, 60 100, 75 50"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M10 150 C 30 145, 70 140, 110 135"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="75" cy="50" r="5" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.3" />
        <path
          d="M45 110 C 35 95, 45 90, 55 102 C 58 110, 52 115, 45 110 Z"
          fill="currentColor"
          opacity="0.22"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M65 140 C 75 128, 90 130, 82 142 C 76 146, 70 144, 65 140 Z"
          fill="currentColor"
          opacity="0.22"
          stroke="currentColor"
          strokeWidth="0.8"
        />
      </svg>
    </>
  );
}

function VintageMotif() {
  return (
    <>
      {/* Top Left Victorian Corner Filigree */}
      <svg
        className="motif-art motif-top-left"
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 15 L 140 15 M 15 15 L 15 140"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M22 22 L 120 22 M 22 22 L 22 120"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="4 2"
        />
        {/* Baroque Spirals */}
        <path
          d="M15 15 C 40 20, 60 40, 65 65 C 70 90, 50 110, 30 100 C 15 90, 25 70, 40 75 C 50 80, 45 92, 38 90"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M15 15 C 20 40, 40 60, 65 65 C 90 70, 110 50, 100 30 C 90 15, 70 25, 75 40 C 80 50, 92 45, 90 38"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="15" cy="15" r="3.5" fill="currentColor" />
        <circle cx="140" cy="15" r="2.5" fill="currentColor" />
        <circle cx="15" cy="140" r="2.5" fill="currentColor" />
      </svg>

      {/* Top Right Victorian Corner Filigree */}
      <svg
        className="motif-art motif-top-right"
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M165 15 L 40 15 M 165 15 L 165 140"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M158 22 L 60 22 M 158 22 L 158 120"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="4 2"
        />
        <path
          d="M165 15 C 140 20, 120 40, 115 65 C 110 90, 130 110, 150 100 C 165 90, 155 70, 140 75 C 130 80, 135 92, 142 90"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M165 15 C 160 40, 140 60, 115 65 C 90 70, 70 50, 80 30 C 90 15, 110 25, 105 40 C 100 50, 88 45, 90 38"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="165" cy="15" r="3.5" fill="currentColor" />
        <circle cx="40" cy="15" r="2.5" fill="currentColor" />
        <circle cx="165" cy="140" r="2.5" fill="currentColor" />
      </svg>

      {/* Bottom Right Victorian Corner Filigree */}
      <svg
        className="motif-art motif-bottom-right"
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M165 165 L 40 165 M 165 165 L 165 40"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M158 158 L 60 158 M 158 158 L 158 60"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="4 2"
        />
        <path
          d="M165 165 C 140 160, 120 140, 115 115 C 110 90, 130 70, 150 80 C 165 90, 155 110, 140 105 C 130 100, 135 88, 142 90"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="165" cy="165" r="3.5" fill="currentColor" />
        <circle cx="40" cy="165" r="2.5" fill="currentColor" />
        <circle cx="165" cy="40" r="2.5" fill="currentColor" />
      </svg>

      {/* Bottom Left Victorian Corner Filigree */}
      <svg
        className="motif-art motif-bottom-left"
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 165 L 140 165 M 15 165 L 15 40"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M22 158 L 120 158 M 22 158 L 22 60"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="4 2"
        />
        <circle cx="15" cy="165" r="3.5" fill="currentColor" />
        <circle cx="140" cy="165" r="2.5" fill="currentColor" />
        <circle cx="15" cy="40" r="2.5" fill="currentColor" />
      </svg>
    </>
  );
}

function ZenMotif() {
  return (
    <>
      {/* Top Left Concentric Ripples */}
      <svg
        className="motif-art motif-top-left"
        viewBox="0 0 220 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="0" cy="0" r="60" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
        <circle cx="0" cy="0" r="100" stroke="currentColor" strokeWidth="1" />
        <circle cx="0" cy="0" r="145" stroke="currentColor" strokeWidth="1" strokeDasharray="6 4" />
        <circle cx="0" cy="0" r="190" stroke="currentColor" strokeWidth="1.2" />
        {/* Gentle Lotus Arch */}
        <path
          d="M30 65 C 50 40, 75 40, 95 65 C 75 80, 50 80, 30 65 Z"
          fill="currentColor"
          opacity="0.18"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      {/* Bottom Right Concentric Ripples & Lotus */}
      <svg
        className="motif-art motif-bottom-right"
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="240" cy="240" r="70" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
        <circle cx="240" cy="240" r="120" stroke="currentColor" strokeWidth="1" />
        <circle cx="240" cy="240" r="170" stroke="currentColor" strokeWidth="1" strokeDasharray="6 4" />
        <circle cx="240" cy="240" r="220" stroke="currentColor" strokeWidth="1.2" />
        {/* Center Lotus Blossom */}
        <path
          d="M130 150 C 145 120, 175 120, 190 150 C 165 170, 145 170, 130 150 Z"
          fill="currentColor"
          opacity="0.2"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M160 115 C 150 135, 170 135, 160 115 Z"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
    </>
  );
}

function CelestialMotif() {
  return (
    <>
      {/* Top Right Crescent Moon & Stars */}
      <svg
        className="motif-art motif-top-right"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Crescent Moon */}
        <path
          d="M150 40 C 130 55, 130 85, 150 100 C 120 95, 115 50, 150 40 Z"
          fill="currentColor"
          opacity="0.3"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        {/* Sparkle 4-point stars */}
        <path
          d="M70 45 Q 70 60 85 60 Q 70 60 70 75 Q 70 60 55 60 Q 70 60 70 45 Z"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M120 130 Q 120 140 130 140 Q 120 140 120 150 Q 120 140 110 140 Q 120 140 120 130 Z"
          fill="currentColor"
          opacity="0.35"
        />
        <circle cx="95" cy="90" r="1.5" fill="currentColor" opacity="0.6" />
        <circle cx="165" cy="130" r="2" fill="currentColor" opacity="0.5" />
        <circle cx="45" cy="80" r="1.5" fill="currentColor" opacity="0.5" />
      </svg>

      {/* Bottom Left Constellation */}
      <svg
        className="motif-art motif-bottom-left"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M40 160 L 70 130 L 110 140 L 140 110"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="3 3"
          opacity="0.5"
        />
        <circle cx="40" cy="160" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="70" cy="130" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="110" cy="140" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="140" cy="110" r="3.5" fill="currentColor" opacity="0.7" />
        <path
          d="M140 100 Q 140 110 150 110 Q 140 110 140 120 Q 140 110 130 110 Q 140 110 140 100 Z"
          fill="currentColor"
          opacity="0.4"
        />
      </svg>
    </>
  );
}
