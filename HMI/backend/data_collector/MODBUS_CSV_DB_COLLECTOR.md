# Thu thập Modbus vào CSV và SQLite

Chỉ sử dụng `HMI/backend/backend_config.json` cho backend và Collector.

## Cấu hình

- `modbus`: host, port, unit_id, timeout_seconds của kết nối.
- `signals`: địa chỉ, source_type, scale, data_type và register_count.
- `database_path`: đường dẫn SQLite dùng chung.
- `data_collector.auto_start`: tự khởi động cùng backend.
- `data_collector.modbus`: poll_interval_seconds và timestamp_format.
- `data_collector.output`: csv_directory, csv_filename_prefix, table_name, retention_days.
- `signals`: cũng là danh sách duy nhất các điểm cần thu thập.

Ví dụ một tín hiệu trong `signals`:

```json
"engine_1.engine_power": {
  "label": "Engine Power",
  "source_type": "holding_register",
  "address": 40038,
  "scale": 1,
  "unit": "kW"
}
```

Mọi tín hiệu trong `signals` được tự động thu thập, không cần khai báo lần hai.
Engine mặc định được lấy từ tên tín hiệu; tín hiệu chung dùng engine 0.
Có thể bổ sung `history` vào một tín hiệu để đặt `engine`, `channel_description`,
hoặc `enabled: false` để ngừng thu thập. `history.aliases` giữ các tên kênh lịch
sử dùng cho truy vấn nhiên liệu; mỗi alias tạo thêm một dòng từ cùng tín hiệu.
Tắt `history.enabled` sẽ tắt cả tín hiệu và các alias. `unit` và `precision`
nằm trực tiếp trong định nghĩa tín hiệu. Khởi động lại Collector sau khi sửa.

Đường dẫn tương đối được tính từ thư mục chứa `backend_config.json`.
Mặc định database là `database/database`, CSV nằm trong `database/csv_history`.
Phần quản trị lưu thiết lập Collector vào cùng file backend này.

## Chạy từ thư mục dự án

```bash
python3 HMI/backend/data_collector/modbus_csv_db_collector.py --once
python3 HMI/backend/data_collector/modbus_csv_db_collector.py
```

Chọn bản cấu hình backend khác bằng `--config /path/to/backend_config.json`.

## Dữ liệu đầu ra

Mỗi snapshot tạo một CSV mới và ghi cùng các dòng vào SQLite:
`Engine, Channel Description, Timestamp, Value, Unit`.
Digital lưu 0/1 với đơn vị `state`. Timestamp dùng UTC.
Database và bảng/index được tạo khi ghi snapshot đầu tiên. SQLite giữ lịch sử
60 ngày theo cấu hình; CSV không tự xóa theo chính sách này.

Collector đọc theo nhóm địa chỉ liên tiếp. Địa chỉ 40001 và 10001 được chuyển
thành offset 0. int32/uint32 gồm high word tại địa chỉ cấu hình và low word ở
địa chỉ tiếp theo. Khi đọc Modbus thất bại, chế độ liên tục thử lại sau 60 giây;
chế độ `--once` trả lỗi.
