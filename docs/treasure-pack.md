# Papertrails 四季宝藏

## 本地游玩

在项目目录运行：

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5273/`。准备礼物时按 **I** 导入 ZIP，导入成功后按 **Esc** 回到游戏。

- **Tab / E** 打开 Atlas。底图会直接用四个季节颜色的宝箱图标标记位置。顶部显示各季的方向或开启状态，已开启的宝箱图标会掀开箱盖。
- 靠近宝箱后按 **F** 开启或重看。冬日宝箱藏在圣诞树里，靠近整棵树即可触发提示。第一次读到信件时有拆信动画，之后打开可直接阅读。
- 主角随地貌更换四套洛丽塔服装和四把洋伞。松林沿用秋装。按 **N** 切换昼夜，白天撑伞，夜里收伞作手杖。
- 探索和查看地图时，鼠标旁会显示当前季节的花朵、太阳、枫叶或雪花。
- **Esc** 或弹窗内的关闭按钮回到游戏。
- 导入前发现或开启的宝箱会记录进度。成功导入后，重新打开相应宝箱即可查看内容。

礼物包保存在当前浏览器的 IndexedDB。开箱和探索进度保存在同一浏览器的本地存档，按地图种子区分。用固定的本地地址和端口游玩可以继续使用同一份数据。重新导入成功后，旧礼物包整体替换，开箱进度继续保留。导入失败会保留上一份礼物包。

## ZIP 格式

把 `manifest.json` 和 `images` 文件夹直接放在 ZIP 根目录。图片路径按 ZIP 内的大小写填写，使用 `/` 分隔。

```text
treasure-pack.zip
├── manifest.json
└── images/
    ├── spring.webp
    ├── summer.jpg
    ├── autumn.png
    └── winter.webp
```

下面展示字段结构。导入前请换成你自己的标题、正文和照片。

```json
{
  "format": "papertrails-treasure-pack",
  "version": 1,
  "title": "填入宝藏包标题",
  "treasures": {
    "spring": { "title": "春日标题", "message": "春日正文", "image": "images/spring.webp" },
    "summer": { "title": "夏日标题", "message": "夏日正文", "image": "images/summer.jpg" },
    "autumn": { "title": "秋日标题", "message": "秋日正文", "image": "images/autumn.png" },
    "winter": {
      "title": "冬日标题",
      "photo": "images/winter.webp",
      "letter": {
        "salutation": "信件称呼",
        "paragraphs": ["第一段正文", "第二段正文"],
        "signature": "信件落款"
      }
    }
  }
}
```

| 项目 | 支持范围 |
| --- | --- |
| 压缩包 | 普通 ZIP，最多 20 MiB，解压后合计最多 40 MiB，共 20 个条目，含目录 |
| 图片 | PNG、JPEG、WebP。单张最多 12 MiB，宽高各不超过 4096 像素 |
| JSON | UTF-8，版本 1，最大 128 KiB |
| 文字 | 标题、称呼和落款最多 140 字符，春夏秋正文各最多 2000 字符，冬季 1 至 30 段且每段最多 2400 字符 |

## 配置和验证

- `src/core/config/game.js` 的 `treasures` 配置季节对应的生物群系、地图提示、交互距离，以及冬季开箱是否要求先打开前三季。默认可直接打开冬季宝箱。
- `src/core/config/animals.js` 的 `companion` 配置两只猫的毛色、后方队形、休息和追赶距离。
- `npm run build` 验证生产构建。 `npm run test:browser` 使用本机 Chromium 浏览器与临时浏览器数据目录执行测试。可用 `PAPERTRAILS_CHROME` 指定浏览器的可执行文件路径，或用 `PAPERTRAILS_TEST_ARTIFACTS` 指定截图输出目录。
- 浏览器测试覆盖双猫状态及跨生物群系、四季宝箱落点和折叠、首次开启与重读、ZIP 校验和替换、冬季信件与照片、圣诞树，以及正式页面键鼠交互和刷新后的存档。长距离旅行的交互回归用测试定位到各宝箱，保留真实地图、地块和弹窗逻辑。
