# modbus_csv_db_collector.py

## Mục đích

`modbus_csv_db_collector.py` là script thu thập dữ liệu từ Modbus TCP theo cấu hình JSON, sau đó:

- ghi snapshot vào file CSV
- đồng bộ cùng dữ liệu đó vào SQLite

Script này phù hợp cho:

- lưu lịch sử để dùng cho trend pages
- tạo nguồn dữ liệu cho backend history API
- kiểm tra nhanh việc đọc Modbus theo một danh sách point cố định

## File liên quan

- Script: `HMI/backend/data_collector/modbus_csv_db_collector.py`
- Config: `HMI/backend/data_collector/modbus_csv_db_collector_config.json`

## Chức năng chính

Script làm 5 việc chính:

1. Đọc file config JSON
2. Parse danh sách `points` cần đọc từ Modbus
3. Kết nối Modbus TCP và đọc dữ liệu theo batch
4. Ghi dữ liệu ra CSV
5. Upsert dữ liệu vào SQLite

## Đầu vào

Script nhận config theo tham số:

```bash
python modbus_csv_db_collector.py --config <path-to-json>
```

Nếu không truyền `--config`, nó dùng mặc định:

```text
modbus_csv_db_collector_config.json
```

Script cũng hỗ trợ:

```bash
python modbus_csv_db_collector.py --once
```

`--once` có nghĩa là:

- đọc một snapshot duy nhất
- ghi vào CSV và database
- in summary
- thoát

Nếu không dùng `--once`, script sẽ chạy lặp vô hạn theo `poll_interval_seconds`.

## Cấu trúc config

Config có 3 phần chính:

### 1. `modbus`

Ví dụ:

```json
"modbus": {
  "host": "10.0.0.204",
  "port": 502,
  "unit_id": 20,
  "timeout_seconds": 3,
  "poll_interval_seconds": 1,
  "timestamp_format": "%Y-%m-%d %H:%M:%S"
}
```

Ý nghĩa:

- `host`, `port`: địa chỉ Modbus TCP server
- `unit_id`: slave/unit id
- `timeout_seconds`: timeout khi đọc
- `poll_interval_seconds`: chu kỳ đọc khi chạy liên tục
- `timestamp_format`: format lưu timestamp

### 2. `output`

Ví dụ:

```json
"output": {
  "csv_path": "../database/modbus_history.csv",
  "database_path": "../database/database",
  "table_name": "database"
}
```

Ý nghĩa:

- `csv_path`: file CSV lưu lịch sử
- `database_path`: file SQLite
- `table_name`: bảng SQLite để insert/update

### 3. `points`

Mỗi point mô tả một giá trị cần đọc.

Ví dụ digital:

```json
{
  "engine": 0,
  "channel_description": "DO_transfer_pump_1",
  "source_type": "discrete_input",
  "address": 11649,
  "scale": 1,
  "unit": "state",
  "enabled": true
}
```

Ví dụ analog:

```json
{
  "engine": 1,
  "channel_description": "Engine Power",
  "source_type": "holding_register",
  "address": 40038,
  "scale": 1,
  "unit": "kW",
  "enabled": true
}
```

Field quan trọng:

- `engine`: engine index ghi vào DB
- `channel_description`: tên channel
- `source_type`: `holding_register` hoặc `discrete_input`
- `address`: địa chỉ Modbus dạng hiển thị như `40038`, `10001`
- `scale`: hệ số nhân
- `unit`: đơn vị lưu vào DB
- `precision`: số chữ số thập phân, nếu có
- `data_type`: ví dụ `uint16`, `int32`
- `register_count`: số register, ví dụ 2 cho `int32`
- `enabled`: bật/tắt point

## Cách script đọc Modbus

### Địa chỉ Modbus

Script dùng địa chỉ kiểu hiển thị:

- holding register bắt đầu từ `40001`
- discrete input bắt đầu từ `10001`

Sau đó nó tự convert về zero-based offset trước khi gửi lệnh Modbus.

Ví dụ:

- `40001 -> 0`
- `40038 -> 37`
- `10001 -> 0`

### Tối ưu đọc theo batch

Script không đọc từng point một.

Nó sẽ:

