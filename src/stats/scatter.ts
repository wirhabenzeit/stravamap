import {library} from "@fortawesome/fontawesome-svg-core";
import {fas} from "@fortawesome/free-solid-svg-icons";

library.add(fas);
import * as d3 from "d3";

import * as Plot from "@observablehq/plot";

import {type Activity} from "~/server/db/schema";
import {
  categorySettings,
  aliasMap,
} from "~/settings/category";

import {commonSettings} from "~/stats";

const valueOptions = {
  distance: {
    id: "distance",
    fun: (d: Activity) => d.distance! / 1000,
    format: (v: number) => v.toFixed() + "km",
    formatAxis: (v: number) => v.toFixed(),
    label: "Distance",
    unit: "km",
  },
  elevation: {
    id: "elevation",
    fun: (d: Activity) => d.total_elevation_gain,
    format: (v: number) => (v / 1.0).toFixed() + "m",
    formatAxis: (v: number) => (v / 1.0).toFixed(),
    label: "Elevation",
    unit: "km",
  },
  duration: {
    id: "duration",
    fun: (d: Activity) => d.elapsed_time! / 3600,
    format: (v: number) => v.toFixed(1) + "h",
    formatAxis: (v: number) => v.toFixed(1),
    label: "Duration",
    unit: "h",
  },
  date: {
    id: "date",
    fun: (d: Activity) => new Date(d.start_date_local!),
    formatAxis: (v: Date) => d3.timeFormat("%b %Y")(v),
    format: (v: Date) => d3.timeFormat("%Y-%m-%d")(v),
    label: "Date",
    unit: "",
  },
  average_speed: {
    id: "average_speed",
    fun: (d: Activity) => d.average_speed,
    format: (v: number) => (v * 3.6).toFixed(1) + "km/h",
    formatAxis: (v: number) => (v * 3.6).toFixed(1),
    label: "Avg Speed",
    unit: "km/h",
  },
} as const;

export const settings = {
  xValue: {
    type: "categorical",
    label: "X",
    options: valueOptions,
  },
  yValue: {
    type: "categorical",
    label: "Y",
    options: valueOptions,
  },
  rValue: {
    type: "categorical",
    label: "R",
    options: valueOptions,
  },
  group: {
    type: "categorical",
    label: "Group",
    options: {
      sport_group: {
        id: "sport_group",
        fun: (d: Activity) => aliasMap[d.sport_type],
        color: (id: keyof typeof categorySettings) =>
          categorySettings[id].color,
        icon: (id: keyof typeof categorySettings) =>
          categorySettings[id].icon,
        label: "Group",
      },
    },
  },
} as const;

type ScatterSetting = {
  xValue: keyof typeof valueOptions;
  yValue: keyof typeof valueOptions;
  rValue: keyof typeof valueOptions;
  group: keyof typeof settings.group.options;
};

export const defaultSettings: ScatterSetting = {
  xValue: "date",
  yValue: "elevation",
  rValue: "duration",
  group: "sport_group",
};

type Spec = {
  xValue: (typeof valueOptions)[keyof typeof valueOptions];
  yValue: (typeof valueOptions)[keyof typeof valueOptions];
  rValue: (typeof valueOptions)[keyof typeof valueOptions];
  group: (typeof settings.group.options)[keyof typeof settings.group.options];
};

const getter = (setting: ScatterSetting): Spec => ({
  xValue: valueOptions[setting.xValue],
  yValue: valueOptions[setting.yValue],
  rValue: valueOptions[setting.rValue],
  group: settings.group.options[setting.group],
});

const setter =
  (scatter: ScatterSetting) =>
  <K extends keyof ScatterSetting>(
    name: K,
    value: ScatterSetting[K]
  ) => {
    return {...scatter, [name]: value};
  };

