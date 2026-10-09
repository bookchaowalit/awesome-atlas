---
title: Awesome Atlas Web — ภาพรวมระบบและสารบัญเอกสาร
doc_id: AWE-DOC-00
doc_type: overview
version: 0.1
date: 2026-10-07
status: ร่างเพื่อพิจารณา
owner: Product
audience: internal
related: 01-prd.md, 02-architecture.md, 03-nfr-security.md, 04-runbook.md
---

# Awesome Atlas Web — ภาพรวมระบบ

## สรุประบบ

`apps/awesome-web` (ชื่อแพ็กเกจ `awesome-atlas-web`) คือเว็บ SPA ภาษาไทยที่สร้างด้วย React 19 + Vite
สำหรับค้นพบโปรเจกต์โอเพนซอร์สจาก GitHub Awesome lists: ค้นหา เลือกหมวดหมู่ เปิดดูภายในลิสต์และหมวดย่อย
เปรียบเทียบรายการซ้ำระหว่างสองลิสต์ ดูอันดับ "พบในหลายลิสต์" และอันดับรายวันจาก GitHub Trending archive
และบุ๊กมาร์กใน browser ได้สูงสุด 200 รายการ เว็บอ่านข้อมูลผ่าน public contract `awesome.v1` ของ backend แยก
`services/awesome-api` เท่านั้น ไม่มีบัญชีผู้ใช้และไม่อ่านข้อมูลส่วนกลางของ Solo Empire

## สถานะปัจจุบัน

- สถานะใน `runtime-boundaries.yaml`: `extraction-pilot`, `extraction: pending`, `target_capability: awesome-discovery`
- Production บน Railway โปรเจกต์ `awesome-atlas` (region สิงคโปร์) ตาม README และ deployment README ของ `awesome-api`
  โดย web และ API deploy `SUCCESS` จาก repo แยก commit `34d71d0`
- ข้อมูลยังไม่ครบ: รอบแรกอ่านสำเร็จ 12 จาก 679 ลิสต์ และ API data state เป็น `degraded` ณ เวลาที่บันทึก **[ต้องยืนยัน]** สถานะล่าสุด
- `PRODUCT.md` ระบุว่า "ไม่อ้างว่ามี hosted deployment" ซึ่งขัดกับ README ที่ระบุว่าออนไลน์บน Railway **[ต้องยืนยัน]** ว่าเอกสารใดเป็นปัจจุบัน
- `service-deployments.yaml` ยังไม่มี entry ของ awesome **[ต้องยืนยัน]**

## ผู้ใช้หลัก

- นักพัฒนาและผู้สนใจเครื่องมือโอเพนซอร์สที่ต้องการค้นหาและเก็บโปรเจกต์ไว้กลับมาดู (ตาม `PRODUCT.md`)
- เจ้าของระบบ (owner คนเดียว) ในบทบาทผู้ดูแล deploy และข้อมูล

## รายการเอกสาร

| รหัส | ชื่อ | ไฟล์ | ผู้อ่าน |
|---|---|---|---|
| AWE-DOC-00 | ภาพรวมระบบและสารบัญเอกสาร | `00-overview.md` | ทุกคน |
| AWE-DOC-01 | Product Requirements (PRD) | `01-prd.md` | Product, ผู้พัฒนา |
| AWE-DOC-02 | System Architecture | `02-architecture.md` | Solution Architect, ผู้พัฒนา |
| AWE-DOC-03 | NFR และความปลอดภัย | `03-nfr-security.md` | Solution Architect, Security |
| AWE-DOC-04 | Runbook การติดตั้งและดูแลระบบ | `04-runbook.md` | DevOps, ผู้ดูแลระบบ |

## วิธีอ่าน

เริ่มที่ `01-prd.md` เพื่อเข้าใจเป้าหมายและขอบเขต ต่อด้วย `02-architecture.md` สำหรับการเชื่อมกับ `awesome-api`
จากนั้นอ่าน `03-nfr-security.md` และ `04-runbook.md` เมื่อจะ deploy หรือแก้ปัญหา ข้อความ **[ต้องยืนยัน]**
คือข้อเท็จจริงที่เจ้าของต้องยืนยัน ส่วน **[สมมติฐาน]** คือสมมติฐานทำงาน

## การอนุมัติ

| บทบาท | สถานะ | วันที่ | ลงนาม |
|---|---|---|---|
| Product owner | รอพิจารณา | — | ________ |

## แหล่งข้อมูล

- `apps/awesome-web/README.md`, `apps/awesome-web/PRODUCT.md`, `apps/awesome-web/DESIGN.md`, `apps/awesome-web/package.json`
- `repository-catalog/registries/runtime-boundaries.yaml` (`awesome`)
- `repository-catalog/registries/docpack-coverage.yaml` (`awesome-web`)
- `services/awesome-api/deployment/README.md`
