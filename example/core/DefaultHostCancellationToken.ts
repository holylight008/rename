import ts = require("./../libs/typescriptServices");

/** 
 * @author featherJ 
 */
export class DefaultHostCancellationToken implements ts.HostCancellationToken {
	public static Instance = new DefaultHostCancellationToken();

	public isCancellationRequested() {
		return false;
	}
} 