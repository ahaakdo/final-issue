import "dotenv/config";
import { query } from "./connection.js";

async function migrate() {
  console.log("Running migrate-rio-classic...");

  // 创建女排专栏表
  await query(`
    CREATE TABLE IF NOT EXISTS rio_women_volleyball_players (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL COMMENT '姓名',
      position VARCHAR(50) NOT NULL COMMENT '位置',
      number TINYINT NOT NULL COMMENT '球衣号码',
      birthday DATE DEFAULT NULL COMMENT '出生日期',
      height_cm INT DEFAULT NULL COMMENT '身高cm',
      club VARCHAR(100) DEFAULT NULL COMMENT '当时俱乐部',
      intro TEXT DEFAULT NULL COMMENT '个人简介',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='女排里约奥运会阵容';
  `);

  // 创建经典赛事表
  await query(`
    CREATE TABLE IF NOT EXISTS classic_volleyball_matches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL COMMENT '比赛标题',
      event_name VARCHAR(100) NOT NULL COMMENT '赛事名称',
      match_date DATE DEFAULT NULL COMMENT '比赛日期',
      opponent VARCHAR(100) DEFAULT NULL COMMENT '对手',
      round VARCHAR(100) DEFAULT NULL COMMENT '阶段',
      video_url VARCHAR(255) DEFAULT NULL COMMENT '视频地址',
      description TEXT DEFAULT NULL COMMENT '比赛简介',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='经典女排赛事';
  `);

  // 仅在表为空时插入示例数据，避免重复
  const [rioCount] = await query(
    "SELECT COUNT(*) AS cnt FROM rio_women_volleyball_players"
  );
  if (rioCount.cnt === 0) {
    await query(`
      INSERT INTO rio_women_volleyball_players
        (name, position, number, birthday, height_cm, club, intro)
      VALUES
        ('朱婷', '主攻', 2, '1994-11-29', 198, '瓦基弗银行俱乐部', '中国女排核心主攻，里约奥运会MVP，以强劲的进攻火力和全面能力著称。'),
        ('张常宁', '主攻/接应', 9, '1995-11-06', 195, '江苏中天钢铁女排', '攻防兼备的主攻手，在里约奥运会中承担重要的一传与进攻任务。'),
        ('惠若琪', '主攻', 12, '1991-03-04', 192, '江苏中天钢铁女排', '队长之一，以稳定的一传、防守和串联能力闻名，是球队的“定海神针”。'),
        ('袁心玥', '副攻', 1, '1996-12-21', 201, '八一深圳女排', '身高出众的副攻，拦网和快攻能力突出，是中国女排网口高度的重要保障。'),
        ('徐云丽', '副攻', 8, '1987-08-02', 196, '福建阳光城女排', '经验丰富的副攻，以出色的拦网判断和比赛阅读能力见长。'),
        ('颜妮', '副攻', 17, '1987-03-01', 192, '辽宁女排', '以“北长城”著称的拦网高手，多次在关键比赛中凭借拦网改变走势。'),
        ('魏秋月', '二传', 3, '1988-09-26', 182, '天津渤海银行女排', '中国女排二传核心之一，传球节奏感极佳，是球队战术组织的关键。'),
        ('丁霞', '二传', 6, '1990-01-13', 180, '辽宁女排', '作风顽强的二传，以灵动多变的传球和防守覆盖见长。'),
        ('林莉', '自由人', 15, '1992-07-15', 171, '福建阳光城女排', '世界级自由人，防守范围大，一传稳定，是后排防守的核心。'),
        ('龚翔宇', '接应', 7, '1997-04-21', 186, '江苏中天钢铁女排', '里约周期崭露头角的年轻接应，以稳定发挥赢得“关键先生”称号。'),
        ('刘晓彤', '主攻', 10, '1990-02-16', 188, '北京汽车女排', '替补奇兵型主攻，多次在关键时刻顶住压力，贡献发球和进攻。'),
        ('杨方旭', '接应', 16, '1994-10-06', 190, '山东体彩女排', '力量型接应，发球和强攻能力突出，为球队提供火力支持。')
    `);
    console.log("Inserted sample rio_women_volleyball_players data.");
  } else {
    console.log("rio_women_volleyball_players already has data, skip seed.");
  }

  const [matchCount] = await query(
    "SELECT COUNT(*) AS cnt FROM classic_volleyball_matches"
  );
  if (matchCount.cnt === 0) {
    await query(`
      INSERT INTO classic_volleyball_matches
        (title, event_name, match_date, opponent, round, video_url, description)
      VALUES
        ('中国女排 vs 塞尔维亚 · 里约奥运会决赛', '2016 里约奥运会', '2016-08-20', '塞尔维亚女排', '决赛', 'https://www.bilibili.com/video/BV1xxxxxxx1', '中国女排在先失一局的不利局面下连扳三局，逆转战胜塞尔维亚，时隔12年再夺奥运金牌。'),
        ('中国女排 vs 荷兰 · 里约奥运会半决赛', '2016 里约奥运会', '2016-08-18', '荷兰女排', '半决赛', 'https://www.bilibili.com/video/BV1xxxxxxx2', '面对此前小组赛曾输给的对手荷兰队，中国女排顶住压力，3:1赢下关键之战，挺进决赛。'),
        ('中国女排 vs 巴西 · 里约奥运会四分之一决赛', '2016 里约奥运会', '2016-08-16', '巴西女排', '1/4决赛', 'https://www.bilibili.com/video/BV1xxxxxxx3', '在马拉卡纳吉诺体育馆，上演“生死战”，中国女排3:2淘汰东道主巴西，堪称经典之战。'),
        ('中国女排 vs 美国 · 世界女排大奖赛总决赛', '2015 世界女排大奖赛', '2015-07-25', '美国女排', '总决赛', 'https://www.bilibili.com/video/BV1xxxxxxx4', '与美国队的较量展现了双方高水平的对抗，中国女排在落后的情况下不断追分，打出世界级回合。'),
        ('中国女排 vs 俄罗斯 · 世锦赛经典大战', '2014 女排世锦赛', '2014-10-08', '俄罗斯女排', '小组赛', 'https://www.bilibili.com/video/BV1xxxxxxx5', '面对老牌劲旅俄罗斯队，中国女排展现年轻活力，通过快速多变的战术取得比赛胜利。')
    `);
    console.log("Inserted sample classic_volleyball_matches data.");
  } else {
    console.log("classic_volleyball_matches already has data, skip seed.");
  }

  console.log("migrate-rio-classic finished.");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

