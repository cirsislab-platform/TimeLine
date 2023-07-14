import { TimeLinePlugin } from "../types";
import { getNearestPoint, isPointInBox } from "../utils";

/**
 * This plugin adds text labels to the X and Y axis.
 * @returns {TimeLinePlugin}
 */
export const axisLabelPlugin = (): TimeLinePlugin => ({
	data: {
		xLabelEl: document.createElement("p"),
		yLabelEl: document.createElement("p"),
		styleTag: document.createElement("style"),
	},
	construct: function (chart) {
		chart.leftPadding += 15;
		chart.bottomPadding += 10;

		this.data.styleTag.innerText = `.crisislab-timeline-axis-label {
				font-size: 16px;
				position: absolute;
				user-select: none;
				font-family: Arial, sans-serif;
			}
			.crisislab-timeline-axis-label.crisislab-timeline-x-axis {
				left: 50%;
				transform: translateX(-50%);
				bottom: 0px;
				margin-bottom: 2px;

			}

			.crisislab-timeline-axis-label.crisislab-timeline-y-axis {
                left: 0px;
				top: 50%;
				writing-mode: vertical-rl;
				transform: rotate(180deg) translateY(50%);
				margin-left: 2px;
			}`;
		chart.container.appendChild(this.data.styleTag);

		this.data.xLabelEl.innerText = chart.xLabel;
		this.data.xLabelEl.className =
			"crisislab-timeline-axis-label crisislab-timeline-x-axis";
		chart.container.appendChild(this.data.xLabelEl);

		this.data.yLabelEl.innerText = chart.yLabel;
		this.data.yLabelEl.className =
			"crisislab-timeline-axis-label crisislab-timeline-y-axis";
		chart.container.appendChild(this.data.yLabelEl);
	},
});
