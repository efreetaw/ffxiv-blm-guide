// Local additions to the MIT-licensed XIV in the Shell copy.
import React, { useEffect, useState } from "react";
import { controller } from "../Controller/Controller";
import { ActionType, Line, Record as BattleRecord, SerializedAction } from "../Controller/Record";
import { CURRENT_GAME_COMBAT_PATCH, getCachedValue, setCachedValue } from "../Controller/Common";
import { ConfigData, GameConfig, makeDefaultConfig } from "../Game/GameConfig";
import { ACTIONS, ActionKey } from "../Game/Data";
import { BLM_ACTIONS } from "../Game/Data/Jobs/BLM";
import { createMockCanvas } from "./ImageExport";
import { ColorTheme, getCurrentThemeColors, getThemeColors } from "./ColorTheme";
import { getSkillIconImage } from "./Skills";
import { buffIconImages } from "./Buffs";
import { getSkill } from "../Game/Skills";

type ExportOptions = { wrapSeconds?: number; scale?: number; pixelRatio?: number; includeTime?: boolean; theme?: ColorTheme };
type FlowOptions = { columns?: number; pixelRatio?: number; title?: string; subtitle?: string; expectedGcd?: number };
type SequenceInput = {
	name?: string;
	config?: Partial<ConfigData>;
	initialResources?: { [key: string]: number };
	actions: (string | SerializedAction)[];
	export?: ExportOptions;
	flow?: FlowOptions;
};

if (!getCachedValue("language")) setCachedValue("language", "zh");

export const BASELINE: SequenceInput = {
	name: "攻略图1基准序列（13个GCD）",
	config: { spellSpeed: 420, skillSpeed: 420, countdown: 0, fps: 60, animationLock: 0.7, randomSeed: "baseline", procMode: "Never" as ConfigData["procMode"] },
	initialResources: { UMBRAL_ICE: 1, PARADOX: 1, FIRESTARTER: 1 },
	actions: ["即刻", "冰3", "冰4", "U", "星灵移位", "火3", "火4×6", "A", "耀星", "绝望"],
	export: { wrapSeconds: 20, scale: 0.4, pixelRatio: 3, includeTime: true, theme: "Light" },
};

const allowed = new Set<string>([...Object.keys(BLM_ACTIONS), "SWIFTCAST", "LUCID_DREAMING", "ADDLE", "SURECAST", "TINCTURE", "SPRINT"]);
const aliases = new Map<string, ActionKey>();
for (const key of allowed) {
	const value = ACTIONS[key as ActionKey];
	for (const name of [key, value.name, value.label?.zh]) {
		if (typeof name === "string") aliases.set(name.toLowerCase(), key as ActionKey);
	}
}
const extra: { [key: string]: ActionKey } = {
	B1: "BLIZZARD", B2: "BLIZZARD_II", B3: "BLIZZARD_III", B4: "BLIZZARD_IV",
	F1: "FIRE", F2: "FIRE_II", F3: "FIRE_III", F4: "FIRE_IV", A: "PARADOX", U: "PARADOX", D: "DESPAIR", M: "MANAFONT", X: "XENOGLOSSY", FS: "FLARE_STAR",
	冰1: "BLIZZARD", 冰2: "BLIZZARD_II", 冰3: "BLIZZARD_III", 冰4: "BLIZZARD_IV", 火1: "FIRE", 火2: "FIRE_II", 火3: "FIRE_III", 火4: "FIRE_IV",
	冰结: "BLIZZARD", 冰冻: "BLIZZARD_II", 冰封: "BLIZZARD_III", 冰澈: "BLIZZARD_IV", 火炎: "FIRE", 烈炎: "FIRE_II", 爆炎: "FIRE_III", 炽炎: "FIRE_IV",
	冰悖论: "PARADOX", 火悖论: "PARADOX", 即刻: "SWIFTCAST", 昏乱: "ADDLE", 星灵移位: "TRANSPOSE", 移位: "TRANSPOSE", 三连: "TRIPLECAST", 黑魔纹: "LEY_LINES", 核: "FLARE", 耀: "FLARE_STAR",
};
for (const [alias, key] of Object.entries(extra)) aliases.set(alias.toLowerCase(), key);
const resourceMax: { [key: string]: number } = { MANA: 10000, ASTRAL_FIRE: 3, UMBRAL_ICE: 3, UMBRAL_HEART: 3, ASTRAL_SOUL: 6, PARADOX: 1, FIRESTARTER: 1, THUNDERHEAD: 1, POLYGLOT: 3, TRIPLECAST: 3, SWIFTCAST: 1, LEY_LINES: 1 };