- gom các địa chỉ liên tiếp bằng `group_contiguous_addresses`
- cắt chunk theo giới hạn an toàn protocol bằng `split_address_group`

Lợi ích:

- ít request hơn
- giảm thời gian poll
- giảm tải cho Modbus device

### Hỗ trợ kiểu dữ liệu

Hiện script hỗ trợ:

- `discrete_input`
- `holding_register` 1 word
- `holding_register` 2 word với `int32` hoặc `uint32`

Với điểm nhiều hơn 1 register, script coi `address` là high word, và các low word nằm ở địa chỉ ngay trước đó.

## Luồng xử lý snapshot

Mỗi vòng lặp, script sẽ:

1. Tạo timestamp UTC hiện tại
2. Mở kết nối Modbus TCP
3. Đọc toàn bộ holding registers cần thiết
4. Đọc toàn bộ discrete inputs cần thiết
5. Resolve từng point thành giá trị cuối
6. Apply `scale` và `precision`
7. Tạo danh sách row theo format:

```text
(Engine, Channel Description, Timestamp, Value, Unit)
```

8. Append vào CSV
9. Upsert vào SQLite
10. In summary ra terminal

## Ghi CSV

Script đảm bảo file CSV có header:

```text
Engine,Channel Description,Timestamp,Value,Unit
```

Nếu file chưa tồn tại hoặc rỗng, script sẽ tự tạo header trước khi append.

## Ghi SQLite

Script tạo bảng nếu chưa có:

- cột `Engine`
- cột `Channel Description`
- cột `Timestamp`
- cột `Value`
- cột `Unit`

Nó cũng tạo unique key trên:

```text
(Engine, Channel Description, Timestamp)
```

Vì vậy nếu cùng timestamp đã tồn tại:

- row sẽ không bị nhân đôi
- dữ liệu sẽ được `upsert`

Nghĩa là:

- nếu chưa có thì insert
- nếu đã có thì update `Value` và `Unit`

## Kết quả in ra sau mỗi snapshot

Ví dụ:

```text
Collected rows: 249
Timestamp: 2026-07-29 07:12:05
CSV file: /.../modbus_history.csv
Database: /.../database
Table: database
Inserted rows: 249
Updated rows: 0
```

Ý nghĩa:

- `Collected rows`: số point đọc thành công
- `Timestamp`: timestamp dùng cho snapshot đó
- `Inserted rows`: số row mới
- `Updated rows`: số row cũ được cập nhật

## Cách chạy

### Chạy một lần

```bash
python HMI/backend/data_collector/modbus_csv_db_collector.py --once
```

### Chạy liên tục

```bash
python HMI/backend/data_collector/modbus_csv_db_collector.py
```

### Chạy với config khác

```bash
python HMI/backend/data_collector/modbus_csv_db_collector.py --config /path/to/config.json --once
```

## Khi nào nên dùng script này

Nên dùng khi bạn muốn:

- xây dữ liệu lịch sử cho trend pages
- kiểm tra nhanh Modbus point mapping
- ghi snapshot định kỳ vào SQLite
- chuẩn bị data cho `pressure_trend`, `exh_temp_trend`, `do-consumption`, `ho-consumption`

## Hạn chế hiện tại

- chưa có retry logic riêng cho từng batch
- chưa có logging file riêng
- chưa có cơ chế skip từng point lỗi rồi tiếp tục
- chưa hỗ trợ nhiều kiểu dữ liệu ngoài `uint16`, `int32`, `uint32`
- timestamp hiện dùng một giá trị chung cho toàn snapshot

## Lưu ý vận hành

- `pymodbus` phải được cài trong môi trường chạy script
- Modbus device phải reachable từ máy hoặc WSL đang chạy
- file config phải đúng với địa chỉ và kiểu dữ liệu thực tế
- đường dẫn output trong config được resolve tương đối theo thư mục chứa config

## Tóm tắt ngắn

`modbus_csv_db_collector.py` là cầu nối từ Modbus sang dữ liệu lịch sử:

- đọc point theo config
- chuẩn hóa snapshot
- lưu đồng thời vào CSV và SQLite
- hỗ trợ chạy một lần hoặc chạy poll liên tục
