# 🚢 P&ID Monitor Dashboard

Giao diện giám sát P&ID được xây dựng bằng **React + Vite** ở frontend và **Flask + pymodbus** ở backend để đọc dữ liệu **Modbus TCP** thật từ thiết bị/PLC.

Frontend hiển thị:

- 🔢 `Flow1 ... Flow18` theo dạng giá trị analog như `100 L/H`
- 🟢🔴 các tín hiệu digital như `pump 1`, `TSH_F.O. drain tank`, `LL_D.O.service.tank` theo trạng thái `ON/OFF`
- 🖼️ sơ đồ `P&IDbackground.png` + lớp phủ `Monitor items.svg`

## ✨ Kiến trúc dự án

```text
Frontend (React/Vite)
  -> gọi /api/pid-monitor
Backend (Flask)
  -> đọc Modbus TCP bằng pymodbus
Thiết bị Modbus / PLC
```

## 📁 Cấu trúc thư mục chính

```text
backend/
  app.py
  pid_monitor_config.json
  requirements.txt

public/
  Monitor items.svg
  P&IDbackground.png

src/
  components/
  pages/
    PAndID.jsx
  services/
    pidMonitorApi.js
  utils/
    PIDMonitor.js
```

## 🧰 Công nghệ sử dụng

- ⚛️ React 19
- ⚡ Vite
- 🎨 MUI + Tailwind utility classes
- 🐍 Flask
- 🔌 pymodbus

## ✅ Yêu cầu môi trường

Trước khi chạy dự án, hãy đảm bảo bạn đã cài:

- `Node.js` 20+
- `Python` 3.10+ hoặc mới hơn
- quyền truy cập tới thiết bị Modbus TCP

Kiểm tra nhanh:

```bash
node -v
python --version
```

## 🚀 Chạy dự án ở môi trường local

### 1. Cài frontend dependencies

```bash
npm install
```

### 2. Cài backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Cấu hình kết nối Modbus

Mở file:

`backend/pid_monitor_config.json`

Ví dụ:

```json
{
  "modbus": {
    "host": "127.0.0.1",
    "port": 502,
    "unit_id": 1,
    "timeout_seconds": 3,
    "poll_interval_ms": 2000
  }
}
```

Ý nghĩa:

- `host`: IP thiết bị Modbus TCP / PLC
- `port`: thường là `502`
- `unit_id`: slave id / unit id của thiết bị
- `timeout_seconds`: thời gian timeout mỗi lần đọc
- `poll_interval_ms`: chu kỳ polling dữ liệu

### 4. Chạy backend

```bash
python backend/app.py
```

Backend sẽ mở API tại:

```text
http://127.0.0.1:8001/api/pid-monitor
```

### 5. Chạy frontend

```bash
npm start
```

Frontend Vite sẽ chạy tại địa chỉ như:

```text
http://localhost:5173
```

Vite đã được cấu hình proxy:

- `/api/*` -> `http://127.0.0.1:8001`

## 🔌 Cấu hình mapping Modbus

Toàn bộ mapping đang nằm trong:

- `backend/pid_monitor_config.json`
- `src/utils/PIDMonitor.js`

### Analog `Flow1 ... Flow18`

Ví dụ:

```json
{ "id": "Flow1", "register": 40001, "scale": 1, "unit": "L/H" }
```

Ý nghĩa:

- `id`: phải trùng với `id` trong `Monitor items.svg`
- `register`: địa chỉ holding register kiểu tài liệu Modbus
- `scale`: hệ số nhân giá trị
- `unit`: đơn vị hiển thị

Ví dụ nếu PLC trả `1234` nhưng thực tế là `123.4 L/H`, cấu hình:

```json
{ "id": "Flow1", "register": 40001, "scale": 0.1, "unit": "L/H" }
```

### Digital `ON/OFF`

Ví dụ:

```json
{ "id": "pump 1", "bit": 10001 }
```

Ý nghĩa:

- `id`: phải trùng với `id` trong SVG
- `bit`: địa chỉ discrete input / digital point

## 🧠 Lưu ý quan trọng về địa chỉ Modbus

