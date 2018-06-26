import * as ts from "typescript";

export class ClassData{
    className:string;
    parents:string;
    declarePositon:number;
    declareFile:string;
    offset:number=0;
    propsAndMethods:PropsData[]=[];
}

export class PropsData{
    oldName:string;
    newName:string;
    declarePosition:number;
    offset:number=0;
}