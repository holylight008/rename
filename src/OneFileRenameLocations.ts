import { TextChange } from "typescript";

//某文件在一个关键词下所有的更改位置
export class OneFileRenameLocations{
    filename:string;
    edits:TextChange[];
    constructor(filename:string){
        this.filename=filename;
        this.edits=[];
    }
}