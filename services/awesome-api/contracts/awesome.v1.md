# Awesome API v1

API อ่านข้อมูล GitHub Awesome แบบ public ไม่ต้องมี token และไม่มี endpoint สำหรับเขียนหรือสั่ง sync จาก browser
ข้อมูลมาจาก README ของ repository ที่ปรากฏใน `sindresorhus/awesome` โดยใช้ GitHub repository URL ที่ตรวจสอบแล้วเท่านั้น

| GET path | ผลลัพธ์ |
| --- | --- |
| `/health` | `{status: "ok", service: "awesome-api"}` แสดงว่าอ่าน SQLite ได้ |
| `/api/v1/projects` | `{items, total, limit, offset}` |
| `/api/v1/categories` | `{items: [{id, name, count}]}` |
| `/api/v1/sources` | `{items: [{id, name, owner, url, category, project_count, last_synced_at, error}]}` |
| `/api/v1/compare` | `{items,total,limit,offset,left,right,shared_count,left_only_count,right_only_count,union_count,overlap_percent}` |
| `/api/v1/daily/sources` | `{items: [{id,name,url,description,last_synced_at,latest_date,error,dates}]}` |
| `/api/v1/daily` | `{items:[{rank,project,source_count}],total,limit,offset,source,date,captured_at}` |
| `/api/v1/status` | สถานะการดึงข้อมูลและความครอบคลุมตามตารางด้านล่าง |

`/api/v1/projects` รองรับ `q` (ค้นหา name/owner/description, สูงสุด 256 ตัวอักษร), `category` (slug), `source` (owner/repo),
`kind=project|list|all` (ค่าเริ่มต้น `project`), `sort=recent|name|mentions` (ค่าเริ่มต้น `recent`), `limit=1..100` (ค่าเริ่มต้น 30),
`offset>=0` (ค่าเริ่มต้น 0) และ `ids=owner/repo,owner/repo` (สูงสุด 200 IDs)
เพิ่ม `min_sources=0..1000` (ค่าเริ่มต้น 0) และ `section` สำหรับชื่อ heading ตรงตัว (ไม่ใช่ slug)
heading ตัด HTML tags/normalize ช่องว่างและจำกัด 256 ตัวอักษรก่อนบันทึก; section query จำกัดเท่ากัน ให้ใช้ชื่อที่ source.sections คืนมา
ใช้ `source` ร่วมกับ `section` เพื่อกรองหมวดย่อยภายในลิสต์นั้น
การค้นหา `%` และ `_` ใช้เป็นตัวอักษรธรรมดา; ตัวกรองทำงานร่วมกันแบบ AND
ค่า `ids` ที่ผิดรูปแบบหรือเกิน 200 คืน HTTP 400; query ที่ผิดชนิด/ขอบเขตคืน HTTP 422

```json
{
  "id": "owner/repo",
  "name": "ชื่อเดิมจากลิงก์ใน README",
  "owner": "owner",
  "description": "ข้อความอธิบายเดิมจาก README",
  "url": "https://github.com/owner/repo",
  "categories": ["developer-tools"],
  "source_ids": ["owner/awesome-list"],
  "source_count": 1,
  "sections": ["Command line tools"],
  "kind": "project",
  "discovered_at": "2026-10-04T00:00:00+00:00",
  "updated_at": "2026-10-04T00:00:00+00:00",
  "stars": null,
  "language": null
}
```

`id` เป็น lowercase owner/repo; `name` และ `description` รักษาข้อความต้นฉบับรวม Markdown ที่มีอยู่
description จำกัด 2,000 ตัวอักษรและ name จำกัด 200; README ฉบับเต็มเก็บใน landing
`discovered_at` คือเวลาที่ service พบครั้งแรก และ `updated_at` คือเวลาที่ snapshot ถูกนำเข้า service ล่าสุด
`recent` เรียงตามเวลานำเข้า snapshot ไม่ใช่ commit หรือ release ล่าสุดของโครงการ
หลายรายการที่อ้างถึง repository เดียวกันรวมเป็นรายการเดียวพร้อมหมวดหมู่และแหล่งอ้างอิงทั้งหมด
`source_count` นับ active Awesome sources แบบไม่ซ้ำ ไม่รวม `sindresorhus/awesome`
repo ที่ปรากฏหลาย sections ในลิสต์เดียวกันเพิ่มจำนวน mentions เพียงหนึ่งครั้ง
`sort=mentions` เรียง source_count มากไปน้อย แล้ว id; เป็นความซ้ำในลิสต์ที่เก็บแล้ว ไม่ใช่คุณภาพหรือจำนวน stars
`sections` รวม headings ที่ repository นั้นอยู่; เมื่อกรอง source จะคืน headings เฉพาะ source นั้น
source sections รองรับ ATX H1–H6 และ Setext ที่มี underline `=` หรือ `-` ถัดจากชื่อหัวข้อบรรทัดเดียว
root categories ใช้ ATX H2–H6 ตามเดิม; fenced code, bullet/table separators และ horizontal rules ไม่ถูกแปลงเป็น sections
Source เพิ่ม `item_count` รวม project/list และ `sections:[{name,count}]` ที่นับ repository ไม่ซ้ำในแต่ละ heading
source ใหม่จาก nested list มี last_synced_at=null และ item_count=0 จนกว่าจะดึงสำเร็จ
เมื่อส่ง ids ชัดเจน จะ resolve repository ที่รู้จักจาก daily snapshots ด้วยสำหรับรายการบันทึก
repo ที่ไม่มี active Awesome membership ใช้ fallback จาก snapshot ล่าสุดที่มี repo นั้น โดยมี source_count=0 และ memberships ว่าง
q/kind/category/source/section/min_sources ยังทำงานร่วมกัน; category/source/section หรือ min_sources>0 จะไม่รวม daily-only fallback
ผลลัพธ์สองแหล่งรวมก่อน sort/pagination; การค้นหาปกติที่ไม่ส่ง ids และจำนวน catalog ยังนับเฉพาะ Awesome
`stars` และ `language` เป็น `null` เพราะการดึง README ไม่ให้ข้อมูล GitHub metadata เหล่านี้
`kind=list` ได้แก่รายการใน root catalog และ repository ที่ชื่อมีคำว่า `awesome` คั่นด้วย `-`, `_` หรือ `.`

