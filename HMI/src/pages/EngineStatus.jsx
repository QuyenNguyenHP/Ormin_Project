import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import DashboardButton from "../components/DashboardButton";
import { usePolledPagePayload } from "../hooks/usePolledPagePayload";

const ALARM_GROUP_TEMPLATES = [
  { key: "machine_status", title: "ENGINE STATUS" },
  { key: "lubrication_oil", title: "LUBRICATION OIL" },
  { key: "cooling_water", title: "COOLING WATER" },
  { key: "fuel_system", title: "FUEL SYSTEM" },
  { key: "exhaust_system", title: "EXHAUST SYSTEM" },
];

const ALARM_GROUP_COLUMNS = {
  machine_status: 0,
  lubrication_oil: 1,
  cooling_water: 2,
  fuel_system: 3,
  exhaust_system: 3,
};

const FALLBACK_SIGNAL_DEFINITIONS = [
  ["Overspeed", "machine_status"],
  ["Mechanical Overspeed", "machine_status"],
  ["Start Failure", "machine_status"],
  ["Low Speed", "machine_status"],
  ["Rated Speed", "machine_status"],
  ["Start Solenoid Valve", "machine_status"],
  ["Governor Handle Switch", "machine_status"],
  ["Turning Handle Out Position Switch", "machine_status"],

  ["Oil Mist Detector Major Fault", "lubrication_oil"],
  ["Oil Mist Detector Minor Fault", "lubrication_oil"],
  ["Oil Mist Detector System Fault", "lubrication_oil"],
  ["Engine LO Pressure Switch (1st)", "lubrication_oil"],
  ["Engine LO Pressure Switch (2nd)", "lubrication_oil"],
  ["T/C LO Pressure Switch (1st)", "lubrication_oil"],
  ["T/C LO Pressure Switch (2nd)", "lubrication_oil"],
  ["LO Priming Pressure Switch", "lubrication_oil"],
  ["LO Temp Switch", "lubrication_oil"],
  ["LO Sump Tank Level Switch", "lubrication_oil"],
  ["LO Filter Differential Pressure Switch", "lubrication_oil"],
  ["T/C LO Filter Differential Pressure Switch", "lubrication_oil"],

  ["FO Pressure Switch", "fuel_system"],
  ["FO Leak Tank Level Switch", "fuel_system"],
  ["Fuel Shutdown Device", "fuel_system"],
  ["Fuel Control Piston Solenoid Valve", "fuel_system"],
  ["Fuel Cutoff Piston Solenoid Valve", "fuel_system"],
  ["Changeover Valve Limit Switch", "fuel_system"],

  ["J.W Flow", "cooling_water"],
  ["J.W Temp Switch (1st)", "cooling_water"],
  ["J.W Temp Switch (2nd)", "cooling_water"],
  ["J.W Pressure Switch (1st)", "cooling_water"],
  ["J.W Pressure Switch (2nd)", "cooling_water"],
  ["C.W Pressure Switch", "cooling_water"],
  ["C.W Temp Switch", "cooling_water"],
  ["C.W Flow", "cooling_water"],
  ["C.W Expansion Tank Level Switch", "cooling_water"],
  ["C.W Expansion Tank Level Switch", "cooling_water"],
  ["J.W Expansion Tank Level Switch", "cooling_water"],
  ["J.W Expansion Tank Level Switch", "cooling_water"],

  ["T/C Gas Outlet Temp Switch (1st)", "exhaust_system"],
  ["T/C Gas Outlet Temp Switch (2nd)", "exhaust_system"],
];

const FALLBACK_ENGINES = Array.from({ length: 4 }, (_, engineIndex) => ({
  key: `engine_${engineIndex + 1}`,
  title: `Engine ${engineIndex + 1}`,
  bits: FALLBACK_SIGNAL_DEFINITIONS.map(([label, category], bitIndex) => ({
    key: `fallback_bit_${engineIndex + 1}_${bitIndex + 1}`,
    label,
    category,
    value: false,
  })),
  activeCount: 0,
}));

