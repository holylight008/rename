import * as ts from "typescript";
import { ScriptInfo } from "./ScriptInfo";

/** 
 * @author featherJ 
 */
export class ScriptSnapshot implements ts.IScriptSnapshot {
	public textSnapshot: string;
	public version: number;

	constructor(public scriptInfo: ScriptInfo) {
		this.textSnapshot = scriptInfo.content;
		this.version = scriptInfo.version;
	}

	public getText(start: number, end: number): string {
		return this.textSnapshot.substring(start, end);
	}

	public getLength(): number {
		return this.textSnapshot.length;
	}

	public getChangeRange(oldScript: ts.IScriptSnapshot): ts.TextChangeRange {
		var oldShim = <ScriptSnapshot>oldScript;
		return this.scriptInfo.getTextChangeRangeBetweenVersions(oldShim.version, this.version);
	}
} 