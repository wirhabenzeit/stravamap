import {
  useContext,
  createContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { ActivityContext } from "./ActivityContext";
import { FilterContext } from "./FilterContext";
import { SelectionContext } from "./SelectionContext";
import * as d3tf from "d3-time-format";
import * as d3 from "d3-array";
import * as d3f from "d3-force";
import * as d3t from "d3-time";

import {
  timelineSettings,
  pieSettings,
  calendarSettings,
  scatterSettings,
  mapStatSettings,
  violinSettings,
  timelineSettingsVisx,
} from "../settings";

const defaultTimeline = {
  timePeriod: timelineSettings.timePeriods.week,
  value: timelineSettings.values.time,
  group: timelineSettings.groups.sport_group,
  timeGroup: timelineSettings.timeGroups.byYear(2023),
  loaded: false,
};

const repel = (data, x, y, r, ticks = 100) => {
  const entries = data.map((d) => ({
    x0: x(d),
    y0: y(d),
    r: r(d),
    data: d,
  }));

  const simulation = d3f
    .forceSimulation(entries)
    .force(
      "x",
      d3f.forceX((d) => d.x0)
    )
    .force(
      "y",
      d3f.forceY((d) => d.y0)
    )
    .force(
      "collide",
      d3f.forceCollide((d) => d.r)
    );

  for (let i = 0; i < ticks; i++) simulation.tick();

  return simulation.nodes();
};

const defaultStats = {
  data: [],
  allData: [],
  extent: [undefined, undefined],
  map: {
    value: mapStatSettings.values.elevation,
    timeGroup: mapStatSettings.timeGroups.all(2023),
    loaded: false,
  },
  timeline: {
    ...defaultTimeline,
    stat: timelineSettings.stats(defaultTimeline).cumTotal,
    loaded: false,
    data: [],
  },
  timelineVisx: {
    value: timelineSettingsVisx.values.elevation,
    group: timelineSettingsVisx.groups.sport_group,
    timePeriod: timelineSettingsVisx.timePeriods.day,
    averaging: timelineSettingsVisx.averages.movingAvg(7),
    loaded: false,
    groups: [],
    data: [],
  },
  pie: {
    value: pieSettings.values.elevation,
    group: pieSettings.groups.sport_group,
    timeGroup: pieSettings.timeGroups.all(2023),
    loaded: false,
    data: [],
  },
  violin: {
    color: violinSettings.color,
    icon: violinSettings.icon,
    value: violinSettings.values.elevation,
    group: violinSettings.groups.sport_group,
    scaleY: violinSettings.scaleYs.log,
    loaded: false,
    stats: undefined,
    compute: () => [],
  },
  calendar: {
    value: calendarSettings.values.elevation,
    extent: [undefined, undefined],
    loaded: false,
    data: [],
    activitiesByDate: {},
    colorScaleFn: (colors) => (value) => colors[0],
    onClick: () => {},
  },
  scatter: {
    xValue: scatterSettings.values.date,
    yValue: scatterSettings.values.elevation,
    size: scatterSettings.values.distance,
    group: scatterSettings.groups.sport_group,
    color: scatterSettings.color,
    loaded: false,
    extent: {
      x: [undefined, undefined],
      y: [undefined, undefined],
      size: [undefined, undefined],
    },
    onClick: () => {},
  },
};

const StatsContext = createContext(defaultStats);

const updateMap = (data, map) => {
  const filteredData = d3.filter(data, (f) => map.timeGroup.filter(f));
  const rollup = d3.rollups(filteredData, map.value.fun, (f) => f.country);
  console.log(rollup);
  const outData = d3.map(rollup, ([key, value]) => ({
    id: key,
    value: value,
  }));
  const domain = d3.extent(outData, (d) => d.value).map((d) => d / 1);
  return { data: outData, domain: domain };
};

const updateCalendar = (data, calendar, selectedDays, setSelected) => {
  const activitiesByDate = d3.group(data, (f) =>
    d3tf.timeFormat("%Y-%m-%d")(f.date)
  );
  const outData = d3.map(activitiesByDate, ([key, value]) => ({
    value: selectedDays.includes(key) ? "selected" : calendar.value.fun(value),
    day: key,
  }));
  const onClick = (point) => {
    const selected = activitiesByDate.get(point.day);
    if (selected) setSelected(selected.map((f) => f.id));
    else setSelected([]);
  };
  return {
    data: outData,
    activitiesByDate: activitiesByDate,
    onClick: onClick,
  };
};

const updatePie = (data, pie) => {
  const filteredData = d3.filter(data, (f) => pie.timeGroup.filter(f));
  const rollup = d3.rollups(filteredData, pie.value.fun, pie.group.fun);
  rollup.sort(pie.group.sort);
  return d3.map(rollup, ([key, value]) => ({
    id: key,
    value: value,
    color: pie.group.color(key),
    icon: pie.group.icon(key),
  }));
};

const updateTimeline = (data, timeline, setTimeline) => {
  const extent = d3.extent(data, (d) => d.date);
  const years = extent.map((d) => d.getFullYear());
  const extentInYear = (year) => [
    year == years[0] ? extent[0] : new Date(year, 0, 1),
    year == years[1] ? extent[1] : new Date(year, 11, 31),
  ];
  const rollup = d3.rollup(
    data,
    timeline.stat.fun,
    (f) =>
      JSON.stringify({
        group: timeline.group.fun(f),
        year: timeline.timeGroup.fun(f),
      }),
    (f) => timeline.timePeriod.fun(f.date)
  );
  const fillZeros = (data, extent) => {
    const out = [];
    timeline.timePeriod.range(extent).forEach((date) => {
      const transformedDate = timeline.timePeriod.fun(date);
      if (data.has(transformedDate)) {
        out.push([transformedDate, data.get(transformedDate)]);
      } else {
        out.push([transformedDate, 0]);
      }
    });
    return out;
  };

  const makeCumulative = (data) => {
    return d3.zip(
      data.map(([x, y]) => x),
      d3.cumsum(data.map(([x, y]) => y))
    );
  };
  const rollupData = Array.from(rollup.entries()).map(([id, data]) => {
    id = JSON.parse(id);
    return [
      id,
      timeline.stat.cumulative
        ? makeCumulative(
            fillZeros(
              data,
              timeline.timeGroup.highlight
                ? extentInYear(id.year)
                : timeline.timePeriod.relative
                ? extentInYear(2018)
                : extent
            )
          )
        : fillZeros(
            data,
            timeline.timeGroup.highlight
              ? extentInYear(id.year)
              : timeline.timePeriod.relative
              ? extentInYear(2018)
              : extent
          ),
    ];
  });

  const outData = rollupData.map(([id, data]) => ({
    id: JSON.stringify(id),
    color: timeline.group.color(id.group),
    icon: timeline.group.icon(id.group),
    alpha: id.year == timeline.timeGroup.highlight ? 1 : 0.1,
    data: data.map(([x, y]) => ({ x: d3tf.timeFormat("%Y-%m-%d")(x), y: y })),
    xLabel: (x) =>
      ("year" in id ? id.year + "-" : "") + timeline.timePeriod.format(x),
    yLabel: (y) => y + timeline.stat.unit,
    onClick: () => {
      if ("year" in id)
        setTimeline({
          ...timeline,
          timeGroup: timelineSettings.timeGroups.byYear(id.year),
        });
    },
  }));
  return outData;
};

const computeTimelineVisx = ({ data, extent, group, fun, tick, avgFun }) => {
  const groups = [...d3.group(data, group.fun).keys()];
  const bins = d3
    .bin()
    .value((d) => d.date)
    .domain(extent)
    .thresholds(tick.range(...extent))(data)
    .map((d) => {
      const reduce = d3.rollup(d, fun, group.fun);
      groups.forEach((g) => {
        if (!reduce.has(g)) reduce.set(g, 0);
      });
      return {
        date: d3t.timeDay(d.x0),
        values: reduce,
      };
    });

  const movingAvg = new d3.InternMap(
    groups.map((g) => [g, avgFun(bins.map((d) => d.values.get(g)))])
  );

  bins.forEach((d, i) => {
    const iMovingAvg = new d3.InternMap(
      d3.map(movingAvg, ([k, g]) => [k, g[i]])
    );
    d.movingAvg = iMovingAvg;
  });

  return { groups: groups, data: bins, color: group.color };

  /*return d3.groups(data, group.fun).map(([groupName, groupData]) => {
    const data_values_avg = avgFun(bins.map((d) => d.value));
    bins.forEach((d, i) => {
      d.movingAvg = data_values_avg[i];
    });

    return { groups: groups, data: bins };
  });*/
};

export function StatsContextProvider({ children }) {
  const activityContext = useContext(ActivityContext);
  const filterContext = useContext(FilterContext);
  const selectionContext = useContext(SelectionContext);
  const [state, setState] = useState(defaultStats);

  const setTimelineVisx = (newTimeline) => {
    const timeline = { ...state.timelineVisx, ...newTimeline };
    console.log("setting timeline visx", timeline);
    setState((state) => ({
      ...state,
      timelineVisx: {
        ...state.timelineVisx,
        ...timeline,
        ...computeTimelineVisx({
          data: state.data,
          extent: state.extent,
          group: timeline.group,
          fun: timeline.value.fun,
          tick: timeline.timePeriod.tick,
          avgFun: timeline.averaging.fun,
        }),
      },
    }));
  };

  const setTimeline = (newTimeline) => {
    console.log("setting timeline");
    const timeline = {
      ...state.timeline,
      ...newTimeline,
      extent: state.extent,
    };
    // stats depend on the other props
    if (!("stat" in newTimeline))
      timeline.stat = timelineSettings.stats(timeline)[timeline.stat.id];
    // if switching from relative to absolute, reset timeGroup to all
    if (
      "timePeriod" in newTimeline &&
      !newTimeline.timePeriod.relative &&
      timeline.timeGroup.highlight
    )
      timeline.timeGroup = timelineSettings.timeGroups.all(
        timeline.timeGroup.highlight
      );

    const data = updateTimeline(state.data, timeline, setTimeline);
    setState((state) => ({
      ...state,
      timeline: {
        ...state.timeline,
        ...timeline,
        data: data,
        loaded: true,
      },
    }));
  };

  const setViolin = (newViolin) => {
    console.log("setting violin");
    const violin = { ...state.violin, ...newViolin };

    const compute = ({
      innerHeight,
      innerWidth,
      margin,
      yScale,
      xScale,
      outlierNum,
    }) => {
      const bins = d3
        .range(innerHeight + margin.top, margin.top, -innerHeight / 20)
        .concat(margin.top)
        .map(yScale.invert);

      const data = d3
        .groups(
          state.data.filter(
            (d) =>
              violin.value.minValue <= violin.value.fun(d) &&
              (violin.value.maxValue == undefined ||
                violin.value.fun(d) <= violin.value.maxValue)
          ),
          violin.group.fun
        )
        .map(([group, data]) => {
          const data_values = data.map(violin.value.fun);
          const binData = d3.bin().thresholds(bins).domain(yScale.domain())(
            data_values
          );

          const bulk = binData.filter((d) => d.length >= outlierNum);

          if (d3.sum(bulk.map((d) => d.length)) < 20) {
            return {
              group: group,
              binData: [],
              stats: undefined,
              points: repel(
                data.filter(
                  (d) => violin.value.minValue <= violin.value.fun(d)
                ),
                (d) => xScale(group) + xScale.bandwidth() / 2,
                (d) => yScale(violin.value.fun(d)),
                (d) => 3
              ),
            };
          }

          const outliers = data.filter(
            (d) =>
              violin.value.fun(d) < bulk[0].x0 ||
              violin.value.fun(d) > bulk[bulk.length - 1].x1
          );

          console.log(
            "outliers before repel",
            group,
            xScale.domain(),
            xScale.bandwidth(),
            outliers.map((d) => yScale(violin.value.fun(d)))
          );

          const outliersRep = repel(
            outliers,
            (d) => xScale(group) + xScale.bandwidth() / 2,
            (d) => yScale(violin.value.fun(d)),
            (d) => 4
          );

          console.log("outliers after repel", outliersRep);

          const data_values_remaining = binData
            .filter(
              (d) => d.x0 >= bulk[0].x0 && d.x1 <= bulk[bulk.length - 1].x1
            )
            .flat();

          return {
            group: group,
            binData: binData.map((d) => ({
              count: d.length,
              value: d.x0,
            })),
            stats: {
              count: data_values_remaining.length,
              min: d3.min(data_values_remaining),
              max: d3.max(data_values_remaining),
              median: d3.median(data_values_remaining),
              firstQuartile: d3.quantile(data_values_remaining, 0.25),
              thirdQuartile: d3.quantile(data_values_remaining, 0.75),
            },
            points: outliersRep,
          };
        });
      console.log("computed violin plot");
      return data;
    };

    setState((state) => ({
      ...state,
      violin: {
        ...violin,
        compute: compute,
        loaded: true,
        groups: [...d3.group(state.data, violin.group.fun).keys()],
      },
    }));
  };

  const setPie = (newPie) => {
    const pie = { ...state.pie, ...newPie };
    const data = updatePie(state.data, pie);
    setState((state) => ({
      ...state,
      pie: {
        ...pie,
        data: data,
        loaded: true,
      },
    }));
  };

  const setMap = (newMap) => {
    const map = { ...state.map, ...newMap };
    const data = updateMap(state.data, map);
    setState((state) => ({
      ...state,
      map: {
        ...map,
        ...data,
        loaded: true,
      },
    }));
  };

  const setCalendar = (newCalendar) => {
    const calendar = { ...state.calendar, ...newCalendar };
    const colorScaleFn = (colors) => {
      const realColors = colors.slice(1, colors.length - 1);
      return (value) => {
        var retVal;
        if (value === 0) retVal = colors[0];
        else if (value === "selected") retVal = colors[colors.length - 1];
        else
          retVal =
            realColors[
              Math.floor(
                Math.min(value / calendar.value.maxValue, 1) *
                  (realColors.length - 1)
              )
            ];
        return retVal;
      };
    };
    const data = updateCalendar(
      state.data,
      calendar,
      selectionContext.selected.map((id) =>
        activityContext.activityDict[id].properties.start_date_local.slice(
          0,
          10
        )
      ),
      selectionContext.setSelected
    );
    setState((state) => ({
      ...state,
      calendar: {
        ...calendar,
        ...data,
        extent: d3.extent(state.data, (f) => f.date),
        colorScaleFn: colorScaleFn,
        loaded: true,
      },
    }));
  };

  const setScatter = (newScatter) => {
    setState((state) => ({
      ...state,
      scatter: {
        ...state.scatter,
        ...newScatter,
      },
    }));
  };

  useEffect(() => {
    if (activityContext.loaded && state.data.length > 0) {
      setTimeline({});
      setPie({});
      setCalendar({});
      setScatter({});
      setViolin({});
      setTimelineVisx({});
    }
  }, [state.data]);

  useEffect(() => {
    if (activityContext.loaded) {
      const data = activityContext.geoJson.features.map(
        (feature) => feature.properties
      );
      data.forEach((feature) => {
        feature.date = new Date(feature.start_date_local);
      });
      console.log(data);
      setState({
        ...state,
        extent: d3.extent(data, (f) => f.date),
        allData: data,
      });
    }
  }, [activityContext.geoJson]);

  useEffect(() => {
    if (activityContext.loaded) {
      setState((state) => {
        const data = state.allData.filter((feature) =>
          filterContext.filterIDs.includes(feature.id)
        );
        const extent = d3.extent(data, (f) => f.date);
        return {
          ...state,
          extent: extent,
          data: data,
          loaded: true,
        };
      });
    }
  }, [state.allData, filterContext.filterIDs]);

  return (
    <StatsContext.Provider
      value={{
        ...state,
        setTimeline: setTimeline,
        setTimelineVisx: setTimelineVisx,
        setPie: setPie,
        setCalendar: setCalendar,
        setScatter: setScatter,
        setMap: setMap,
        setViolin: setViolin,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export { StatsContext };