const normalizeEngines = (backendEngines) => {
  if (!Array.isArray(backendEngines) || backendEngines.length === 0) {
    return FALLBACK_ENGINES;
  }

  return backendEngines.map((engine, engineIndex) => {
    const bits = Array.isArray(engine.bits) ? engine.bits : [];
    const normalizedBits = bits.map((bit, bitIndex) => ({
      key: bit.key ?? `bit_${bitIndex + 1}`,
      label: bit.label ?? `Bit ${bitIndex + 1}`,
      category: bit.category ?? "other",
      value: Boolean(bit.value),
    }));

    return {
      key: engine.key ?? `engine_${engineIndex + 1}`,
      title: engine.title ?? `Engine ${engineIndex + 1}`,
      bits: normalizedBits,
      activeCount: normalizedBits.filter((bit) => bit.value).length,
    };
  });
};

const buildAlarmGroups = (bits) => {
  if (!Array.isArray(bits) || bits.length === 0) {
    return [];
  }

  return ALARM_GROUP_TEMPLATES.map((group) => {
    const groupBits = bits.filter((bit) => bit.category === group.key);
    return {
      ...group,
      bits: groupBits,
      activeCount: groupBits.filter((bit) => bit.value).length,
    };
  }).filter((group) => group.bits.length > 0);
};

const buildAlarmGroupColumns = (groups) => {
  const columns = [[], [], [], []];

  groups.forEach((group) => {
    const columnIndex = ALARM_GROUP_COLUMNS[group.key] ?? 0;
    columns[columnIndex].push(group);
  });

  return columns;
};

const SelectEngineButtons = ({
  engineNames,
  selectedEngineName,
  onSelectEngine,
  className = "",
}) => (
  <Box className={`flex flex-wrap items-center gap-3 ${className}`}>
    <Typography className="text-[#cbd5e1] font-medium">Select engines:</Typography>
    {engineNames.map((engineName) => (
      <DashboardButton
        key={engineName}
        active={selectedEngineName === engineName}
        onClick={() => onSelectEngine(engineName)}
      >
        {engineName}
      </DashboardButton>
    ))}
  </Box>
);

const AlarmBitRow = ({ bit }) => (
  <Box className="flex min-h-[34px] items-center justify-between gap-2 border-b border-[#e2e8f014] py-1.5 last:border-b-0">
    <Typography
      title={bit.label}
      className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] leading-4 text-[#dbe4ee]"
    >
      {bit.label}
    </Typography>
    <Box
      className={`min-w-[58px] shrink-0 rounded-[8px] px-1.5 py-0.5 text-center text-[9px] font-semibold leading-4 ${
        bit.value
          ? "bg-[#f14949cc] text-white"
          : "bg-[rgba(34,197,94,0.18)] text-[#bbf7d0]"
      }`}
    >
      {bit.value ? "ACTIVE" : "NORMAL"}
    </Box>
  </Box>
);

