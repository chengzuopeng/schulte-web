export const formatMilliseconds = (milliseconds: number): string => {
	// 计算总秒数
	const totalSeconds = Math.floor(milliseconds / 1000);

	// 计算小时、分钟和秒数
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const ms = (milliseconds / 1000).toFixed(2).slice(-2)

	// 格式化为两位数
	const hoursStr = hours > 0 ? ('0' + hours).slice(-2) + ':' : '';
	const minutesStr = ('0' + minutes).slice(-2);
	const secondsStr = ('0' + seconds).slice(-2);

	// 返回格式化后的字符串
	return hoursStr + minutesStr + ':' + secondsStr + '.' + ms;
}
