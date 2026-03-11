import "dotenv/config";
import { query } from "./connection.js";

async function ensureColumn(name, ddl) {
  const rows = await query(
    `SHOW COLUMNS FROM rio_women_volleyball_players LIKE '${name}'`
  );
  if (rows.length === 0) {
    await query(`ALTER TABLE rio_women_volleyball_players ADD COLUMN ${ddl}`);
    console.log(`Added column ${name}`);
  } else {
    console.log(`Column ${name} already exists, skip`);
  }
}

async function migrate() {
  console.log("Running migrate-rio-extend...");

  await ensureColumn(
    "avatar_url",
    "avatar_url VARCHAR(255) DEFAULT NULL COMMENT '头像照片URL'"
  );
  await ensureColumn(
    "gallery1_url",
    "gallery1_url VARCHAR(255) DEFAULT NULL COMMENT '风采照1'"
  );
  await ensureColumn(
    "gallery2_url",
    "gallery2_url VARCHAR(255) DEFAULT NULL COMMENT '风采照2'"
  );
  await ensureColumn(
    "gallery3_url",
    "gallery3_url VARCHAR(255) DEFAULT NULL COMMENT '风采照3'"
  );
  await ensureColumn(
    "honors",
    "honors TEXT DEFAULT NULL COMMENT '个人荣誉与代表性成绩'"
  );

  // 为示例数据补充一些可正常访问的头像 / 风采照 / 荣誉文案
  await query(`
    UPDATE rio_women_volleyball_players
    SET
      avatar_url = COALESCE(avatar_url, 'https://via.placeholder.com/160x160?text=%E6%9C%B1%E5%A9%B7'),
      gallery1_url = COALESCE(gallery1_url, 'https://via.placeholder.com/320x200?text=%E5%A5%B3%E6%8E%92+%E6%93%8D%E4%BD%9C'),
      honors = COALESCE(
        honors,
        '里约奥运会MVP，多次获世界女排大奖赛与世俱杯最佳主攻。'
      )
    WHERE name = '朱婷'
  `);

  await query(`
    UPDATE rio_women_volleyball_players
    SET
      avatar_url = COALESCE(avatar_url, 'https://via.placeholder.com/160x160?text=%E5%BC%A0%E5%B8%B8%E5%AE%81'),
      honors = COALESCE(
        honors,
        '里约奥运会冠军成员，技术全面的一传与后排保障型主攻。'
      )
    WHERE name = '张常宁'
  `);

  // 为经典赛事补充可播放的视频链接（这里统一指向一场完整比赛回放）
  await query(`
    UPDATE classic_volleyball_matches
    SET video_url = 'https://www.youtube.com/watch?v=IBc8v65hB7Q'
    WHERE video_url IS NULL OR video_url LIKE 'https://www.bilibili.com/video/BV1xxxxxxx%'
  `);

  console.log("migrate-rio-extend finished.");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