## เปรียบเทียบ Awesome lists

`GET /api/v1/compare?left=owner/list-a&right=owner/list-b` ต้องระบุ active Awesome sources สองรายการที่ต่างกัน
รองรับ `mode=shared|left_only|right_only|all` (ค่าเริ่มต้น shared), `kind=all|project|list` (ค่าเริ่มต้น all), q, limit และ offset
source IDs รับ case-insensitive; source ผิดรูปแบบหรือซ้ำคืน 400; source ไม่รู้จัก/inactive รวม root catalog คืน 404
source ที่ลงทะเบียนแล้วแต่ยังไม่ sync ใช้เปรียบเทียบได้โดยมีรายการว่างและ timestamp=null
items เป็น Project เรียง mentions มากไปน้อย แล้ว id; left/right เป็น Source ตาม `/sources`
total นับหลัง mode/kind/q ก่อน pagination; shared_count/left_only_count/right_only_count/union_count คำนวณตาม kind โดยไม่ขึ้นกับ q
`overlap_percent=shared_count/union_count*100` ปัดสองตำแหน่ง และเป็น 0 เมื่อ union ว่าง
Project.sections รวมเฉพาะ headings ของ sources สองรายการ แต่ source_count ยังนับ active Awesome sources ทั้งหมด

## อันดับ repository รายวัน

แหล่งที่รองรับคือ `antonkomarev/github-trending-archive` จาก public JSON path `archive/repository/YYYY/YYYY-MM-DD/(null).json`
`/daily` รับ source (ค่าเริ่มต้นแหล่งนี้), date เป็นวันที่จริงรูป YYYY-MM-DD, q, limit=1..100 และ offset>=0
source ไม่รู้จักคืน 404, source ผิดรูปแบบคืน 400, date หรือ pagination ไม่ถูกต้องคืน 422
ไม่ระบุ date ใช้วันของ snapshot ล่าสุดที่มีจริง; ก่อนมีข้อมูล date/captured_at เป็น null และรายการว่าง
วันที่ที่ยังไม่มี snapshot แต่ระบุชัดคืน date ตามที่ขอและ captured_at=null
DailySource.dates เรียงใหม่ไปเก่า; latest_date เป็นวัน snapshot ไม่ใช่เวลา fetch
rank เป็น index+1 จาก provider; repo ซ้ำตาม canonical ID เก็บ occurrence แรก จึงอาจมี rank ข้ามเลข
project ใช้ metadata/memberships ปัจจุบันเมื่อมี active Awesome membership
repo นอก Awesome ใช้ชื่อจาก repo, description ว่าง, categories/source_ids/sections ว่าง, source_count=0 และ timestamps จาก capture
stars/language เป็น null เสมอ; items.source_count เท่ากับ project.source_count
q ค้นหา name/owner/description แบบ literal โดยไม่จัด rank ใหม่หลังกรองหรือ pagination
worker ดึงล่าสุด 7 วัน UTC; 404 ข้ามโดยไม่ลบ snapshot เดิม ส่วน malformed/date mismatch/network/lake failures แสดง source error
daily storage แยกจาก Awesome graph; root refresh ไม่ปิดข้อมูลรายวัน
อันดับ archive แยกจากอันดับ mentions และไม่ใช่จำนวน stars ปัจจุบันจาก GitHub API

| Status field | ความหมาย |
| --- | --- |
| `state` | `idle`, `syncing` หรือ `degraded` เมื่อยังมี source error |
| `last_synced_at` | เวลาจบรอบล่าสุดที่มี capture สำเร็จอย่างน้อยหนึ่งแหล่ง; `null` ก่อนมีข้อมูล |
| `next_sync_at` | เวลารอบถัดไปของ worker ขณะรัน service; `null` เมื่อปิด worker หรือใช้ CLI |
| `sync_interval_seconds` | ช่วงพักหลังจบรอบ ค่าเริ่มต้น 1,800 วินาที |
| `project_count`, `list_count`, `category_count` | จำนวนรายการปัจจุบันใน projection |
| `sources_synced`, `sources_total` | จำนวนรายการจาก root ที่เคย sync สำเร็จเทียบกับแหล่งทั้งหมด; ไม่รวม root |
| `last_error` | สรุป source errors สูงสุด 1,000 ตัวอักษร หรือ `null` |

category `count` และ source `project_count` นับเฉพาะ `kind=project` ไม่รวม Awesome lists
`last_synced_at` ของแต่ละ source คือ snapshot สำเร็จล่าสุด; `error` ระบุการดึงล่าสุดที่ล้มเหลว
source ที่มี error ยังให้ข้อมูลจาก snapshot สำเร็จเดิมได้
timestamps ใช้ ISO 8601 UTC; service ไม่รับรองว่าทุกรายการใน GitHub เป็นโครงการที่ยัง active หรือพร้อมใช้งานจริง

รายละเอียดการบันทึกต้นทางและ projection อยู่ใน [คู่มือ backend](../README.md)
