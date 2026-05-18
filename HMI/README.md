# 🚢 DRUMS HMI Dashboard

Frontend HMI dashboard cho hệ thống DRUMS, dùng để hiển thị dữ liệu máy chính, exhaust, P&ID và lịch sử tiêu thụ F.O. từ 2 nguồn dữ liệu:

- ⚡ Modbus TCP cho dữ liệu live
- 🗄️ SQLite cho lịch sử `F.O. Consumption`

Project hiện chạy theo mô hình:

```text
React + Vite frontend
  -> gọi /api/*
Flask backend
  -> modbus_api.py đọc live data từ PLC/Modbus
  -> database_api.py đọc lịch sử từ SQLite
```

## ✨ Tech Stack

- `React 19`
- `Vite 6`
- `React Router 7`
- `MUI 7`
- `Tailwind CSS 4`
- `ECharts 5`
- `Flask 3`
- `pymodbus 3`
- `sqlite3`

## 🧭 Các màn hình hiện có

- `Overview` tại `/`
- `Engine` tại `/engine`
- `F.O. Consumption` tại `/fo-consumption`
- `Exhaust` tại `/exhaust`
- `P&ID` tại `/pid`
- `Power` tại `/power` hiện là placeholder
- `Alarms` tại `/alarms` hiện là placeholder

## 🧠 Kiến trúc dữ liệu hiện tại

### 1. Live Modbus pages

Các trang dưới đây dùng chung hook polling `src/hooks/usePolledPagePayload.js`:

- `Overview`
- `Engine`
- `Exhaust`
- `P&ID`

Luồng hoạt động:

```text
Page
  -> usePolledPagePayload("page-name")
  -> fetch /api/<page-name>
  -> backend/modbus_api.py
  -> backend/backend_config.json
  -> Modbus TCP device
```

Backend sẽ:

1. Đọc cấu hình page từ `backend/backend_config.json`
2. Flatten tất cả mapping nodes
3. Gom địa chỉ Modbus liền kề để đọc theo batch
4. Đọc holding registers và discrete inputs
5. Scale / round / gán threshold state
6. Trả payload dạng `sections + meta`

### 2. Historical database page

Trang `F.O. Consumption` không dùng polling Modbus. Trang này gọi:

- `GET /api/fo-consumption`

Luồng hoạt động:

```text
FOConsumption.jsx
  -> fetchFOConsumptionHistory(...)
  -> backend/database_api.py
  -> SQLite database/flow_meter_history.db
```

Trang này hỗ trợ:

- chọn khoảng thời gian UTC bằng `datetime-local`
- dịch khung thời gian `Prev 24h` / `Next 24h`
- so sánh `flow in` và `flow out` theo từng engine
- tính tiêu thụ từ phần chênh lệch lưu lượng

## 📁 Cấu trúc thư mục chính

```text
HMI/
  backend/
    app.py
    modbus_api.py
    database_api.py
    backend_config.json
    requirements.txt
    database/
      flow_meter_history.db

  public/
    Monitoritem_v2.svg
    P&IDbackground.png
    engine_image.png
    *.svg icons

  src/
    components/
      EngineGauge.jsx
      EngineMetricGroupCard.jsx
      FOConsumptionChart.jsx
      Cylinder_exh_temp.jsx
      Header.jsx
      Footer.jsx
      NavigationSidebar.jsx
    hooks/
      usePolledPagePayload.js
    pages/
      Overview.jsx
      Engine.jsx
      FOConsumption.jsx
      Exhaust.jsx
      PAndID.jsx
      PlaceholderPage.jsx
    services/
      pidMonitorApi.js
    utils/
      PIDMonitor.js
```

## 🔌 API endpoints

### Modbus endpoints

- `GET /api/overview`
- `GET /api/engine`
- `GET /api/exhaust`
- `GET /api/pid`
- `GET /api/debug/modbus-snapshot`

### Database endpoint

- `GET /api/fo-consumption`

Query params hỗ trợ:

- `windowMinutes`
- `startTime`
- `endTime`

Lưu ý:

- `startTime` và `endTime` phải đi cùng nhau
- nếu không truyền range tuyệt đối, backend sẽ lấy cửa sổ mặc định từ config

## ⚙️ Cấu hình backend

File chính:

- [backend/backend_config.json](./backend/backend_config.json)

Cấu trúc lớn hiện tại:

```json
{
  "modbus": {
    "host": "192.168.18.26",
    "port": 502,
    "unit_id": 16,
    "timeout_seconds": 3,
    "poll_interval_ms": 2000
  },
  "fo_consumption": {
    "database_path": "database/flow_meter_history.db",
    "table_name": "flow_meter_history",
    "default_window_minutes": 1440,
    "default_end_engine_count": 4
  },
  "pages": {
    "overview": {},
    "engine": {},
    "exhaust": {},
    "pid": {}
  }
}
```

### Ý nghĩa nhanh

- `modbus.host`, `port`, `unit_id`: kết nối PLC / gateway Modbus
- `poll_interval_ms`: chu kỳ polling frontend tham chiếu từ `meta.pollIntervalMs`
- `fo_consumption.database_path`: file SQLite cho lịch sử F.O.
- `pages.*`: mapping dữ liệu cho từng trang

