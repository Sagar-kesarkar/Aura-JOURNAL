import { treePaths, treeViewBox } from './tree-paths';

/** Decorative alongside the visible Aura wordmark; colours inherit the theme. */
export function TreeLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`tree-logo ${className}`}
      viewBox={treeViewBox}
      aria-hidden="true"
      focusable="false"
      fillRule="evenodd"
    >
      <g className="tree-canopy-mid">
        <path d={treePaths.mid} />
      </g>
      <g className="tree-roots-dark">
        <path d={treePaths.roots} />
      </g>
      <g className="tree-canopy-shadow">
        <path d={treePaths.shadow} />
      </g>
      <g className="tree-canopy-highlight">
        <path d={treePaths.highlight} />
      </g>
    </svg>
  );
}