const AlarmSignalGroupCard = ({ group }) => (
  <Box
    className="w-[350px] min-w-[350px] max-w-[350px] rounded-[14px] border border-[#cbd5e11a] bg-[#0f172a59] p-3 backdrop-blur-[0px]"
    sx={{ boxShadow: "0 10px 22px rgba(15, 23, 42, 0.16)" }}
  >
    <Box className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-[#e2e8f024] bg-[#7D8797] px-3 py-1.5">
      <Typography className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold tracking-[0.04em] text-[#f8fafc]">
        {group.title}
      </Typography>
      <Typography
        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${
          group.activeCount > 0
            ? "bg-[#f14949cc] text-white"
            : "bg-[rgba(15,23,42,0.38)] text-[#dcfce7]"
        }`}
      >
        {group.activeCount}/{group.bits.length}
      </Typography>
    </Box>

    <Box className="mt-2 flex flex-col gap-1">
      {group.bits.map((bit) => (
        <AlarmBitRow key={bit.key} bit={bit} />
      ))}
    </Box>
  </Box>
);

const EngineStatus = () => {
  const { payload, isLoading, error, lastUpdated, pollIntervalMs } = usePolledPagePayload("alarm");
  const modbusConnected = error ? false : payload ? true : null;

  const engines = useMemo(() => normalizeEngines(payload?.sections?.engines), [payload]);
  const engineNames = useMemo(() => engines.map((engine) => engine.title), [engines]);
  const [selectedEngineName, setSelectedEngineName] = useState("Engine 1");

  const effectiveSelectedEngineName = engineNames.includes(selectedEngineName)
    ? selectedEngineName
    : engineNames[0] ?? "Engine 1";

  const selectedEngine =
    engines.find((engine) => engine.title === effectiveSelectedEngineName) ?? engines[0] ?? null;

  const alarmGroups = useMemo(
    () => buildAlarmGroups(selectedEngine?.bits ?? []),
    [selectedEngine]
  );
  const alarmGroupColumns = useMemo(
    () => buildAlarmGroupColumns(alarmGroups),
    [alarmGroups]
  );

  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-start !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="min-h-[916px] flex-1 rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-auto flex flex-col items-start !p-5 max-w-full shrink-0">
            <SelectEngineButtons
              engineNames={engineNames}
              selectedEngineName={effectiveSelectedEngineName}
              onSelectEngine={setSelectedEngineName}
            />

            <Box className="relative mt-4 h-[820px] w-full shrink-0 overflow-hidden rounded-[18px] border border-[#475569]">
              <Box
                className="absolute inset-0"
                sx={{
                  "@keyframes alarmCanvasPopIn": {
                    "0%": {
                      opacity: 0,
                      transform: "scale(0.96)",
                    },
                    "65%": {
                      opacity: 0.72,
                      transform: "scale(1.015)",
                    },
                    "100%": {
                      opacity: 0.62,
                      transform: "scale(1)",
                    },
                  },
                  backgroundImage: "url('/engine_image.png')",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                  opacity: 0.6,
                  filter: "saturate(0.9)",
                  transformOrigin: "center",
                  animation: "alarmCanvasPopIn 900ms ease-out",
                  willChange: "transform, opacity",
                }}
              />
              <Box
                className="absolute inset-0"
                sx={{
                  background:
                    "radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 34%), linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.74))",
                }}
              />

              <Box className="relative z-[1] h-full p-4">
                <Box className="flex flex-wrap items-center justify-between gap-3">
                  {isLoading ? (
                    <Typography className="text-[13px] text-[#93c5fd]">
                      Loading live Modbus engine status data...
                    </Typography>
                  ) : null}

                  {!isLoading && error ? (
                    <Typography className="text-[13px] text-[#fca5a5]">
                      Backend unavailable. Showing fallback engine status names with NORMAL state until Modbus comes back.
                    </Typography>
                  ) : null}
                </Box>

                <Box className="mt-6 hidden items-start gap-4 xl:grid xl:grid-cols-4">
                  {alarmGroupColumns.map((columnGroups, columnIndex) => (
                    <Box key={`alarm-column-${columnIndex + 1}`} className="flex flex-col gap-4">
                      {columnGroups.map((group) => (
                        <AlarmSignalGroupCard key={group.key} group={group} />
                      ))}
                    </Box>
                  ))}
                </Box>

                <Box className="mt-6 grid grid-cols-1 items-start gap-4 xl:hidden md:grid-cols-2">
                  {alarmGroups.map((group) => (
                    <AlarmSignalGroupCard key={group.key} group={group} />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </section>
      </main>
      <Footer
        lastUpdated={lastUpdated}
        networkStatus={
          modbusConnected === false
            ? "Disconnected"
            : modbusConnected
              ? "Connected"
              : "Connecting..."
        }
        pollIntervalMs={pollIntervalMs}
      />
    </Box>
  );
};

export default EngineStatus;
