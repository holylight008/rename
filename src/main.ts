import * as ts from "typescript"
import * as fs from "fs"
import { RenameService } from "./RenameService";

let options = ts.getDefaultCompilerOptions();
options.outDir = process.cwd()+"/testout";
let testFolderpath = "E:/projects/transformer/test";
let files = fs.readdirSync(testFolderpath);
for (let i = 0; i < files.length; i++) {
    files[i] = "E:/projects/transformer/test/" + files[i];
}
let renameService=new RenameService(files,options,false,true);
let result= renameService.compilingWithWatch();
let b=10;