import { Children } from "./Children";

/**
 * testcomment
 */
export class Parent {
    public getTT():string{
        return 'hello';
    }
    public getOO(){
        return this.oppo;
    }
    public getWindow(){}
    /**
     * @uncompress
     * @sdfsdfsdf
     */
    public nameofmeme:string[];
    public oppo:Children[];
    private queen:string;
}
let a:Parent=new Parent();
let b=a.getTT();
let c=a.getWindow();
let d=a.getTT();

function happy(){
    let b=new Parent();
    b.getOO();
}