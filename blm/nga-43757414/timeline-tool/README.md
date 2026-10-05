# 黑魔时间轴本地版

本目录复制了 XIV in the Shell 的实际模拟器和时间轴，保留手动添加技能、资源检查、时间轴选择/编辑、导入记录和导出 PNG 等原站功能；另加中文序列导入和自动出图接口。

## 打开工具

双击 `启动时间轴.cmd`，然后访问 <http://127.0.0.1:8766/>。服务只监听本机。构建好的网页和图片均已保存在 `site/`，正常使用不需要联网或重新安装依赖；需要本机已有的 Node.js。`停止时间轴.ps1` 可停止由启动脚本启动的服务。

页面上方有“黑魔序列导入与出图”面板：

1. 点击“加载基准示例”，即可生成攻略图1中计入比较范围的13个GCD；另外显示即刻咏唱和星灵移位两个能力技。图首上一段结尾的A、D及填充异言没有放入这段计量窗口。
2. 继续使用原站技能按钮添加技能，或展开输入框写中文/英文序列，以箭头、逗号或换行分隔。支持 `F4×6` / `火4*6`；`A`、`U` 均是悖论，实际状态由模拟器决定。
3. 点击“替换当前时间轴并导入”，会替换当前轨道。未知技能或资源不足时会报错并恢复原记录。
4. 点击“导出完整时间轴 PNG”保存时间轴，或点击“导出释放顺序流程图”生成带技能图标、顺序箭头、GCD编号与AF/UI状态的流程图；也可以用原站的图片导出界面按选中范围导出。保存的 Record JSON 可以再次导入原站或本地副本。

“冰针”是灵极心资源，不是技能。JSON中的 `UMBRAL_HEART` 表示冰针数量，范围0–3；冰4给3根冰针。

## 基准示例与版本边界

示例输入为 `examples/baseline.json`，图片为 `examples/基准序列-时间轴.png`，并附原站兼容的 `.record.json` 和含逐技能时间的 `.timings.json`。

基准示例从1层灵极冰、1层冰悖论、1层火苗开始，满蓝；先即刻冰3，再冰4、U、移位、火3、6火4、A、耀星、绝望。配置为100级、420咏速、60 FPS、0.7秒能力技后摇，不开启黑魔纹。示例用来验证排图流程，不是起手推荐。

上游副本的模拟规则是 **7.5**，攻略正文是 **7.2**。示例复现攻略的技能排列，但当前模拟器的时间、威力、伤害和默认装备属性不能直接当作7.2攻略的计算结论。攻略中的13技能位、6846总威力和p值仍按攻略规则计算；模拟器还包含实际读条、后摇、咏速和FPS的影响。

## 让助手自动生成图片

以后给出技能顺序以及初始蓝量、冰火档位、冰针、火苗、悖论等必要条件，助手可以生成 JSON，并执行：

```powershell
node .\render-sequence.mjs .\examples\baseline.json .\examples\基准序列-时间轴.png
node .\render-sequence.mjs .\examples\ledgers\standard.json ..\images\ledger-standard.png --flow
```

脚本自动启动本地服务（如尚未运行）、调用同一模拟器、验证技能资源、等待图标加载，然后导出 PNG、Record JSON 和逐技能时间 JSON。临时启动的服务会在脚本退出时关闭。自动导出需要 Playwright 和 Chrome/Edge；当前 Codex 环境已配置。换机器可设置 `BLM_PLAYWRIGHT_PATH`（Playwright模块路径）和 `BLM_BROWSER_PATH`（浏览器路径），或在脚本所在目录安装 Playwright。时间轴图使用原站的Canvas导出函数，流程图使用同一份技能记录和图标绘制Canvas；均不依赖网页截图裁切。

攻略循环的5个输入保存在 `examples/ledgers/`：单体基准、起手、两段火阶段、双目标AOE、三目标AOE。执行 `node .\render-ledgers.mjs` 可重新生成 `../images/ledger-*.png`，检查GCD计数13／14／22／5／5，并把记录、逐技能信息与验证结果保存在输入旁。图题威力来自攻略7.2循环，未使用7.5模拟器的伤害结果。

JSON格式示例见 `examples/baseline.json`：

- `config`：咏速、FPS、倒计时、能力技后摇等模拟配置。
- `initialResources`：`MANA`蓝量，`ASTRAL_FIRE`火档位，`UMBRAL_ICE`冰档位，`UMBRAL_HEART`冰针，`FIRESTARTER`火苗，`PARADOX`悖论，`POLYGLOT`通晓等。
- `actions`：中文/英文技能数组；可使用 `{ "type": "Wait", "waitDuration": 1 }` 插入1秒等待。
- `export`：`wrapSeconds`每行秒数（0不换行），`scale`时间轴缩放（0.4表示40像素/秒），`pixelRatio`输出倍率（1–4），`includeTime`时间刻度，`theme`为`Light`或`Dark`。
- `flow`：`columns`每行技能数（4–10），`pixelRatio`输出倍率（1–4），`title`标题，`subtitle`初始条件等说明，`expectedGcd`循环预期技能位数。加 `--flow` 时按这些设置出流程图；蓝框为GCD，灰框为能力技，状态为该技能施放前的AF/UI。

## 源码、来源与构建

来源：<https://github.com/xivintheshell/xivintheshell>

固定上游提交：`08eb81788c343a684fd421a7955a4f0785f61868`。

上游源码位于 `upstream/`；原始MIT许可保存在 `upstream/LICENSE`，原作者版权声明保留。`site/` 是可以离线运行的构建文件和全部原站资源。Goldman字体也已下载到本地，附带原始OFL许可。当前新增改动：`LocalSequenceTools.tsx`、Main中的导入面板、对原图片导出函数增加导出声明、Vite输出目录调整、字体路径本地化，以及本地启动/自动出图脚本。依赖、日志与PID不进入版本控制。

重建：在 `upstream/` 执行 `npm ci`、`npm run typecheck`、`npm run build`，输出到 `site/`。不要用 `file://` 直接打开构建页，浏览器的模块与图片加载应通过上面的本机地址进行。
