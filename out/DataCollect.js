"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var ClassData_1 = require("./ClassData");
var DataCollect = /** @class */ (function () {
    function DataCollect() {
        this.classes = [];
    }
    DataCollect.prototype.getClassData = function (filename, options) {
        var _this = this;
        var program = ts.createProgram(filename, options);
        var sourcefiles = program.getSourceFiles();
        var checker = program.getTypeChecker();
        var _loop_1 = function (j) {
            var node = sourcefiles[j];
            node.forEachChild(function (child) {
                if (ts.isClassDeclaration(child) || ts.isInterfaceDeclaration(child)) {
                    var nodeType = checker.getTypeAtLocation(child);
                    var symbol = nodeType.getSymbol();
                    var props = child.members;
                    var heritageClause = child.heritageClauses;
                    var classsTemlete_1 = new ClassData_1.ClassData();
                    if (heritageClause) {
                        for (var i = 0; i < heritageClause.length; i++) {
                            if (heritageClause[i].token == ts.SyntaxKind.ExtendsKeyword) {
                                heritageClause[i].types.forEach(function (father) {
                                    classsTemlete_1.parents = father.getText();
                                });
                            }
                        }
                    }
                    for (var i = 0; i < props.length; i++) {
                        classsTemlete_1.propsAndMethods.push({
                            oldName: props[i].name.getText(),
                            declarePosition: props[i].name.getStart(),
                            newName: 'testNewWord',
                            offset: 0
                        });
                    }
                    classsTemlete_1.className = symbol.getName();
                    classsTemlete_1.declareFile = sourcefiles[j].fileName;
                    _this.classes.push(classsTemlete_1);
                }
            });
        };
        for (var j = 1; j < sourcefiles.length; j++) {
            _loop_1(j);
        }
    };
    DataCollect.prototype.findChildren = function (parentName) {
        var result = [];
        this.classes.forEach(function (cla) {
            if (cla.parents = parentName) {
                result.push(cla);
            }
        });
        return result;
    };
    DataCollect.prototype.updatePropertyOffset = function (startPosition, offset, filename) {
        for (var i = 0; i < this.classes.length; i++) {
            if (this.classes[i].declareFile == filename) {
                var props = this.classes[i].propsAndMethods;
                for (var j = 0; j < props.length; j++) {
                    if (props[j].declarePosition > startPosition) {
                        props[j].offset += offset;
                    }
                }
            }
        }
    };
    return DataCollect;
}());
exports.DataCollect = DataCollect;
//# sourceMappingURL=DataCollect.js.map