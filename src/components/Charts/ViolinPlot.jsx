import React, {
  useContext,
  cloneElement,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";

const selectedBrushStyle = {
  fill: `url(#brush_pattern)`,
  stroke: "#1976d2",
};

import {
  scaleLinear,
  scaleLog,
  scaleSqrt,
  scaleOrdinal,
  scaleBand,
  scaleTime,
} from "@visx/scale";

import { ViolinPlot, BoxPlot } from "@visx/stats";
import { PatternLines } from "@visx/pattern";
import { LinearGradient, GradientTealBlue } from "@visx/gradient";
import { Circle, LinePath, AreaClosed, AreaStack } from "@visx/shape";
import { Group } from "@visx/group";
import { Axis, AxisLeft } from "@visx/axis";
import {
  AnimatedAxis,
  AnimatedGridRows,
  AnimatedGridColumns,
} from "@visx/react-spring";
import {
  Annotation,
  HtmlLabel,
  Label,
  Connector,
  CircleSubject,
  LineSubject,
} from "@visx/annotation";
import { useTooltip, TooltipWithBounds, withTooltip } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { voronoi } from "@visx/voronoi";

import { StatsContext } from "../../contexts/StatsContext";
import { ActivityContext } from "../../contexts/ActivityContext";
import { SelectionContext } from "../../contexts/SelectionContext";

function addAlpha(color, opacity) {
  const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
  return color + _opacity.toString(16).toUpperCase();
}
import { Typography } from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";

import { violinSettings } from "../../settings";

import { TitleBox, CustomSelect, IconTooltip } from "../StatsUtilities.jsx";

const ViolinVisx = withTooltip(
  ({
    width,
    height,
    hideTooltip,
    showTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  }) => {
    const statsContext = useContext(StatsContext);
    const selectionContext = useContext(SelectionContext);
    const values = violinSettings.values;
    const groups = violinSettings.groups;
    const scaleYs = violinSettings.scaleYs;

    const svgRef = useRef(null);
    const [nodeId, setNodeId] = useState(null);
    const margin = useMemo(
      () => ({
        top: 80,
        left: 60,
        right: 30,
        bottom: 30,
      }),
      []
    );

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = useMemo(() => {
      const newXscale = scaleBand({
        range: [margin.left, innerWidth + margin.left],
        domain: statsContext.violin.groups,
        padding: 0,
      });
      console.log("computied xScale", statsContext.violin.groups);
      return newXscale;
    }, [margin, innerWidth, statsContext.violin.groups]);

    const yScale = useMemo(
      () =>
        statsContext.violin.scaleY.scale({
          range: [innerHeight + margin.top, margin.top],
          domain: [
            statsContext.violin.value.minValue,
            statsContext.violin.value.maxValue ||
              Math.max(...statsContext.data.map(statsContext.violin.value.fun)),
          ],
        }),
      [
        statsContext.data,
        statsContext.violin.value,
        statsContext.violin.scaleY,
        innerHeight,
        margin,
      ]
    );

    const outlierNum = 8;

    const data = useMemo(() => {
      console.log("computing violin data");
      return statsContext.violin.compute({
        margin,
        innerWidth,
        innerHeight,
        xScale,
        yScale,
        outlierNum,
      });
    }, [margin, innerWidth, innerHeight, xScale, yScale]);

    const boxWidth = xScale.bandwidth();
    const constrainedWidth = Math.min(100, 0.8 * boxWidth);

    console.log(
      "rendering violin",
      new Date(),
      data[0]?.stats,
      data[0]?.points,
      data[0]?.binData
    );

    return (
      statsContext.violin.loaded && (
        <>
          <svg width="100%" height="100%" ref={svgRef} position="relative">
            <GradientTealBlue id="statsplot" />
            <rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="url(#statsplot)"
              rx={14}
            />
            <foreignObject
              width={width}
              height={height}
              x={10}
              y={10}
              position="absolute"
            >
              <TitleBox sx={{ position: "absolute", top: 0, left: 0 }}>
                <Typography variant="h6" key="heading">
                  Violin Plot
                </Typography>
                <CustomSelect
                  key="value"
                  propName="value"
                  value={statsContext.violin.value}
                  name="Value"
                  options={values}
                  setState={statsContext.setViolin}
                />
                <CustomSelect
                  key="group"
                  propName="group"
                  value={statsContext.violin.group}
                  name="Group"
                  options={groups}
                  setState={statsContext.setViolin}
                />
                <CustomSelect
                  key="scaleY"
                  propName="scaleY"
                  value={statsContext.violin.scaleY}
                  name="Scale"
                  options={scaleYs}
                  setState={statsContext.setViolin}
                />
              </TitleBox>
            </foreignObject>
            <PatternLines
              id="hViolinLines"
              height={3}
              width={3}
              stroke="#ced4da"
              strokeWidth={1}
              // fill="rgba(0,0,0,0.3)"
              orientation={["horizontal"]}
            />
            <AnimatedAxis
              orientation="top"
              scale={xScale}
              top={margin.top}
              tickFormat={(d) => statsContext.violin.group.format(d)}
              hideAxisLine={true}
              hideTicks={true}
              numTicks={15}
              tickLabelProps={{
                fill: "#ffffff",
                angle: 90,
                textAnchor: "begin",
                dy: 0,
                dx: 15,
                fontWeight: "bold",
              }}
            />
            <AxisLeft
              scale={yScale}
              left={margin.left}
              top={0}
              tickValues={statsContext.violin.scaleY.ticks(yScale)}
              tickFormat={statsContext.violin.value.formatAxis}
              hideAxisLine={true}
              hideTicks={true}
              tickLabelProps={{ fill: "#ffffff" }}
            />
            <AnimatedGridRows
              left={margin.left}
              scale={yScale}
              width={innerWidth}
              strokeOpacity={0.15}
              stroke="#fff"
            />
            <Group>
              {data.map((d) => (
                <g key={d.group}>
                  {d.binData && d.binData.length > 0 && (
                    <ViolinPlot
                      data={d.binData}
                      stroke="#dee2e6"
                      left={
                        xScale(d.group) + boxWidth / 2 - constrainedWidth / 2
                      }
                      width={constrainedWidth}
                      valueScale={yScale}
                      fill="url(#hViolinLines)"
                    />
                  )}
                  {d.stats && d.stat && (
                    <BoxPlot
                      {...d.stats}
                      left={
                        xScale(d.group) + boxWidth / 2 - constrainedWidth / 5
                      }
                      boxWidth={constrainedWidth * 0.4}
                      fill="#FFFFFF"
                      fillOpacity={0.3}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      valueScale={yScale}
                      medianProps={{
                        style: {
                          stroke: "white",
                        },
                      }}
                    />
                  )}
                  {d.points.map((outlier) => (
                    <Circle
                      key={outlier.data.id}
                      cx={outlier.x}
                      cy={outlier.y}
                      r={nodeId === outlier.data.id ? 5 : 3}
                      fill={statsContext.violin.color(outlier.data)}
                      fillOpacity={0.8}
                      stroke={
                        selectionContext.selected.includes(outlier.data.id)
                          ? "#000"
                          : "#FFF"
                      }
                      strokeWidth={2}
                      onMouseOver={(e) => {
                        setNodeId(outlier.data.id);
                        showTooltip({
                          tooltipLeft: outlier.x,
                          tooltipTop: outlier.y,
                          tooltipData: {
                            textRight: outlier.data.name,
                            color: statsContext.violin.color(outlier.data),
                            icon: statsContext.violin.icon(outlier.data),
                            textLeft: statsContext.violin.value.format(
                              statsContext.violin.value.fun(outlier.data)
                            ),
                          },
                        });
                      }}
                      onMouseLeave={() => {
                        hideTooltip();
                        setNodeId(null);
                      }}
                    />
                  ))}
                </g>
              ))}
            </Group>
          </svg>
          {tooltipOpen &&
            tooltipData &&
            tooltipLeft != null &&
            tooltipTop != null && (
              <IconTooltip
                left={tooltipLeft}
                top={tooltipTop}
                {...tooltipData}
              />
            )}
        </>
      )
    );
  }
);

export default ViolinVisx;
