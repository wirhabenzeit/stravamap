"use client";

import {useState} from "react";
import {signIn, signOut} from "next-auth/react";
import Image from "next/image";
import * as d3 from "d3";
import {
  Box,
  List,
  ListItem,
  Tooltip,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Avatar,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  Add as AddIcon,
  Logout as LogoutIcon,
  QuestionMark as QuestionMarkIcon,
} from "@mui/icons-material";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {library} from "@fortawesome/fontawesome-svg-core";
import {fas} from "@fortawesome/free-solid-svg-icons";
library.add(fas);

import {useStore} from "~/contexts/Zustand";
import type {Account, User} from "~/server/db/schema";
import type {Activity} from "~/server/db/schema";

export function LoginButton() {
  return (
    <IconButton
      color="inherit"
      sx={{p: 0}}
      onClick={() => signIn("strava")}
    >
      <Image
        src="/btn_strava.svg"
        alt="Strava Login Icon"
        width={185}
        height={40}
      />
    </IconButton>
  );
}

export function UserSettings({
  user,
  account,
}: {
  user?: User;
  account?: Account;
}) {
  const {toggleUserSettings, loading} = useStore(
    (state) => ({
      toggleUserSettings: state.toggleUserSettings,
      loading: state.loading,
    })
  );

  return (
    user &&
    account && (
      <>
        <Box sx={{flexGrow: 0}}>
          <IconButton
            onClick={() => {
              toggleUserSettings();
            }}
            sx={{p: 0, position: "relative"}}
          >
            <Box sx={{m: 0, position: "relative"}}>
              <Avatar alt={user.name} src={user.image!} />
              {loading && (
                <CircularProgress
                  size={40}
                  sx={{
                    color: "white",
                    position: "absolute",
                    top: "0px",
                    left: "0px",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1,
                  }}
                />
              )}
            </Box>
          </IconButton>
        </Box>
        <SettingsDialog user={user} />
      </>
    )
  );
}

const checkWebhook = async () => {
  const res = await fetch("/api/strava/checkwebhook");
  try {
    const json = (await res.json()) as {
      id: number;
      callback_url: string;
    }[];
    console.log(window.location.origin, json);
    if (!Array.isArray(json)) {
      throw new Error("Invalid response");
    }
    if (json.length === 0) {
      return false;
    }
    if (json.length > 1) {
      throw new Error("Multiple subscriptions found");
    }
    if (
      json[0]!.callback_url ==
      `${window.location.origin}/api/strava/webhook`
    )
      return true;
    console.log("Found foreign subscription", json[0]);
    return json[0]!.id;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to fetch subscriptions");
  }
};

const requestWebhook = async (url: string, id?: number) => {
  if (id) {
    const res = await fetch(
      `/api/strava/deletewebhook?id=${id}`
    );
    if (!res.ok) {
      throw new Error("Failed to delete webhook");
    }
    console.log("Deleted webhook", id);
  }
  const res = await fetch(
    `/api/strava/requestwebhook?url=${url}`
  );
  if (!res.ok) {
    throw new Error("Failed to request webhook");
  }
  return await res.text();
};

function WebhookStatus() {
  const [webhookStatus, setWebhookStatus] = useState<
    undefined | boolean
  >(undefined);

  const [id, setId] = useState<number | undefined>(
    undefined
  );

  const {setLoading} = useStore((state) => ({
    setLoading: state.setLoading,
  }));

  return (
    <>
      {webhookStatus === undefined && (
        <Tooltip title="Check status">
          <IconButton
            onClick={async () => {
              setLoading(true);
              try {
                const status: boolean | number =
                  await checkWebhook();
                if (typeof status === "number") {
                  setWebhookStatus(false);
                  setId(status);
                } else {
                  setWebhookStatus(status);
                }
              } catch (e) {
                console.error(e);
              }
              setLoading(false);
            }}
          >
            <QuestionMarkIcon />
          </IconButton>
        </Tooltip>
      )}
      {webhookStatus === true && (
        <Tooltip title="Deactivate Webhook">
          <IconButton>
            <FontAwesomeIcon
              fontSize="large"
              icon="check"
            />
          </IconButton>
        </Tooltip>
      )}
      {webhookStatus === false && (
        <Tooltip title="Activate Webhook">
          <IconButton
            onClick={async () => {
              setLoading(true);
              try {
                const response = await requestWebhook(
                  `${window.location.origin}/api/strava/webhook`,
                  id
                );
                console.log(response);
                setWebhookStatus(true);
              } catch (e) {
                console.error(e);
              }
              setLoading(false);
            }}
          >
            <FontAwesomeIcon
              fontSize="large"
              icon="times"
            />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}

function LoadMore() {
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const {activityDict, loadFromStrava} = useStore(
    (state) => ({
      activityDict: state.activityDict,
      loadFromStrava: state.loadFromStrava,
    })
  );

  return (
    <Box sx={{position: "relative"}}>
      <Tooltip title="Load more activities">
        <IconButton
          disabled={disabled}
          aria-label="save"
          color="primary"
          onClick={async () =>
            loadFromStrava({
              photos: true,
              before: d3.min(
                Object.values(activityDict),
                (a: Activity) =>
                  Number(a.start_date_local_timestamp)
              ),
            })
          }
        >
          <AddIcon />
        </IconButton>
      </Tooltip>
      {loading && (
        <CircularProgress
          size={32}
          sx={{
            position: "absolute",
            top: 6,
            left: 6,
            zIndex: 1,
          }}
        />
      )}
    </Box>
  );
}

function SettingsDialog({user}: {user: User}) {
  const {
    userSettingsOpen,
    toggleUserSettings,
    activityDict,
  } = useStore((state) => ({
    userSettingsOpen: state.userSettingsOpen,
    toggleUserSettings: state.toggleUserSettings,
    activityDict: state.activityDict,
  }));

  const nActivities = Object.keys(activityDict).length;

  return (
    <>
      <Dialog
        open={userSettingsOpen}
        onClose={toggleUserSettings}
        slotProps={{backdrop: {style: {opacity: 0.1}}}}
      >
        <DialogTitle>User Settings</DialogTitle>
        <DialogContent dividers={true}>
          <List sx={{width: "300px", pt: 0}}>
            <ListItem
              disableGutters
              secondaryAction={
                <IconButton
                  aria-label="logout"
                  color="primary"
                  onClick={() => signOut()}
                >
                  <Tooltip title="Logout">
                    <LogoutIcon />
                  </Tooltip>
                </IconButton>
              }
            >
              <ListItemAvatar>
                <Avatar
                  alt={user.name}
                  src={user.image as string | undefined}
                />
              </ListItemAvatar>
              <ListItemText primary={user.name} />
            </ListItem>
            <ListItem
              disableGutters
              secondaryAction={<LoadMore />}
            >
              <ListItemIcon>
                <FontAwesomeIcon
                  fontSize="large"
                  icon="child-reaching"
                />
              </ListItemIcon>
              <Tooltip title="Strava only allows to download 200 activities at a time">
                <ListItemText
                  primary="Activities"
                  secondary={nActivities}
                />
              </Tooltip>
            </ListItem>
            <ListItem
              disableGutters
              secondaryAction={<WebhookStatus />}
            >
              <ListItemIcon>
                <FontAwesomeIcon
                  fontSize="large"
                  icon="refresh"
                />
              </ListItemIcon>
              <ListItemText
                primary="Activity Webhook"
                secondary="Automatically fetch new"
              />
            </ListItem>
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
