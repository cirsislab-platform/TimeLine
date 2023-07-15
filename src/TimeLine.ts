import type {
	ComputedTimeLineDataPoint,
	TimeLineDataPoint,
	TimeLinePlugin,
} from "./types";

export interface TimeLineOptions {
	container: HTMLElement;
	data: TimeLineDataPoint[];
	maxPoints: number;
	yLabel: string;
	xLabel: string;
	lineWidth?: number;
	plugins?: (TimeLinePlugin | null | undefined | false)[];
}

// NOTE: Assumes data is sorted by X value, with smallest value first in the list
export class TimeLine {
	// Raw data points passed by user
	data: TimeLineDataPoint[];
	// Saved when recompute is called. Only used internally before computedData is done computing
	savedData: TimeLineDataPoint[] = [];
	// Computed when recompute is called. Use this.
	computedData: ComputedTimeLineDataPoint[] = [];

	container: HTMLElement;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	maxPoints: number;
	yLabel: string;
	xLabel: string;
	lineWidth = 0.8;
	paused = false;
	leftPadding = 0;
	bottomPadding = 0;

	foregroundColour = "black";
	backgroundColour = "white";
	plugins: TimeLinePlugin[];

	constructor(options: TimeLineOptions) {
		this.container = options.container;
		this.data = options.data;
		this.maxPoints = options.maxPoints;
		this.xLabel = options.xLabel;
		this.yLabel = options.yLabel;
		this.plugins =
			(options.plugins?.filter(
				(plugin) => !!plugin,
			) as TimeLinePlugin[]) || [];

		if (options.lineWidth) this.lineWidth = options.lineWidth;

		// Very important for axis labels
		this.container.style.position = "relative";

		// Setup canvas
		this.canvas = document.createElement("canvas");
		this.canvas.style.width = "100%";
		this.canvas.style.height = "100%";
		this.container.appendChild(this.canvas);
		const context = this.canvas.getContext("2d");
		if (!context) throw "Unable to get canvas context!";
		this.ctx = context;

		// Initial update
		this.updateCanvas();
		// Update canvas on resize

		// Save 'this'
		const that = this;
		// Need to make sure that 'this' inside the handler refers to the class
		window.addEventListener("resize", () => {
			that.updateCanvas();
			that.compute();
		});

		// First update
		this.recompute();

		// Call plugins
		this.handlePluginHooks("construct");
	}

	/**
	 * Helper function for handling plugin hooks
	 * @param hook The hook to call
	 */
	private handlePluginHooks(hook: keyof TimeLinePlugin) {
		// Call all plugins with that hook defined
		for (const plugin of this.plugins) {
			plugin?.[hook]?.(this);
		}
	}

	/**
	 * Pauses the chart. New data won't be shown, even if recompute is called,
	 * until the chart is unpaused by calling resume.
	 */
	pause() {
		this.paused = true;
		this.handlePluginHooks("pause");
	}

	/**
	 * Unpauses the chart
	 */
	resume() {
		this.paused = false;
		this.recompute();
		this.handlePluginHooks("resume");
	}

	updateCanvas() {
		// Undo previous scaling
		this.ctx.setTransform(1, 0, 0, 1, 0, 0);

		// Update width and height
		const rect = this.canvas.getBoundingClientRect();
		this.canvas.width = rect.width * window.devicePixelRatio;
		this.canvas.height = rect.height * window.devicePixelRatio;

		// Scale context
		this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	}

	get widthWithoutPadding() {
		return this.width - this.leftPadding;
	}

	get width() {
		return this.canvas.width / window.devicePixelRatio;
	}

	get heightWithoutPadding() {
		return this.height - this.bottomPadding;
	}

	get height() {
		return this.canvas.height / window.devicePixelRatio;
	}

