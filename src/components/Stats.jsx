// install (please try to align the version of installed @nivo packages)
// yarn add @nivo/bump
import { ResponsiveAreaBump } from "@nivo/bump";
import { ResponsiveLine } from "@nivo/line";
import React, { useContext } from "react";
import { StatsContext } from "../contexts/StatsContext";
import { ActivityContext } from "../contexts/ActivityContext";
function addAlpha(color, opacity) {
  const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
  return color + _opacity.toString(16).toUpperCase();
}
import {
  ListSubheader,
  CardHeader,
  ButtonGroup,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Card,
  Paper,
  CardContent,
  Unstable_Grid2 as Grid,
  ToggleButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";

import { aliasMap, categorySettings } from "../settings";
import * as d3 from "d3-array";
import * as d3t from "d3-time";
import * as d3tf from "d3-time-format";
import { FilterContext } from "../contexts/FilterContext";

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));

function range(from, to, step = 1) {
  return [...Array(Math.floor((to - from) / step)).keys()].map(
    (i) => i * step + from
  );
}
function fillZeros(arr, step = 1) {
  return arr.reduce(
    (prev, curr) => [
      ...prev,
      ...(prev.length > 0 && prev[prev.length - 1][0] < curr[0] - step
        ? range(prev[prev.length - 1][0] + step, curr[0], step).map((x) => [
            x,
            0,
          ])
        : []),
      curr,
    ],
    []
  );
}

//import { ActivityContext } from "/src/contexts/ActivityContext";

// make sure parent container have a defined height when using
// responsive component, otherwise height will be 0 and
// no chart will be rendered.
// website examples showcase many properties,
// you'll often use just a few of them.

