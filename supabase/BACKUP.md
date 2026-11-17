# النسخ الاحتياطي

كل ليلة الساعة 3 الفجر (الرياض) يشتغل `.github/workflows/backup.yml` ويرفع إلى Cloudflare R2 (المخزن `devmenu-backups`):

- `db/YYYY-MM-DD.dump.age`: قاعدة الإنتاج كاملة (public + auth + storage)، مشفّرة. نحتفظ بآخر 30 يوم.
- `images/`: صور المنيو، تنضاف الجديدة فقط.

المفتاح الخاص لفك التشفير **ليس في GitHub ولا في R2**. نسخته الأصلية في `~/devmenu-backup-key.txt` على جهاز صاحب المشروع، ونسخة منه في مدير كلمات السر. بدونه ما ينفتح أي نسخة.

## الاسترجاع

1. نزّل الملف من Cloudflare: R2 ← devmenu-backups ← db ← اختر التاريخ ← Download.
2. فك التشفير:
   ```bash
   age -d -i ~/devmenu-backup-key.txt -o db.dump 2026-11-17.dump.age
   ```
3. جرّب على قاعدة التجربة أول (ما يمس الإنتاج):
   ```bash
   pg_restore --no-owner --no-privileges -n public --clean --if-exists -d "$STAGING_DB_URL" db.dump
   ```
4. استرجاع جدول واحد فقط (مثلاً بطاقات الولاء) إلى الإنتاج:
   ```bash
   pg_restore --no-owner --data-only -t loyalty_cards -f loyalty_cards.sql db.dump
   ```
   ثم راجع الملف وشغّله.

## تشغيل يدوي

GitHub ← Actions ← Nightly backup ← Run workflow.
