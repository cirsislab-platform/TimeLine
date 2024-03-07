import { TimeLine } from "./TimeLine";

export type TimeLineDataPointTime = number | Date;
export type TimeLineDataPointValue = number;

export interface TimeLineDataPoint {
	time: TimeLineDataPointTime;
	value: TimeLineDataPointValue;
}

export interface TimeLineSavedDataPoint {
	time: number;
	value: number;
}

export interface PlainPoint {
	x: number;
	y: number;
}

export interface ComputedTimeLineDataPoint extends TimeLineDataPoint {
	time: number;
	value: number;
	renderX: number;
	renderY: number;
}

export type DistanceMethod = "pythagoras" | "closest-x" | "closest-y";

type TimeLinePluginHook = (chart: TimeLine) => void;
export interface TimeLinePlugin {
	"draw:before"?: TimeLinePluginHook;
	"draw:after"?: TimeLinePluginHook;
	"compute:before"?: TimeLinePluginHook;
	"compute:after"?: TimeLinePluginHook;
	construct?: TimeLinePluginHook;
	pause?: TimeLinePluginHook;
	resume?: TimeLinePluginHook;
	data?: any;
	"calculate-positions"?: TimeLinePluginHook;
}
