---
title: Awesome Atlas Web — Runbook การติดตั้งและดูแลระบบ
doc_id: AWE-DOC-04
doc_type: runbook
version: 0.1
date: 2026-10-07
status: ร่างเพื่อพิจารณา
owner: DevOps
audience: internal
related: 00-overview.md, 02-architecture.md, 03-nfr-security.md
---

# Awesome Atlas Web — Runbook

## Environments

| Environment | URL/พอร์ต | หมายเหตุ |
|---|---|---|
| Local dev | `http://127.0.0.1:3500` | ต้องเปิด `awesome-api` ที่ `127.0.0.1:3510` ก่อน |
| Production | Railway `awesome-atlas` / `production` (สิงคโปร์) | URL ใน `apps/awesome-web/README.md` และ `services/awesome-api/deployment/railway-state.json` |

## วิธี build/deploy

```bash
cd apps/awesome-web
npm ci
npm run dev                 # local
npm test && npm run typecheck && npm run build
npm run test:browser        # ต้องเปิดเว็บ+API และติดตั้ง Chromium ของ Playwright
```

Production: Railway build จาก repository root ด้วย `apps/awesome-web/Dockerfile` เมื่อ push `main`
ของ source repo ที่เชื่อมไว้ (`bookchaowalit/awesome-atlas`) และมีการเปลี่ยน build inputs ของ service นี้
ไม่พบ task ใน `infra/tasks/*.yml` สำหรับแอปนี้ **[ต้องยืนยัน]** ว่าต้องเพิ่มหรือไม่

## Config/secret (ชื่อตัวแปรเท่านั้น)

| ตัวแปร | ใช้ที่ | ความหมาย |
|---|---|---|
| `AWESOME_API_ORIGIN` | Vite dev/preview, Caddy | origin ของ `awesome-api` |
| `PORT` | Caddy | พอร์ตเว็บ (ค่าเริ่มต้น 3500) |

เว็บไม่มีค่าลับ ค่า production อยู่ใน deployment record

## Health check

- `GET /health` → 200 `ok` (web process)
- `GET /api/v1/status` → JSON ที่มี `last_synced_at` และรอบซิงก์ 1800 วินาที
- ตรวจ projects/sources/หมวดย่อย/comparison/daily archive ผ่าน origin เดียวกัน

## Rollback

ใช้ deployment image ก่อนหน้าที่ผ่านการตรวจใน service เดิมบน Railway แล้วตรวจ `/health` และ `/api/v1/status` ซ้ำ

## Incident/troubleshooting

| อาการ | สาเหตุที่เป็นไปได้ | การแก้ |
|---|---|---|
| หน้าเว็บแสดง "API ตอบกลับ 5xx" | `awesome-api` ล่ม หรือ `AWESOME_API_ORIGIN` ผิด | ตรวจ service API และตัวแปร |
| ลิสต์แสดงสถานะรอซิงก์ | worker ยังไม่อ่านลิสต์นั้น | รอรอบซิงก์ 30 นาที ไม่ตีความว่ามีรายการศูนย์ |
| data state `degraded` | บางลิสต์ parse ไม่ได้ | ดู error ใน `/api/v1/status` |
| Playwright รันไม่ได้บน Linux | ขาด shared libraries ของ Chromium | `npx playwright install-deps chromium` |

## Backup/restore

เว็บไม่มีข้อมูลต้อง backup บุ๊กมาร์กอยู่ใน browser ของผู้ใช้และไม่มีการกู้คืนฝั่งเซิร์ฟเวอร์
ข้อมูลของ API ใช้ `python -m awesome_api.cli rebuild` ตาม `services/awesome-api/deployment/README.md`
และยังไม่มี managed backup **[ต้องยืนยัน]**

## การอนุมัติ

| บทบาท | สถานะ | วันที่ | ลงนาม |
|---|---|---|---|
| DevOps | รอพิจารณา | — | ________ |

## แหล่งข้อมูล

- `apps/awesome-web/README.md`, `apps/awesome-web/package.json`, `apps/awesome-web/vite.config.ts`, `apps/awesome-web/Caddyfile`
- `services/awesome-api/deployment/README.md`
