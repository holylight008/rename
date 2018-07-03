import { Parent } from "./Parent";
import { Children } from "./Children";

class Others{
    lady:Parent=new Parent();
}

let o=new Others();

let x=o.lady.getOO()[0].getColor();