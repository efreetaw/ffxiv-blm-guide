import fs from "node:fs";
import { controller } from "../Controller/Controller";
import { ActionType, Line } from "../Controller/Record";
import { PresetLinesManager } from "../Controller/PresetLinesManager";
import { setCachedValue } from "../Controller/Common";
import { getSavedConfigPart } from "../Game/GameConfig";
import { BASELINE } from "../Components/LocalSequenceTools";
import { loadFromFile } from "../Components/Common";
import { getSkill } from "../Game/Skills";
import { rotationTestSetup, rotationTestTeardown } from "./utils";

beforeEach(rotationTestSetup);
afterEach(rotationTestTeardown);

it.each(["standard", "opener", "two-stage", "aoe-two", "aoe-three"])(
	"imports the current %s guide sequence",
	(id) => {
		const input = JSON.parse(fs.readFileSync(`../examples/ledgers/${id}.json`, "utf8"));
		window.blmTimeline.importSequence(input);
		const gcds = controller.record.actions.filter((node) =>
			node.info.type === ActionType.Skill && getSkill("BLM", node.info.skillName).cdName === "cd_GCD");
		expect(gcds).toHaveLength(input.flow.expectedGcd);
		expect(controller.record.actions.every((node) => node.tmp_invalid_reasons.length === 0)).toBe(true);
	},
);

it("round-trips a current record and keeps it after rejected imports", () => {
	window.blmTimeline.importSequence(BASELINE);
	const saved = controller.record.serialized();
	controller.loadBattleRecordFromFile(saved);
	const before = controller.record.serialized();
	expect(before.actions).toEqual(saved.actions);
	expect(before.config).toEqual(saved.config);
	expect(before.config).not.toHaveProperty("casterTax");
	const oldConfig = { ...saved, config: { ...saved.config, shellVersion: 0 } };
	expect(() => controller.loadBattleRecordFromFile(oldConfig)).toThrow("Unsupported record config");
	expect(controller.record.serialized()).toEqual(before);
	const oldAction = { ...saved, actions: [{ type: "Skill", skillName: "Fire IV", targetCount: 1 }] };
	expect(() => controller.loadBattleRecordFromFile(oldAction)).toThrow("Unsupported legacy action format");
	expect(controller.record.serialized()).toEqual(before);
});

it("rejects embedded waits and old resource names without converting them", () => {
	expect(() => Line.deserialize(JSON.parse('[{"type":"Skill","skillName":"Fire IV","targetList":[1],"waitDuration":2.5}]'))).toThrow("Unsupported legacy action format");
	window.blmTimeline.importSequence(BASELINE);
	const saved = controller.record.serialized();
	const old = { ...saved, config: { ...saved.config, initialResourceOverrides: [{ type: "UmbralIce", stacks: 1, timeTillFullOrDrop: 0, enabled: true }] } };
	expect(() => controller.loadBattleRecordFromFile(old)).toThrow("Unsupported resource override");
	expect(controller.record.serialized()).toEqual(saved);
	expect(() => window.blmTimeline.importSequence({ actions: ["冰3"], config: JSON.parse(JSON.stringify(old.config)) })).toThrow("Unsupported resource override");
	expect(controller.record.serialized()).toEqual(saved);
});

it("restores the sequence after a resource or skill error", () => {
	window.blmTimeline.importSequence(BASELINE);
	const before = controller.record.serialized();
	expect(() => window.blmTimeline.importSequence({ actions: ["冰3"], initialResources: { UMBRAL_ICE: 4 } })).toThrow("初始资源无效");
	expect(() => window.blmTimeline.importSequence({ actions: ["火4"] })).toThrow("动作无效");
	expect(controller.record.serialized()).toEqual(before);
});

it("stops a malformed JSON import before calling the consumer", async () => {
	const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
	const callback = vi.fn();
	loadFromFile(new Blob(["{broken"]), callback);
	await vi.waitFor(() => expect(alert).toHaveBeenCalledOnce());
	expect(callback).not.toHaveBeenCalled();
	expect(alert.mock.calls[0][0]).toContain("SyntaxError");
});

it("saves preset jobs explicitly and rejects incomplete saved inputs", () => {
	setCachedValue("presetLines", JSON.stringify({ presets: [] }));
	const presets = new PresetLinesManager();
	presets.addLine(Line.deserialize([{ type: ActionType.Skill, skillName: "Fire 3", targetList: [1], healTargetCount: undefined }]), "BLM");
	const saved = presets.serialized();
	const loaded = new PresetLinesManager();
	expect(loaded.serialized()).toEqual(saved);
	expect(loaded.getLinesForJob("BLM")[0].actions[0].info).toMatchObject({ type: ActionType.Skill, skillName: "FIRE_III" });
	expect(saved.presets[0].job).toBe("BLM");
	expect(() => presets.deserializeAndAppend({ presets: [{ ...saved.presets[0], job: undefined }] })).toThrow("job key");
	setCachedValue("defaultPartialConfig: BLM", JSON.stringify({ spellSpeed: 420 }));
	expect(() => getSavedConfigPart("BLM")).toThrow("stats are missing");
});