Trong file config, bạn đang dùng notation kiểu tài liệu:

- `40001` cho holding register
- `10001` cho discrete input

Backend sẽ tự đổi về offset `0-based` khi đọc bằng `pymodbus`:

- `40001` -> offset `0`
- `40002` -> offset `1`
- `10001` -> offset `0`

Bạn chỉ cần nhập địa chỉ theo đúng tài liệu PLC/HMI quen dùng.

## 🖥️ Frontend lấy dữ liệu như thế nào

Frontend trong `src/pages/PAndID.jsx` sẽ:

1. gọi API `/api/pid-monitor`
2. nhận dữ liệu thật từ backend
3. dùng `src/utils/PIDMonitor.js` để map dữ liệu vào các `id` trong `Monitor items.svg`
4. đổi:
   - text của `Flow1 ... Flow18`
   - màu fill/stroke của các tín hiệu digital

## 🧪 API trả về gì

Ví dụ response:

```json
{
  "holdingRegisters": {
    "40001": 100,
    "40002": 85
  },
  "discreteInputs": {
    "10001": 1,
    "10002": 0
  },
  "meta": {
    "host": "127.0.0.1",
    "port": 502,
    "unitId": 1,
    "pollIntervalMs": 2000
  }
}
```

## 🛠️ Build frontend

```bash
npm run build
```

Output build sẽ nằm trong thư mục:

```text
build/
```

## 🌍 Triển khai dự án

### Phương án 1: Chạy nội bộ trong mạng nhà máy / tàu / xưởng

Phù hợp nhất cho bài toán P&ID realtime.

Triển khai:

1. 🐍 chạy Flask backend trên máy có thể truy cập thiết bị Modbus
2. ⚡ build frontend bằng `npm run build`
3. 🌐 phục vụ thư mục `build/` bằng Nginx, Apache hoặc chính Flask
4. 🔁 cấu hình reverse proxy để frontend gọi được `/api/pid-monitor`

### Phương án 2: Chạy tách frontend và backend

- frontend: web server tĩnh
- backend: Python service riêng

Bạn chỉ cần đảm bảo:

- frontend truy cập được backend
- CORS hoặc reverse proxy được cấu hình đúng
- máy chạy backend nhìn thấy PLC/Modbus device

### Phương án 3: Đóng gói service backend để chạy lâu dài

Khuyến nghị:

- Windows: chạy backend như scheduled task / NSSM service
- Linux: chạy bằng `systemd`
- Docker: nếu môi trường cho phép

## 📌 Gợi ý triển khai production

- 🔒 tắt `debug=True` trong `backend/app.py`
- 🧱 đặt backend sau Nginx hoặc reverse proxy
- 📜 thêm logging cho lỗi kết nối Modbus
- ♻️ thêm retry / reconnect logic nếu thiết bị mất kết nối
- ⏱️ cân nhắc polling interval phù hợp để không làm nặng PLC

## ⚠️ Những việc nên làm tiếp

- bổ sung `.env` hoặc config production riêng
- thêm endpoint health check như `/api/health`
- thêm trạng thái lỗi kết nối trực quan ở frontend
- thêm bảng chẩn đoán địa chỉ Modbus đang đọc
- thêm test cho logic mapping trong `PIDMonitor.js`

## 🐞 Troubleshooting

### Frontend không có dữ liệu

Kiểm tra:

- backend đã chạy chưa
- `http://127.0.0.1:8001/api/pid-monitor` có trả JSON không
- Vite proxy có đang hoạt động không

### Backend báo không kết nối được Modbus

Kiểm tra:

- IP `host`
- `port`
- `unit_id`
- firewall
- thiết bị có bật Modbus TCP không

### Python không chạy được

Nếu máy đang trỏ vào alias của Microsoft Store, hãy cài Python chính thức từ:

- https://www.python.org/downloads/

Sau đó kiểm tra lại:

```bash
python --version
```

## 📄 Ghi chú

Dự án hiện đã bỏ mock trong `PAndID.jsx` và chuyển sang đọc dữ liệu thật qua backend Modbus. Nếu cần chế độ demo/offline, có thể bổ sung lại mock mode riêng trong tương lai.
