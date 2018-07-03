"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var LanguageHost_1 = require("./LanguageHost");
var OneFileRenameLocations_1 = require("./OneFileRenameLocations");
var fs = require("fs");
var RenameService = /** @class */ (function () {
    function RenameService(files, options, ifWriteFile, debugMode) {
        if (ifWriteFile === void 0) { ifWriteFile = false; }
        if (debugMode === void 0) { debugMode = true; }
        var _this = this;
        //用于重命名时计算字母表取值位置
        this.times = 0;
        //在属性访问节点先于属性定义节点编译时,记录某文件下改名位置和新名字的记录器
        //TODO 增量编译下的数据结构可能需要改进
        this.recorder = new Map();
        //TODO 此处可在重命名时再开启相应Host
        //如果有更多自定义编译要求，也可把各种功能组合派生，编译作为单独类独立出来
        // this.options = this.getCompilerOptions();
        this.options = options;
        this.debugMode = debugMode;
        this.languageServiceHost = new LanguageHost_1.LanguageHost(files, this.options);
        this.languageService = ts.createLanguageService(this.languageServiceHost);
        this.ifWriteFile = ifWriteFile;
        files.forEach(function (file) {
            _this.recorder.set(file, new Map());
        });
    }
    RenameService.prototype.renameProperty = function (node, context, checker) {
        var _this = this;
        //真正的访问每个节点的函数，也就是ts.Vistor类型
        var visitor = function (node) {
            if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
                var props = node.members;
                for (var i = 0; i < props.length; i++) {
                    if (_this.ifCompress(props[i]) && _this.checkUserProperty(props[i].name)) {
                        var fileName = node.getSourceFile().fileName;
                        //getStart()只能获取没有改动之前的原始位置，所以需要计算偏移
                        //getText()此处之所以暂存原先的名字，是因为改变名字以后就不能再读取了
                        var previousPosition = props[i].name.getStart();
                        var previousName = props[i].name.getText();
                        var offset = _this.computeProducedOffset(fileName, previousPosition);
                        //如果在定义位置之前出现了使用，则按照记录表中使用时的重命名更新定义
                        if (_this.recorder.get(fileName).has(previousPosition)) {
                            var newName = _this.recorder.get(fileName).get(previousPosition);
                            props[i].name = ts.createIdentifier(newName);
                        }
                        else {
                            //只要通过位移找到定义时的属性，语言服务就可以找到内存中该属性的使用位置，并在后续判断中，为相关节点改名
                            var locations = _this.languageService.findRenameLocations(fileName, previousPosition + offset, false, false);
                            if (locations) {
                                //DEBUG 并没有改变该节点的position，似乎对后续编译没有影响？
                                var newName = _this.nameFomate(previousName);
                                props[i].name = ts.createIdentifier(newName);
                                if (_this.ifWriteFile) {
                                    _this.changeSourceFile(locations, newName);
                                }
                            }
                        }
                    }
                    else {
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
                var variety = node.expression;
                var symbol = checker.getSymbolAtLocation(node);
                var propName = symbol.valueDeclaration.name.text;
                //本次编译中，该属性定义文件被重新编译，且此处属性访问所在文件先于定义文件编译，因此定义处的名字不能被使用
                //解决方法是当属性使用第一次出现时，如果先于定义编译，就在属性处重命名，并记录重命名位置（由于每个节点只会访问一次，因为只能更改一次，所以只能在这里修改并记录）
                if (propName.indexOf("$") < 0 && _this.ifCompress(symbol.valueDeclaration)) {
                    var fileName = node.getSourceFile().fileName;
                    var previousPosition = node.name.getStart();
                    var offset_1 = _this.computeProducedOffset(fileName, previousPosition);
                    var info = _this.languageService.getQuickInfoAtPosition(fileName, previousPosition + offset_1);
                    var locations = _this.languageService.findRenameLocations(fileName, previousPosition + offset_1, false, false);
                    var newName_1 = _this.nameFomate(propName);
                    locations.forEach(function (location) {
                        _this.recorder.get(location.fileName).set(location.textSpan.start + offset_1, newName_1);
                    }, _this);
                    node = ts.createPropertyAccess(variety, ts.createIdentifier(newName_1));
                }
                else {
                    var props = ts.createIdentifier(propName);
                    node = ts.createPropertyAccess(variety, props);
                }
                return ts.visitEachChild(node, visitor, context);
            }
            else {
                return ts.visitEachChild(node, visitor, context);
            }
        };
        return visitor;
    };
    //以下两种编译模式未来可能需要更新或合并，或者重构一个编译模式的模块
    //普通编译模式
    RenameService.prototype.compiling = function () {
        var emitResult;
        if (this.options) {
            this.compilerHost = ts.createCompilerHost(this.options);
            var program = ts.createProgram(this.languageServiceHost.getScriptFileNames(), this.options, this.compilerHost);
            var checker = program.getTypeChecker();
            emitResult = program.emit(undefined, undefined, undefined, undefined, {
                before: [
                    this.transformerFind(checker)
                ]
            });
        }
        return emitResult;
    };
    //增量编译模式
    RenameService.prototype.compilingWithWatch = function () {
        var _this = this;
        if (!ts.sys.watchFile || !ts.sys.watchDirectory) {
            return null;
        }
        var watchCompilerHost = ts.createWatchCompilerHost(this.languageServiceHost.fileNames, this.options, ts.sys);
        var compileUsingBuilder = watchCompilerHost.createProgram;
        watchCompilerHost.createProgram = function (rootNames, options, host, oldProgram, configFileParsingDiagnostics) {
            _this.languageServiceHost = new LanguageHost_1.LanguageHost(rootNames, _this.options);
            _this.languageService = ts.createLanguageService(_this.languageServiceHost);
            //this.resetRecorder(rootNames as string[]);
            return compileUsingBuilder(rootNames, options, host, oldProgram, configFileParsingDiagnostics);
        };
        watchCompilerHost.afterProgramCreate = function (builderProgram) {
            var checker = builderProgram.getProgram().getTypeChecker();
            builderProgram.emit(undefined, undefined, undefined, undefined, {
                before: [
                    _this.transformerFind(checker)
                ]
            });
        };
        watchCompilerHost.options = this.options;
        ts.createWatchProgram(watchCompilerHost);
    };
    RenameService.prototype.transformerFind = function (checker) {
        var _this = this;
        return function (context) {
            return function (sourceFile) { return ts.visitNode(sourceFile, _this.renameProperty(sourceFile, context, checker)); };
        };
    };
    RenameService.prototype.transformerChange = function (checker) {
        var _this = this;
        return function (context) {
            return function (sourceFile) { return ts.visitNode(sourceFile, _this.renameProperty(sourceFile, context, checker)); };
        };
    };
    //调用语言服务host对源文件进行更改
    RenameService.prototype.applyEdits = function (fileName, edits) {
        var runningOffset = 0;
        for (var i = 0; i < edits.length; i++) {
            var edit = edits[i];
            var offsetStart = edit.span.start;
            var offsetEnd = offsetStart + edit.span.length;
            this.languageServiceHost.scripts.get(fileName).editContent(offsetStart, offsetEnd, edit.newText);
            var editDelta = edit.newText.length - edit.span.length;
            runningOffset += editDelta;
            //fs.writeFileSync(fileName, this.languageServiceHost.scripts.get(fileName).content);
            // 由于该变动的影响，文件内其他变动的位置也要相应改变
            for (var j = i + 1; j < edits.length; j++) {
                if (edits[j].span.start >= edits[i].span.start) {
                    edits[j].span.start += editDelta;
                }
            }
        }
        return runningOffset;
    };
    //查看是否有重命名标记
    RenameService.prototype.ifCompress = function (node) {
        var ifCompress = true;
        var uncompressTag = "uncompress";
        if (node.jsDoc) {
            var comment = node.jsDoc;
            comment[0].tags.forEach(function (tag) {
                if (tag.tagName.text == uncompressTag) {
                    ifCompress = false;
                }
            }, this);
        }
        return ifCompress;
    };
    //检查用户代码类属性中，是否有以$结尾的名称，如果有，则跳过对该属性的处理
    RenameService.prototype.checkUserProperty = function (nameNode) {
        var name = nameNode.text;
        if (name[name.length - 1] == "$") {
            return false;
        }
        else {
            return true;
        }
    };
    //计算该文件，当前类当前位置声明的属性由于之前的重命名，产生的位移偏差
    //计算方法：如果变动在该属性原位置之前，则累计
    RenameService.prototype.computeProducedOffset = function (fileName, previousPosition) {
        var offset = 0;
        if (this.ifWriteFile) {
            var changes = this.languageServiceHost.scripts.get(fileName).editRanges;
            changes.forEach(function (change) {
                if (previousPosition > change.textChangeRange.span.start) {
                    offset += change.textChangeRange.newLength - change.textChangeRange.span.length;
                }
            });
        }
        return offset;
    };
    //读取编译配置文件,此处可以为用户提供更改接口或常量
    RenameService.prototype.getCompilerOptions = function () {
        var path = process.cwd() + "\\test\\testconfig.json";
        var jsonString = fs.readFileSync(path, "utf-8");
        var configFile = ts.parseConfigFileTextToJson(path, jsonString);
        var options;
        if (!configFile.error) {
            options = configFile.config;
        }
        return options;
    };
    //将命名改变写入原来的ts源文件
    RenameService.prototype.changeSourceFile = function (locations, newName) {
        var eachFileEdits = new Map();
        for (var k = 0; k < locations.length; k++) {
            if (!eachFileEdits.has(locations[k].fileName)) {
                eachFileEdits.set(locations[k].fileName, new OneFileRenameLocations_1.OneFileRenameLocations(locations[k].fileName));
            }
            eachFileEdits.get(locations[k].fileName).edits.push({
                span: locations[k].textSpan,
                newText: newName
            });
        }
        eachFileEdits.forEach(function (edit) {
            this.applyEdits(edit.filename, edit.edits);
        }, this);
    };
    //此处格式可以提供更改接口
    RenameService.prototype.nameFomate = function (previousName) {
        var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var secondName = '';
        for (var k = 0; k <= Math.floor(this.times / alphabet.length); k++) {
            secondName += alphabet[this.times % (alphabet.length - 1)];
        }
        this.times++;
        if (this.debugMode) {
            return previousName + "_" + secondName + "$";
        }
        else {
            return secondName + "$";
        }
    };
    RenameService.prototype.resetRecorder = function (files) {
        var _this = this;
        this.recorder.clear();
        if (files) {
            files.forEach(function (file) {
                _this.recorder.set(file, new Map());
            });
        }
    };
    return RenameService;
}());
exports.RenameService = RenameService;
//# sourceMappingURL=RenameService.js.map