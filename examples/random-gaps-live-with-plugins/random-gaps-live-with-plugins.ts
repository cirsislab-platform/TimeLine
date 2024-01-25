import {
	TimeLine,
	TimeLineDataPoint,
	timeAxisPlugin,
	valueAxisPlugin,
	doubleClickCopyPlugin,
	highlightNearestPointPlugin,
	nearestPointInfoPopupPlugin,
	pointerCrosshairPlugin,
	axisLabelPlugin,
} from "../../src/index";

const data: TimeLineDataPoint[] = [];
const timeWindow = 30 * 1000;
const chart = new TimeLine({
	container: document.getElementById("chart-container") as HTMLElement,
	data,
	timeWindow,
	timeAxisLabel: "Time",
	valueAxisLabel: "Random numbers",
	plugins: [
		timeAxisPlugin((x) => new Date(x).toLocaleTimeString()),
		valueAxisPlugin(),
		doubleClickCopyPlugin(),
		highlightNearestPointPlugin(),
		nearestPointInfoPopupPlugin(),
		pointerCrosshairPlugin(),
		axisLabelPlugin(),
	],
});

let prev = 0;
function addPoint() {
	setTimeout(addPoint, Math.random() * 50);

	const y =
		prev + Math.floor(Math.random() * 10) * (Math.random() > 0.5 ? -1 : 1);
	prev = y;
	data.push({
		time: Date.now(),
		value: y,
	});

	// Call chart.recompute() when you're done updating `data`
	chart.recompute();
}
addPoint();

// Note that you need to call chart.draw() yourself
function renderLoop() {
	requestAnimationFrame(renderLoop);
	chart.draw();
}
renderLoop();
