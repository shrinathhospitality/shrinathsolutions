export interface HealthCheckResult {
  success: boolean;
  database: 'connected' | 'unavailable';
}

export async function checkApiHealth(): Promise<HealthCheckResult> {
  const response = await fetch('/api/health.php');
  return (await response.json()) as HealthCheckResult;
}
