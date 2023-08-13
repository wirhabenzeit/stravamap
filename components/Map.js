import {
  useRef,
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import ReactMapGL, {
  NavigationControl,
  GeolocateControl,
  FullscreenControl,
  useControl,
  Layer,
  Source,
} from "react-map-gl";
import Head from "next/head";
import { MapContext } from "@/components/Context/MapContext";
import "mapbox-gl/dist/mapbox-gl.css";
import { mapSettings } from "@/settings";
import { DownloadControl } from "@/components/Controls/DownloadControl";
import { SelectionControl } from "@/components/Controls/SelectionControl";
import { ActivityContext } from "@/components/Context/ActivityContext";
import { FilterContext } from "@/components/Context/FilterContext";
import { ListContext } from "@/components/Context/ListContext";
import { categorySettings } from "@/settings";
import { listSettings } from "@/settings";
import { Paper } from "@mui/material";
import { DataGrid, GridColumnMenu } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import LayerSwitcher from "@/components/LayerSwitcher";

function Download(props) {
  useControl(() => new DownloadControl(), {
    position: props.position,
  });
  return null;
}

function Selection(props) {
  const filterContext = useContext(FilterContext);

  useControl(
    () =>
      new SelectionControl({
        mapRef: props.mapRef,
        layers: ["routeLayerBG", "routeLayerBGsel"],
        source: "routeSource",
        selectionHandler: (sel) => filterContext.setSelected(sel),
      }),
    {
      position: props.position,
    }
  );
  return null;
}

/*function RouteSource(props) {
  const activityContext = useContext(ActivityContext);
  return (
    {props.children}
  );
}*/

function RouteLayer() {
  const filterContext = useContext(FilterContext);
  const activityContext = useContext(ActivityContext);

  console.log("routeLayer render");
  console.log(filterContext.filterIDs, activityContext);

  const theme = useTheme();

  const color = ["match", ["get", "sport_type"]];
  Object.entries(categorySettings).forEach(([key, value]) => {
    value.alias.forEach((alias) => {
      color.push(alias, value.color);
    });
  });
  color.push("#000000");

  const filter = ["in", "id", ...filterContext.filterIDs];
  const selectedFilter = ["in", "id", ...filterContext.selected];
  const unselectedFilter = ["!in", "id", ...filterContext.selected];
  const filterAll = ["all", filter, unselectedFilter];
  const filterSel = ["all", filter, selectedFilter];
  const filterHigh = ["==", "id", filterContext.highlighted];
  return (
    <Source data={activityContext.geoJson} id="routeSource" type="geojson">
      <Layer
        source="routeSource"
        id="routeLayerBG"
        type="line"
        paint={{ "line-color": "black", "line-width": 4 }}
        filter={filterAll}
      />
      <Layer
        source="routeSource"
        id="routeLayerFG"
        type="line"
        paint={{ "line-color": color, "line-width": 2 }}
        filter={filterAll}
      />
      <Layer
        source="routeSource"
        id="routeLayerBGsel"
        type="line"
        paint={{ "line-color": "black", "line-width": 6 }}
        filter={filterSel}
      />
      <Layer
        source="routeSource"
        id="routeLayerMIDsel"
        type="line"
        paint={{ "line-color": color, "line-width": 4 }}
        filter={filterSel}
      />
      <Layer
        source="routeSource"
        id="routeLayerFGsel"
        type="line"
        paint={{ "line-color": "white", "line-width": 2 }}
        filter={filterSel}
      />
      <Layer
        source="routeSource"
        id="routeLayerHigh"
        type="line"
        paint={{
          "line-color": theme.palette.primary.light,
          "line-width": 6,
          "line-opacity": 0.4,
        }}
        filter={filterHigh}
      />
    </Source>
  );
}

function Map(props) {
  const [cursor, setCursor] = useState("auto");
  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor("auto"), []);
  const map = useContext(MapContext);
  const listState = useContext(ListContext);

  const controls = useMemo(
    () => (
      <>
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <FullscreenControl position="top-right" />
        <Download position="top-right" context={map} />
        <Selection position="top-right" mapRef={props.mapRef} />
        <LayerSwitcher
          sx={{ position: "absolute", top: 10, left: 10 }}
          mapRef={props.mapRef}
        />
      </>
    ),
    [map]
  );

  const overlayMaps = useMemo(
    () => (
      <>
        {map.overlayMaps.map((mapName) => (
          <Source
            key={mapName + "source"}
            id={mapName}
            type="raster"
            tiles={[mapSettings[mapName].url]}
            tileSize={256}
          >
            <Layer
              key={mapName + "layer"}
              id={mapName}
              type="raster"
              paint={{ "raster-opacity": mapSettings[mapName].opacity }}
            />
          </Source>
        ))}
      </>
    ),
    [map]
  );

  const routes = () => (
    <RouteSource>
      <RouteLayer />
    </RouteSource>
  );

  return (
    <>
      <ReactMapGL
        reuseMaps
        styleDiffing={false}
        ref={props.mapRef}
        boxZoom={false}
        //initialViewState={viewport}
        onLoad={() => {
          if (props.mapRef.current) {
            props.mapRef.current.flyTo(props.mapPosition, 5000);
          }
        }}
        projection="globe"
        //{...map.position}
        //onMove={(evt) => map.updateMapPosition(evt.viewState)}
        mapStyle={
          mapSettings[map.baseMap].type == "vector"
            ? mapSettings[map.baseMap].url
            : undefined
        }
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        cursor={cursor}
        //interactiveLayerIds={["routeLayerBG", "routeLayerBGsel"]}
        //onClick={(evt) =>
        //  filter.setSelected(evt.features.map((feature) => feature.id))
        //}
        //terrain={{
        //  source: "mapbox-dem",
        //  exaggeration: map.threeDim ? 1.5 : 0,
        //}}
      >
        {mapSettings[map.baseMap].type == "raster" && (
          <Source
            type="raster"
            tiles={[mapSettings[map.baseMap].url]}
            tileSize={256}
          >
            <Layer id="baseMap" type="raster" paint={{ "raster-opacity": 1 }} />
          </Source>
        )}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
        {controls}
        {overlayMaps}
        <RouteLayer />
      </ReactMapGL>
      {/*<Paper
        elevation={3}
        sx={{
          zIndex: 2,
          position: "absolute",
          left: "40px",
          maxWidth: "800px",
          height: filter.selected.length > 7 ? "210px" : "auto",
          right: "10px",
          bottom: "30px",
          margin: "auto",
          display: filter.selected.length > 0 ? "block" : "none",
        }}
      >
        <DataGrid
          hideFooter={true}
          rowHeight={35}
          disableColumnMenu={true}
          rows={activities.geoJson.features.filter((data) =>
            filter.selected.includes(data.id)
          )}
          autoHeight={filter.selected.length <= 7}
          initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
          //pageSizeOptions={[10]}
          columns={listSettings.columns}
          disableColumnFilter
          density="compact"
          sortModel={listState.compact.sortModel}
          onSortModelChange={(model) =>
            listState.setSortModel("compact", model)
          }
          columnVisibilityModel={listState.compact.columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            listState.setColumnVisibilityModel("compact", newModel)
          }
          onRowClick={(row, params) => {
            console.log(row.id + " clicked");
            filter.setHighlighted(row.id);
            props.mapRef.current?.fitBounds(
              activities.activityDict[row.id].bbox,
              {
                padding: 100,
              }
            );
          }}
        />
        </Paper>*/}
    </>
  );
}

export default Map;
