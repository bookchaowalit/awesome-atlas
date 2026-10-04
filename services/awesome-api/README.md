# Awesome Explore Backend

backend แยกสำหรับเว็บค้นหาโครงการ ดูเนื้อหา Awesome lists เปรียบเทียบรายการซ้ำ และอ่านอันดับ repository รายวัน: FastAPI อ่าน projection ใน SQLite ของตัวเอง
worker ดึงรายการต้นทางจาก `sindresorhus/awesome` และทยอยอ่าน README ของ Awesome lists โดยไม่ใช้ GitHub token
runtime และ dependency อยู่ใน service นี้; ไม่อ่านหรือเขียน database ส่วนกลาง

```bash
cd services/awesome-api
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m uvicorn awesome_api.app:app --host 127.0.0.1 --port 3510 --workers 1
```

หากเครื่องไม่มี `ensurepip` แต่ติดตั้ง `uv` แล้ว ให้สร้าง environment ด้วย `uv venv .venv`
และติดตั้งด้วย `uv pip install --python .venv/bin/python -r requirements-dev.txt`
ตั้งค่า environment ตาม [.env.example](.env.example); service ไม่อ่าน `.env` อัตโนมัติ
frontend ใช้ `http://127.0.0.1:3510` ผ่าน server proxy ของเว็บ
OpenAPI อยู่ที่ `/docs` และ contract อยู่ที่ [contracts/awesome.v1.md](contracts/awesome.v1.md)

## การอัปเดต

เริ่ม sync ใน background ทันทีเมื่อ API พร้อมรับ request จากนั้นพัก 30 นาทีหลังแต่ละรอบ
อ่าน root catalog หนึ่งครั้งและ Awesome lists สูงสุด 16 แหล่งต่อรอบ; เปลี่ยนได้ด้วย `AWESOME_API_MAX_SOURCES`
หมุนเลือกแหล่งที่ไม่ได้ลองดึงนานที่สุด แม้ครั้งก่อนล้มเหลว เพื่อให้ทุกแหล่งมีโอกาสได้รับการอัปเดต
เมื่อ committed list capture พบ nested kind=list จะลงทะเบียน source ให้ worker ดึงในรอบถัดไป
active sources มาจาก graph ที่เข้าถึงได้จาก root; orphan/cycle ที่ไม่เชื่อม root ถูกซ่อนจาก API
เก็บ inactive memberships เป็น cached snapshot เพื่อให้ reconnect แสดงรายการเดิมพร้อมเวลาที่ดึงจริง
source ใหม่ที่ยังไม่ดึงมี last_synced_at=null และ item_count=0; ไม่มี browser endpoint สำหรับลงทะเบียน source
การเลือกแหล่งครั้งแรกให้ลำดับก่อนกับ AI, development, self-hosted, databases และ design
ถ้ามีรายการมาก การเก็บครบใช้หลายรอบ; `sources_synced/sources_total` บอกความครอบคลุมจริง
แหล่งที่เปลี่ยน category ใน root ใช้หมวดหมู่ใหม่เมื่อรอบดึง source นั้นสำเร็จ

แต่ละรอบดึง daily archive เพิ่มสูงสุด 7 snapshots สำหรับ 7 วัน UTC ล่าสุดจาก `antonkomarev/github-trending-archive`
ใช้ fixed public raw JSON path โดยไม่ส่ง authorization; 404 ข้ามโดยไม่ลบข้อมูลเดิม
payload/date/lake ที่ไม่ถูกต้องรักษา snapshot สำเร็จล่าสุดและแสดง error
latest_date คือวันของ snapshot ที่มีจริง; provider rank คงเดิมและไม่เติม stars/language
daily snapshots เก็บแยกจาก Awesome source graph

worker ทำงานใน process ของ API; Railway production ปิด app sleeping และเริ่ม process ใหม่เมื่อเกิด failure
ไม่มี scheduler ซ้ำภายนอก และการรันแบบ local ยังหยุดเมื่อปิดเครื่อง
ใช้หนึ่ง process/หนึ่ง replica/`--workers 1`; หากต้องการรันหลาย replicas ต้องแยก worker และเพิ่ม distributed lock ก่อน
รอบใน process เดียวไม่ซ้อนกัน; หยุด API ก่อนใช้ `sync` หรือ `rebuild` กับ runtime เดียวกัน
`GET /api/v1/status` แสดงเวลา แหล่งที่ดึงแล้ว จำนวนรายการ และ error
เมื่อ network/source/lake ล้มเหลวจะรักษาข้อมูลสำเร็จครั้งก่อนและแสดง `degraded`
README ที่มีข้อความแต่ parser ไม่พบ GitHub repository links ที่รองรับถือเป็น source error เช่นกัน
จึงรักษา snapshot เดิมไว้แทนการแทนที่ด้วยรายการว่าง แม้ต้นฉบับจะมีเฉพาะลิงก์เว็บไซต์อื่นที่ถูกต้องก็ตาม
เว็บเริ่มจากข้อมูลว่างระหว่างกำลังเก็บข้อมูลจริง ไม่มีข้อมูลโครงการจำลองเติมเข้าฐานข้อมูล

