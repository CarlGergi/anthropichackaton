export default function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>React is Working! ✓</h1>
      <p>If you see this, React is rendering correctly.</p>
      <p>Environment variables:</p>
      <ul>
        <li>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL || 'MISSING'}</li>
        <li>VITE_SUPABASE_PUBLISHABLE_KEY: {import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'MISSING'}</li>
      </ul>
    </div>
  );
}
