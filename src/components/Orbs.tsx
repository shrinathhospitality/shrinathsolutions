/** Animated gradient orbs sitting behind the glass layers. */
export default function Orbs() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute rounded-full"
        style={{
          top: -190, left: -140, width: 630, height: 630, filter: 'blur(32px)',
          background: 'radial-gradient(circle at 40% 40%, rgba(59,107,255,.45), rgba(59,107,255,0) 68%)',
          animation: 'drift 27s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: 380, right: -170, width: 580, height: 580, filter: 'blur(38px)',
          background: 'radial-gradient(circle at 50% 50%, rgba(123,92,255,.38), rgba(123,92,255,0) 70%)',
          animation: 'drift 34s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: -160, left: '28%', width: 520, height: 520, filter: 'blur(40px)',
          background: 'radial-gradient(circle at 50% 50%, rgba(34,211,238,.24), rgba(34,211,238,0) 70%)',
          animation: 'drift 40s ease-in-out infinite',
        }}
      />
    </div>
  );
}
