import { useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import FuelConsumptionBarChart from "../components/FuelConsumptionBarChart";
import DashboardButton from "../components/DashboardButton";
import { fetchDailyFuelConsumption, fetchModbusStatus } from "../services/pidMonitorApi";

const MODBUS_STATUS_POLL_INTERVAL_MS = 6000;
const ENGINE_NUMBERS = [1, 2, 3, 4];
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 30;

const shiftDay = (day, offset) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);

const Consumption = () => {
  const [dailyPayload, setDailyPayload] = useState(null);
  const [modbusConnected, setModbusConnected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [draftStartDay, setDraftStartDay] = useState("");
  const [draftEndDay, setDraftEndDay] = useState("");
  const [appliedRange, setAppliedRange] = useState(null);
  const [chartCount, setChartCount] = useState(4);
  const [selectedEngine, setSelectedEngine] = useState(1);

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      try {
        const status = await fetchModbusStatus();
        if (active) setModbusConnected(Boolean(status?.connected));
      } catch {
        if (active) setModbusConnected(false);
      }
    };
    loadStatus();
    const intervalId = window.setInterval(loadStatus, MODBUS_STATUS_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadDaily = async () => {
      setIsLoading(true);
      try {
        const nextPayload = await fetchDailyFuelConsumption(appliedRange ?? {});
        if (!active) return;
        setDailyPayload(nextPayload);
        setDraftStartDay(nextPayload?.meta?.startDay ?? "");
        setDraftEndDay(nextPayload?.meta?.endDay ?? "");
        setLastUpdated(new Date());
        setError("");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load daily fuel consumption.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadDaily();
    return () => { active = false; };
  }, [appliedRange]);

  const handleApplyRange = () => {
    if (!draftStartDay || !draftEndDay) {
      setError("Both From day and To day are required.");
      return;
    }
    const daysApart = (Date.parse(`${draftEndDay}T00:00:00Z`) - Date.parse(`${draftStartDay}T00:00:00Z`)) / DAY_MS;
    if (daysApart < 0) {
      setError("From day must be on or before To day.");
      return;
    }
    if (daysApart >= MAX_DAYS) {
      setError(`Select at most ${MAX_DAYS} UTC days.`);
      return;
    }
    setAppliedRange({ startDay: draftStartDay, endDay: draftEndDay });
  };

  const handleShiftRange = (direction) => {
    if (!draftStartDay || !draftEndDay) return;
    const startDay = shiftDay(draftStartDay, direction);
    const endDay = shiftDay(draftEndDay, direction);
    setDraftStartDay(startDay);
    setDraftEndDay(endDay);
    setAppliedRange({ startDay, endDay });
  };

  const visibleEngines = chartCount === 1 ? [selectedEngine] : ENGINE_NUMBERS;
  const recordsByEngine = useMemo(() => {
    const records = dailyPayload?.records ?? [];
    return Object.fromEntries(
      ENGINE_NUMBERS.map((engine) => [
        engine,
        records.filter((record) => Number(record.engine) === engine),
      ])
    );
  }, [dailyPayload]);

  return (
    <Box className="min-h-screen relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch flex-1 overflow-hidden flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="flex-1 overflow-hidden flex items-start justify-center !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="relative flex-1 min-h-[916px] overflow-auto rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border flex flex-col items-start !p-6 max-w-full shrink-0">
            {isLoading && (
              <Box className="absolute inset-0 z-10 flex items-center justify-center rounded-[10px] bg-[#0f172ab3] backdrop-blur-[2px]">
                <Box className="flex flex-col items-center gap-3 rounded-[14px] border border-[#334155] bg-[#111827] !px-6 !py-5">
                  <CircularProgress size={40} thickness={4.5} sx={{ color: "#38bdf8" }} />
                  <Typography className="text-[14px] font-semibold text-[#dbeafe]">Loading data</Typography>
                </Box>
              </Box>
            )}
            <Box className="w-full flex flex-col gap-6">
              {error && (
                <Box role="alert" className="rounded-[10px] border border-[#ef4444] bg-[#7f1d1d] !p-3 text-[14px] text-[#fee2e2]">
                  {error}
                </Box>
              )}
              <Box className="w-full rounded-[14px] border border-[#334155] bg-[#111827] !px-3 !py-3">
                <Box className="flex flex-wrap items-center justify-between gap-3">
                  <Box className="flex flex-wrap items-center gap-3">
                    <Box className="flex items-center gap-2 rounded-[12px] border border-[#334155] bg-[#0b1220] !px-3 !py-2">
                      <Typography className="text-[13px] font-semibold text-[#8fb4ef]">From day (UTC)</Typography>
                      <input type="date" className="border-0 bg-transparent text-[14px] font-semibold text-[#f8fafc] outline-none [color-scheme:dark]" value={draftStartDay} onChange={(event) => setDraftStartDay(event.target.value)} />
                    </Box>
                    <Box className="flex items-center gap-2 rounded-[12px] border border-[#334155] bg-[#0b1220] !px-3 !py-2">
                      <Typography className="text-[13px] font-semibold text-[#8fb4ef]">To day (UTC)</Typography>
                      <input type="date" className="border-0 bg-transparent text-[14px] font-semibold text-[#f8fafc] outline-none [color-scheme:dark]" value={draftEndDay} onChange={(event) => setDraftEndDay(event.target.value)} />
                    </Box>
                    <DashboardButton onClick={() => handleShiftRange(-1)} active>Prev day</DashboardButton>
                    <DashboardButton onClick={() => handleShiftRange(1)} active>Next day</DashboardButton>
                    <DashboardButton onClick={handleApplyRange} active>Apply</DashboardButton>
                  </Box>
                  <Box className="flex flex-wrap items-center gap-3">
                    <ToggleButtonGroup exclusive size="small" value={chartCount} onChange={(_, value) => value && setChartCount(value)} aria-label="Number of graphs" sx={{ bgcolor: "#0b1220", "& .MuiToggleButton-root": { color: "#94a3b8", borderColor: "#334155", px: 2, textTransform: "none", "&.Mui-selected": { color: "#fff", bgcolor: "#155dfc", "&:hover": { bgcolor: "#1d4ed8" } } } }}>
                      <ToggleButton value={1}>1 graph</ToggleButton>
                      <ToggleButton value={4}>4 graphs</ToggleButton>
                    </ToggleButtonGroup>
                    {chartCount === 1 && (
                      <TextField select size="small" label="Engine" value={selectedEngine} onChange={(event) => setSelectedEngine(Number(event.target.value))} sx={{ minWidth: 130, "& .MuiInputLabel-root": { color: "#94a3b8" }, "& .MuiOutlinedInput-root": { color: "#f8fafc", bgcolor: "#0b1220", "& fieldset": { borderColor: "#334155" } } }}>
                        {ENGINE_NUMBERS.map((engine) => <MenuItem key={engine} value={engine}>Engine {engine}</MenuItem>)}
                      </TextField>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box className={`grid grid-cols-1 ${chartCount === 4 ? "xl:grid-cols-2" : ""} gap-4 w-full`}>
                {visibleEngines.map((engine) => (
                  <Box key={engine} className="rounded-[12px] border border-[#334155] bg-[#0f172a] !p-4">
                    <FuelConsumptionBarChart
                      records={recordsByEngine[engine]}
                      engineNumber={engine}
                      height={chartCount === 1 ? 520 : 330}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </section>
      </main>
      <Footer
        lastUpdated={lastUpdated}
        networkStatus={modbusConnected === false ? "Disconnected" : modbusConnected ? "Connected" : "Connecting..."}
        pollIntervalMs={null}
      />
    </Box>
  );
};

export default Consumption;