function readInput(input: SequenceInput | string): SequenceInput {
	if (typeof input !== "string") return input;
	const text = input.trim();
	if (text.startsWith("{")) return JSON.parse(text);
	return { actions: text.split(/(?:\s*(?:→|->|,|，|、|\n|;)\s*)/).filter(Boolean) };
}

function normalizeActions(input: SequenceInput): SerializedAction[] {
	if (!Array.isArray(input.actions) || !input.actions.length) throw new Error("序列不能为空");
	const actions: SerializedAction[] = [];
	for (const item of input.actions) {
		if (typeof item !== "string") {
			if (item.type === ActionType.Wait) {
				if (!Number.isFinite(item.waitDuration) || item.waitDuration < 0 || item.waitDuration > 600) throw new Error("等待时间应为 0–600 秒");
				actions.push(item);
				continue;
			}
			if (item.type !== ActionType.Skill) throw new Error("只支持技能和 Wait 等待记录");
		}
		const name = typeof item === "string" ? item.trim() : item.skillName;
		const repeated = /^(.*?)\s*[*×]\s*(\d+)$/.exec(name);
		const key = aliases.get((repeated ? repeated[1].trim() : name).toLowerCase());
		if (!key) throw new Error(`未知黑魔技能：${name}。冰针是灵极心资源；获得3根冰针应填写冰4。`);
		const count = repeated ? Number(repeated[2]) : 1;
		if (count < 1 || count > 100) throw new Error("单项重复次数应为 1–100");
		for (let i = 0; i < count; i++) actions.push({ type: ActionType.Skill, skillName: ACTIONS[key].name, targetList: typeof item === "string" ? [1] : item.targetList ?? [1], healTargetCount: undefined });
	}
	if (actions.length > 500) throw new Error("每张图最多500个动作，请拆分长序列");
	return actions;
}

function importSequence(raw: SequenceInput | string) {
	const input = readInput(raw);
	const actions = normalizeActions(input);
	const config = { ...makeDefaultConfig("BLM"), spellSpeed: 420, skillSpeed: 420, countdown: 0, ...input.config, job: "BLM" as const };
	if (!Number.isFinite(config.spellSpeed) || config.spellSpeed < 420 || config.spellSpeed > 10000) throw new Error("咏速应为420–10000");
	if (!Number.isFinite(config.fps) || config.fps <= 0 || config.fps > 1000) throw new Error("FPS应为1–1000");
	if (!Number.isFinite(config.countdown) || config.countdown < 0 || config.countdown > 60) throw new Error("倒计时应为0–60秒");
	if (input.initialResources) config.initialResourceOverrides = Object.entries(input.initialResources).map(([type, stacks]) => {
		if (!(type in resourceMax) || !Number.isInteger(stacks) || stacks < 0 || stacks > resourceMax[type]) throw new Error(`初始资源无效：${type}=${stacks}`);
		return { type, stacks, timeTillFullOrDrop: type === "TRIPLECAST" ? 15.7 : type === "LEY_LINES" ? 20 : 30, effectOrTimerEnabled: true } as ConfigData["initialResourceOverrides"][number];
	});
	if (config.initialResourceOverrides.some(x => x.type === "ASTRAL_FIRE" && x.stacks > 0) && config.initialResourceOverrides.some(x => x.type === "UMBRAL_ICE" && x.stacks > 0)) throw new Error("不能同时持有星极火和灵极冰");
	const oldRecord = controller.record;
	const oldConfig = controller.gameConfig;
	try {
		controller.gameConfig = new GameConfig(config);
		const record = new BattleRecord();
		record.config = controller.gameConfig;
		record.name = input.name ?? "自定义黑魔序列";
		record.actions = Line.deserialize(actions).actions;
		const status = controller.checkRecordValidity(record, 0, true);
		if (!status.isValid) {
			const bad = status.invalidActions[0];
			throw new Error(`第${bad.index + 1}个动作无效：${bad.node.getNameForMessage()}（${bad.reason.unavailableReasons.join("；")}）。请核对初始蓝量、冰针、火苗及技能顺序。`);
		}
		controller.record.name = record.name;
		controller.record.unselectAll();
		controller.undoStack.clear();
		if (controller.timeline.slots[controller.timeline.activeSlotIndex]) controller.timeline.slots[controller.timeline.activeSlotIndex].job = "BLM";
		controller.updateAllDisplay();
		controller.autoSave();
		return summarize();
	} catch (error) {
		controller.gameConfig = oldConfig;
		controller.checkRecordValidity(oldRecord, 0, true);
		controller.record.name = oldRecord.name;
		controller.updateAllDisplay();
		throw error;
	}
}

