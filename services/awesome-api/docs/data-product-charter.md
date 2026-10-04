---
title: Awesome Atlas Data Product Charter
status: pilot
created: 2026-10-04
updated: 2026-10-05
tags: [data-engineering, awesome, public-data]
description: ขอบเขตข้อมูล Awesome lists และอันดับ GitHub Trending รายวันสำหรับ Awesome Atlas
---

# Data Product Charter

ขอบเขตข้อมูลสำหรับ repository `bookchaowalit/awesome-atlas`

## Document control

| Field | Value |
|---|---|
| Data product ID/version | awesome-catalog / awesome.v1 additive extension |
| Product owner | Awesome Atlas / bookchaowalit |
| Data owner/steward | awesome-api; ไม่เขียนฐานข้อมูลของ service อื่น |
| Producer team | worker ใน awesome-api |
| Status/review date | hosted pilot ออนไลน์บน Railway; ยังทยอยซิงก์ลิสต์; 2026-10-05 |
| Evidence boundary | service tests, service lake, API contract และ [deployment record](../deployment/railway-state.json) |

## Product contract

- Decision or user outcome: เปิดดูโปรเจกต์ใน Awesome list เทียบรายการซ้ำ และแยกอันดับตามการแนะนำในลิสต์ออกจากอันดับ Trending รายวัน
- Consumers and use cases: awesome-web อ่าน public API; CLI สร้าง projection กลับจากสำเนาต้นทาง
- Source systems and lake layers: [source inventory](source-inventory.md); HTTPS ต้นทาง → immutable landing → Bronze Parquet → manifest → SQLite → read-only API
- Grain: Awesome membership หนึ่งแถวต่อ source/repository โดยรวมหมวดย่อย; อันดับหนึ่งแถวต่อ provider/date/repository พร้อมลำดับจาก provider
- In scope/out of scope: public README และรายชื่ออันดับ; ไม่ดึง source code, credentials, ข้อมูลส่วนตัว หรือสร้างคะแนนคุณภาพ/ดาวที่ต้นทางไม่มี
- Freshness, availability, and volume expectation: รอบพัก 30 นาทีหลัง sync; Awesome ไม่เกิน 16 แหล่งต่อรอบและหมุนอย่างเป็นธรรม; daily อ่านย้อนหลังไม่เกิน 7 วัน UTC ต่อรอบ การอ่านครบทุกลิสต์ต้องใช้หลายรอบ
- Data classification, residency, retention, and access: public; local filesystem หรือ Railway volume ของ service ในสิงคโปร์; retention class `operational`, pilot รักษาทุก committed capture ไม่มีงานลบอัตโนมัติ Browser อ่านได้เฉพาะ API
- Quality thresholds and incident route: canonical repository IDs, source/date ที่ตรงกัน, nonempty captures และ checksums ต้องผ่านก่อนแทน projection; error ต้องมองเห็นและรักษาข้อมูลสำเร็จเดิม
- Cost/capacity guardrail: อ่าน GitHub โดยไม่ใช้ token; จำกัด timeout/ขนาดต่อการดึงและจำนวนแหล่งต่อรอบ ไม่รับ URL จาก browser ไปดึงเอง Railway คิด usage ในบัญชีที่มีอยู่ตามคำขอ deploy; จำกัด API 0.5 GB RAM/1 vCPU และเว็บ 0.25 GB RAM/0.5 vCPU, หนึ่ง replica ต่อ service
- Versioning, deprecation, and migration policy: HTTP v1 เพิ่ม fields/queries/endpoints; schema ใหม่ต้องอ่าน manifest เก่าได้และ replay ใน tests ก่อนเปลี่ยน

## Acceptance and ownership

| Gate | Evidence | Owner | Result/status |
|---|---|---|---|
| Contract | [awesome.v1](../contracts/awesome.v1.md) และ tests | awesome-api | ตรวจในชุดทดสอบของ service |
| Quality | parser, deduplication, comparison, snapshot, failure/replay tests | awesome-api | ต้องผ่านก่อน commit |
| Lineage | manifest ผูก source, raw/Bronze checksums, capture time และ snapshot date | awesome-api | lake เป็นจุดอนุญาตให้เขียน projection |
| Access/privacy | public fixed-host reads, read-only browser API, ignored runtime | awesome-api | ไม่มี secret ingress |
| Operations | [README](../README.md), [Railway runbook](../deployment/README.md), CLI sync/status/rebuild | ผู้ดูแลโมดูล awesome | หนึ่ง process, volume เก็บข้อมูลข้าม deploy; ไม่มี managed backup หรือ hosted SLA ที่รับรองเอง |

## Approval

| Role | Name/date | Decision |
|---|---|---|
| Product/data owner | คำขอผู้ใช้ 2026-10-04 | อนุญาตให้พัฒนา local pilot และเพิ่มข้อมูลอันดับสาธารณะ |
| Hosted deployment | คำขอผู้ใช้ 2026-10-05 เวลาไทย | อนุญาต deploy เว็บ/backend บน Railway แทน Render |
| Producer owner | โมดูล awesome | คง lake/projection ภายใน service |
| Consumer representative | awesome-web | ตรวจการใช้ contract ผ่าน browser tests |

Deployment target คือ Railway; ผลออนไลน์และ resource IDs อยู่ใน deployment record
ตั้ง volume สำหรับ lake/projection ข้าม restart แล้ว แต่ยังไม่ได้ทดสอบหยุด/เริ่มบริการจริง
ต้องติดตามพื้นที่และกำหนด
retention/backup เพิ่ม การ deploy ไม่เปลี่ยนเงื่อนไขการอ่านต้นทางหรือสิทธิ์ของข้อมูล
