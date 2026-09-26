const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1>AI-Powered Customer Insights</h1>
      <p>
        Frontend base (RF-06). API: <code>{apiUrl}</code>
      </p>
      {/* TODO: FeedbackForm (POST /feedbacks) */}
      {/* TODO: FeedbackTable com filtros status/sentiment/urgency */}
      {/* TODO: AnalysisModal + MetricsDashboard (GET /feedbacks/metrics) */}
      <p>Scaffolding pronto. Próxima etapa: implementar componentes.</p>
    </main>
  );
}
