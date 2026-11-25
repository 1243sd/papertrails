# Papertrails 四季宝藏

## 本地游玩

在项目目录运行：

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5273/`。准备礼物时按 **I** 导入 ZIP，导入成功后按 **Esc** 回到游戏。

- **Tab / E** 打开 Atlas。底图会直接用四个季节颜色的宝箱图标标记位置。顶部显示各季的方向或开启状态，已开启的宝箱图标会掀开箱盖。
- 靠近宝箱后按 **F** 开启或重看。冬日宝箱藏在圣诞树里，开启后进入全屏故事书。「爱的印记」可以浏览照片和视频。点击照片相框可放大，点击带播放标记的相框可播放视频。「冬日来信」首次打开会拆信并逐行显示正文，可选择「显示全文」或「合上信纸」。
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
├── images/
│   ├── spring.webp
│   ├── summer.jpg
│   ├── autumn.png
│   ├── chat-sticker.png
│   ├── first-meeting.jpg
│   └── winter.webp
└── videos/
    └── winter.mp4
```

下面展示字段结构。导入前请换成你自己的标题、正文和照片。

```json
{
  "format": "papertrails-treasure-pack",
  "version": 3,
  "title": "填入宝藏包标题",
  "treasures": {
    "spring": { "title": "春日标题", "message": "春日正文", "image": "images/spring.webp" },
    "summer": { "title": "夏日标题", "message": "夏日正文", "image": "images/summer.jpg" },
    "autumn": {
      "title": "秋日标题",
      "message": "秋日正文",
      "image": "images/autumn.png",
      "memories": {
        "firstChat": { "sticker": "images/chat-sticker.png" },
        "firstMeeting": { "photos": [{ "image": "images/first-meeting.jpg", "caption": "那天的照片" }] },
        "newYear": { "photos": [] },
        "livingTogether": { "photos": [] },
        "letter": { "paragraphs": ["秋日来信的正文"] }
      }
    },
    "winter": {
      "title": "冬日标题",
      "photos": [
        { "image": "images/winter.webp", "caption": "填入这张照片的说明" }
      ],
      "videos": [
        { "video": "videos/winter.mp4", "caption": "填入这段视频的说明" }
      ],
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
| JSON | UTF-8，版本 1、2 或 3，最大 128 KiB |
| ZIP 图片文件数 | 版本 2 最多 9 张，版本 3 最多 16 张 |
| 秋季回忆 | 版本 3 支持一张聊天贴纸，见面、跨年、同居三个章节各最多 2 张照片。照片说明可省略，每条最多 320 字符 |
| 冬季照片 | 版本 2 和 3 最多 6 张，每张说明最多 320 字符 |
| 冬季视频 | 版本 2 和 3 最多 3 段 MP4 或 WebM，放在 ZIP 根目录的 `videos/` 下，单段最多 18 MiB，每段说明最多 320 字符 |
| 文字 | 标题、称呼和落款最多 140 字符，春夏秋正文各最多 2000 字符，秋季来信最多 30 段，冬季来信 1 至 30 段。每段最多 2400 字符 |

版本 3 可省略整个 `autumn.memories` 或其中任意章节。提供照片章节时填写 `photos` 数组，提供来信时填写 `paragraphs` 数组。两种数组都可以为空，来信的 `salutation` 和 `signature` 可省略。贴纸和照片均使用 ZIP 内 `images/` 下的路径。

如果同时使用 16 张图片和 3 段视频，媒体文件和 `manifest.json` 已占满 20 个条目。打包时保留媒体的文件夹路径即可，可以省去单独的目录条目。

版本 1 使用 `winter.photo` 指定单张照片，并要求填写信件。版本 2 和 3 的冬季至少提供一张照片或一段视频，也可以同时提供两种。可以先省略 `winter.letter`，等信件准备好后再导入完整 ZIP。视频会使用浏览器支持的编码在本地播放。

## 配置和验证

- `src/core/config/game.js` 的 `treasures` 配置季节对应的生物群系、地图提示、交互距离，以及冬季开箱是否要求先打开前三季。默认可直接打开冬季宝箱。
- `src/core/config/animals.js` 的 `companion` 配置两只猫的毛色、后方队形、休息和追赶距离。
- `npm run build` 验证生产构建。 `npm run test:browser` 使用本机 Chromium 浏览器与临时浏览器数据目录执行测试。可用 `PAPERTRAILS_CHROME` 指定浏览器的可执行文件路径，或用 `PAPERTRAILS_TEST_ARTIFACTS` 指定截图输出目录。
- 浏览器测试覆盖双猫状态及跨生物群系、四季宝箱落点和折叠、首次开启与重读、ZIP 校验和替换、冬季信件与照片、圣诞树，以及正式页面键鼠交互和刷新后的存档。长距离旅行的交互回归用测试定位到各宝箱，保留真实地图、地块和弹窗逻辑。
