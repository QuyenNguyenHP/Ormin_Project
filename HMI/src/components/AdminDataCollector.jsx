import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, MenuItem, TextField, Typography } from "@mui/material";

const emptyStatus = {
  collector: { running: false, output: [] },
  fuel_calculation: { running: false, output: [] },
};

const formatTimestamp = (value) => value ? new Date(value).toLocaleString() : "—";

function ProcessStatus({ title, process }) {
  const output = process?.output ?? [];
  return (
    <Box sx={{ p: 2.5, border: "1px solid #364153", borderRadius: 2, bgcolor: "#182231", minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2 }}>
        <Typography sx={{ color: "#e2e8f0", fontWeight: 600 }}>{title}</Typography>
        <Chip
          size="small"
          label={process?.running ? `Running · PID ${process.pid}` : "Stopped"}
          color={process?.running ? "success" : "default"}
          sx={{ color: process?.running ? undefined : "#cbd5e1", bgcolor: process?.running ? undefined : "#334155" }}
        />
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1, mb: 2 }}>
        <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>Started: {formatTimestamp(process?.started_at)}</Typography>
        <Typography sx={{ color: "#94a3b8", fontSize: 13 }}>
          {process?.running ? "Exit code: —" : `Exit code: ${process?.last_exit_code ?? "—"}`}
        </Typography>
      </Box>
      <Box
        component="pre"
        sx={{ m: 0, p: 1.5, minHeight: 82, maxHeight: 230, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", borderRadius: 1.5, bgcolor: "#0b1220", border: "1px solid #334155", color: "#cbd5e1", fontSize: 12, lineHeight: 1.55 }}
      >
        {output.length ? output.join("\n") : "No process output yet."}
      </Box>
    </Box>
  );
}

export default function AdminDataCollector({ requestJson, fieldSx }) {
  const [status, setStatus] = useState(emptyStatus);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [day, setDay] = useState("");
  const [settings, setSettings] = useState(null);

  const refresh = useCallback(async (showError = false) => {
    try {
      const payload = await requestJson("/api/admin/data-collector/status");
      setStatus(payload);
      setSettings((current) => current ?? payload.settings ?? null);
    } catch (requestError) {
      if (showError) setError(requestError.message);
    }
  }, [requestJson]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!active) return;
      await refresh(true);
    };
    load();
    const intervalId = window.setInterval(() => refresh(false), 2000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const runAction = async (name, url, options) => {
    setBusy(name);
    setError("");
    setMessage("");
    try {
      const payload = await requestJson(url, options);
      setStatus(payload);
      setMessage(payload.message || "Action completed.");
    } catch (requestError) {
      setError(requestError.message);
      await refresh(false);
    } finally {
      setBusy("");
    }
  };

  const collector = status.collector ?? emptyStatus.collector;
  const fuel = status.fuel_calculation ?? emptyStatus.fuel_calculation;

  const updateSetting = (event) => {
    const { name, value } = event.target;
    setSettings((current) => ({ ...current, [name]: value }));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}

      <Box sx={{ p: 2.5, border: "1px solid #364153", borderRadius: 2, bgcolor: "#182231" }}>
        <Typography sx={{ color: "#e2e8f0", fontWeight: 600 }}>History data collection</Typography>
        <Typography sx={{ color: "#94a3b8", fontSize: 13, mt: 0.5, mb: 2 }}>
          Reads the configured Modbus points every 15 or 30 seconds. Each snapshot is written to a new timestamped CSV file and to SQLite.
        </Typography>
        {settings && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px minmax(280px, 1fr)" }, gap: 2, mb: 2 }}>
            <TextField
              select
              sx={fieldSx}
              name="collection_interval_seconds"
              label="Collection interval"
              value={String(settings.collection_interval_seconds)}
              onChange={updateSetting}
              disabled={collector.running || Boolean(busy)}
            >
              <MenuItem value="15">Every 15 seconds</MenuItem>
              <MenuItem value="30">Every 30 seconds</MenuItem>
            </TextField>
            <TextField
              required
              sx={fieldSx}
              name="csv_directory"
              label="CSV storage directory"
              value={settings.csv_directory}
              onChange={updateSetting}
              disabled={collector.running || Boolean(busy)}
              helperText="Relative paths are resolved from backend/data_collector; absolute paths are also supported."
            />
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            disabled={!settings || collector.running || Boolean(busy)}
            onClick={() => runAction("collector-save", "/api/admin/data-collector/settings", { method: "PUT", body: JSON.stringify(settings) })}
            sx={{ textTransform: "none" }}
          >
            {busy === "collector-save" ? "Saving..." : "Save settings"}
          </Button>
          <Button
            variant="contained"
            disabled={collector.running || Boolean(busy)}
            onClick={() => runAction("collector-start", "/api/admin/data-collector/start", { method: "POST" })}
            sx={{ textTransform: "none" }}
          >
            {busy === "collector-start" ? "Starting..." : "Start collection"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!collector.running || Boolean(busy)}
            onClick={() => runAction("collector-stop", "/api/admin/data-collector", { method: "DELETE" })}
            sx={{ textTransform: "none" }}
          >
            {busy === "collector-stop" ? "Stopping..." : "Stop collection"}
          </Button>
        </Box>
      </Box>

      <ProcessStatus title="Modbus CSV/SQLite collector" process={collector} />

      <Box sx={{ p: 2.5, border: "1px solid #364153", borderRadius: 2, bgcolor: "#182231" }}>
        <Typography sx={{ color: "#e2e8f0", fontWeight: 600 }}>Daily fuel consumption</Typography>
        <Typography sx={{ color: "#94a3b8", fontSize: 13, mt: 0.5, mb: 2 }}>
          Leave the day empty to recalculate every available UTC day, or choose one specific UTC day.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            sx={{ ...fieldSx, width: 220 }}
            label="UTC day (optional)"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            disabled={fuel.running || Boolean(busy)}
            onClick={() => runAction("fuel-start", "/api/admin/fuel-calculation/start", { method: "POST", body: JSON.stringify({ day: day || null }) })}
            sx={{ textTransform: "none" }}
          >
            {busy === "fuel-start" ? "Starting..." : "Calculate now"}
          </Button>
          {fuel.running && (
            <Button
              variant="outlined"
              color="error"
              disabled={Boolean(busy)}
              onClick={() => runAction("fuel-stop", "/api/admin/fuel-calculation", { method: "DELETE" })}
              sx={{ textTransform: "none" }}
            >
              Stop calculation
            </Button>
          )}
        </Box>
      </Box>

      <ProcessStatus title="Fuel consumption calculation" process={fuel} />
    </Box>
  );
}