function summarize() {
	return {
		name: controller.record.name,
		patch: CURRENT_GAME_COMBAT_PATCH,
		duration: controller.game.getDisplayTime(),
		actions: controller.record.actions.filter(n => n.info.type === ActionType.Skill).map(n => ({ name: ACTIONS[(n.info as { skillName: ActionKey }).skillName].name, start: (n.tmp_startLockTime ?? 0) - controller.gameConfig.countdown, end: (n.tmp_endLockTime ?? 0) - controller.gameConfig.countdown, invalid: n.tmp_invalid_reasons })),
		record: controller.record.serialized(),
	};
}

async function exportPng(options: ExportOptions = {}) {
	const { wrapSeconds = 40, scale = 0.4, pixelRatio = 3, includeTime = true, theme = "Light" } = options;
	if (!Number.isFinite(wrapSeconds) || wrapSeconds < 0 || wrapSeconds > 300 || !Number.isFinite(scale) || scale < 0.1 || scale > 2 || !Number.isInteger(pixelRatio) || pixelRatio < 1 || pixelRatio > 4) throw new Error("导出尺寸设置无效");
	const images = controller.record.actions.filter(n => n.info.type === ActionType.Skill).map(n => getSkillIconImage("BLM", (n.info as { skillName: ActionKey }).skillName));
	await Promise.all([...new Set([...images, ...buffIconImages.values()])].map(img => img.decode()));
	await document.fonts.ready;
	controller.record.unselectAll();
	controller.timeline.setHorizontalScale(scale);
	controller.setImageExportConfig({ wrapThresholdSeconds: wrapSeconds, includeTime });
	const estimatedWidth = (wrapSeconds || controller.game.time + 4) * scale * 100;
	if (estimatedWidth * pixelRatio > 16000 || (controller.game.time + 4) * scale * 100 > 30000) throw new Error("图片过宽，请降低缩放比例或拆分序列");
	const canvas = createMockCanvas(includeTime, getThemeColors(theme));
	const result = document.createElement("canvas");
	result.width = canvas.width * pixelRatio;
	result.height = canvas.height * pixelRatio;
	const context = result.getContext("2d")!;
	context.fillStyle = getThemeColors(theme).background;
	context.fillRect(0, 0, result.width, result.height);
	context.drawImage(canvas, 0, 0, result.width, result.height);
	return { dataUrl: result.toDataURL("image/png"), width: result.width, height: result.height };
}

// Read each action's actual pre-cast state from the upstream replay engine.
// The current record remains unchanged; the live display is restored afterwards.
function flowSteps() {
	let gcdNumber = 0;
	const steps: { key: ActionKey; label: string; phase: string; gcd: boolean; gcdNumber: number; targets: number }[] = [];
	try {
		controller.record.actions.forEach((node, index) => {
			if (node.info.type !== ActionType.Skill) return;
			const key = node.info.skillName;
			controller.displayHistoricalState((node.tmp_startLockTime ?? 0) - controller.gameConfig.countdown, index);
			const resources = controller.savedHistoricalGame.resources;
			const af = resources.get("ASTRAL_FIRE").availableAmount();
			const ui = resources.get("UMBRAL_ICE").availableAmount();
			const phase = af ? `AF${af}` : ui ? `UI${ui}` : "无冰火状态";
			const gcd = getSkill("BLM", key).cdName === "cd_GCD";
			if (gcd) gcdNumber++;
			const shortNames: { [key: string]: string } = { FIRE_IV: "火4", FIRE_III: "火3", BLIZZARD_III: "冰3", BLIZZARD_IV: "冰4", FLARE_STAR: "耀星", DESPAIR: "绝望", FLARE: "核爆", FREEZE: "玄冰", MANAFONT: "魔泉", TRANSPOSE: "星灵移位", SWIFTCAST: "即刻咏唱" };
			const label = key === "PARADOX" ? (ui ? "冰悖论 U" : "火悖论 A") : shortNames[key] ?? String(ACTIONS[key].label?.zh ?? ACTIONS[key].name);
			steps.push({ key, label, phase, gcd, gcdNumber, targets: node.info.targetList.length });
		});
	} finally { controller.displayCurrentState(); }
	return steps;
}

