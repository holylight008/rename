import * as ts from "typescript"
import { ClassData } from "./ClassData";
export class DataCollect {
    public classes: ClassData[] = [];
    public getClassData(filename: string[], options: ts.CompilerOptions) {
        let program = ts.createProgram(filename, options);
        let sourcefiles = program.getSourceFiles();
        let checker = program.getTypeChecker();
        for (let j = 1; j < sourcefiles.length; j++) {
            let node: ts.Node = sourcefiles[j];
            node.forEachChild((child) => {
                if (ts.isClassDeclaration(child) || ts.isInterfaceDeclaration(child)) {
                    let nodeType = checker.getTypeAtLocation(child);
                    let symbol = nodeType.getSymbol();
                    let props = child.members;
                    let heritageClause = child.heritageClauses;
                    let classsTemlete = new ClassData();
                    if (heritageClause) {
                        for (let i = 0; i < heritageClause.length; i++) {
                            if (heritageClause[i].token == ts.SyntaxKind.ExtendsKeyword) {
                                heritageClause[i].types.forEach((father) => {
                                    classsTemlete.parents = father.getText();
                                })
                            }
                        }
                    }
                    for(let i=0;i<props.length;i++){
                        classsTemlete.propsAndMethods.push({
                            oldName:props[i].name.getText(),
                            declarePosition:props[i].name.getStart(),
                            newName:'testNewWord',
                            offset:0
                        });
                    }
                    classsTemlete.className = symbol.getName();
                    classsTemlete.declareFile=sourcefiles[j].fileName;
                    this.classes.push(classsTemlete);
                }
            });
        }
    }

    public findChildren(parentName: string): ClassData[] {
        let result: ClassData[] = [];
        this.classes.forEach((cla) => {
            if (cla.parents = parentName) {
                result.push(cla);
            }
        });
        return result;
    }

    public updatePropertyOffset(startPosition:number,offset:number,filename:string){
        for(let i=0;i<this.classes.length;i++){
            if(this.classes[i].declareFile==filename){
                let props=this.classes[i].propsAndMethods;
                for(let j=0;j<props.length;j++){
                    if(props[j].declarePosition>startPosition){
                        props[j].offset+=offset;
                    }
                }
            }
        }
    }
}