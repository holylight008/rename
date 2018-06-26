import * as ts from './typescript_inner';
import * as fs from 'fs';
import { ClassNode, Prop } from '../../syntaxNodes';
import { TempClassData } from './commons';

var _inEgret = [
	'/libs/modules/egret/',
	'/libs/modules/eui/',
	'/libs/modules/egret-wasm/',
	'/libs/modules/eui-wasm/',
	'/libs/modules/gui/',
	'/libs/modules/res/',
	'/libs/modules/tween/'
];
var _needPrompt = [
	'/libs/modules/tween/'
];
function inEgret(path: string): boolean {
	path = path.replace(/\\/g, '/');
	for (var i = 0; i < _inEgret.length; i++) {
		if (path.indexOf(_inEgret[i]) !== -1) {
			return true;
		}
	}
	return false;
}
function inPrompt(path: string): boolean {
	path = path.replace(/\\/g, '/');
	for (var i = 0; i < _needPrompt.length; i++) {
		if (path.indexOf(_needPrompt[i]) !== -1) {
			return true;
		}
	}
	return false;
}



function getClassExtendsHeritageClauseElement(node: ts.ClassLikeDeclaration) {
	let heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
	return heritageClause && heritageClause.types.length > 0 ? heritageClause.types[0] : undefined;
}

function getClassImplementsHeritageClauseElements(node: ts.ClassLikeDeclaration) {
	let heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ImplementsKeyword);
	return heritageClause ? heritageClause.types : undefined;
}

function getInterfaceBaseTypeNodes(node: ts.InterfaceDeclaration) {
	let heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
	return heritageClause ? heritageClause.types : undefined;
}

function getHeritageClause(clauses: ts.NodeArray<ts.HeritageClause>, kind: ts.SyntaxKind) {
	if (clauses) {
		for (let clause of clauses) {
			if (clause.token === kind) {
				return clause;
			}
		}
	}
	return undefined;
}

function getImplementedInterfaces(type: ts.Type, checker: ts.TypeChecker) {
	var superInterfaces: ts.NodeArray<ts.ExpressionWithTypeArguments> = null;
	var result: Array<ts.ObjectType> = [];

	if (type.symbol.declarations) {
		type.symbol.declarations.forEach(node => {
			var interfaceType = checker.getTypeAtLocation(node);
			var flags = (<ts.ObjectType>interfaceType).objectFlags;
			var isClass = 0;
			if (flags) {
				isClass = flags & ts.ObjectFlags.Class;
			}
			if (isClass) {
				superInterfaces = getClassImplementsHeritageClauseElements(<ts.ClassLikeDeclaration>node);
			} else {
				superInterfaces = getInterfaceBaseTypeNodes(<ts.InterfaceDeclaration>node);
			}
			if (superInterfaces) {
				superInterfaces.forEach(sp => {
					interfaceType = checker.getTypeAtLocation(sp);
					var flags = (<ts.ObjectType>interfaceType).objectFlags;
					if (flags && (flags & ts.ObjectFlags.Interface)) {
						result.push(<ts.ObjectType>interfaceType);
					}
				});
			}
		});
	}
	return result;
}

function getFullyQualifiedName(symbol: ts.Symbol, checker: ts.TypeChecker): string {
	var parent = symbol['parent'];
	var parentIsFile: boolean = false;
	if (parent && parent.declarations && parent.declarations.length === 1) {
		var fileObject = parent.declarations[0];
		if (fileObject && fileObject['fileName']) {
			parentIsFile = true;
		}
	}
	return symbol['parent'] && !parentIsFile ? getFullyQualifiedName(symbol['parent'], checker) + '.' + checker.symbolToString(symbol) : checker.symbolToString(symbol);
}



const options: ts.CompilerOptions = { module: ts.ModuleKind.CommonJS };
/**
 * Ts类解析器
 * @author featherJ
 */
export class TsParser {
	private files: ts.Map<{ version: number }>;
	private servicesHost: ts.LanguageServiceHost;
	private services: ts.LanguageService;
	/**
	 * 文件变化
	 * @param adds 
	 * @param modifies 
	 * @param deletes 
	 */
	public fileChanged(adds: string[], modifies: string[], deletes: string[]): void {
		var mPaths: string[] = modifies;
		var dPaths: string[] = deletes;
		var cPaths: string[] = adds;
		if (!this.files) {
			this.files = Object.create(null);
		}
		for (var i = 0; i < cPaths.length; i++) {
			if (this.files[cPaths[i]]) {
				this.files[cPaths[i]].version++;
			} else {
				this.files[cPaths[i]] = { version: 0 };
			}
		}
		for (var i = 0; i < mPaths.length; i++) {
			if (this.files[mPaths[i]]) {
				this.files[mPaths[i]].version++;
			} else {
				this.files[mPaths[i]] = { version: 0 };
			}
		}
		for (var i = 0; i < dPaths.length; i++) {
			delete this.files[dPaths[i]];
		}
		if (!this.servicesHost) {
			this.servicesHost = {
				getScriptFileNames: () => {
					var paths: string[] = [];
					for (var path in this.files) {
						paths.push(path);
					}
					return paths;
				},
				getScriptVersion: (fileName) => this.files[fileName] && this.files[fileName].version.toString(),
				getScriptSnapshot: (fileName) => {
					if (!fs.existsSync(fileName)) {
						return undefined;
					}
					return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
				},
				getCurrentDirectory: () => process.cwd(),
				getCompilationSettings: () => options,
				getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
			};
			this.services = ts.createLanguageService(this.servicesHost, ts.createDocumentRegistry());
		}
		this.currentStamp = process.uptime();
	}
	private currentStamp: number = -1;
	private cacheStamp: number = -1;
	/**
	 * 得到类数据
	 */
	public getClassDataMap(): { [className: string]: TempClassData } {
		if (this.cacheStamp !== this.currentStamp) {
			this.services.getProgram();
			this.tmpClassMap = {};
			var program = this.services.getProgram();
			var sourceCodes = program.getSourceFiles();
			var checker = program.getTypeChecker();
			for (var i = 0; i < sourceCodes.length; i++) {
				if (sourceCodes[i].fileName.indexOf('lib.d.ts') === -1) {
					this.delintNode(sourceCodes[i], checker, inEgret(sourceCodes[i].fileName), inPrompt(sourceCodes[i].fileName));
				}
			}
			this.cacheStamp = this.currentStamp;
		}
		return this.tmpClassMap;
	}
	private tmpClassMap: { [className: string]: TempClassData } = {};
	
