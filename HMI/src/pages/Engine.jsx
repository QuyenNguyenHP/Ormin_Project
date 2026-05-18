import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import DashboardButton from "../components/DashboardButton";
import EngineMetricGroupCard from "../components/EngineMetricGroupCard";
import { usePolledPagePayload } from "../hooks/usePolledPagePayload";

const engineGroupTemplates = [
  {
    key: "alternator_temperature",
    title: "ALTERNATOR TEMPERATURE",
    metrics: [
      { key: "stator_winding_temp_u", label: "Stator Winding Temp U", unit: "C", base: 112, step: 2 },
      { key: "stator_winding_temp_v", label: "Stator Winding Temp V", unit: "C", base: 114, step: 2 },
      { key: "stator_winding_temp_w", label: "Stator Winding Temp W", unit: "C", base: 111, step: 2 },
      { key: "de_bearing_temp", label: "DE Bearing Temp", unit: "C", base: 86, step: 1 },
      { key: "nde_bearing_temp", label: "NDE Bearing Temp", unit: "C", base: 83, step: 1 },
    ],
  },
  {
    key: "engine_parameters",
    title: "ENGINE PARAMETERS",
    metrics: [
      { key: "intake_air_pressure", label: "Intake Air Pressure", unit: "MPa", base: 0.35, step: 0.01, precision: 2 },
      { key: "air_receiver_pressure", label: "Air Receiver Pressure", unit: "MPa", base: 0.34, step: 0.01, precision: 2 },
      { key: "engine_running_hours", label: "Engine Running Hours", unit: "h", base: 18432, step: 120 },
      { key: "engine_power", label: "Engine Power", unit: "kW", base: 348, step: 12 },
      { key: "engine_speed", label: "Engine Speed", unit: "rpm", base: 720, step: 5 },
    ],
  },
  {
    key: "exhaust_gas_temp",
    title: "EXHAUST GAS TEMP",
    metrics: [
      { key: "tc_outlet_temp", label: "T/C Outlet Temp", unit: "C", base: 352, step: 4 },
      { key: "cyl_1_exhaust_temp", label: "Cyl 1 Exhaust Temp", unit: "C", base: 346, step: 4 },
      { key: "cyl_2_exhaust_temp", label: "Cyl 2 Exhaust Temp", unit: "C", base: 348, step: 4 },
      { key: "cyl_3_exhaust_temp", label: "Cyl 3 Exhaust Temp", unit: "C", base: 350, step: 4 },
      { key: "cyl_4_exhaust_temp", label: "Cyl 4 Exhaust Temp", unit: "C", base: 349, step: 4 },
      { key: "cyl_5_exhaust_temp", label: "Cyl 5 Exhaust Temp", unit: "C", base: 351, step: 4 },
      { key: "cyl_6_exhaust_temp", label: "Cyl 6 Exhaust Temp", unit: "C", base: 347, step: 4 },
      { key: "tc_inlet_temp", label: "T/C Inlet Temp", unit: "C", base: 298, step: 3 },
    ],
  },
  {
    key: "fuel_oil_system",
    title: "FUEL OIL SYSTEM",
    metrics: [
      { key: "fuel_oil_pressure", label: "Fuel Oil Pressure", unit: "bar", base: 6.2, step: 0.1, precision: 1 },
      { key: "do_engine_inlet_temp", label: "DO Engine Inlet Temp", unit: "C", base: 43, step: 1 },
      { key: "do_engine_return_temp", label: "DO Engine Return Temp", unit: "C", base: 47, step: 1 },
      { key: "ho_engine_inlet_temp", label: "HO Engine Inlet Temp", unit: "C", base: 84, step: 2 },
      { key: "ho_engine_return_temp", label: "HO Engine Return Temp", unit: "C", base: 88, step: 2 },
    ],
  },
  {
    key: "fuel_oil_flow_system",
    title: "FUEL OIL FLOW SYSTEM",
    metrics: [
      { key: "do_transfer_flow", label: "DO Transfer Flow", unit: "L/h", base: 118, step: 5 },
      { key: "do_engine_inlet_flow", label: "DO Engine Inlet Flow", unit: "L/h", base: 96, step: 4 },
      { key: "do_engine_return_flow", label: "DO Engine Return Flow", unit: "L/h", base: 41, step: 2 },
      { key: "ho_transfer_flow", label: "HO Transfer Flow", unit: "L/h", base: 142, step: 5 },
      { key: "ho_engine_inlet_flow", label: "HO Engine Inlet Flow", unit: "L/h", base: 121, step: 4 },
      { key: "ho_engine_return_flow", label: "HO Engine Return Flow", unit: "L/h", base: 57, step: 3 },
    ],
  },
  {
    key: "lub_oil_system",
    title: "LUB OIL SYSTEM",
    metrics: [
      { key: "engine_lo_pressure", label: "Engine LO Pressure", unit: "bar", base: 4.8, step: 0.1, precision: 1 },
      { key: "turbo_lo_pressure", label: "Turbo LO Pressure", unit: "bar", base: 2.6, step: 0.1, precision: 1 },
      { key: "lo_cooler_inlet_temp", label: "LO Cooler Inlet Temp", unit: "C", base: 61, step: 1 },
      { key: "lo_cooler_outlet_temp", label: "LO Cooler Outlet Temp", unit: "C", base: 55, step: 1 },
    ],
  },
  {
    key: "oil_mist_detection",
    title: "OIL MIST DETECTION",
    metrics: [
      { key: "oil_mist_level", label: "Oil Mist Level", unit: "%", base: 12, step: 1 },
      { key: "omd_analog_signal", label: "OMD Analog Signal", unit: "mA", base: 4.8, step: 0.2, precision: 1 },
    ],
  },
  {
    key: "pms",
    title: "PMS",
    metrics: [
      { key: "generator_voltage", label: "Generator Voltage", unit: "V", base: 440, step: 2 },
      { key: "generator_frequency", label: "Generator Frequency", unit: "Hz", base: 60.0, step: 0.05, precision: 2 },
      { key: "generator_power_factor", label: "Generator Power Factor", unit: "", base: 0.86, step: 0.01, precision: 2 },
      { key: "generator_current", label: "Generator Current", unit: "A", base: 520, step: 15 },
    ],
  },
  {
    key: "cooling_water_system",
    title: "COOLING WATER SYSTEM",
    metrics: [
      { key: "jacket_water_pressure", label: "Jacket Water Pressure", unit: "bar", base: 3.6, step: 0.1, precision: 1 },
      { key: "cooler_water_pressure", label: "Cooler Water Pressure", unit: "bar", base: 2.8, step: 0.1, precision: 1 },
      { key: "jacket_water_inlet_temp", label: "Jacket Water Inlet Temp", unit: "C", base: 74, step: 1 },
      { key: "jacket_water_outlet_temp", label: "Jacket Water Outlet Temp", unit: "C", base: 81, step: 1 },
      { key: "cooler_water_inlet_temp", label: "Cooler Water Inlet Temp", unit: "C", base: 31, step: 1 },
      { key: "cooler_water_outlet_temp", label: "Cooler Water Outlet Temp", unit: "C", base: 38, step: 1 },
      { key: "cw_before_lo_cooler_temp", label: "CW Before LO Cooler Temp", unit: "C", base: 33, step: 1 },
    ],
  },
];

