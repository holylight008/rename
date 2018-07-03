import * as ts from "typescript";
import { LanguageHost } from "./LanguageHost";
import { OneFileRenameLocations } from "./OneFileRenameLocations";
import * as fs from "fs";
export class RenameService {
    public languageService: ts.LanguageService;
    public compilerHost: ts.CompilerHost;
    public languageServiceHost: LanguageHost;

    public options: ts.CompilerOptions;
    public debugMode: boolean;

    //用于重命名时计算字母表取值位置
    public times: number = 0;
    //是否更改源文件
    //TODO DEBUG 似乎缓存更改过的源文件可以提高增量编译模式的访问效率,但更改文件后位置会有变化，记录数组待调整
    public ifWriteFile;
    //在属性访问节点先于属性定义节点编译时,记录某文件下改名位置和新名字的记录器
    //TODO 增量编译下的数据结构可能需要改进
    public recorder: Map<string, Map<number, string>> = new Map();

    constructor(files: string[], options: ts.CompilerOptions, ifWriteFile = false, debugMode = true) {
        //TODO 此处可在重命名时再开启相应Host
        //如果有更多自定义编译要求，也可把各种功能组合派生，编译作为单独类独立出来
        // this.options = this.getCompilerOptions();
        this.options = options;
        this.debugMode = debugMode;
        this.languageServiceHost = new LanguageHost(files, this.options);
        this.languageService = ts.createLanguageService(this.languageServiceHost);
        this.ifWriteFile = ifWriteFile;
        files.forEach((file) => {
            this.recorder.set(file, new Map<number, string>());
        })
    }