## 🧪 Mapping và rule trong Modbus backend

Trong `modbus_api.py`, mỗi metric mapping thường có:

- `source_type`
- `address`
- `scale`
- `precision`
- `unit`
- `warning`
- `alarm`
- `direction`

Backend hiện hỗ trợ:

- `holding_register`
- `discrete_input`

Threshold state được gán thành:

- `normal`
- `warning`
- `alarm`

Và dùng ở frontend để tô trạng thái cho metric cards.

## 🖥️ Mô tả từng page

### `Overview`

- Hiển thị 4 engine cards
- Mỗi card có 1 gauge và 6 metrics chính
- Dùng `Container1.jsx` + `EngineGauge.jsx`

### `Engine`

- Cho chọn engine đang xem
- Chia metric thành nhiều nhóm như:
  - alternator temperature
  - engine parameters
  - exhaust gas temp
  - fuel oil system
  - fuel oil flow system
  - lub oil system
  - oil mist detection
  - PMS
  - cooling water system
- Có liên kết từ group `exhaust_gas_temp` sang trang `/exhaust`

### `Exhaust`

- Cho bật/tắt nhiều engine cùng lúc
- Có 2 biểu đồ:
  - nhiệt độ xả từng cylinder
  - nhiệt độ turbocharger
- Có summary card tính điểm nóng nhất và trung bình

### `F.O. Consumption`

- Hiển thị 4 chart theo engine
- Tự nhóm bản ghi thành `flowIn`, `flowOut`, `bandGap`
- Chart dùng `ECharts`
- Có zoom, double-click reset zoom và hiệu ứng pop-in

### `P&ID`

- Render nền bằng `P&IDbackground.png`
- Overlay `Monitoritem_v2.svg`
- Dùng `src/utils/PIDMonitor.js` để cập nhật text flow và digital state theo `id` trong SVG

## 🧰 Frontend services và hooks

File chính:

- [src/services/pidMonitorApi.js](./src/services/pidMonitorApi.js)
- [src/hooks/usePolledPagePayload.js](./src/hooks/usePolledPagePayload.js)

Các hàm đang dùng:

- `fetchPagePayload(pageName)`
- `fetchDebugModbusSnapshot()`
- `fetchFOConsumptionHistory({ windowMinutes, startTime, endTime })`

Hook `usePolledPagePayload(pageName)` hiện:

- tự poll lại theo `meta.pollIntervalMs`
- fallback về `2000ms` nếu backend lỗi
- trả về `payload`, `isLoading`, `error`, `lastUpdated`, `pollIntervalMs`

## 🚀 Chạy local

### 1. Cài frontend dependencies

```bash
npm install
```

### 2. Cài backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Chạy backend Flask

```bash
python backend/app.py
```

Backend mặc định:

```text
http://127.0.0.1:8001
```

### 4. Chạy frontend Vite

```bash
npm run start
```

Frontend mặc định:

```text
http://localhost:5173
```

## 🌐 Vite proxy

File:

- [vite.config.mjs](./vite.config.mjs)

Proxy hiện tại:

```js
server: {
  proxy: {
    "/api": "http://127.0.0.1:8001",
  },
}
```

Nghĩa là frontend chỉ cần gọi:

```text
/api/overview
/api/engine
/api/exhaust
/api/pid
/api/fo-consumption
```

## 🛠️ Build

```bash
npm run build
```

Output sẽ nằm ở thư mục:

```text
build/
```

## 🧯 Troubleshooting

### Frontend không có dữ liệu

- kiểm tra Flask backend có đang chạy không
- kiểm tra Vite proxy còn đúng không
- mở DevTools để xem request `/api/*`
- kiểm tra backend có trả `error` JSON không

### Không kết nối được Modbus

- kiểm tra `modbus.host`
- kiểm tra `modbus.port`
- kiểm tra `modbus.unit_id`
- kiểm tra firewall / routing tới PLC

### `F.O. Consumption` không có dữ liệu

- kiểm tra file SQLite tại `backend/database/flow_meter_history.db`
- kiểm tra `fo_consumption.table_name` trong config
- kiểm tra range UTC đang chọn có dữ liệu thật hay không

### `P&ID` không update đúng

- kiểm tra response `/api/pid`
- kiểm tra `id` trong `Monitoritem_v2.svg`
- kiểm tra mapping trong `src/utils/PIDMonitor.js`

## 📝 Ghi chú hiện trạng source

- ✅ README này đã cập nhật theo source hiện tại trong `HMI`
- ✅ Có cả mô tả Modbus API và SQLite API
- ✅ Đã phản ánh đúng các route `Overview`, `Engine`, `Exhaust`, `F.O. Consumption`, `P&ID`
- ✅ `Power` và `Alarms` hiện vẫn là placeholder
- ℹ️ Hiện chưa thấy test automation riêng cho frontend/backend trong thư mục `HMI`

## 💡 Gợi ý cải tiến tiếp theo

- thêm `health` endpoint cho backend
- thêm logging rõ hơn cho lỗi Modbus / SQLite
- thêm test cho `PIDMonitor.js`, chart data transforms, và payload builders
- tách riêng config thresholds thành file độc lập nếu tiếp tục mở rộng
- thêm tài liệu deploy cho thư mục `deloy_Raspberry_pi/`