function YearlySummary() {
  const statsContext = useContext(StatsContext);
  const filterContext = useContext(FilterContext);

  const [timePeriod, setTimePeriod] = React.useState("month");
  const [yearAvg, setYearAvg] = React.useState(false);
  const [yearHigh, setYearHigh] = React.useState(new Date().getFullYear());
  const [stat, setStat] = React.useState("total");
  const [group, setGroup] = React.useState("sport_group");
  const [value, setValue] = React.useState("distance");

  const timePeriods = {
    year: {
      label: "Year",
      format: (v) => v,
      fun: (d) => d.date.getFullYear(),
      unit: "",
      step: 1,
      scale: "linear",
    },
    yearMonth: {
      label: "Year/Month",
      format: (v) => v,
      fun: (d) => d.date.getFullYear() + d.date.getMonth() / 12,
      unit: "",
      step: 1 / 12,
      scale: "linear",
    },
    month: {
      label: "Month",
      format: (v) =>
        new Date(2023, v, 1).toLocaleString("default", { month: "short" }),
      fun: (d) => d.date.getMonth(),
      relative: "years",
      unit: "",
      step: 1,
      scale: "point",
    },
    week: {
      label: "Week",
      format: (v) => v,
      fun: (d) => parseInt(d3tf.timeFormat("%W")(d.date)),
      relative: "years",
      unit: "",
      step: 1,
      scale: "linear",
    },
    day: {
      label: "Day",
      format: (v) =>
        new Date(Date.UTC(2017, 0, 2 + v)).toLocaleString("default", {
          weekday: "short",
        }),
      fun: (d) => (d.date.getDay() + 6) % 7,
      relative: "weeks",
      unit: "",
      step: 1,
      scale: "point",
    },
  };

  const values = {
    distance: {
      fun: (d) => d.distance,
      format: (v) => (v / 1000).toFixed(),
      label: "Distance",
      unit: "km",
    },
    elevation: {
      fun: (d) => d.total_elevation_gain,
      format: (v) => v.toFixed(),
      label: "Elevation",
      unit: "m",
    },
    time: {
      fun: (d) => d.elapsed_time,
      format: (v) => (v / 3600).toFixed(1),
      label: "Duration",
      unit: "h",
    },
  };
  const stats = {
    count: {
      label: "Count",
      fun: (v) =>
        timePeriods[timePeriod].relative && yearAvg
          ? v.length / statsContext[timePeriods[timePeriod].relative].length
          : v.length,
      format: (v) =>
        timePeriods[timePeriod].relative ? v.toFixed(1) : v.toFixed(),
    },
    total: {
      label: "Total",
      format: values[value].format,
      fun: (v) =>
        timePeriods[timePeriod].relative && yearAvg
          ? d3.sum(v, values[value].fun) /
            statsContext[timePeriods[timePeriod].relative].filter((d) =>
              timePeriod == "day" && !yearAvg
                ? d.getFullYear() == v[0].date.getFullYear()
                : true
            ).length
          : d3.sum(v, values[value].fun),
    },
    avg: {
      label: "Average",
      fun: (v) => d3.mean(v, values[value].fun),
      format: values[value].format,
    },
    median: {
      label: "Median",
      format: values[value].format,
      fun: (v) => d3.median(v, values[value].fun),
    },
    min: {
      label: "Min",
      format: values[value].format,
      fun: (v) => d3.min(v, values[value].fun),
    },
    max: {
      label: "Max",
      format: values[value].format,
      fun: (v) => d3.max(v, values[value].fun),
    },
  };
  const groups = {
    sport_group: {
      label: "Sport Group",
      fun: (d) => aliasMap[d.sport_type],
      color: (id) => categorySettings[id].color,
    },
    sport_type: {
      label: "Sport Type",
      fun: (d) => d.sport_type,
      color: (id) => categorySettings[aliasMap[id]].color,
    },
    no_group: {
      label: "All",
      fun: (d) => "All",
      color: (id) => "#000000",
    },
  };

  const data = (
    yearAvg || !timePeriods[timePeriod].relative
      ? d3.rollups(
          d3.filter(statsContext.data, (f) =>
            filterContext.filterIDs.includes(f.id)
          ),
          stats[stat].fun,
          groups[group].fun,
          timePeriods[timePeriod].fun
        )
      : d3
          .rollups(
            d3.filter(statsContext.data, (f) =>
              filterContext.filterIDs.includes(f.id)
            ),
            stats[stat].fun,
            groups[group].fun,
            (f) => f.date.getFullYear(),
            timePeriods[timePeriod].fun
          )
          .map(([sport, years]) =>
            years.map(([year, data]) => [[sport, year], data])
          )
          .flat()
  ).map(([id, data]) => ({
    id: id,
    color:
      yearAvg || !timePeriods[timePeriod].relative
        ? groups[group].color(id)
        : groups[group].color(id[0]),
    data: fillZeros(
      data.sort((a, b) => a[0] - b[0]),
      timePeriods[timePeriod].step
    ).map(([d, v]) => ({ x: d, y: v })),
  }));
  const minMax = d3.extent(statsContext.years).map((d) => d.getFullYear());

  return (
    statsContext.loaded && (
      <Card>
        <CardHeader
          title="Yearly Summary"
          action={
            <Grid
              container
              justify="center"
              alignItems="center"
              direction="row"
            >
              <FormControl sx={{ mx: 1 }}>
                <InputLabel>Axis</InputLabel>
                <Select
                  size="small"
                  value={timePeriod}
                  label="Value"
                  onChange={(event) => {
                    setTimePeriod(event.target.value);
                  }}
                >
                  <ListSubheader>Absolute</ListSubheader>
                  {Object.entries(timePeriods)
                    .filter(([key, agg]) => !agg.relative)
                    .map(([key, aggregator]) => (
                      <MenuItem value={key} key={key}>
                        {aggregator.label}
                      </MenuItem>
                    ))}
                  <ListSubheader>Relative</ListSubheader>
                  {Object.entries(timePeriods)
                    .filter(([key, agg]) => agg.relative)
                    .map(([key, aggregator]) => (
                      <MenuItem value={key} key={key}>
                        {aggregator.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {timePeriods[timePeriod].relative && (
                <>
                  <ButtonGroup variant="outlined">
                    <Button
                      disabled={yearAvg || yearHigh == minMax[0]}
                      onClick={(e) => {
                        setYearHigh(yearHigh - 1);
                      }}
                    >
                      -
                    </Button>
                    <Button
                      onClick={(e) => {
                        setYearAvg(!yearAvg);
                      }}
                    >
                      {yearAvg ? "Avg" : yearHigh}
                    </Button>
                    <Button
                      disabled={yearAvg || yearHigh == minMax[1]}
                      onClick={(e) => {
                        setYearHigh(yearHigh + 1);
                      }}
                    >
                      +
                    </Button>
                  </ButtonGroup>
                </>
              )}
              <FormControl sx={{ mx: 1 }}>
                <InputLabel>Group</InputLabel>
                <Select
                  size="small"
                  value={group}
                  label="Group"
                  onChange={(event) => setGroup(event.target.value)}
                >
                  {Object.entries(groups).map(([key, aggregator]) => (
                    <MenuItem value={key} key={key}>
                      {aggregator.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ mx: 1 }}>
                <InputLabel>Stat</InputLabel>
                <Select
                  size="small"
                  value={stat}
                  label="Value"
                  onChange={(event) => setStat(event.target.value)}
                >
                  {Object.entries(stats).map(([key, aggregator]) => (
                    <MenuItem value={key} key={key}>
                      {aggregator.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ mx: 1 }}>
                <InputLabel>Value</InputLabel>
                <Select
                  size="small"
                  value={value}
                  label="Value"
                  onChange={(event) => setValue(event.target.value)}
                  disabled={stat === "count"}
                >
                  {Object.entries(values).map(([key, aggregator]) => (
                    <MenuItem value={key} key={key}>
                      {aggregator.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          }
        />
        <CardContent sx={{ width: 1, aspectRatio: 2 }}>
          <ResponsiveLine
            animate
            margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
            curve="monotoneX"
            enablePointLabel={false}
            useMesh={true}
            //enableSlices="x"
            //sliceTooltip={({ slice }) => JSON.stringify(slice)}
            isInteractive={true}
            enablePoints={timePeriods[timePeriod].step == 1}
            yFormat={stats[stat].format}
            data={data}
            xScale={{
              type: timePeriods[timePeriod].scale,
              min: "auto",
              max: "auto",
            }}
            axisBottom={{
              //tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              format: timePeriods[timePeriod].format,
            }}
            axisLeft={{
              //tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: stat == "count" ? "#" : values[value].unit,
              format: stats[stat].format,
            }}
            colors={(d) =>
              addAlpha(
                d.color,
                yearAvg ||
                  d.id[1] == yearHigh ||
                  !timePeriods[timePeriod].relative
                  ? 1
                  : 0.15
              )
            }
            onClick={(d) => {
              console.log(d);
              setYearHigh(d.serieId[1]);
            }}
          />
        </CardContent>
      </Card>
    )
  );
}

const Scatter = () => {
  const statsContext = useContext(StatsContext);
  const values = scatterSettings.values;
  const theme = useTheme();
  var dataDict;
  if (statsContext.scatter.data)
    dataDict = d3.rollup(
      statsContext.scatter.data,
      (v) => v[0],
      (d) => d.id
    );

  const ScatterTooltip = ({ point }) => {
    const catProps = dataDict.get(point.serieId);
    return (
      <Chip
        sx={{
          backgroundColor: theme.palette.background.paper,
          border: 1,
          borderColor: catProps.color,
        }}
        size="small"
        label={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <FontAwesomeIcon
              fontSize="small"
              icon={catProps.icon}
              color={catProps.color}
            />
            <Typography
              sx={{
                ml: 1,
                fontSize: "small",
              }}
            >
              {point.data.title}
            </Typography>
          </Box>
        }
        variant="filled"
      />
    );
  };

  return (
    <>
      <TitleBox>
        <Typography variant="h6" key="heading">
          Scatter
        </Typography>
        <CustomSelect
          key="xValue"
          propName="xValue"
          value={statsContext.scatter.xValue}
          name="X"
          options={values}
          setState={statsContext.setScatter}
        />
        <CustomSelect
          key="yValue"
          propName="yValue"
          value={statsContext.scatter.yValue}
          name="Y"
          options={values}
          setState={statsContext.setScatter}
        />
        <CustomSelect
          key="size"
          propName="size"
          value={statsContext.scatter.size}
          name="Size"
          options={values}
          setState={statsContext.setScatter}
        />
      </TitleBox>
      {statsContext.scatter.loaded && statsContext.data.length > 0 && (
        <ResponsiveScatterPlotCanvas
          data={statsContext.scatter.data}
          margin={{ top: 10, right: 40, bottom: 100, left: 60 }}
          xScale={{ type: "linear", min: "auto", max: "auto" }}
          yScale={{ type: "linear", min: "auto", max: "auto" }}
          blendMode="multiply"
          xFormat={statsContext.scatter.xValue.format}
          yFormat={statsContext.scatter.yValue.format}
          nodeSize={(d) => d.data.size}
          colors={(d) => dataDict.get(d.serieId).color}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            orient: "bottom",
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            format: statsContext.scatter.xValue.formatAxis,
          }}
          axisLeft={{
            orient: "left",
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            format: statsContext.scatter.yValue.formatAxis,
          }}
          tooltip={({ node }) => <ScatterTooltip point={node} />}
          renderNode={(ctx, node) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size / 2, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();
            if (node.data.selected) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.size / 2 + 2, 0, 2 * Math.PI);
              ctx.strokeStyle = "#000000";
              ctx.stroke();
            }
          }}
          onClick={statsContext.scatter.onClick}
        />
      )}
    </>
  );
};

const TypePie = () => {
  const statsContext = useContext(StatsContext);
  const values = pieSettings.values;
  const groups = pieSettings.groups;
  const timeGroups = pieSettings.timeGroups;

  return (
    <>
      <TitleBox>
        <Typography variant="h6" key="title">
          Sport
        </Typography>
        <CustomSelect
          key="value"
          propName="value"
          value={statsContext.pie.value}
          name="Value"
          options={values}
          setState={statsContext.setPie}
        />
        <CustomSelect
          key="group"
          propName="group"
          value={statsContext.pie.group}
          name="Sport"
          options={groups}
          setState={statsContext.setPie}
        />
        <CustomPicker
          key="timeGroup"
          propName="timeGroup"
          options={timeGroups}
          value={statsContext.pie.timeGroup}
          range={[2014, 2023]}
          setState={statsContext.setPie}
        />
      </TitleBox>
      {!statsContext.pie.loaded && (
        <Skeleton
          variant="rounded"
          width="90%"
          height="80%"
          sx={{ margin: "auto" }}
        />
      )}
      {statsContext.pie.loaded && (
        <ResponsivePie
          data={statsContext.pie.data}
          margin={{ top: 40, right: 120, bottom: 100, left: 120 }}
          innerRadius={0.6}
          padAngle={0.7}
          cornerRadius={5}
          activeOuterRadiusOffset={8}
          borderWidth={0}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: "color" }}
          arcLabelsSkipAngle={20}
          colors={(d) => d.data.color}
          valueFormat={statsContext.pie.value.format}
        />
      )}
    </>
  );
};

export default function StatsView() {
  const statsContext = useContext(StatsContext);
  return (
    <Grid container spacing={2}>
      <Grid xs={12}>{statsContext.loaded && <YearlySummary />}</Grid>
    </Grid>
  );
}
