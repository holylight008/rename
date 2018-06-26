import Logger = require("./../utils/Logger");
import ts = require("./../libs/typescriptServices");
import DefaultHostCancellationToken = require("./DefaultHostCancellationToken");
import ScriptInfo = require("./ScriptInfo");
import ScriptSnapshot = require("./ScriptSnapshot");

/**
 * Host
 * @author featherJ
 */
export class Host implements ts.LanguageServiceHost {
	//当前已经加载的ts代码
	protected fileNameToScript: ts.Map<ScriptInfo.ScriptInfo> = {};
	constructor(protected cancellationToken = DefaultHostCancellationToken.DefaultHostCancellationToken.Instance,
		protected settings = ts.getDefaultCompilerOptions()) {
	}
	public getFilenames(): string[] {
		var fileNames: string[] = [];
		this.forEachKey(this.fileNameToScript, (fileName) => { fileNames.push(fileName); });
		return fileNames;
	}
	private forEachKey<T, U>(map: ts.Map<T>, callback: (key: string) => U): U {
		var result: U;
		for (var id in map) {
			if (result = callback(id)) break;
		}
		return result;
	}
	public getScriptInfo(fileName: string): ScriptInfo.ScriptInfo {
		return this.fileNameToScript[fileName];
	}
	/**
	 * 添加代码
	 * @param fileName {string} 代码标识
	 * @param content {string} 文本内容
	 */
	public addScript(fileName: string, content: string): void {
		if (!this.contains(fileName)) {
			this.fileNameToScript[fileName] = new ScriptInfo.ScriptInfo(fileName, content);
			return;
		}
		this.updateScript(fileName, content)
	}
	/**
	 * 编辑代码
	 * @param fileName {string} 代码标识
	 * @param startIndex {number} 编辑的起始索引（包括）
	 * @param endIndex {number} 编辑的结束索引（不包括）
	 * @param newText {string} 新的文本内容
	 */
	public editScript(fileName: string, startIndex: number, endIndex: number, newText: string): void {
		var script = this.getScriptInfo(fileName);
		if (script) {
			script.editContent(startIndex, endIndex, newText);
			return;
		}
		throw new Error("No script with name '" + fileName + "'");
	}
	/**
	 * 更新代码
	 * @param fileName {string} 代码标识
	 * @param content {string} 文本内容
	 */
	public updateScript(fileName: string, content: string): void {
		var script = this.getScriptInfo(fileName);
		if (script) {
			script.updateContent(content);
			return;
		}
		this.addScript(fileName, content);
	}
	/**
	 * 移除代码
	 * @param fileName {string} 代码标识
	 */
	public removeScript(fileName: string) {
		var script = this.getScriptInfo(fileName);
		if (script) {
			script.updateContent("");
			return;
		}
	}
	public getCompilationSettings(): ts.CompilerOptions {
		return this.settings;
	}
	public getCancellationToken() {
		return this.cancellationToken;
	}
	public getCurrentDirectory(): string {
		return ""
	}
	public getDefaultLibFileName(options: ts.CompilerOptions): string {
		return (options.hasOwnProperty("target") && options.target === 2) /* ES6 */ ? "lib.es6.d.ts" : "lib.d.ts";
	}
	public getScriptFileNames(): string[] {
		return this.getFilenames();
	}
	public getScriptSnapshot(fileName: string): ts.IScriptSnapshot {
		let script = this.getScriptInfo(fileName);
		return script ? new ScriptSnapshot.ScriptSnapshot(script) : undefined;
	}
	public getScriptVersion(fileName: string): string {
		let script = this.getScriptInfo(fileName);
		return script ? script.version.toString() : undefined;
	}
	/**是否包含指定名的代码*/
	public contains(fileName: string): boolean {
		if (this.fileNameToScript[fileName])
			return true;
		return false;
	}
	log(s: any) { Logger.log(s); }
	trace(s: string): void { Logger.log(s); }
	error(s: string): void { Logger.log(s); }
	/**
	 * 删除所有已加载的脚本
	 */
	public dispose(): void {
		var fileNames: string[] = this.getFilenames();
		for (var i: number = 0; i < fileNames.length; i++) {
			this.removeScript(fileNames[i]);
		}
	}
}