    public renameProperty(node: ts.Node, context: ts.TransformationContext, checker: ts.TypeChecker): ts.Visitor {
        //真正的访问每个节点的函数，也就是ts.Vistor类型
        const visitor = (node: ts.Node) => {
            if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
                let props = node.members;
                for (let i = 0; i < props.length; i++) {
                    if (this.ifCompress(props[i]) && this.checkUserProperty(props[i].name as ts.Identifier)) {
                        let fileName = node.getSourceFile().fileName;
                        //getStart()只能获取没有改动之前的原始位置，所以需要计算偏移
                        //getText()此处之所以暂存原先的名字，是因为改变名字以后就不能再读取了
                        let previousPosition = props[i].name.getStart();
                        let previousName = props[i].name.getText();
                        let offset = this.computeProducedOffset(fileName, previousPosition);

                        //如果在定义位置之前出现了使用，则按照记录表中使用时的重命名更新定义
                        if (this.recorder.get(fileName).has(previousPosition)) {
                            let newName = this.recorder.get(fileName).get(previousPosition);
                            props[i].name = ts.createIdentifier(newName);
                        } else {
                            //只要通过位移找到定义时的属性，语言服务就可以找到内存中该属性的使用位置，并在后续判断中，为相关节点改名
                            let locations = this.languageService.findRenameLocations(fileName, previousPosition + offset, false, false);
                            if (locations) {
                                //DEBUG 并没有改变该节点的position，似乎对后续编译没有影响？
                                let newName = this.nameFomate(previousName);
                                props[i].name = ts.createIdentifier(newName);

                                if (this.ifWriteFile) {
                                    this.changeSourceFile(locations, newName);
                                }
                            }
                        }
                    } else {
                        continue;
                    }
                }
                return ts.visitEachChild(node, visitor, context);
            }
            //  else if (node.getSourceFile()
            //     && this.recorder.has(node.getSourceFile().fileName)
            //     && this.recorder.get(node.getSourceFile().fileName).has(node.pos)) {
            //     let positionToNewname = this.recorder.get(node.getSourceFile().fileName);
            //     node = ts.createIdentifier(positionToNewname.get(node.pos));
            //     return ts.visitEachChild(node, visitor, context);
            // }
            else if (ts.isPropertyAccessExpression(node)) {
                let variety = node.expression;
                let symbol = checker.getSymbolAtLocation(node);
                let propName = symbol.valueDeclaration.name.text as string;
                //本次编译中，该属性定义文件被重新编译，且此处属性访问所在文件先于定义文件编译，因此定义处的名字不能被使用
                //解决方法是当属性使用第一次出现时，如果先于定义编译，就在属性处重命名，并记录重命名位置（由于每个节点只会访问一次，因为只能更改一次，所以只能在这里修改并记录）
                if (propName.indexOf("$") < 0 && this.ifCompress(symbol.valueDeclaration)) {
                    let fileName = node.getSourceFile().fileName;
                    let previousPosition = node.name.getStart();
                    let offset = this.computeProducedOffset(fileName, previousPosition);
                    let info=this.languageService.getQuickInfoAtPosition(fileName, previousPosition + offset);
                    let locations = this.languageService.findRenameLocations(fileName, previousPosition + offset, false, false);
                    let newName = this.nameFomate(propName);
                    locations.forEach((location) => {
                        this.recorder.get(location.fileName).set(location.textSpan.start + offset, newName);
                    }, this);
                    node = ts.createPropertyAccess(variety, ts.createIdentifier(newName));
                } else {
                    let props = ts.createIdentifier(propName as string);
                    node = ts.createPropertyAccess(variety, props);
                }
                return ts.visitEachChild(node, visitor, context);
            } else {
                return ts.visitEachChild(node, visitor, context);
            }
        }
        return visitor;

    }

    //以下两种编译模式未来可能需要更新或合并，或者重构一个编译模式的模块
    //普通编译模式
    public compiling(): ts.EmitResult {
        let emitResult;
        if (this.options) {
            this.compilerHost = ts.createCompilerHost(this.options);
            let program = ts.createProgram(this.languageServiceHost.getScriptFileNames(), this.options, this.compilerHost);
            let checker = program.getTypeChecker();
            emitResult = program.emit(undefined, undefined, undefined, undefined, {
                before: [
                    this.transformerFind(checker)
                ]
            });
        }

        return emitResult;
    }

    //增量编译模式
    public compilingWithWatch() {
        if (!ts.sys.watchFile || !ts.sys.watchDirectory) {
            return null;
        }

        let watchCompilerHost = ts.createWatchCompilerHost(this.languageServiceHost.fileNames, this.options, ts.sys);
        const compileUsingBuilder = watchCompilerHost.createProgram;
        watchCompilerHost.createProgram = (rootNames, options, host, oldProgram, configFileParsingDiagnostics) => {
            this.languageServiceHost = new LanguageHost(rootNames as string[], this.options);
            this.languageService = ts.createLanguageService(this.languageServiceHost);
            //this.resetRecorder(rootNames as string[]);
            return compileUsingBuilder(rootNames, options, host, oldProgram, configFileParsingDiagnostics);
        };

        watchCompilerHost.afterProgramCreate = builderProgram => {
            let checker = builderProgram.getProgram().getTypeChecker();
            builderProgram.emit(undefined, undefined, undefined, undefined, {
                before: [
                    this.transformerFind(checker)
                ]
            })
        };

        watchCompilerHost.options = this.options;
        ts.createWatchProgram(watchCompilerHost);
    }

    public transformerFind(checker: ts.TypeChecker) {
        return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
            return (sourceFile: ts.SourceFile) => ts.visitNode(sourceFile, this.renameProperty(sourceFile, context, checker))
        }
    }

    public transformerChange(checker: ts.TypeChecker) {
        return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
            return (sourceFile: ts.SourceFile) => ts.visitNode(sourceFile, this.renameProperty(sourceFile, context, checker))
        }
    }

    //调用语言服务host对源文件进行更改
    public applyEdits(fileName, edits): number {
        let runningOffset = 0;
        for (let i = 0; i < edits.length; i++) {
            let edit = edits[i];
            let offsetStart = edit.span.start;
            let offsetEnd = offsetStart + edit.span.length;
            this.languageServiceHost.scripts.get(fileName).editContent(offsetStart, offsetEnd, edit.newText);
            let editDelta = edit.newText.length - edit.span.length;
            runningOffset += editDelta;
            //fs.writeFileSync(fileName, this.languageServiceHost.scripts.get(fileName).content);
            // 由于该变动的影响，文件内其他变动的位置也要相应改变
            for (let j = i + 1; j < edits.length; j++) {
                if (edits[j].span.start >= edits[i].span.start) {
                    edits[j].span.start += editDelta;
                }
            }
        }
        return runningOffset;
    }

    //查看是否有重命名标记
    public ifCompress(node: ts.Node) {
        let ifCompress = true;
        const uncompressTag = "uncompress";
        if (node.jsDoc) {
            let comment = node.jsDoc;
            comment[0].tags.forEach(function (tag) {
                if (tag.tagName.text == uncompressTag) {
                    ifCompress = false;
                }
            }, this);
        }
        return ifCompress;
    }

    //检查用户代码类属性中，是否有以$结尾的名称，如果有，则跳过对该属性的处理
    public checkUserProperty(nameNode: ts.Identifier) {
        let name = nameNode.text;
        if (name[name.length - 1] == "$") {
            return false
        } else {
            return true;
        }
    }

    //计算该文件，当前类当前位置声明的属性由于之前的重命名，产生的位移偏差
    //计算方法：如果变动在该属性原位置之前，则累计
    public computeProducedOffset(fileName, previousPosition) {
        let offset = 0;
        if (this.ifWriteFile) {
            let changes = this.languageServiceHost.scripts.get(fileName).editRanges;
            changes.forEach((change) => {
                if (previousPosition > change.textChangeRange.span.start) {
                    offset += change.textChangeRange.newLength - change.textChangeRange.span.length;
                }
            });
        }
        return offset;
    }

    //读取编译配置文件,此处可以为用户提供更改接口或常量
    public getCompilerOptions() {
        let path = process.cwd() + "\\test\\testconfig.json";
        let jsonString = fs.readFileSync(path, "utf-8");
        let configFile = ts.parseConfigFileTextToJson(path, jsonString);
        let options: ts.CompilerOptions;
        if (!configFile.error) {
            options = configFile.config as ts.CompilerOptions;
        }
        return options;
    }

    //将命名改变写入原来的ts源文件
    public changeSourceFile(locations: ts.RenameLocation[], newName: string) {
        let eachFileEdits = new Map();
        for (let k = 0; k < locations.length; k++) {
            if (!eachFileEdits.has(locations[k].fileName)) {
                eachFileEdits.set(locations[k].fileName, new OneFileRenameLocations(locations[k].fileName));
            }

            eachFileEdits.get(locations[k].fileName).edits.push({
                span: locations[k].textSpan,
                newText: newName
            });
        }
        eachFileEdits.forEach(function (edit) {
            this.applyEdits(edit.filename, edit.edits);
        }, this);
    }

    //此处格式可以提供更改接口
    public nameFomate(previousName: string): string {
        const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let secondName = '';
        for (let k = 0; k <= Math.floor(this.times / alphabet.length); k++) {
            secondName += alphabet[this.times % (alphabet.length - 1)];
        }
        this.times++;
        if (this.debugMode) {
            return previousName + "_" + secondName + "$";
        } else {
            return secondName + "$";
        }
    }

    public resetRecorder(files?: string[]) {
        this.recorder.clear();
        if (files) {
            files.forEach((file) => {
                this.recorder.set(file, new Map<number, string>());
            })
        }
    }
}