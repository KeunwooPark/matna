/** The app mark (same drawing as src/app/icon.svg): a map pin with a ticked box, on an accent tile. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={className}>
      <rect width="64" height="64" rx="14" fill="#ff6b35" />
      <path d="M32 9c-8.3 0-15 6.5-15 14.7C17 34.5 32 50 32 50s15-15.5 15-26.3C47 15.5 40.3 9 32 9z" fill="#fff" />
      <rect x="24.5" y="16.5" width="14" height="14" rx="3" fill="none" stroke="#ff6b35" strokeWidth="2.6" />
      <path d="M27.5 23l3.6 3.6L40 16" fill="none" stroke="#ff6b35" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
