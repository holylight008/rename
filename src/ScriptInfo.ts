import * as ts from "typescript";
import * as fs from "fs";
/**
 * 一个代码实体类
 * @author featherJ  
 */
export class ScriptInfo {
	public version: number = 1;
	public content:string;
	public editRanges: { length: number; textChangeRange: ts.TextChangeRange; }[] = [];
	constructor(public fileName: string) {
		this.content=fs.readFileSync(fileName,"utf-8");
	}

	private setContent(content: string): void {
		this.content = content;
	}

	public updateContent(content: string): void {
		if(content != this.content)
			this.editContent(0,this.content.length,content);
	}

	public editContent(start: number, end: number, newText: string): void {
		if(start == end && newText.length == 0) return;
		// Apply edits
		var prefix = this.content.substring(0, start);
		var middle = newText;
		var suffix = this.content.substring(end);
		this.setContent(prefix + middle + suffix);

		// Store edit range + new length of script
		this.editRanges.push({
			length: this.content.length,
			textChangeRange: ts.createTextChangeRange(
				ts.createTextSpanFromBounds(start, end), newText.length)
		});
		// Update version #
		this.version++;
	}

	public getTextChangeRangeBetweenVersions(startVersion: number, endVersion: number): ts.TextChangeRange {
		if (startVersion === endVersion) {
			// No edits!
			return ts.unchangedTextChangeRange;
		}

		var initialEditRangeIndex = this.editRanges.length - (this.version - startVersion);
		var lastEditRangeIndex = this.editRanges.length - (this.version - endVersion);

		var entries = this.editRanges.slice(initialEditRangeIndex, lastEditRangeIndex);
		return ts.collapseTextChangeRangesAcrossMultipleVersions(entries.map(e => e.textChangeRange));
	}
}