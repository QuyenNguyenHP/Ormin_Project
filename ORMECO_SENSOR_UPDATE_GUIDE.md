# Ormeco Sensor Update Guide

Tai lieu nay dung de cap nhat nhanh khi co thay doi trong 2 file nguon:

- `Ormeco Sensor Analog List.md`
- `Ormeco Sensor Digital List.md`

Muc tieu:

- Giu mot noi tham chieu duy nhat cho cac quy uoc mapping dang duoc su dung trong project.
- Khi file sensor list thay doi, chi can dua tai lieu nay la co the sua dung cac file lien quan nhanh va it sot hon.

## 1. Nguon du lieu goc

### Analog

- File markdown: `Ormeco Sensor Analog List.md`
- Nguon excel goc: `C:\Users\DAIKAI VR\Desktop\Ormeco Sensor List_Rev05_Fined.xlsx`
- Noi dung chinh:
  - Toan bo dia chi analog cua `D/G#1` den `D/G#4`
  - Co ca gia tri `16 bit Int` va `32 bit Int`

### Digital

- File markdown: `Ormeco Sensor Digital List.md`
- Nguon excel goc: `C:\Users\DAIKAI VR\Desktop\Ormeco Sensor Digital List.xlsx`
- Noi dung chinh:
  - Digital dung chung `D/G`
  - Digital rieng theo `D/G#1`, `D/G#2`, `D/G#3`, `D/G#4`
  - Du lieu la `Boolean`

## 2. Cac file can sua khi doi sensor list

### Bat buoc cho analog

- `HMI/backend/backend_config.json`
- `HMI/backend/data_collecting/modbus_csv_db_collector_config.json`

### Bat buoc khi co 32-bit analog

- `HMI/backend/modbus_api.py`
- `HMI/backend/data_collecting/modbus_csv_db_collector.py`

### Bat buoc cho flow mapping o frontend P&ID

- `HMI/src/utils/PIDMonitor.js`
- `HMI/src/pages/PAndID.jsx`

### Bat buoc cho digital va alarm

- `HMI/backend/backend_config.json`
- `HMI/backend/data_collecting/modbus_csv_db_collector_config.json`
- `HMI/src/utils/PIDMonitor.js`
- `HMI/src/pages/Alarms.jsx`

## 3. Quy uoc mapping dang duoc ap dung

### 3.1. Analog

- Analog su dung `source_type = "holding_register"`.
- Dia chi analog duoc dung nguyen gia tri trong list.
- Cac gia tri `32 bit Int` dang duoc xu ly bang:
  - `data_type: "int32"`
  - `register_count: 2`
- Quy uoc nay hien dang ap dung cho:
  - `Running hours [Generator]`
  - 6 flow meter cua moi engine:
    - `D.O Transfer Flow`
    - `D.O Engine Inlet Flow`
    - `D.O Engine Return Flow`
    - `H.O Transfer Flow`
    - `H.O Engine Inlet Flow`
    - `H.O Engine Return Flow`

### 3.2. Digital

- Digital su dung `source_type = "discrete_input"`.
- File digital list dang dung dia chi goc kieu:
  - `1`, `401`, `801`, `1201`
  - `1601`, `1614`, `1646`
  - `40040`, `40140`, `40240`, `40340`
- Trong backend hien dang map theo quy uoc:

`discrete_input_address = 10000 + raw_digital_address`

Vi du:

- raw `1` -> backend `10001`
- raw `401` -> backend `10401`
- raw `1607` -> backend `11607`
- raw `40040` -> backend `50040`

Neu sau nay PLC/Modbus xac nhan quy uoc khac, can doi lai tai:

- `HMI/backend/backend_config.json`
- `HMI/backend/data_collecting/modbus_csv_db_collector_config.json`
- `HMI/src/utils/PIDMonitor.js`

## 4. Cac file da duoc doi theo version 2

### Backend config chinh

File:

- `HMI/backend/backend_config.json`

Da cap nhat:

- `version = 2`
- Toan bo analog address theo list moi
- Cac diem `int32` cho running hours va flow meter
- `pages.pid.flows` theo address moi
- `pages.pid.digitals` theo digital list moi
- `pages.alarm` de frontend doc bit status theo 4 engine

### Backend collector config

File:

- `HMI/backend/data_collecting/modbus_csv_db_collector_config.json`

Da cap nhat:

- Analog address moi
- Ho tro `int32` cho running hours va flow meter
- Digital P&ID mapping moi

### Backend logic doc 32-bit

Files:

- `HMI/backend/modbus_api.py`
- `HMI/backend/data_collecting/modbus_csv_db_collector.py`

Da cap nhat:

- Ho tro `register_count`
- Ho tro `data_type`
- Ghep 2 thanh ghi 16-bit thanh `int32`/`uint32`

## 5. Cac mapping analog quan trong can nho

### Running hours

- Engine 1: `40063-40064`
- Engine 2: `40163-40164`
- Engine 3: `40263-40264`
- Engine 4: `40363-40364`

### Flow meter

- Engine 1:
  - `40051-40052`
  - `40053-40054`
  - `40055-40056`
  - `40057-40058`
  - `40059-40060`
  - `40061-40062`