## คำสั่ง CLI

```bash
.venv/bin/python -m awesome_api.cli sync
.venv/bin/python -m awesome_api.cli --once
.venv/bin/python -m awesome_api.cli status
.venv/bin/python -m awesome_api.cli rebuild
.venv/bin/python -m pytest -q
```

`sync` และ `--once` ดึงข้อมูลหนึ่งรอบ แล้วจบ; คืน exit code 1 เมื่อมีการดึงในรอบนั้นล้มเหลว
`status` อ่านสถานะอย่างเดียว ไม่มี network
`rebuild` ตรวจ checksum ทุก manifest ที่ commit แล้ว ก่อนแทนที่ SQLite projection ใน transaction เดียว
จากนั้น replay captures ตามเวลาโดยไม่เรียก network; ข้อมูล error/attempt ที่ไม่ได้ commit ลง lake จะไม่ถูก replay
manifest เสียหรือ artifact หายทำให้ rebuild ล้มเหลวโดยไม่เปลี่ยน projection เดิม

## อ่านลิสต์ เปรียบเทียบ และจัดอันดับ

`/api/v1/sources` เพิ่ม item_count รวม project/list และ sections:[{name,count}]
เปิดรายการด้วย `/api/v1/projects?source=owner/awesome-list&kind=all`; กรอง heading ด้วย section แบบชื่อเดิมตรงตัว
Project.sections รวม headings จาก source ที่เลือก; repo ที่อยู่หลาย headings รวมเป็นรายการเดียว
`/api/v1/compare?left=owner/list-a&right=owner/list-b&mode=shared` แสดงรายการซ้ำ
เปลี่ยน mode เป็น left_only, right_only หรือ all; counts ไม่ขึ้นกับข้อความค้นหาหรือ pagination
overlap_percent ใช้ shared หาร union; source ที่รอ sync มีรายการว่างตามจริง

`/api/v1/projects?sort=mentions&min_sources=2` เรียงจำนวน active Awesome lists ที่แนะนำ repo มากไปน้อย
ไม่นับ root catalog และไม่เพิ่มจำนวนจาก repo ซ้ำหลาย sections ในลิสต์เดียวกัน; ไม่ใช่คะแนนคุณภาพหรือ stars
`/api/v1/daily/sources` แสดง provider, วันที่ที่เก็บแล้วและ errors
`/api/v1/daily?source=antonkomarev/github-trending-archive&date=2026-10-04` อ่าน snapshot ตามวัน
ไม่ส่ง date ใช้ snapshot ล่าสุดที่มีจริง; items มี provider rank, Project และ Awesome source_count
repo นอก Awesome ยังแสดงพร้อม source_count=0; rank ไม่เปลี่ยนหลัง search/pagination
รายการบันทึกเรียก `/api/v1/projects?ids=owner/repo&kind=all` เพื่อ resolve daily-only repo ที่เก็บแล้วได้ด้วย
ใช้ metadata จาก snapshot ล่าสุดที่มี repo นั้น และเคารพ filters/sort/pagination โดยไม่เพิ่มจำนวนใน Awesome catalog ปกติ

## Lake และขอบเขตการดึง

ใช้ลำดับ `README bytes → immutable landing → Bronze Parquet → committed manifest → SQLite`
ในเครื่อง artifact อยู่ใต้ `.runtime/lake/` และ SQLite อยู่ที่ `.runtime/catalog.sqlite3`; ignored ทั้งคู่
Railway ตั้ง `AWESOME_API_RUNTIME_DIR=/data` บน persistent volume จึงเก็บ lake/SQLite ข้าม deployments
manifest มี `domain=awesome`, `dataset=github_repositories`, schema version 2, source ID, event/run ID,
UTC capture time, SHA-256 ของ raw/Parquet และจำนวน records; บันทึก manifest แบบ atomic ก่อนเขียน projection
schema version 2 เพิ่ม Bronze.sections; อ่าน/replay version 1 โดยให้ sections=[] และ retention_class=operational
SQLite memberships เดิม migrate เพิ่ม sections ค่าเริ่มต้น [] โดยไม่ลบ rows
daily ใช้ role=daily, dataset=github_daily_rankings, landing snapshot.json และ Bronze ที่มี rank/snapshot_date
ทุก role ใช้ domain=awesome, privacy=public และ retention_class=operational; rebuild replay ทั้ง README และ daily snapshots
อ่านต้นฉบับได้จาก `landing/<owner>/<repo>/<run_id>/readme.md`
Parquet อยู่ที่ `bronze/<owner>/<repo>/<run_id>/records.parquet`
เก็บ snapshots แบบ immutable สำหรับ public data และ replay; pilot ยังไม่มีนโยบายลบอัตโนมัติ ต้องเฝ้าดูพื้นที่ disk
lake ใช้ filesystem ของ service: local directory หรือ Railway persistent volume
ยังไม่ได้ต่อ Object Storage หรือเปิด managed backup; volume ไม่ใช่สำเนาสำรองและต้องติดตามพื้นที่สะสม

