# Awesome Atlas

เว็บภาษาไทยสำหรับค้นพบโปรเจกต์จาก GitHub Awesome lists ผ่าน backend แยก
[`awesome-api`](../../services/awesome-api/) และ contract `awesome.v1`
ค้นหา เลือกหมวดหมู่ เปิด Awesome list เพื่อดูโปรเจกต์และหมวดย่อยใน README
เทียบรายการซ้ำระหว่างสองลิสต์ ดูอันดับการถูกอ้างถึงและอันดับรายวัน
ตรวจที่มา สลับรายการ/การ์ดและธีม
พร้อมบุ๊กมาร์กในเบราว์เซอร์ได้สูงสุด 200 รายการ

## รันในเครื่อง

เปิด backend ที่ `127.0.0.1:3510` ตาม README ของ API ก่อน
จากนั้นเปิด terminal อีกหน้าที่ directory นี้:

```bash
npm ci
npm run dev
```

เปิด <http://127.0.0.1:3500> เว็บ proxy `/api` ไปยัง backend จึงไม่ต้อง
เปิด CORS กว้างหรือส่ง credentials ให้ browser เปลี่ยน backend ได้ด้วย
`AWESOME_API_ORIGIN` ใน `.env.local` ตาม `.env.example`

หน้าเว็บตรวจข้อมูลใหม่ทุก 30 วินาที ส่วน worker ของ backend ดึงต้นทาง
ตามรอบ 30 นาที ปุ่มรีเฟรชโหลดข้อมูลจาก backend และไม่สั่ง scraping
บุ๊กมาร์กอยู่ใน browser ของผู้ใช้ ไม่มีบัญชีหรือการซิงก์ข้ามอุปกรณ์
จำนวนโปรเจกต์และเวลาซิงก์มาจาก API ไม่สร้างสถิติ stars/language ที่ยังไม่ได้ดึง

## ดูภายในลิสต์ เปรียบเทียบ และจัดอันดับ

ชื่อ Awesome list และที่มาในแต่ละการ์ดเปิดหน้ารายละเอียดในเว็บ ส่วนลิงก์
GitHub เปิดต้นทางแยกต่างหาก รายละเอียดแสดงทั้งโปรเจกต์และลิสต์ซ้อน
เลือกหมวดย่อยจากหัวข้อ README ได้เมื่อ backend อ่านหัวข้อแล้ว ลิสต์ที่
ยังไม่ถูกอ่านจะแสดงสถานะรอซิงก์และจะเติมข้อมูลตามรอบของ worker

หน้าเปรียบเทียบเลือกสองแหล่งจากรายการที่ค้นพบทั้งหมด ค้นหาชื่อลิสต์เพื่อ
ลดตัวเลือกได้ แล้วเลือกดูรายการซ้ำ เฉพาะ A เฉพาะ B หรือทั้งหมดรวมกัน
จำนวนสรุปและเปอร์เซ็นต์ซ้ำคำนวณก่อนกรองคำค้น โดยเปอร์เซ็นต์คือรายการ
ร่วมกันหารด้วยรายการรวม ระบบเตือนเมื่อแหล่งยังไม่ถูกอ่าน ซิงก์ผิดพลาด
หรือข้อมูลที่อ่านล่าสุดเกิน 24 ชั่วโมง
เพราะจำนวนศูนย์จากข้อมูลไม่ครบยังสรุปว่าไม่มีรายการร่วมกันไม่ได้

อันดับ “พบในหลายลิสต์” ใช้จำนวนแหล่ง Awesome ที่อ้างถึง repo เดียวกัน
ไม่นับลิงก์ซ้ำภายในแหล่งเดียวและไม่รวม `sindresorhus/awesome` ซึ่งเป็น
ลิสต์รวมหลัก จำนวนนี้ไม่ใช่คะแนนคุณภาพหรือ stars และขึ้นกับขอบเขตลิสต์
ที่อ่านแล้ว หน้าอันดับแสดงขอบเขตดังกล่าวพร้อมเลือกจำนวนลิสต์ขั้นต่ำได้

