import BufferHelper = require("./../utils/BufferHelper");
import Logger = require("./../utils/Logger");

/** 
 * 标准数据输出底层
 * @author featherJ 
 */
export class StdCore {
	constructor() {
	}
	//接受数据端
	private receivedBh: BufferHelper.BufferHelper = new BufferHelper.BufferHelper();
	//启动
	public start() {
		var target: any = this;
		var func: Function = this.readableHandler;
		process.stdin.on("readable", function(): void {
			func.call(target);
		});
	}
	private readableHandler(): void {
		var buf: any = process.stdin.read();
		if (buf instanceof Buffer) {
			this.receivedBh.concat(buf);
			this.parserPack();
		}
	}
	//解包
	private parserPack(): void {
		while (true) {
			if (this.receivedBh.length > 4) {
				var respondBytesCache: Buffer = this.receivedBh.toBuffer();
				var msgLen: number = respondBytesCache.readInt32LE(0);
				if (respondBytesCache.length >= msgLen + 4) {
					//将一个完整的数据二进制保存下来
					var msgBytes: Buffer = respondBytesCache.slice(4, msgLen + 4);
					var tempBytes: Buffer = respondBytesCache.slice(msgLen + 4, respondBytesCache.length);
					this.receivedBh.clear();
					this.receivedBh = new BufferHelper.BufferHelper();
					this.receivedBh.concat(tempBytes);
					//处理本次接收到的数据
					try {
						this.getData(msgBytes);
					}
					catch (e) {
					}
					tempBytes.length = 0;
					msgBytes.length = 0;
					respondBytesCache.length = 0;
				} else {
					respondBytesCache.length = 0;
					break;
				}
			} else
				break;
		}
	}
	
	//接受到数据包
	private getData(buffer: Buffer): void {
		var data: string = buffer.toString("utf-8");
		var o: any = JSON.parse(data);
		if (o) {
			for (var i: number = 0; i < this.listenerList.length; i++) {
				var func: Function = this.listenerList[i]["func"];
				var target: any = this.listenerList[i]["target"];
				func.call(target, o);
			}
		}
	}

	private listenerList: any[] = [];
	//注册一个监听回调。监听形如：function(o:any):void{}
	public registerListener(listener: Function, target: any): void {
		this.listenerList.push({
			"func": listener,
			"target": target
		});
	}
	/**
	 * 发送一个数据对象。 
	 */
	public write(o: any): void {
		var str: string = JSON.stringify(o);
		var strBuff: Buffer = new Buffer("Content:" + str, "utf-8");
		var buff: Buffer = new Buffer(strBuff.length + 4);
		buff.writeInt32LE(strBuff.length, 0);
		strBuff.copy(buff, 4, 0, strBuff.length);
		process.stdout.write(buff);
	}
}