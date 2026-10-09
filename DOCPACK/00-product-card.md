---
title: Awesome Atlas — Product Card
doc_id: CARD-awesome-atlas
doc_type: product-card
verdict: showcase
version: 0.1
date: 2026-10-09
status: ร่างเพื่อพิจารณา
owner: Product owner (Book Dev)
---

# Awesome Atlas — Product Card

## 1. สรุปคุณค่าในหนึ่งประโยค

ช่วยคนไทยค้นพบโปรเจกต์โอเพนซอร์สจาก GitHub Awesome lists ด้วยการค้นหา หมวดหมู่ การเปรียบเทียบลิสต์ และอันดับรายวัน โดยไม่ต้องมีบัญชีผู้ใช้

## 2. ปัญหาและผู้ใช้เป้าหมาย

- ปัญหา: Awesome lists กระจายอยู่หลายร้อย repository อ่านเป็น Markdown ยาว ๆ และเทียบกันข้ามลิสต์ไม่ได้
- ผู้ใช้: นักพัฒนาและผู้ที่กำลังเลือกเครื่องมือโอเพนซอร์ส — ผู้ใช้จริงตอนนี้ **[ต้องยืนยัน]**

## 3. สิ่งที่ทำได้จริงตอนนี้

- เว็บ `apps/awesome-web` (React 19 + Vite) อ่านข้อมูลผ่าน contract `awesome.v1` เท่านั้น
- API `services/awesome-api` ดึง README ของลิสต์ตามรอบ เก็บเป็น data lake ของตัวเอง และให้บริการ projects, sources, categories, comparison, mentions ranking และ daily archive
- Deploy บน Railway โปรเจกต์ `awesome-atlas` (สิงคโปร์) จาก repository นี้ ตาม `services/awesome-api/deployment/README.md`

## 4. หลักฐานสถานะ

| รายการ | ค่า (ตรวจจาก repository) |
|---|---|
| Stack | TypeScript (web), Python (API) |
| Commits | 5 (แรก 2026-10-04 → ล่าสุด 2026-10-09) |
| Source | ประมาณ 1,800 บรรทัด (ไม่รวมเทสต์) |
| Tests | 7 ไฟล์ |
| CI | ไม่มี |
| Deploy config | Railway (ตั้งผ่าน connector, บันทึกใน `railway-state.json`) |
| Live URL | `https://awesome-web-production.up.railway.app` |
| README | 62 บรรทัด |

## 5. คุณค่าและจุดต่าง

- แยกขาดจาก Solo Empire control plane: ไม่อ่านฐานข้อมูลส่วนกลาง ไม่มี provider token
- มุมรายได้: ยังไม่มี **[สมมติฐาน]** ใช้เป็นหลักฐาน portfolio ด้าน data product และ lake-first pipeline

## 6. ช่องว่างสำคัญ

- ข้อมูลยังไม่ครบ: รอบแรกอ่านสำเร็จ 12 จาก 679 ลิสต์ และ API data state เป็น `degraded` ณ เวลาที่บันทึก **[ต้องยืนยัน]** สถานะล่าสุด
- ไม่มี CI และไม่มีผู้ใช้ที่ยืนยันได้
- เอกสารระบบละเอียดอยู่ที่ `apps/awesome-web/DOCPACK/`

## 7. คำตัดสิน

**`showcase`** — ระบบออนไลน์และแยก boundary ชัด แต่ยังไม่มีผู้ใช้หรือรายได้ จะเปลี่ยนเป็น `invest` เมื่อมีผู้ใช้กลับมาใช้ซ้ำหรือข้อมูลครบทุกลิสต์อย่างเสถียร

## 8. ขั้นต่อไป

1. ตรวจ data state ล่าสุดบน Railway และบันทึกผล
2. เพิ่ม CI สำหรับเทสต์ web และ API
3. ตัดสินใจว่าจะเปิดสาธารณะหรือเก็บเป็น portfolio

## การอนุมัติ

| บทบาท | สถานะ | วันที่ | ลงนาม |
|---|---|---|---|
| Product owner (Book Dev) | รอพิจารณา | — | ________ |

## แหล่งข้อมูล

- `README.md`
- `apps/awesome-web/README.md`, `apps/awesome-web/DOCPACK/`
- `services/awesome-api/README.md`, `services/awesome-api/deployment/railway-state.json`