const fallbackEngines = Array.from({ length: 4 }, (_, engineIndex) => ({
  name: `Engine ${engineIndex + 1}`,
  groups: engineGroupTemplates.map((group) => ({
    key: group.key,
    title: group.title,
    metrics: group.metrics.map((metric) => ({
      key: metric.key,
      label: metric.label,
      unit: metric.unit,
      value:
        typeof metric.precision === "number"
          ? Number((metric.base + metric.step * engineIndex).toFixed(metric.precision))
          : metric.base + metric.step * engineIndex,
    })),
  })),
}));

const normalizeEngines = (backendEngines) => {
  if (!Array.isArray(backendEngines) || backendEngines.length === 0) {
    return fallbackEngines;
  }

  return backendEngines.map((engine, engineIndex) => ({
    name: engine.name ?? `Engine ${engineIndex + 1}`,
    groups: Array.isArray(engine.groups)
      ? engine.groups.map((group, groupIndex) => ({
          key: group.key ?? `group_${groupIndex + 1}`,
          title: group.title ?? `Group ${groupIndex + 1}`,
          metrics: Array.isArray(group.metrics)
            ? group.metrics.map((metric, metricIndex) => ({
                ...metric,
                key: metric.key ?? `metric_${metricIndex + 1}`,
                label: metric.label ?? `Metric ${metricIndex + 1}`,
                unit: metric.unit ?? "",
                value: metric.value,
              }))
            : [],
        }))
      : [],
  }));
};

