import { FileType, getCachedValue, setCachedValue } from "./Common";
import { Line } from "./Record";
import { updateSkillSequencePresetsView } from "../Components/SkillSequencePresets";
import { ShellJob, JOBS } from "../Game/Data/Jobs";

type Fixme = any;

export class PresetLinesManager {
	presetLines: { actions: Line; job: ShellJob }[] = [];

	constructor() {
		this.#load();
	}

	#save() {
		setCachedValue("presetLines", JSON.stringify(this.serialized()));
	}

	#load() {
		const data = getCachedValue("presetLines");
		if (data !== null) {
			const content = JSON.parse(data);
			this.deserializeAndAppend(content);
			return true;
		}
		return false;
	}

	serialized() {
		return {
			fileType: FileType.SkillSequencePresets,
			presets: this.presetLines.map(({ actions, job }) => ({ ...actions.serialized(), job })),
		};
	}

	deserializeAndAppend(content: Fixme) {
		for (const preset of content.presets) {
			if (!(preset.job in JOBS)) throw new Error("Skill preset requires a current job key.");
			const line = Line.deserialize(preset.actions);
			line.name = preset.name;
			this.addLine(line, preset.job);
		}
	}

	getLinesForJob(currentJob: ShellJob): Line[] {
		return this.presetLines.flatMap(({ actions, job }) =>
			job === currentJob ? [actions] : [],
		);
	}

	addLine(line: Line, job: ShellJob) {
		this.presetLines.push({ actions: line, job: job });
		updateSkillSequencePresetsView();
		this.#save();
	}

	deleteLine(line: Line) {
		for (let i = 0; i < this.presetLines.length; i++) {
			if (this.presetLines[i].actions === line) {
				this.presetLines.splice(i, 1);
				updateSkillSequencePresetsView();
				this.#save();
				return;
			}
		}
		console.assert(false);
	}

	deleteAllLines() {
		this.presetLines = [];
		updateSkillSequencePresetsView();
		this.#save();
	}
}
