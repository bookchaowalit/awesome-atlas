# Awesome Atlas บน Railway

โปรเจกต์ `awesome-atlas` แยก `awesome-web` ออกจาก `awesome-api`
ทั้งสอง service อยู่ใน environment `production` และ region สิงคโปร์
source ที่เตรียมคือ `bookchaowalit/awesome-atlas`, branch `main`; build context เป็น
repository root โดย Dockerfile-specific allowlists ไม่รวมไฟล์ส่วนอื่น
resource IDs และผลตรวจอยู่ใน [railway-state.json](railway-state.json)

สถานะปัจจุบัน: [เว็บออนไลน์](https://awesome-web-production.up.railway.app) แล้ว
ทั้งสอง services build และ deploy `SUCCESS` จาก commit `34d71d0`
ตรวจ HTTPS, health, API projects/sources/categories, หมวดย่อย, comparison,
mentions ranking และ daily archive ผ่าน origin เดียวกันแล้ว
รอบแรกอ่านสำเร็จ 12 จาก 679 ลิสต์และมี daily snapshots 7 วัน UTC;
API data state เป็น `degraded` เพราะ 4 ลิสต์ไม่มี GitHub repository links ที่ parser รองรับ
ข้อมูลลิสต์อื่นยังทยอยดึงทุก 30 นาที สถานะนี้แยกจาก Railway services ที่ออนไลน์

| Service | Dockerfile | Port | Health | Storage |
|---|---|---|---|---|
| awesome-web | `apps/awesome-web/Dockerfile` | 3500 | `/health` | static image |
| awesome-api | `services/awesome-api/Dockerfile` | 3510 | `/health` | `awesome-data` mounted `/data` |

web service ตั้ง `AWESOME_API_ORIGIN=http://awesome-api.railway.internal:3510`
API ตั้ง `AWESOME_API_RUNTIME_DIR=/data`, `AWESOME_API_SYNC_ENABLED=true`,
`AWESOME_API_SYNC_INTERVAL_SECONDS=1800` และ `AWESOME_API_MAX_SOURCES=16`
ไม่มี provider token หรือ shared Solo Empire database ในทั้งสอง service
ใช้หนึ่ง replica ต่อ service; ปิด app sleeping และไม่เพิ่ม cron ที่ซ้ำกับ worker

Railway settings ตั้งผ่าน Railway connector โดยตรง: Dockerfile paths,
watch patterns, health checks, restart policy, region, resource limits และ
variables ตาม deployment record ไม่มี `railway.toml` ของ Config as Code
เพราะ [ระบบนี้เลิกใช้สำหรับบริการใหม่](https://docs.railway.com/infrastructure-as-code)
การนำไปตั้งในโปรเจกต์ใหม่ต้องสร้างสอง services/volume และตั้ง settings เหล่านี้ก่อนเชื่อม source

## ตรวจหลัง deploy

เปิด web origin จาก deployment record แล้วตรวจ `/health` ได้ HTTP 200
`/api/v1/status` ต้องเป็น JSON ที่มี `last_synced_at` และรอบซิงก์ 1800 วินาที
ตรวจ projects, sources, หมวดย่อย, comparison และ daily archive ผ่าน origin เดียวกัน
สถานะ Railway `SUCCESS` ยืนยันเพียง deployment พร้อมรับ request;
ใช้ API status เพื่อตรวจ coverage และ error ของแหล่งข้อมูลเพิ่มเติม

หาก upstream ของบางลิสต์ผิดพลาด worker จะรักษา snapshot เดิมและหมุนไปแหล่งถัดไป
การอ่าน Awesome ทุกลิสต์ต้องใช้หลายรอบ; ไม่ตีความ source ที่รอซิงก์ว่ามีรายการศูนย์จริง

## ข้อมูลและการกู้คืน

`/data/catalog.sqlite3` เป็น projection; `/data/lake/` มี immutable landing,
Bronze Parquet และ committed manifests การ redeploy/restart ใช้ volume เดิม
ห้ามลบ volume หรือสร้าง API replica เพิ่มที่ใช้ writer พร้อมกัน
หาก projection เสีย ใช้ CLI `python -m awesome_api.cli rebuild` ภายใน API container
โดยคง `AWESOME_API_RUNTIME_DIR=/data` และหยุด writer ก่อน rebuild

ยังไม่มี managed backup หรือ automatic retention deletion ต้องติดตาม volume usage
และตั้ง backup/retention เพิ่มก่อนขยายการเก็บข้อมูล การเรียกเก็บเงินเป็น usage
ในบัญชี Railway ที่มีอยู่ ไม่เปลี่ยนแพ็กเกจหรือเพิ่มบริการ database ที่ไม่จำเป็น

## อัปเดตและ rollback

หลังเชื่อม GitHub source แล้ว การ push `main` ที่เปลี่ยน runtime/build inputs
ของแต่ละ service จะทำให้ Railway build เฉพาะ service นั้น การแก้เอกสารอย่างเดียว
ไม่ควรทำให้ API หยุดเพื่อ redeploy ขณะนี้ source เชื่อมกับ branch `main` แล้ว
Railway volume deployments มีช่วงหยุดสั้น ๆ เพื่อให้ writer ใช้ volume เพียงตัวเดียว
rollback ใช้ deployment image ที่ผ่านการตรวจใน service เดิมและคง volume เดิมไว้
หลัง rollback ต้องตรวจ API status และ compatibility ของ projection/lake ก่อนรับรองผล