async function exportFlow(options: FlowOptions = {}) {
	const { columns = 8, pixelRatio = 2, title = controller.record.name || "黑魔释放顺序", subtitle = "逐行从左到右；蓝框为GCD，灰框为能力技", expectedGcd } = options;
	if (!Number.isInteger(columns) || columns < 4 || columns > 10 || !Number.isInteger(pixelRatio) || pixelRatio < 1 || pixelRatio > 4) throw new Error("流程图尺寸设置无效");
	const steps = flowSteps();
	if (!steps.length) throw new Error("请先添加技能");
	const gcdCount = steps.filter(step => step.gcd).length;
	if (expectedGcd !== undefined && gcdCount !== expectedGcd) throw new Error(`技能位计数不符：要求${expectedGcd}，实际${gcdCount}`);
	await Promise.all([...new Set(steps.map(step => getSkillIconImage("BLM", step.key)))].map(img => img.decode()));
	await document.fonts.ready;
	const margin = 28, cardWidth = 110, cardHeight = 140, gap = 24, rowGap = 28, header = 104, footer = 42;
	const cols = Math.min(columns, steps.length), rows = Math.ceil(steps.length / cols);
	const width = margin * 2 + cols * cardWidth + (cols - 1) * gap;
	const height = header + rows * cardHeight + (rows - 1) * rowGap + footer;
	if (width * height * pixelRatio ** 2 > 64000000) throw new Error("流程图过大，请拆分序列");
	const canvas = document.createElement("canvas");
	canvas.width = width * pixelRatio; canvas.height = height * pixelRatio;
	const ctx = canvas.getContext("2d")!; ctx.scale(pixelRatio, pixelRatio);
	ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#17334f"; ctx.font = 'bold 25px "Microsoft YaHei", sans-serif'; ctx.fillText(title, margin, 30);
	ctx.fillStyle = "#54677b"; ctx.font = '14px "Microsoft YaHei", sans-serif'; ctx.fillText(subtitle, margin, 60);
	ctx.fillStyle = "#1d4e7a"; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif'; ctx.fillText(`${gcdCount} 个GCD  +  ${steps.length - gcdCount} 个能力技`, margin, 84);
	steps.forEach((step, index) => {
		const row = Math.floor(index / cols), col = index % cols;
		const x = margin + col * (cardWidth + gap), y = header + row * (cardHeight + rowGap);
		ctx.fillStyle = step.gcd ? "#f0f7ff" : "#f5f6f8"; ctx.strokeStyle = step.gcd ? "#6797c4" : "#a0aab6"; ctx.lineWidth = 1.5;
		ctx.beginPath(); ctx.roundRect(x, y, cardWidth, cardHeight, 8); ctx.fill(); ctx.stroke();
		ctx.textAlign = "center"; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'; ctx.fillStyle = step.gcd ? "#245f91" : "#647384";
		ctx.fillText(step.gcd ? `GCD ${step.gcdNumber}` : "能力技", x + cardWidth / 2, y + 16);
		ctx.drawImage(getSkillIconImage("BLM", step.key), x + (cardWidth - 48) / 2, y + 30, 48, 48);
		ctx.fillStyle = "#19334d"; ctx.font = 'bold 15px "Microsoft YaHei", sans-serif'; ctx.fillText(step.label, x + cardWidth / 2, y + 94);
		ctx.fillStyle = "#536a80"; ctx.font = '12px "Microsoft YaHei", sans-serif'; ctx.fillText(step.phase + (step.targets > 1 ? ` · ${step.targets}目标` : ""), x + cardWidth / 2, y + 118);
		if (col < cols - 1 && index < steps.length - 1) {
			const ax = x + cardWidth + 5, ay = y + cardHeight / 2;
			ctx.strokeStyle = "#708397"; ctx.fillStyle = "#708397"; ctx.lineWidth = 2;
			ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + gap - 12, ay); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(ax + gap - 10, ay); ctx.lineTo(ax + gap - 16, ay - 4); ctx.lineTo(ax + gap - 16, ay + 4); ctx.closePath(); ctx.fill();
		} else if (index < steps.length - 1) {
			ctx.fillStyle = "#536a80"; ctx.font = '12px "Microsoft YaHei", sans-serif'; ctx.fillText("↓ 接下一行", x + cardWidth / 2, y + cardHeight + rowGap / 2);
		}
	});
	ctx.textAlign = "left"; ctx.fillStyle = "#60758b"; ctx.font = '12px "Microsoft YaHei", sans-serif';
	ctx.fillText("状态标签表示该技能施放前的AF / UI；能力技不计入循环技能位。", margin, height - 20);
	return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height, gcdCount, steps };
}

