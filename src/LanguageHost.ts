import * as ts from "typescript";
import { ScriptInfo } from "./ScriptInfo";
import { ScriptSnapshot } from "./ScriptSnapshot";
export class LanguageHost implements ts.LanguageServiceHost{
    public settings:ts.CompilerOptions;
    public fileNames:string[];
    public scripts: Map<string,ScriptInfo>=new Map();

    constructor(fileNames:string[],settings:ts.CompilerOptions){
        this.settings=settings;
        this.fileNames=fileNames;
        fileNames.forEach((name)=>{
            this.scripts.set(name,new ScriptInfo(name));
        });
    }

    getCompilationSettings(): ts.CompilerOptions {
        return this.settings;
    }    
    getScriptFileNames(): string[] {
        return this.fileNames;
    }
    getScriptVersion(fileName: string): string {
        let script = this.getScriptInfo(fileName);
        return script ? script.version.toString() : undefined;
    }
    getScriptSnapshot(fileName: string): ts.IScriptSnapshot {
        let script = this.getScriptInfo(fileName);
		return script ? new ScriptSnapshot(script) : undefined;
    }
    getCurrentDirectory(): string {
        return ""
    }
    getDefaultLibFileName(options: ts.CompilerOptions): string {
        return (options.hasOwnProperty("target") && options.target === 2) /* ES5 */ ? "lib.es5.d.ts" : "lib.d.ts";
    }
    public getScriptInfo(fileName: string): ScriptInfo {
		return this.scripts.get(fileName);
	}
}