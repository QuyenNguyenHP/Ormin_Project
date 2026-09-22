import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import AdminAddresses from "../components/AdminAddresses";
import AdminDatabase from "../components/AdminDatabase";

const emptyLogin = { username: "", password: "" };
const emptyConfig = {
  host: "",
  port: "502",
  unit_id: "1",
  timeout_seconds: "3",
  poll_interval_ms: "1000",
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
};

const fieldSx = {
  "& .MuiInputLabel-root": { color: "#94a3b8" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#51a2ff" },
  "& .MuiOutlinedInput-root": {
    color: "#f8fafc",
    backgroundColor: "#101828",
    borderRadius: "6px",
    "& fieldset": { borderColor: "#475569" },
    "&:hover fieldset": { borderColor: "#64748b" },
    "&.Mui-focused fieldset": { borderColor: "#51a2ff", borderWidth: "1px" },
  },
  "& .MuiInputBase-input": { padding: "14px" },
};

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [login, setLogin] = useState(emptyLogin);
  const [config, setConfig] = useState(emptyConfig);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginInputsEnabled, setLoginInputsEnabled] = useState(false);
  const [section, setSection] = useState("signals");

  useEffect(() => {
    const clearAutofill = () => setLogin({ username: "", password: "" });
    clearAutofill();
    const timeoutId = window.setTimeout(clearAutofill, 150);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const loadConfig = async () => {
    const payload = await requestJson("/api/admin/modbus");
    setConfig(Object.fromEntries(Object.entries(payload.modbus).map(([key, value]) => [key, String(value)])));
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const payload = await requestJson("/api/admin/session");
        setAuthenticated(payload.authenticated);
        if (payload.authenticated) await loadConfig();
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await requestJson("/api/admin/login", { method: "POST", body: JSON.stringify(login) });
      await loadConfig();
      setAuthenticated(true);
      setLogin(emptyLogin);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const payload = await requestJson("/api/admin/modbus", { method: "PUT", body: JSON.stringify(config) });
      setConfig(Object.fromEntries(Object.entries(payload.modbus).map(([key, value]) => [key, String(value)])));
      setSuccess(payload.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await requestJson("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setSuccess("");
    setError("");
  };

  const updateField = (setter) => (event) => setter((current) => ({ ...current, [event.target.name]: event.target.value }));

  if (checkingSession) {
    return (
      <Box className="min-h-screen bg-[#101828] flex items-center justify-center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="min-h-screen bg-[#101828] w-full flex flex-col items-start">
      <Header />
      <main className="self-stretch flex-1 flex items-start max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="flex-1 min-w-0 flex items-start !p-4 box-border max-w-full">
          <Box sx={{ width: "100%", minWidth: 0, p: { xs: 2, md: 3 }, borderRadius: "10px", bgcolor: "#1e2939", border: "1px solid #364153", fontFamily: "Roboto", textAlign: "left" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", pb: 2.5, mb: 3, borderBottom: "1px solid #364153" }}>
              <Box>
              <Typography variant="h5" className="!font-bold !text-[#f8fafc]">Administration</Typography>
              <Typography className="!mt-2 !text-[#94a3b8]">Modbus signals and SQLite history management</Typography>
              </Box>
              {authenticated && <Button variant="outlined" onClick={handleLogout} disabled={submitting} sx={{ borderColor: "#475569", color: "#cbd5e1", textTransform: "none" }}>Sign out</Button>}
            </Box>
            {authenticated && <Tabs value={section} onChange={(_, value) => setSection(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 3, minHeight: 42, borderBottom: "1px solid #364153", "& .MuiTab-root": { color: "#94a3b8", minHeight: 42, textTransform: "none" }, "& .Mui-selected": { color: "#93c5fd !important" } }}>
              <Tab value="signals" label="Modbus & signal addresses" />
              <Tab value="sqlite" label="Database" />
            </Tabs>}
            <Box sx={{ display: "grid", gridTemplateColumns: !authenticated || section === "signals" ? { xs: "minmax(0, 1fr)", lg: authenticated ? "300px minmax(0, 1fr)" : "minmax(0, 460px)" } : "minmax(0, 1fr)", gap: 3, alignItems: "start" }}>
              {(!authenticated || section === "signals") && <Box sx={{ minWidth: 0, p: 2.5, border: "1px solid #364153", borderRadius: 2, bgcolor: "#182231" }}>
                {error && <Alert severity="error" className="!mb-5">{error}</Alert>}
                {success && <Alert severity="success" className="!mb-5">{success}</Alert>}
                {!authenticated ? (
                  <Box component="form" onSubmit={handleLogin} autoComplete="off" className="flex flex-col gap-5">
                    <Typography className="!font-medium !text-[#e2e8f0]">Administrator sign in</Typography>
                    <TextField
                      required
                      sx={fieldSx}
                      id="admin-login-username"
                      name="admin_login_username"
                      label="Username"
                      autoComplete="new-password"
                      InputProps={{ readOnly: !loginInputsEnabled }}
                      value={login.username}
                      onFocus={() => setLoginInputsEnabled(true)}
                      onChange={(event) => setLogin((current) => ({ ...current, username: event.target.value }))}
                    />
                    <TextField
                      required
                      sx={fieldSx}
                      id="admin-login-password"
                      name="admin_login_password"
                      label="Password"
                      type="password"
                      autoComplete="new-password"
                      InputProps={{ readOnly: !loginInputsEnabled }}
                      value={login.password}
                      onFocus={() => setLoginInputsEnabled(true)}
                      onChange={(event) => setLogin((current) => ({ ...current, password: event.target.value }))}
                    />
                    <Button type="submit" variant="contained" disabled={submitting} className="!h-11 !rounded-md !bg-[#155dfc] hover:!bg-[#1d4ed8]">{submitting ? "Signing in..." : "Sign in"}</Button>
                  </Box>
                ) : (
                  <Box component="form" onSubmit={handleSave} className="flex flex-col gap-5">
                    <Box>
                      <Typography className="!font-semibold !text-[#e2e8f0]">Modbus TCP settings</Typography>
                      <Typography sx={{ color: "#94a3b8", fontSize: 13, mt: 0.5 }}>Connection and polling configuration</Typography>
                    </Box>
                    <TextField required sx={fieldSx} name="host" label="Host / IP address" value={config.host} onChange={updateField(setConfig)} />
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2.5 }}>
                      <TextField required sx={fieldSx} name="port" label="Port" type="number" inputProps={{ min: 1, max: 65535 }} value={config.port} onChange={updateField(setConfig)} />
                      <TextField required sx={fieldSx} name="unit_id" label="Unit ID" type="number" inputProps={{ min: 0, max: 247 }} value={config.unit_id} onChange={updateField(setConfig)} />
                      <TextField required sx={fieldSx} name="timeout_seconds" label="Timeout (s)" type="number" inputProps={{ min: 0.1, max: 120, step: 0.1 }} value={config.timeout_seconds} onChange={updateField(setConfig)} />
                      <TextField required sx={fieldSx} name="poll_interval_ms" label="Poll (ms)" type="number" inputProps={{ min: 100, max: 3600000 }} value={config.poll_interval_ms} onChange={updateField(setConfig)} />
                    </Box>
                    <Box className="flex flex-wrap gap-3 pt-2">
                      <Button fullWidth type="submit" variant="contained" disabled={submitting} className="!h-11 !rounded-md !bg-[#155dfc] hover:!bg-[#1d4ed8]" sx={{ textTransform: "none" }}>{submitting ? "Saving..." : "Save configuration"}</Button>
                    </Box>
                  </Box>
                )}
              </Box>}
              {authenticated && section === "signals" && <AdminAddresses requestJson={requestJson} fieldSx={fieldSx} />}
              {authenticated && section === "sqlite" && <AdminDatabase requestJson={requestJson} fieldSx={fieldSx} />}
            </Box>
          </Box>
        </section>
      </main>
      <Footer />
    </Box>
  );
};

export default Admin;