fetch จำกัด host เป็น `raw.githubusercontent.com`, HTTPS, timeout 12 วินาทีต่อ request และ README ไม่เกิน 4 MiB
root ใช้ `main/readme.md`; lists ใช้ `HEAD/readme.md` และ fallback `README.md` เมื่อพบ HTTP 404
redirect ออกนอก allowlist ถูกปฏิเสธ; ไม่ส่ง token หรือ authorization header
parser อ่าน Markdown bullet/reference links และ repository links ใน first column ของ Markdown tables
ข้าม fenced examples, badges, links กลับ README ตัวเองและ prose ทั่วไป
source sections รองรับ ATX H1–H6 และ Setext ที่มี underline `=` หรือ `-` ถัดจากชื่อหัวข้อบรรทัดเดียว
root categories ยังคงใช้ ATX H2–H6; fenced code, bullet/table separators และ horizontal rules ไม่เป็น section headings
heading ตัด HTML tags, normalize ช่องว่างและจำกัด 256 ตัวอักษรให้ใช้กรองด้วย section query ได้
description ตัด HTML tags ออก; ฉบับเต็มอยู่ใน landing จึงไม่เปิด general HTML parser
รับเฉพาะ URL GitHub แบบ owner/repo และรวม case, anchor, query, `.git` ให้เป็น canonical ID เดียวกัน
รายการที่เก็บเป็นสิ่งที่ README อ้างอิง ไม่ได้ตรวจสอบ license, ความปลอดภัย หรือสถานะ maintenance ของแต่ละโครงการ
แสดงข้อความและลิงก์กลับ upstream; ไม่มีการคัดลอก source code ของโครงการ
รายละเอียด ownership และ sources อยู่ใน [Data Product Charter](docs/data-product-charter.md) และ [Source Inventory](docs/source-inventory.md)

## Docker

```bash
docker build -f services/awesome-api/Dockerfile -t awesome-api .
docker run --rm -p 3510:3510 -v awesome-api-runtime:/data awesome-api
```

entrypoint เตรียมสิทธิ์ directory ของ volume แล้วลดสิทธิ์เป็น user `app`
ก่อนรัน Uvicorn เป็น process หลัก ใช้ `PORT` เมื่อกำหนดและค่าเริ่มต้น 3510
`Dockerfile.dockerignore` จำกัด root build context ให้มีเฉพาะ build inputs ของ service นี้

## Railway

`service.yaml` กำหนด target เป็น Railway; `awesome-api` และ `awesome-web`
อยู่ในโปรเจกต์ `awesome-atlas` แยกจากบริการอื่น ใช้ region สิงคโปร์
API เปิดเฉพาะเครือข่ายภายใน เว็บให้บริการ `/api/v1/*` ผ่าน proxy ของตัวเอง
API มี persistent volume ที่ `/data`, หนึ่ง process/หนึ่ง replica,
health check `/health`, restart เมื่อ failure และปิด app sleeping
เมื่อ deployment ผ่าน health check จะทำงานและซิงก์ข้อมูลได้แม้ปิดเครื่องพัฒนา
source คือ repo `bookchaowalit/awesome-atlas` ที่มีเฉพาะเว็บและ backend
เว็บและ API deploy สำเร็จแล้ว: [Awesome Atlas](https://awesome-web-production.up.railway.app)
ตรวจ HTTPS, API, หมวดย่อย, เปรียบเทียบรายการซ้ำและข้อมูลอันดับรายวันผ่านแล้ว
ข้อมูลยังทยอยซิงก์และบางลิสต์ไม่มี repository links ที่ parser รองรับ;
ใช้ API status และ deployment record เพื่อตรวจความครอบคลุมและข้อจำกัดจริง

การตั้งค่าและหลักฐาน deployment อยู่ใน [คู่มือดูแลระบบ](deployment/README.md)
และ [deployment record](deployment/railway-state.json)