อันดับรายวันอ่าน snapshot จาก
[`antonkomarev/github-trending-archive`](https://github.com/antonkomarev/github-trending-archive)
ใช้วันที่ต้นทางตาม UTC และลำดับที่ archive บันทึก แม้ค้นหาหรือเปลี่ยนหน้า
ก็ยังแสดงเลขอันดับเดิม เลือกย้อนหลังได้เฉพาะวันที่ API มี snapshot
แสดงเครดิต เวลาอ่าน และสถานะข้อมูลล่าสุดแยกจากการตั้งใจดูย้อนหลัง
ต้นทางนี้ไม่ได้ให้จำนวน stars จึงไม่สร้างข้อมูลนั้นในหน้าเว็บ
การ์ดบอกจำนวนลิสต์ Awesome ที่พบ repo นั้น หรือ “ยังไม่พบในลิสต์ที่อ่านแล้ว”

หน้ารายละเอียด การเปรียบเทียบ และวันของอันดับมี URL query ที่คัดลอก
หรือโหลดใหม่ได้ เช่น `?view=list&source=atlas%2Fawesome-tools` หรือ
`?view=rankings&ranking=daily&date=2026-10-04` ปุ่ม Back ของเบราว์เซอร์
กลับจากลิสต์ซ้อนไปยังลิสต์และหมวดย่อยก่อนหน้าได้ คำค้นและเลขหน้าเป็น
สถานะชั่วคราวภายในแต่ละมุมมอง การเปลี่ยนวันหรือมุมมองเริ่มที่หน้าแรก

## ตรวจสอบและ build

```bash
npm test
npm run typecheck
npm run build
npm run preview
# ทั้งเว็บและ backend ต้องเปิดอยู่ และติดตั้ง Chromium สำหรับ Playwright
npx playwright install chromium
# เครื่อง Linux ต้องมี shared libraries ของ Chromium ด้วย
# ติดตั้งตามคำแนะนำของ Playwright: npx playwright install-deps chromium
npm run test:browser
```

## Railway

Production ใช้ Dockerfile ของเว็บ build `dist/` แล้วเสิร์ฟด้วย Caddy แยกจาก
`awesome-api` ในโปรเจกต์ Railway `awesome-atlas` โฮสต์อยู่สิงคโปร์
เว็บ proxy `/api/*` ไปยัง `http://awesome-api.railway.internal:3510` ขณะรัน
จึงใช้ API บน origin เดียวกับเว็บ โดยไม่ฝัง backend address ใน browser bundle
`/health` ตรวจ web process; `/api/v1/status` ตรวจสถานะข้อมูลและ worker

ตั้ง `PORT=3500` และ `AWESOME_API_ORIGIN` บน web service; ปิด app sleeping
และใช้หนึ่ง replica ตั้ง Dockerfile path เป็น `apps/awesome-web/Dockerfile`
โดย build จาก repository root รายละเอียด resource IDs, runtime settings
และผลตรวจออนไลน์อยู่ใน [deployment record](../../services/awesome-api/deployment/railway-state.json)
และ [คู่มือดูแลระบบ](../../services/awesome-api/deployment/README.md)

Dockerfile-specific allowlist ส่งเฉพาะ build inputs ของเว็บ ไม่ส่ง runtime,
ไฟล์ environment หรือข้อมูลที่ไม่ใช่ build inputs ไปใน image

## ขอบเขตข้อมูล

browser อ่านเฉพาะ public contract ไม่อ่าน SQLite, lake, secrets หรือข้อมูล
ของบริการอื่น Backend เก็บ GitHub raw README → landing → Bronze
Parquet → manifest ก่อนสร้าง operational projection ตาม
[คู่มือข้อมูลของ backend](../../services/awesome-api/README.md)
Original project names/descriptions และเครดิตของ Awesome list ยังคงตามต้นทาง
การรวมรายการไม่ได้เปลี่ยน license ของแต่ละโปรเจกต์
