import * as ts from "typescript";
import { Host } from "./Host";
import { DataCollect } from "./DataCollect";
import * as fs from "fs";
import { OneFileRenameLocations } from "./OneFileRenameLocations";
import { ClassData } from "./ClassData";

export class RenameService {
    public service: ts.LanguageService;
    public collector: DataCollect;
    public host: Host;

    constructor(host: Host, collector: DataCollect) {
        this.host = host;
        this.service = host.startLanguageService();
        this.collector = collector;
    }

    public isSafeRename(changedClass: string, changedProperty:string): boolean {
        let ifSafe = true;
        for (let i = 0; i < this.collector.classes.length; i++) {
            if (changedClass == this.collector.classes[i].parents) {
                this.collector.classes[i].propsAndMethods.forEach((props)=>{
                    if(props.oldName==changedProperty){
                        ifSafe = false;
                    }
                });
            }
        }
        return ifSafe;
    }

    public getSafeRenameLocations(newPropertyClass: string, newPropertyName: string, newPropertyPosition: number, findInString: boolean, findInComment: boolean, fileName: string): ts.RenameLocation[] {
        if (this.isSafeRename(newPropertyClass, newPropertyName)) {
            let info = this.service.getRenameInfo(fileName, newPropertyPosition);
            if (info.canRename) {
                let locations = this.service.findRenameLocations(fileName, newPropertyPosition, findInString, findInComment);
                return locations;
            } else {
                return null;
            }

        } else {
            return null;
        }
    }

    public applyEdits(fileName: string,edits: ts.TextChange[]): number {

        let runningOffset = 0;

        for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            const offsetStart = edit.span.start;
            const offsetEnd = offsetStart + edit.span.length;

            this.host.scripts.get(fileName).editContent(offsetStart, offsetEnd, edit.newText);
            const editDelta = edit.newText.length - edit.span.length;
            runningOffset += editDelta;
            this.collector.updatePropertyOffset(edit.span.start,editDelta,fileName);
            //fs.writeFileSync(fileName,this.host.scripts.get(fileName).content);

            // Update positions of any future edits affected by this change
            for (let j = i + 1; j < edits.length; j++) {
                if (edits[j].span.start >= edits[i].span.start) {
                    edits[j].span.start += editDelta;
                }
            }
        }
        return runningOffset;
    }

    public renameKeyword() {
        for(let i=0;i<this.collector.classes.length;i++){
            let classData= this.collector.classes[i];
            for(let j=0;j<classData.propsAndMethods.length;j++){
                let props= classData.propsAndMethods[j];
                let locations = this.getSafeRenameLocations(classData.className,props.newName,props.declarePosition+props.offset,false,false,classData.declareFile);
                let eachFileEdits: Map<string, OneFileRenameLocations> = new Map();
                for (let k = 0; k < locations.length; k++) {
                    if (!eachFileEdits.has(locations[k].fileName)) {
                        eachFileEdits.set(locations[k].fileName, new OneFileRenameLocations(locations[k].fileName));
                    }
                    eachFileEdits.get(locations[k].fileName).edits.push({
                        span: locations[k].textSpan,
                        newText: props.newName
                    });
                }
                eachFileEdits.forEach((edit)=>{
                    this.applyEdits(edit.filename,edit.edits);
                })
            }
        }
    }

    public findNewName(){
        for(let i=0;i<this.collector.classes.length;i++){
            let classData=this.collector.classes[i];
            for(let j=0;j<classData.propsAndMethods.length;j++){
                let props=classData.propsAndMethods[j];
                
            }
        }
    }

}