const api = { version: 2, baseline: BASELINE, importSequence, summarize, exportPng, exportFlow };
declare global { interface Window { blmTimeline: typeof api } }
window.blmTimeline = api;

function saveFile(data: Blob | string, filename: string) {
	const href = typeof data === "string" ? data : URL.createObjectURL(data);
	const link = document.createElement("a");
	link.href = href;
	link.download = filename;
	link.click();
	if (typeof data !== "string") setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function LocalSequenceTools() {
	const colors = getCurrentThemeColors();
	const [text, setText] = useState(JSON.stringify(BASELINE, null, 2));
	const [message, setMessage] = useState("可用原站按钮逐个添加技能，也可在这里导入中文、英文或F4等简称。");
	const [busy, setBusy] = useState(false);
	useEffect(() => { document.title = "黑魔时间轴 · 本地版"; }, []);
	const run = async (action: () => unknown | Promise<unknown>) => {
		setBusy(true);
		try { await action(); } catch (error) { setMessage((error as Error).message); }
		finally { setBusy(false); }
	};
	return <section style={{ maxWidth: 1060, margin: "20px auto 0", padding: 16, border: `1px solid ${colors.bgHighContrast}`, borderRadius: 8 }} onKeyDown={event => event.stopPropagation()}>
		<h2 style={{ marginTop: 0 }}>黑魔序列导入与出图</h2>
		<p>本地版保留原站的技能按钮、资源检查、时间轴编辑和图片导出。模拟规则版本：{CURRENT_GAME_COMBAT_PATCH}；7.2攻略的威力与p值仍按原文计算。</p>
		<details><summary>输入技能序列 / JSON配置</summary>
			<textarea aria-label="技能序列" value={text} onChange={event => setText(event.target.value)} style={{ width: "100%", height: 220, margin: "10px 0", color: colors.text, background: colors.background }} />
			<p>例：冰3 → 冰4 → U → 星灵移位 → 火3 → 火4×6 → A → 耀星 → 绝望。初始资源须通过JSON指定；冰针写作UMBRAL_HEART，冰4给3根冰针。</p>
			<input type="file" aria-label="导入序列文件" accept=".json,.txt" onChange={event => { const file = event.target.files?.[0]; if (file) void file.text().then(setText); event.target.value = ""; }} />
		</details>
		<div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
			<button disabled={busy} onClick={() => run(() => { const data = importSequence(text); setMessage(`已导入${data.actions.length}个技能，时长${data.duration.toFixed(2)}秒。`); })}>替换当前时间轴并导入</button>
			<button disabled={busy} onClick={() => run(() => { setText(JSON.stringify(BASELINE, null, 2)); const data = importSequence(BASELINE); setMessage(`基准示例已加载：${data.actions.length}个动作（13个GCD＋即刻和移位）。`); })}>加载基准示例</button>
			<button disabled={busy} onClick={() => run(async () => { const input = readInput(text); const png = await exportPng(input.export); saveFile(png.dataUrl, `${controller.record.name || "黑魔时间轴"}.png`); setMessage(`已导出PNG：${png.width}×${png.height}。`); })}>导出完整时间轴 PNG</button>
			<button disabled={busy} onClick={() => run(async () => { const input = readInput(text); const png = await exportFlow(input.flow); saveFile(png.dataUrl, `${controller.record.name || "黑魔序列"}-流程图.png`); setMessage(`已导出释放顺序图：${png.gcdCount}个GCD。`); })}>导出释放顺序流程图</button>
			<button disabled={busy} onClick={() => { saveFile(new Blob([JSON.stringify(controller.record.serialized(), null, 2)], { type: "application/json" }), "黑魔序列-record.json"); }}>保存原站可导入的记录 JSON</button>
		</div>
		<p role="status" style={{ marginBottom: 0 }}>{message}</p>
	</section>;
}
