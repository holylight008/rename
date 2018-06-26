import FileUtil = require("./../utils/FileUtil");
import Path = require('path');
import TSSFactory = require("./../factories/TSSFactory");
import Logger = require("./../utils/Logger");
/** 
 * 配置文件解析器
 * @author featherJ 
 */
export class Tsconfig {
	private _files: string[] = null;
	/** 需要加载的文件列表，如果为空则全部加载 */
	public get files(): string[] {
		return this._files;
	}

	private _rootPath: string = "";
	/** 配置文件的根路径 */
	public get rootPath(): string {
		return this._rootPath;
	}

	private _setting: any = null;
	/** 配置文件的设置项 */
	public get setting(): any {
		return this._setting;
	}
	/**
	 * @param allFiles 所有文件
	 * @param tsconfigPath 配置文件路径
	 */
	constructor(version: string, allFiles: string[], tsconfigPath: string) {
		var optionDeclarations: any[] = TSSFactory.getTss(version).optionDeclarations;
		var rootPath: string = FileUtil.getDirectory(tsconfigPath);
		var str: string = FileUtil.openAsString(tsconfigPath);
		var obj: any = null;
		try {
			obj = JSON.parse(str);
		} catch (e)
		{ }
		var setting: any = null;
		var files: string[] = null;
		var exclude: string[] = null;
		if (obj) {
			setting = getCompilerOptions(obj.compilerOptions, optionDeclarations, rootPath);
			files = obj.files;
			exclude = obj.exclude;
		} else {
		}
		//如果没有setting则采用默认的setting
		if (!setting)
			setting = defaultSetting;
		//将files的相对路径转换为绝对路径
		if (files) {
			for (var i: number = 0; i < files.length; i++)
				files[i] = Path.resolve(rootPath, files[i]);
		}
		//如果存在排除列表
		if (exclude && exclude.length > 0) {
			//将排除列表转换为绝对路径
			for (var i: number = 0; i < exclude.length; i++)
				exclude[i] = Path.resolve(rootPath, exclude[i]);
			if (!files) { //如果没有文件列表则为全部文件
				files = [];
				FileUtil.selectIn(allFiles, rootPath, ["ts"], function(path: string): void {
					files.push(path);
				}, this)
			}
			var newfiles: string[] = [];
			//剔除排除列表
			for (var i: number = 0; i < files.length; i++) {
				var needExclude: boolean = false;
				var filePath: string = files[i];
				for (var j: number = 0; j < exclude.length; j++) {
					if (filePath.toLowerCase().indexOf(exclude[j].toLowerCase()) == 0) {
						needExclude = true;
						break;
					}
				}
				if (!needExclude)
					newfiles.push(filePath);
			}
			files = newfiles;
		}
		//formatSetting(setting, optionDeclarations);
		this._files = files;
		this._setting = setting;
		this._rootPath = rootPath;
	}
}

