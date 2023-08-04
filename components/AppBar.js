import * as React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MapIcon from "@mui/icons-material/Map";
import Menu from "@mui/material/Menu";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import { ActivityContext } from "@/ActivityContext";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

export const LinkWithQuery = ({ children, href, ...props }) => {
  const search = useRouter().query.athlete;
  return (
    <Link
      href={search !== undefined ? href + "?athlete=" + search : href}
      {...props}
    >
      {children}
    </Link>
  );
};

const pages = { Map: "/", List: "/list" };

function LoginButton() {
  return (
    <IconButton
      href={`https://www.strava.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${window.location.href}&approval_prompt=auto&scope=read,activity:read`}
      color="inherit"
      sx={{ p: 0 }}
    >
      <img src="/btn_strava_connectwith_light.svg" />
    </IconButton>
  );
}

function UserSettings() {
  const [anchorElUser, setAnchorElUser] = React.useState(null);
  const activityContext = React.useContext(ActivityContext);

  return (
    <Box sx={{ flexGrow: 0 }}>
      <IconButton
        onClick={(e) => {
          setAnchorElUser(e.currentTarget);
        }}
        sx={{ p: 0 }}
      >
        <Avatar
          alt={activityContext.athlete_name}
          src={activityContext.athlete_img}
        />
      </IconButton>
      <Menu
        sx={{ mt: "45px" }}
        id="menu-appbar"
        anchorEl={anchorElUser}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        keepMounted
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        open={Boolean(anchorElUser)}
        onClose={() => {
          setAnchorElUser(null);
        }}
      >
        <MenuItem
          key="stravaLink"
          onClick={() => {
            setAnchorElUser(null);
          }}
        >
          <Link href={"https://strava.com/athletes/" + activityContext.athlete}>
            <Typography textAlign="center">Strava Profile</Typography>
          </Link>
        </MenuItem>
        <MenuItem
          key="logout"
          onClick={() => {
            setAnchorElUser(null);
          }}
        >
          <Typography
            textAlign="center"
            onClick={() => {
              Cookies.remove("athlete");
              location.reload();
            }}
          >
            Logout
          </Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}

function PageLinks({ setPage }) {
  const [anchorElNav, setAnchorElNav] = React.useState(null);

  return (
    <>
      <Box sx={{ flexGrow: 1, display: { xs: "flex", sm: "none" } }}>
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={(e) => {
            setAnchorElNav(e.currentTarget);
          }}
          color="inherit"
        >
          <MenuIcon />
        </IconButton>
        <Menu
          id="menu-appbar"
          anchorEl={anchorElNav}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          keepMounted
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          open={Boolean(anchorElNav)}
          onClose={() => {
            setAnchorElNav(null);
          }}
          sx={{
            display: { xs: "block", sm: "none" },
          }}
        >
          {Object.entries(pages).map(([name, url]) => (
            <MenuItem key={name}>
              <LinkWithQuery href={url} key={name}>
                <Typography textAlign="center">{name}</Typography>
              </LinkWithQuery>
            </MenuItem>
          ))}
        </Menu>
      </Box>
      <Box sx={{ flexGrow: 1, display: { xs: "none", sm: "flex" } }}>
        {Object.entries(pages).map(([name, url]) => (
          <LinkWithQuery href={url} key={name}>
            <Button key={name} sx={{ my: 2, color: "white", display: "block" }}>
              {name}
            </Button>
          </LinkWithQuery>
        ))}
      </Box>
    </>
  );
}

export default function ResponsiveAppBar({
  open,
  setOpen,
  drawerWidth,
  page,
  setPage,
}) {
  const activityContext = React.useContext(ActivityContext);

  const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== "open",
  })(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }));

  return (
    <AppBar position="fixed" open={open}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={() => {
            setOpen(true);
          }}
          edge="start"
          sx={{
            marginRight: 3,
            ...(open && { display: "none" }),
          }}
        >
          <ChevronRightIcon />
        </IconButton>
        <MapIcon sx={{ mr: 1 }} />
        <Typography
          variant="h6"
          noWrap
          component="a"
          href="/"
          sx={{
            mr: 2,
            //fontFamily: 'monospace', //
            fontWeight: 700,
            //letterSpacing: '.3rem',
            color: "inherit",
            textDecoration: "none",
          }}
        >
          StravaMap
        </Typography>
        <PageLinks setPage={setPage} />
        {activityContext.loaded && Cookies.get("athlete") && <UserSettings />}
        {!activityContext.loaded && !activityContext.loading && <LoginButton />}
      </Toolbar>
    </AppBar>
  );
}