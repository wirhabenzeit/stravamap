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
import { MapContext } from "/src/contexts/MapContext";
import "mapbox-gl/dist/mapbox-gl.css";
import { mapSettings } from "../settings";
import { DownloadControl } from "/src/components/Controls/DownloadControl";
import { SelectionControl } from "/src/components/Controls/SelectionControl";
import { ActivityContext } from "/src/contexts/ActivityContext";
import { SelectionContext } from "/src/contexts/SelectionContext";
import { FilterContext } from "/src/contexts/FilterContext";
import { ListContext } from "/src/contexts/ListContext";
import { categorySettings } from "../settings";
import { listSettings } from "../settings";
import { Paper } from "@mui/material";
import { DataGrid, GridColumnMenu } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import LayerSwitcher from "/src/components/LayerSwitcher";

function Download(props) {
  useControl(() => new DownloadControl(), {
    position: props.position,
  });
  return null;
}

function Selection(props) {
  const selectionContext = useContext(SelectionContext);

  useControl(
    () =>
      new SelectionControl({
        mapRef: props.mapRef,
        layers: ["routeLayerBG", "routeLayerBGsel"],
        source: "routeSource",
        selectionHandler: (sel) => selectionContext.setSelected(sel),
      })
  );
}

/*function RouteSource(props) {
  const activityContext = useContext(ActivityContext);
  return (
    {props.children}
  );
}*/

function RouteLayer() {
  const filterContext = useContext(FilterContext);
  const selectionContext = useContext(SelectionContext);
  const activityContext = useContext(ActivityContext);

  console.log("routeLayer render");
  //console.log(filterContext.filterIDs, activityContext);

  const theme = useTheme();

  const color = ["match", ["get", "sport_type"]];
  Object.entries(categorySettings).forEach(([key, value]) => {
    value.alias.forEach((alias) => {
      color.push(alias, value.color);
    });
  });
  color.push("#000000");

  const filter = ["in", "id", ...filterContext.filterIDs];
  const selectedFilter = ["in", "id", ...selectionContext.selected];
  const unselectedFilter = ["!in", "id", ...selectionContext.selected];
  const filterAll = ["all", filter, unselectedFilter];
  const filterSel = ["all", filter, selectedFilter];
  const filterHigh = ["==", "id", selectionContext.highlighted];
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

function Map({ mapRef }) {
  const [cursor, setCursor] = useState("auto");
  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor("auto"), []);
  const map = useContext(MapContext);
  const [viewport, setViewport] = useState(map.position);
  const activityContext = useContext(ActivityContext);
  const filterContext = useContext(FilterContext);
  const selectionContext = useContext(SelectionContext);
  const listContext = useContext(ListContext);

  const controls = useMemo(
    () => (
      <>
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <FullscreenControl position="top-right" />
        <Download position="top-right" context={map} />
        <Selection position="top-right" mapRef={mapRef} />
        <LayerSwitcher
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
          }}
          mapRef={mapRef}
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

  const routes = useMemo(
    () => <RouteLayer />,
    [activityContext.geoJson, filterContext]
  );

  useEffect(() => {
    console.log("Map render");
    return () => {
      //mapRef.current?.getMap().setTerrain();
      console.log("Map unmount");
    };
  }, []);

  return (
    <>
      <ReactMapGL
        reuseMaps
        styleDiffing={false}
        ref={mapRef}
        boxZoom={false}
        {...viewport}
        onMove={(evt) => setViewport(evt.viewState)}
        projection="globe"
        onMoveEnd={(evt) => {
          map.setPosition(evt.viewState);
        }}
        mapStyle={
          mapSettings[map.baseMap].type == "vector"
            ? mapSettings[map.baseMap].url
            : undefined
        }
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        cursor={cursor}
        interactiveLayerIds={["routeLayerBG", "routeLayerBGsel"]}
        //onClick={(evt) =>
        //  filter.setSelected(evt.features.map((feature) => feature.id))
        //}
        terrain={{
          source: "mapbox-dem",
          exaggeration: map.threeDim ? 1.5 : 0,
        }}
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
        {activityContext.loaded && routes}
      </ReactMapGL>
      <Paper
        elevation={3}
        sx={{
          zIndex: 2,
          position: "absolute",
          left: "40px",
          maxWidth: "800px",
          height: selectionContext.selected.length > 7 ? "210px" : "auto",
          right: "10px",
          width: "calc(100% - 50px)",
          bottom: "30px",
          margin: "auto",
          visibility:
            selectionContext.selected.length > 0 ? "visible" : "hidden",
        }}
      >
        <DataGrid
          hideFooter={true}
          sx={{
            ".MuiDataGrid-iconButtonContainer": {
              visibility:
                selectionContext.selected.length > 0
                  ? "inherit"
                  : "hidden !important",
            },
          }}
          rowHeight={35}
          disableColumnMenu={true}
          rows={selectionContext.selected.map(
            (key) => activityContext.activityDict[key]
          )}
          autoHeight={selectionContext.selected.length <= 7}
          initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
          //pageSizeOptions={[10]}
          columns={listSettings.columns}
          disableColumnFilter
          density="compact"
          sortModel={listContext.compact.sortModel}
          onSortModelChange={(model) =>
            listContext.setSortModel("compact", model)
          }
          columnVisibilityModel={listContext.compact.columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) =>
            listContext.setColumnVisibilityModel("compact", newModel)
          }
          onRowClick={(row, params) => {
            console.log(row.id + " clicked");
            console.log(mapRef.current);
            selectionContext.setHighlighted(row.id);
            mapRef.current?.fitBounds(
              activityContext.activityDict[row.id].bbox,
              {
                padding: 100,
              }
            );
          }}
        />
      </Paper>
    </>
  );
}

export default Map;