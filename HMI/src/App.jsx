import { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigationType,
  useLocation,
} from "react-router-dom";
import Overview from "./pages/Overview";
import PAndID from "./pages/PAndID";
import Engine from "./pages/Engine";
import ExhTempTrend from "./pages/ExhTempTrend";
import DOConsumption from "./pages/DOConsumption";
import HOConsumption from "./pages/HOConsumption";
import PressureTrend from "./pages/PressureTrend";
import PlaceholderPage from "./pages/PlaceholderPage";
import PageTourStudio from "./pages/PageTourStudio";

function App() {
  const action = useNavigationType();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (action !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [action, pathname]);

  useEffect(() => {
    let title = "";
    let metaDescription = "";

    switch (pathname) {
      case "/":
        title = "Overview | P&ID";
        metaDescription = "System overview page.";
        break;
      case "/pid":
        title = "P&ID";
        metaDescription = "P&ID diagram screen.";
        break;
      case "/engine":
        title = "Engine";
        metaDescription = "Engine monitoring page.";
        break;
      case "/pressure_trend":
        title = "Pressure Trend";
        metaDescription = "Pressure trend page with load comparison.";
        break;
      case "/exh_temp_trend":
        title = "Exh TempTrend";
        metaDescription = "Exhaust temperature trend page with load comparison.";
        break;
      case "/fo-consumption":
      case "/do-consumption":
        title = "D.O Consumption";
        metaDescription = "Diesel oil consumption history and flow comparison page.";
        break;
      case "/ho-consumption":
        title = "H.O Consumption";
        metaDescription = "Heavy oil consumption history and flow comparison page.";
        break;
      case "/alarms":
        title = "Alarms";
        metaDescription = "System alarms page.";
        break;
      case "/page-tour-studio":
        title = "Page Tour Studio";
        metaDescription = "Record a guided introduction video for the frontend pages.";
        break;
      default:
        title = "Overview | P&ID";
        metaDescription = "System overview page.";
    }

    if (title) {
      document.title = title;
    }

    if (metaDescription) {
      const metaDescriptionTag = document.querySelector(
        'head > meta[name="description"]'
      );
      if (metaDescriptionTag) {
        metaDescriptionTag.content = metaDescription;
      }
    }
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/pid" element={<PAndID />} />
      <Route path="/engine" element={<Engine />} />
      <Route path="/fo-consumption" element={<Navigate to="/do-consumption" replace />} />
      <Route path="/do-consumption" element={<DOConsumption />} />
      <Route path="/ho-consumption" element={<HOConsumption />} />
      <Route path="/pressure_trend" element={<PressureTrend />} />
      <Route path="/exh_temp_trend" element={<ExhTempTrend />} />
      <Route path="/page-tour-studio" element={<PageTourStudio />} />
      <Route
        path="/alarms"
        element={
          <PlaceholderPage
            title="Alarms"
            subtitle="System alarms and status will be displayed here."
          />
        }
      />
    </Routes>
  );
}

export default App;
