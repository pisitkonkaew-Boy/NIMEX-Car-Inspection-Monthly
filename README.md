# NIMEX Car Inspection Monthly

ระบบตรวจสภาพรถบริษัทประจำเดือน ใช้งานผ่านมือถือเป็นหลัก

- ข้อมูลผลตรวจเก็บใน Google Sheet และรูปเก็บใน Google Drive ผ่าน Apps Script ไม่มีข้อมูลรถหรือรูปใน repo นี้
- รายชื่อรถและ DC ดึงจาก NIMEX Car Performance Dashboard อัตโนมัติ (แคช 6 ชั่วโมง ผู้ดูแลกด "ดึงรายชื่อรถล่าสุด" ได้)
- ผู้ตรวจ: เลือก DC ใส่ชื่อ และรหัสผู้ตรวจ แล้วถ่ายรูปตามหัวข้อ
- ผู้ดูแล: เปิดลิงก์แล้วต่อท้ายด้วย `#admin` ดูทุก DC ลบผลตรวจได้
- ไม่เข้าสู่ระบบ: ดูหน้าสรุปได้อย่างเดียว
- รูปถูกย่อบนมือถือ (ด้านยาว 1600px) และประทับทะเบียน หัวข้อ วันเวลา ก่อนส่ง
- ไม่มีสัญญาณ: รูปและผลตรวจเก็บในเครื่องไว้ก่อน แล้วส่งให้อัตโนมัติเมื่อมีสัญญาณ

## ติดตั้งครั้งแรก
1. สร้าง Google Sheet ใหม่ชื่อ `NIMEX Car Inspection Monthly Database`
2. เมนู Extensions > Apps Script ลบโค้ดเดิม แล้ววางโค้ดทั้งหมดจาก `Code.gs.txt` กด Save
3. Project Settings > Script Properties เพิ่ม 3 ค่า
   - `INSPECT_KEY` = รหัสผู้ตรวจ
   - `ADMIN_KEY` = รหัสผู้ดูแล (ตั้งเอง ห้ามใส่ในไฟล์ใดๆ ของ repo)
   - `CAR_API` = ลิงก์ Web app ของ Car Performance Dashboard (ค่า `FLEET_API` ใน config.js ของ repo นั้น)
4. กลับไปหน้าโค้ด เลือกฟังก์ชัน `setup` แล้วกด Run 1 ครั้ง กดอนุญาตสิทธิ์ (Sheet, Drive, ดึงข้อมูลภายนอก)
5. Deploy > New deployment > Web app: Execute as = Me, Who has access = Anyone แล้วคัดลอก URL ที่ลงท้ายด้วย `/exec`
6. ใส่ URL นั้นใน `config.js` ที่ `window.INSPECT_API`
7. อัปโหลดไฟล์ทั้งหมดขึ้น GitHub repo แล้วเปิด Settings > Pages > Branch `main` / root

แก้ Code.gs ครั้งต่อไป: Deploy > Manage deployments > แก้ไข (ไอคอนดินสอ) > Version: New version เพื่อให้ลิงก์เดิมใช้ต่อได้
แก้ไฟล์หน้าเว็บ: เพิ่มเลข `INSPECT_V` ใน `config.js` และเลข `?v=` ใน `index.html`

## ความเป็นส่วนตัว
- repo เป็นสาธารณะ แต่ไม่มีข้อมูลในไฟล์
- รูปใน Drive ตั้งเป็น "ทุกคนที่มีลิงก์ดูได้" เพื่อให้แสดงในหน้าเว็บ ลิงก์รูปจะเห็นได้เฉพาะคนที่เข้าสู่ระบบด้วยรหัส
- หน้าสรุปสาธารณะแสดงเฉพาะจำนวน ไม่แสดงชื่อผู้ตรวจ รายละเอียด หรือรูป