export const plot =
  (setting: ScatterSetting) =>
  ({
    activities,
    width,
    height,
  }: {
    activities: Activity[];
    width: number;
    height: number;
  }) => {
    const {xValue, yValue, rValue, group} = getter(setting);
    const showCrosshair = width > 500;
    return Plot.plot({
      ...commonSettings,
      height: height,
      width: width,
      ...(showCrosshair
        ? {marginBottom: 40, marginLeft: 70}
        : {}),
      x: {
        tickFormat: xValue.formatAxis,
        axis: "top",
        ticks: width > 800 ? 8 : 5,
      },
      y: {
        tickFormat: yValue.formatAxis,
        axis: "right",
        ticks: 6,
        label: null,
      },
      r: {
        range: [0, 10],
        domain: d3.extent(activities, rValue.fun),
      },
      marks: [
        Plot.frame(),
        Plot.dot(activities, {
          x: xValue.fun,
          y: yValue.fun,
          r: rValue.fun,
          stroke: (d) => group.color(group.fun(d)),
          channels: {
            Activity: (d) => d.name,
            [rValue.label]: rValue.fun,
            [xValue.label]: xValue.fun,
            [yValue.label]: yValue.fun,
          },
          tip: {
            format: {
              x: null,
              y: null,
              r: null,
              stroke: null,
              Activity: (x) => x,
              [rValue.label]: rValue.format,
              [xValue.label]: xValue.format,
              [yValue.label]: yValue.format,
            },
          },
        }),
        Plot.crosshair(activities, {
          x: xValue.fun,
          y: yValue.fun,
          color: (d) => group.color(group.fun(d)),
        }),
      ],
    });
  };

export const legend =
  (setting: ScatterSetting) => (plot: Plot.Plot) => {
    const {rValue} = getter(setting);
    return legendRadius(plot.scale("r"), {
      ticks: 4,
      tickFormat: rValue.format,
      label: rValue.label,
    });
  };

export default {
  plot,
  settings,
  defaultSettings,
  legend,
  getter,
  setter,
};

function legendRadius(
  scale,
  {
    label = scale.label,
    ticks = 5,
    tickFormat = (d) => d,
    strokeWidth = 0.5,
    strokeDasharray = [5, 4],
    lineHeight = 8,
    gap = 20,
    style,
  } = {}
) {
  // const s = scale.scale;
  const s =
    scale.type === "pow"
      ? d3
          .scalePow(scale.domain, scale.range)
          .exponent(scale.exponent)
      : d3.scaleLinear(scale.domain, scale.range);

  const r0 = scale.range[1];
  const shiftY = label ? 10 : 0;

  let h = Infinity;
  const values = s
    .ticks(ticks)
    .reverse()
    .filter((t) => h - s(t) > lineHeight / 2 && (h = s(t)));

  return Plot.plot({
    x: {type: "identity", axis: null},
    r: {type: "identity"},
    y: {type: "identity", axis: null},
    caption: "",
    marks: [
      Plot.link(values, {
        x1: r0 + 2,
        y1: (d) => 8 + 2 * r0 - 2 * s(d) + shiftY,
        x2: 2 * r0 + 2 + gap,
        y2: (d) => 8 + 2 * r0 - 2 * s(d) + shiftY,
        strokeWidth: strokeWidth / 2,
        strokeDasharray,
      }),
      Plot.dot(values, {
        r: s,
        x: r0 + 2,
        y: (d) => 8 + 2 * r0 - s(d) + shiftY,
        strokeWidth,
      }),
      Plot.text(values, {
        x: 2 * r0 + 2 + gap,
        y: (d) => 8 + 2 * r0 - 2 * s(d) + shiftY,
        textAnchor: "start",
        dx: 4,
        text: tickFormat,
      }),
      Plot.text(label ? [label] : [], {
        x: 0,
        y: 6,
        textAnchor: "start",
        fontWeight: "bold",
      }),
    ],
    width: 100,
    height: 40,
    style,
  });
}