function getCompilerOptions(jsonOptions: any, optionDeclarations: any[], basePath: string) {
	var options: any = {};
	var optionNameMap: any = {};
	for (var i: number = 0; i < optionDeclarations.length; i++) {
		optionNameMap[optionDeclarations[i].name] = optionDeclarations[i];
	}
	if (jsonOptions) {
		for (var id in jsonOptions) {
			if (Object.prototype.hasOwnProperty.call(optionNameMap, id)) {
				var opt = optionNameMap[id];
				var optType = opt.type;
				var value = jsonOptions[id];
				var expectedType = typeof optType === "string" ? optType : "string";
				if (typeof value === expectedType) {
					if (typeof optType !== "string") {
						var key = value.toLowerCase();
						if (Object.prototype.hasOwnProperty.call(optType, key)) {
							value = optType[key];
						}
						else {
							//errors.push(ts.createCompilerDiagnostic(opt.error))
							value = 0;
						}
					}
					if (opt.isFilePath) {
						value = normalizePath(combinePaths(basePath, value));
						if (value === "") {
							value = ".";
						}
					}
					options[opt.name] = value;
				}
				else {
					//errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Compiler_option_0_requires_a_value_of_type_1, id, expectedType));
				}
			}
			else {
				//errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Unknown_compiler_option_0, id));
			}
		}
	}
	return options;
}
function combinePaths(path1: string, path2: string) {
	if (!(path1 && path1.length))
		return path2;
	if (!(path2 && path2.length))
		return path1;
	if (getRootLength(path2) !== 0)
		return path2;
	if (path1.charAt(path1.length - 1) === "/")
		return path1 + path2;
	return path1 + "/" + path2;
}
function normalizePath(path: string) {
	path = normalizeSlashes(path);
	var rootLength: number = getRootLength(path);
	var normalized = getNormalizedParts(path, rootLength);
	return path.substr(0, rootLength) + normalized.join("/");
}
function normalizeSlashes(path: string) {
	return path.replace(/\\/g, "/");
}
function getRootLength(path: string) {
	if (path.charCodeAt(0) === 47 /* slash */) {
		if (path.charCodeAt(1) !== 47 /* slash */)
			return 1;
		var p1 = path.indexOf("/", 2);
		if (p1 < 0)
			return 2;
		var p2 = path.indexOf("/", p1 + 1);
		if (p2 < 0)
			return p1 + 1;
		return p2 + 1;
	}
	if (path.charCodeAt(1) === 58 /* colon */) {
		if (path.charCodeAt(2) === 47 /* slash */)
			return 3;
		return 2;
	}
	// Per RFC 1738 'file' URI schema has the shape file://<host>/<path>
	// if <host> is omitted then it is assumed that host value is 'localhost',
	// however slash after the omitted <host> is not removed.
	// file:///folder1/file1 - this is a correct URI
	// file://folder2/file2 - this is an incorrect URI
	if (path.lastIndexOf("file:///", 0) === 0) {
		return "file:///".length;
	}
	var idx = path.indexOf("://");
	if (idx !== -1) {
		return idx + "://".length;
	}
	return 0;
}
function getNormalizedParts(normalizedSlashedPath: string, rootLength: number) {
	var parts = normalizedSlashedPath.substr(rootLength).split("/");
	var normalized: any[] = [];
	for (var _i = 0; _i < parts.length; _i++) {
		var part = parts[_i];
		if (part !== ".") {
			if (part === ".." && normalized.length > 0 && lastOrUndefined(normalized) !== "..") {
				normalized.pop();
			}
			else {
				// A part may be an empty string (which is 'falsy') if the path had consecutive slashes,
				// e.g. "path//file.ts".  Drop these before re-joining the parts.
				if (part) {
					normalized.push(part);
				}
			}
		}
	}
	return normalized;
}
function lastOrUndefined(array: any[]) {
	if (array.length === 0) {
		return undefined;
	}
	return array[array.length - 1];
}
/** 默认的设置项 */
export var defaultSetting = {
	mapSourceFiles: true,
	sourceMap: true,
	target: 1,
	noLib: true,
	jsx: 2
};
/** 
 * 比较setting是否一样
 * @param obj1
 * @param obj2
 */
export function compareSetting(obj1: any, obj2: any): boolean {
	if (obj1 == obj2)
		return true;
	if (typeof obj1 === "array") {
		if (obj1.length != obj2.length)
			return false;
		for (var i: number = 0; i < obj1.length; i++) {
			if (!compareSetting(obj1[i], obj2[i]))
				return false;
		}
	} else if ((typeof obj1 === "string") || (typeof obj1 === "number")) {
		if (obj1 != obj2)
			return false;
	} else {
		var obj1KeyLen: number = 0;
		var obj2KeyLen: number = 0;
		for (var key in obj1) obj1KeyLen++;
		for (key in obj2) obj2KeyLen++;
		if (obj1KeyLen != obj2KeyLen)
			return false;
		for (key in obj1) {
			if (!obj2.hasOwnProperty(key))
				return false;
			var obj1c: Object = obj1[key];
			var obj2c: Object = obj2[key];
			if (!compareSetting(obj1c, obj2c))
				return false;
		}
	}
	return true;
}