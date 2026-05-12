export const fetchPIDMonitorPayload = async () => {
  const response = await fetch("/api/pid-monitor");

  if (!response.ok) {
    throw new Error(`PID monitor request failed with status ${response.status}`);
  }

  return response.json();
};