	private delintNode(node: ts.Node, checker: ts.TypeChecker, inEngine: boolean = false, inPrompt: boolean = false): void {
		if ((node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.InterfaceDeclaration) &&
			this.isExport(node, checker)
		) {
			var nodeType = checker.getTypeAtLocation(node);
			var baseTypes = checker.getBaseTypes(<ts.InterfaceType>nodeType);
			var implementedTypes = getImplementedInterfaces(nodeType, checker);
			var symbol = nodeType.getSymbol();
			var className = getFullyQualifiedName(symbol, checker);
			var props = symbol.members;
			var baseClassNames = this.getIds(baseTypes, checker);
			var implementedNames = this.getIds(implementedTypes, checker);
			var propList: Prop[] = [];
			for (var name in props) {
				if (name.indexOf('$') === 0) {
					continue;
				}
				var prop = props[name];
				if (prop.flags & (ts.SymbolFlags.Property | ts.SymbolFlags.Accessor)) {
					var modifierFlags = ts.getCombinedModifierFlags(prop.declarations[0]);
					if (modifierFlags & (ts.ModifierFlags.Protected | ts.ModifierFlags.Private | ts.ModifierFlags.Readonly)) {
						continue;
					}
					if ((prop.flags & ts.SymbolFlags.Accessor) && prop.declarations.filter(d => d.kind === ts.SyntaxKind.SetAccessor).length === 0) {
						continue;
					}
					if (prop.getDocumentationComment().some(c => c.text.indexOf('@private') >= 0)) {
						continue;
					}
					var type: string = '';
					if (prop.valueDeclaration && (<ts.VariableDeclaration>prop.valueDeclaration).initializer) {
						var initializer = (<ts.VariableDeclaration>prop.valueDeclaration).initializer;
					}
					var defaultValue = '';
					var propType = checker.getTypeAtLocation(prop.declarations[0]);
					if (propType.getFlags() & ts.TypeFlags.Boolean) {
						type = 'boolean';
						if (initializer) {
							defaultValue = initializer.getText();
						} else {
							defaultValue = 'false';
						}
					} else if (propType.getFlags() & ts.TypeFlags.String) {
						type = 'string';
						if (initializer) {
							defaultValue = initializer.getText();
						} else {
							defaultValue = '\"\"';
						}
					} else if (propType.getFlags() & ts.TypeFlags.Number) {
						type = 'number';
						if (initializer) {
							defaultValue = initializer.getText();
						} else {
							defaultValue = '0';
						}
					} else {
						var symbol = propType.getSymbol();
						if (symbol) {
							type = getFullyQualifiedName(symbol, checker);
						} else {
							type = 'any';
						}
						if (initializer) {
							defaultValue = initializer.getText();
						} else {
							defaultValue = 'null';
						}
					}
					var propNode = new Prop();
					propNode.name = name;
					propNode.type = type;
					propNode.value = defaultValue;
					propList.push(propNode);
				}
			}
			var classNode: ClassNode = new ClassNode();
			classNode.inEngine = inEngine;
			classNode.inPrompt = inPrompt;
			classNode.props = propList;
			classNode.fullName = className;
			if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
				classNode.isInterface = true;
			}
			var tempClassNode = {
				baseNames: baseClassNames,
				implementedNames: implementedNames,
				classNode: classNode
			};
			if (this.checkCanAdded(classNode)) {
				this.tmpClassMap[className] = tempClassNode;
			}
		}
		ts.forEachChild(node, (node) => {
			this.delintNode(node, checker, inEngine, inPrompt);
		});
	}
	private checkCanAdded(node: ClassNode): boolean {
		if (node.inEngine) {
			return true;
		}
		if (this.tmpClassMap[node.fullName] && this.tmpClassMap[node.fullName]['classNode']) {
			var classNode: ClassNode = this.tmpClassMap[node.fullName]['classNode'];
			if (classNode.inEngine) {
				return false;
			}
		}
		return true;
	}
	private isExport(node: ts.Node, checker: ts.TypeChecker): boolean {
		var symbol: ts.Symbol = checker.getTypeAtLocation(node).getSymbol();
		if (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile) {
			if (!symbol['parent']) {
				return true;
			}
		} else {
			if (symbol['parent']) {
				return true;
			}
		}
		return false;
	}

	private getId(type: ts.Type, checker: ts.TypeChecker): string {
		var symbol = type.getSymbol();
		var className = getFullyQualifiedName(symbol, checker);
		return className;
	}
	private getIds(types: ts.Type[], checker: ts.TypeChecker): string[] {
		var ids: string[] = [];
		for (var i = 0; i < types.length; i++) {
			ids.push(this.getId(types[i], checker));
		}
		return ids;
	}
}