	getRenderOffsetsAndMultipliers(): {
		xOffset: number;
		xMultiplier: number;
		yOffset: number;
		yMultiplier: number;
	} {
		// Avoid throwing errors dividing by zero
		if (this.savedData.length < 2) {
			return {
				xOffset: 0,
				xMultiplier: 1,
				yOffset: 0,
				yMultiplier: 1,
			};
		}

		// Calculate X and Y multipliers

		// For X, we need to first figure out the total amount of space used by the points
		let totalPointWidth = 0;
		for (let i = 1; i < this.savedData.length; i++) {
			// Calculate the gap between this point & the previous point
			const previousPoint = this.savedData[i - 1];
			const currentPoint = this.savedData[i];
			const gap = currentPoint.x - previousPoint.x;

			totalPointWidth += gap;
		}

		// This is what the pointGap would be if all the points were perfectly spaced
		const averageSpacePerPoint = totalPointWidth / this.savedData.length;

		// Calculate the X multiplier so that the data all fits in the pane
		const xMultiplier =
			this.widthWithoutPadding / (this.maxPoints * averageSpacePerPoint);

		// Calculate the X-offset so that all data is visible
		// & initially the graph scrolls from the right.
		const xOffset =
			(this.maxPoints - this.savedData.length) * averageSpacePerPoint -
			this.savedData[0].x;

		// Y multiplier is simpler - need to find the difference between the minimum and maximum points
		// Note to future self: Always use -Infinity, not Number.MIN_VALUE
		let biggestYValue = -Infinity;
		let smallestYValue = Infinity;
		for (const point of this.savedData) {
			if (point.y > biggestYValue) biggestYValue = point.y;
			if (point.y < smallestYValue) smallestYValue = point.y;
		}

		// Get the maximum gap
		const maxYGap = biggestYValue - smallestYValue;

		// Now divide the available pixels by that for the multiplier
		const yMultiplier = this.heightWithoutPadding / maxYGap;

		// Y offset is very easy - just the inverse of the smallest number
		// since we draw from the top
		const yOffset = -smallestYValue;

		return {
			xOffset,
			xMultiplier,
			yOffset,
			yMultiplier,
		};
	}

	/**
	 * Call this to recompute all the data points after the data array has changed.
	 */
	recompute() {
		// Don't change if it's paused
		if (this.paused) return;

		// Don't try and compute if less than 2 points
		if (this.data.length < 2) return;

		this.savedData = window.structuredClone(this.data);

		this.compute();
	}

	private compute() {
		this.handlePluginHooks("compute:before");
		// Draw the lines
		const { xOffset, xMultiplier, yOffset, yMultiplier } =
			this.getRenderOffsetsAndMultipliers();

		// Clear old data
		this.computedData = [];

		// Compute values for each point
		for (const point of this.savedData) {
			const computedPoint: ComputedTimeLineDataPoint = {
				...point,
				renderX: this.leftPadding + (point.x + xOffset) * xMultiplier,
				renderY:
					this.heightWithoutPadding -
					(point.y + yOffset) * yMultiplier,
			};
			this.computedData.push(computedPoint);
		}
		this.handlePluginHooks("compute:after");
	}

	/**
	 * Call this to draw the graph. The most recently computed data is used.
	 */
	draw() {
		// Don't try and draw if we don't have any data
		if (this.computedData.length < 2) return;

		this.handlePluginHooks("draw:before");
		// Draw in black
		this.ctx.strokeStyle = this.foregroundColour;
		this.ctx.lineWidth = this.lineWidth;
		this.ctx.setLineDash([]);

		// Clear canvas
		this.ctx.fillStyle = this.backgroundColour;
		this.ctx.fillRect(0, 0, this.width, this.height);

		// Draw lines on sides
		this.ctx.strokeRect(
			this.leftPadding,
			0,
			this.widthWithoutPadding,
			this.heightWithoutPadding,
		);

		// Begin the path
		this.ctx.beginPath();

		// First data point
		this.ctx.moveTo(
			this.computedData[0].renderX,
			this.computedData[0].renderY,
		);

		// Loop over all points, other than the first one
		for (const point of this.computedData.slice(1)) {
			// Line to moves the 'cursor' to the point we just drew a line to
			this.ctx.lineTo(point.renderX, point.renderY);
		}

		// Draw the path
		this.ctx.stroke();
		this.handlePluginHooks("draw:after");
	}
}
