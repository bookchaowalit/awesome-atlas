---
title: Awesome Atlas Data Source Inventory
status: pilot
created: 2026-10-04
updated: 2026-10-05
tags: [data-engineering, awesome, source-inventory]
description: ที่มา สิทธิ์การอ่าน ขอบเขต และความเสี่ยงของข้อมูลสาธารณะใน Awesome Atlas
---

# Data Source Inventory

แหล่งข้อมูลสาธารณะที่ Awesome Atlas อ่านและเผยแพร่ผ่าน API

## Document control

| Field | Value |
|---|---|
| Inventory ID/version | awesome-sources.v1 |
| Steward/owner | โมดูล awesome / awesome-api |
| Scope/domain | public GitHub repositories และ daily trending rankings |
| Status/review date | เตรียม hosted pilot บน Railway; รอสิทธิ์ source repository; 2026-10-05 |
| Catalog/evidence path | API sources, daily sources และ immutable capture manifests |

## Sources

| Source ID/name | Owner | Type/location | Data class | Permission/contract | Frequency/volume | Schema/change contact | Status |
|---|---|---|---|---|---|---|---|
| sindresorhus/awesome | sindresorhus | public README บน raw.githubusercontent.com | public | อ่าน anonymous HTTPS; [ต้นทาง](https://github.com/sindresorhus/awesome) และเครดิต/เงื่อนไขต้นทาง | root หนึ่งครั้งต่อรอบ | GitHub README และ repository issues | เปิด discovery |
| linked Awesome lists | เจ้าของแต่ละ repository | README ของ canonical GitHub repo ที่พบจาก root/ลิสต์ที่อ่านแล้ว | public | public read; แสดงที่มาและลิงก์กลับ repo; license ของแต่ละโปรเจกต์ยังเป็นของต้นทาง | สูงสุด 16 แหล่งต่อรอบ | source registry, README headings และ Markdown links | ทยอยอ่าน; แสดง coverage/error |
| antonkomarev/github-trending-archive | Anton Komarev | `archive/repository/YYYY/YYYY-MM-DD/(null).json` | public | [MIT repository](https://github.com/antonkomarev/github-trending-archive); อ่าน anonymous HTTPS | ย้อนหลังสูงสุด 7 วัน UTC ต่อรอบ | `{date, language:null, list:[owner/repo]}`; upstream repository issues | ใช้อันดับรวมทุกภาษา |

## Risk and action

| Source | Risk/gap | Required action | Owner | Due/review | Status |
|---|---|---|---|---|---|
| Awesome lists | รูปแบบ README แตกต่าง; รองรับเฉพาะ repository links ที่ parser อ่านได้ | แสดง coverage, เวลา และ error; เก็บ snapshot เดิมเมื่ออ่านไม่ได้ | awesome-api | เมื่อพบ format ใหม่ | ongoing |
| daily archive | ไม่มี stars, description หรือ language ราย repo; วันล่าสุดอาจยังไม่เผยแพร่ | เก็บ provider rank/date, ไม่เติมข้อมูลที่ไม่มี; แสดงวันที่และสถานะล่าสุด | awesome-api / awesome-web | ทุกรอบ sync | ongoing |
| ทุกแหล่ง | capture สะสมบน Railway volume และยังไม่มี managed backup | ติดตาม volume usage และกำหนด retention/backup; recovery ใช้ lake replay ตาม [runbook](../deployment/README.md) | ผู้ดูแลโมดูล awesome | ระหว่าง hosted pilot/ก่อนขยายการเก็บ | open; hosting และ durable volume ตั้งแล้ว |

## Approval

| Role | Name/date | Decision |
|---|---|---|
| Data steward | โมดูล awesome / 2026-10-04 | รับ public source inventory ตามคำขอผู้ใช้ |
| Security/privacy owner | parent agent scope review | จำกัด anonymous public reads และ read-only API; ไม่เพิ่ม credentials |