- Engine 2:
  - `40151-40152`
  - `40153-40154`
  - `40155-40156`
  - `40157-40158`
  - `40159-40160`
  - `40161-40162`
- Engine 3:
  - `40251-40252`
  - `40253-40254`
  - `40255-40256`
  - `40257-40258`
  - `40259-40260`
  - `40261-40262`
- Engine 4:
  - `40351-40352`
  - `40353-40354`
  - `40355-40356`
  - `40357-40358`
  - `40359-40360`
  - `40361-40362`

## 6. Cac mapping digital quan trong can nho

### Digital P&ID

P&ID frontend hien KHONG doc ten digital moi truc tiep tu SVG.

No dang phu thuoc vao `id` cu trong file SVG, vi du:

- `pump 1`
- `pump 2`
- `LC_D.O.service.tank`
- `TSH_H.O.settling.tank`

Do do:

- `label` trong `pages.pid.digitals` can tiep tuc giu dung voi `id` trong SVG
- `key` va `address` moi la phan duoc doi theo digital list moi

Neu doi `label` cua `pid.digitals` ma khong doi file SVG, P&ID se mat mapping hien thi.

### Alarm page

Trang alarm frontend dang doc tu:

- `pages.alarm.engines[].bits[]`

Moi bit alarm nen co:

- `key`
- `label`
- `source_type`
- `address`

`label` o day nen la ten alarm that trong digital list de nguoi van hanh de doi chieu.

## 7. Giai thich vi sao can fallback o frontend alarm

File:

- `HMI/src/pages/Alarms.jsx`

Dang co fallback cho:

- `Engine 1`
- `Engine 2`
- `Engine 3`
- `Engine 4`
- Toan bo ten alarm mac dinh

Ly do:

- Neu backend bi loi, frontend van phai hien:
  - Nut chon engine 1-4
  - Toan bo ten alarm
  - Trang thai mac dinh `NORMAL`

Dieu nay giup khong bi man hinh trong khi mat ket noi Modbus.

## 8. Cac gia dinh dang duoc dung

### Gia dinh 1: Digital address cong 10000

- Day la quy uoc mapping hien tai cua project.
- Neu sau nay xac nhan PLC tra truc tiep theo he address khac, can doi lai toan bo digital mapping.

### Gia dinh 2: Digital trung address trong sheet

Trong digital list co mot so dong can kiem tra lai khi co file moi.

Vi du:

- `T/C L.O filter differential press switch` o DG#1-#3 trong sheet cu bi trung voi `12/412/812`

Trong project hien da chuan hoa theo pattern:

- DG#1 -> `30`
- DG#2 -> `430`
- DG#3 -> `830`
- DG#4 -> `1230`

Neu file nguon moi xac nhan dia chi khac, phai sua lai trong `backend_config.json`.

### Gia dinh 3: Mot so ten P&ID khong trung 1-1 voi ten trong digital list

Vi du:

- `pump 1..14`
- mot so `LC/LL/LH/TS/TSH`

Nhung ten nay la ten SVG hien co, nen khong duoc doi tuy y neu chua sua SVG.

## 9. Checklist khi ban muon cap nhat lan sau

Khi ban can cap nhat theo sensor list moi, chi can noi:

`Cap nhat theo sensor list moi, dung ORMECO_SENSOR_UPDATE_GUIDE.md`

Va neu co thay doi, nen noi ro 4 nhom sau:

1. Analog co doi dia chi nao khong
2. Co them/bot diem `32 bit Int` nao khong
3. Digital co doi dia chi hay doi ten alarm nao khong
4. Co can doi mapping P&ID SVG hay chi doi backend/frontend config

Checklist thao tac:

1. Doi `HMI/backend/backend_config.json`
2. Doi `HMI/backend/data_collecting/modbus_csv_db_collector_config.json`
3. Neu co 32-bit thi kiem tra `modbus_api.py` va `modbus_csv_db_collector.py`
4. Neu flow doi thi sua `HMI/src/utils/PIDMonitor.js`
5. Neu digital/alarm doi thi sua `HMI/src/utils/PIDMonitor.js` va `HMI/src/pages/Alarms.jsx`
6. Parse lai JSON sau khi sua
7. Neu can, build frontend de kiem tra

## 10. Cach mo ta yeu cau de sua nhanh nhat

Mau cau lenh nen dung:

`Can cu theo ORMECO_SENSOR_UPDATE_GUIDE.md, cap nhat lai analog/digital theo file ... va giu dung quy uoc int32/discrete_input hien tai`

Hoac:

`Can cu theo ORMECO_SENSOR_UPDATE_GUIDE.md, chi doi phan digital alarm, khong doi P&ID SVG label`

Hoac:

`Can cu theo ORMECO_SENSOR_UPDATE_GUIDE.md, doi ca P&ID mapping neu ten tren SVG cung da thay doi`

## 11. File tai lieu nay

File nay:

- `ORMECO_SENSOR_UPDATE_GUIDE.md`

Nen duoc cap nhat moi khi:

- Co quy uoc mapping moi
- Co them page moi lien quan sensor
- Co doi logic doc `int32`
- Co doi quy uoc map digital