const ENGINE_GROUP_COLUMNS = {
  exhaust_gas_temp: 0,
  fuel_oil_flow_system: 0,
  engine_parameters: 1,
  oil_mist_detection: 1,
  pms: 1,
  cooling_water_system: 2,
  fuel_oil_system: 2,
  alternator_temperature: 3,
  lub_oil_system: 3,
};

const ENGINE_GROUP_TITLE_LINKS = {
  engine_parameters: "/power",
  exhaust_gas_temp: "/exhaust",
};

const buildEngineGroupColumns = (groups) => {
  const columns = [[], [], [], []];

  groups.forEach((group) => {
    const columnIndex = ENGINE_GROUP_COLUMNS[group.key] ?? 0;
    columns[columnIndex].push(group);
  });

  return columns;
};

const SelectEngineButtons = ({ engineNames, selectedEngineName, onSelectEngine }) => (
  <Box className="flex flex-wrap items-center gap-3">
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

const Engine = () => {
  const { payload, isLoading, error, lastUpdated, pollIntervalMs } = usePolledPagePayload("engine");
  const modbusConnected = error ? false : payload ? true : null;

  const engines = useMemo(() => normalizeEngines(payload?.sections?.engines), [payload]);
  const engineNames = useMemo(() => engines.map((engine) => engine.name), [engines]);
  const [selectedEngineName, setSelectedEngineName] = useState("Engine 1");

  const effectiveSelectedEngineName = engineNames.includes(selectedEngineName)
    ? selectedEngineName
    : engineNames[0] ?? "Engine 1";

  const selectedEngine = engines.find((engine) => engine.name === effectiveSelectedEngineName) ?? engines[0];
  const selectedEngineColumns = buildEngineGroupColumns(selectedEngine?.groups ?? []);

  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-start !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="min-h-[916px] flex-1 rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-auto flex flex-col items-start !p-6 max-w-full shrink-0">
            <SelectEngineButtons
              engineNames={engineNames}
              selectedEngineName={effectiveSelectedEngineName}
              onSelectEngine={setSelectedEngineName}
            />
            <Box className="mt-6 w-full rounded-[18px] border border-[#475569] overflow-hidden relative">
              <Box
                className="absolute inset-0"
                sx={{
                  "@keyframes engineImagePopIn": {
                    "0%": {
                      opacity: 0,
                      transform: "scale(0.94)",
                    },
                    "65%": {
                      opacity: 0.68,
                      transform: "scale(1.02)",
                    },
                    "100%": {
                      opacity: 0.6,
                      transform: "scale(1)",
                    },
                  },
                  backgroundImage: "url('/engine_image.png')",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "90%",
                  opacity: 0.6,
                  filter: "saturate(0.9)",
                  transformOrigin: "center",
                  animation: "engineImagePopIn 900ms ease-out",
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

              <Box className="relative z-[1] p-5 md:p-6">
                <Box className="flex flex-wrap items-center justify-between gap-3">     
                  {isLoading ? (
                    <Typography className="text-[13px] text-[#93c5fd]">Loading live Modbus data...</Typography>
                  ) : null}

                  {!isLoading && error ? (
                    <Typography className="text-[13px] text-[#fca5a5]">
                      Backend unavailable, showing last fallback layout.
                    </Typography>
                  ) : null}
                </Box>

                <Box className="mt-6 hidden items-start gap-4 xl:grid xl:grid-cols-4">
                  {selectedEngineColumns.map((columnGroups, columnIndex) => (
                    <Box key={`engine-column-${columnIndex}`} className="flex flex-col gap-4">
                      {columnGroups.map((group) => (
                        <EngineMetricGroupCard
                          key={group.key}
                          group={group}
                          titleTo={ENGINE_GROUP_TITLE_LINKS[group.key] ?? ""}
                        />
                      ))}
                    </Box>
                  ))}
                </Box>

                <Box className="mt-6 grid grid-cols-1 items-start gap-4 xl:hidden md:grid-cols-2">
                  {(selectedEngine?.groups ?? []).map((group) => (
                    <EngineMetricGroupCard
                      key={group.key}
                      group={group}
                      titleTo={ENGINE_GROUP_TITLE_LINKS[group.key] ?? ""}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </section>
      </main>
      <Footer
        lastUpdated={lastUpdated}
        networkStatus={error ? "Disconnected" : payload ? "Connected" : "Connecting..."}
        pollIntervalMs={pollIntervalMs}
      />
    </Box>
  );
};

export default Engine;
