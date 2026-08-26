/** Faint static gradient accents sitting behind the page content — kept very subtle and
 *  non-animated on the light theme (a continuously animated full-viewport gradient reads as
 *  distracting glow on light backgrounds, and reduces text contrast). */
export default function Orbs() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute rounded-full"
        style={{
          top: -190, left: -140, width: 630, height: 630, filter: 'blur(60px)',
          background: 'radial-gradient(circle at 40% 40%, rgba(49,87,229,.09), rgba(49,87,229,0) 68%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: 380, right: -170, width: 580, height: 580, filter: 'blur(70px)',
          background: 'radial-gradient(circle at 50% 50%, rgba(115,71,232,.07), rgba(115,71,232,0) 70%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: -160, left: '28%', width: 520, height: 520, filter: 'blur(70px)',
          background: 'radial-gradient(circle at 50% 50%, rgba(255,122,61,.06), rgba(255,122,61,0) 70%)',
        }}
      />
    </div>
  );
}
