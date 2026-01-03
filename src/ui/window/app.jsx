import React, { useEffect, useState } from "react";
import { CssVarsProvider, CssBaseline, Box } from "@mui/joy";

// ui imports
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Switch from "@mui/joy/Switch";

import IconButton from "@mui/joy/IconButton";
import Tooltip from "@mui/joy/Tooltip";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";

// icons
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveDoneIcon from "@mui/icons-material/RemoveDone";
import StopIcon from "@mui/icons-material/Stop";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

const App = () => {
  const [clips, setClips] = useState([{ id: 1, start: "00:00:00", end: "", status: "IDLE" }]);
  const [isFfmpegInstalled, setIsFfmpegInstalled] = useState(false);
  const [ffmpegStatus, setFfmpegStatus] = useState(false);
  const [hwaccel, setHwaccel] = useState(true);
  const [verticalCrop, setVerticalCrop] = useState(false);
  const [format, setFormat] = useState("original");

  function formatTime(positionInSec) {
    const hours = Math.floor(positionInSec / 3600);
    const minutes = Math.floor((positionInSec % 3600) / 60);
    const seconds = Math.floor(positionInSec % 60);
    return [hours, minutes, seconds]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  }

  async function getEndTime() {
    return new Promise((resolve) => {
      iina.postMessage("getEndTime");
      iina.onMessage("endTime", ({ time }) => resolve(time));
    });
  }

  async function getStartTime() {
    return new Promise((resolve) => {
      iina.postMessage("getStartTime");
      iina.onMessage("startTime", ({ time }) => resolve(time));
    });
  }

  async function getFfmpegStatus() {
    return new Promise((resolve) => {
      iina.onMessage("ffmpeg-status-out", ({ status }) => resolve(status));
    });
  }

  async function processVideoClip() {
    iina.postMessage("processVideoClip", {
      clips: clips.filter(c => c.end !== ""),
      hwaccel: hwaccel,
      verticalCrop: verticalCrop,
      format: format,
    });
  }

  function handlePreview(start, end) {
    if (start && end) {
      iina.postMessage("previewClip", { start, end });
    }
  }

  const updateClip = (id, field, value) => {
    setClips(prev => prev.map(clip => clip.id === id ? { ...clip, [field]: value } : clip));
  };

  const addClip = () => {
    // Use max ID + 1
    const maxId = clips.reduce((max, clip) => Math.max(max, clip.id), 0);
    setClips([...clips, { id: maxId + 1, start: "00:00:00", end: "", status: "IDLE" }]);
  };

  const removeClip = (id) => {
    if (clips.length > 1) {
      setClips(clips.filter(c => c.id !== id));
    } else {
      // Reset if it's the last one
      setClips([{ id: 1, start: "00:00:00", end: "", status: "IDLE" }]);
    }
  };

  function handleSetEndTime(id) {
    getEndTime().then((time) => {
      const formattedEndTime = formatTime(time);
      updateClip(id, 'end', formattedEndTime);
    });
  }

  function handleSetStartTime(id) {
    getStartTime().then((time) => {
      const formattedStartTime = formatTime(time);
      updateClip(id, 'start', formattedStartTime);
    });
  }

  function handleCloseBtn() {
    iina.postMessage("closeWindow");
    setClips([{ id: 1, start: "00:00:00", end: "", status: "IDLE" }]);
  }

  useEffect(() => {
    const handleTimeUpdate = ({ time }) => {
      const formattedTime = formatTime(time);
      // On load, update the first clip's start time if it is 00:00:00 (default)
      setClips(prev => {
        if (prev.length === 1 && prev[0].start === "00:00:00") {
          return [{ ...prev[0], start: formattedTime }];
        }
        return prev;
      });
    };
    const handleDepencencyCheck = ({ isInstalled }) => {
      setIsFfmpegInstalled(isInstalled);
    };

    const handleClipStatusUpdate = ({ id, status }) => {
      updateClip(id, 'status', status);
    };

    const handleBatchComplete = () => {
      // Optional: show a global completion toast or reset
      // For now, let the icons show completion
      setFfmpegStatus(false);
    };

    iina.onMessage("currentTime", handleTimeUpdate);
    iina.onMessage("is-ffmpeg-installed", handleDepencencyCheck);
    iina.onMessage("clip-status-update", handleClipStatusUpdate);
    iina.onMessage("batch-complete", handleBatchComplete);

    // Notify backend that UI is ready
    iina.postMessage("ui-ready");

  }, []);

  useEffect(() => {
    function handleFfmpegStatus() {
      getFfmpegStatus().then((status) => {
        setFfmpegStatus(status);
      });
    }
    handleFfmpegStatus();
  }, [ffmpegStatus]);

  const dependencyCheckComponent = (
    <Card variant="soft" sx={{ marginTop: 2 }}>
      <CardContent>
        {isFfmpegInstalled ? (
          <Typography
            level="body-sm"
            startDecorator={
              <CheckCircleIcon sx={{ color: "green", marginRight: 1 }} />
            }
          >
            ffmpeg is installed
          </Typography>
        ) : (
          <Typography
            level="body-sm"
            startDecorator={
              <RemoveDoneIcon sx={{ color: "red", marginRight: 1 }} />
            }
          >
            ffmpeg isn&apos;t installed
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const clipControlComponent = (
    <Stack
      direction="column"
      spacing={2}
      sx={{ justifyContent: "center", marginTop: 3, marginBottom: 2, alignItems: "center" }}
    >
      <Typography
        component="label"
        level="body-sm"
        endDecorator={
          <Switch
            checked={hwaccel}
            variant="soft"
            color={hwaccel ? "success" : "neutral"}
            onChange={(event) => setHwaccel(event.target.checked)}
            sx={{ ml: 1 }}
          />
        }
      >
        HW Acceleration
      </Typography>
      <Typography
        component="label"
        level="body-sm"
        endDecorator={
          <Switch
            checked={verticalCrop}
            variant="soft"
            color={verticalCrop ? "success" : "neutral"}
            onChange={(event) => setVerticalCrop(event.target.checked)}
            sx={{ ml: 1 }}
          />
        }
      >
        Vertical Crop
      </Typography>
      <FormControl size="sm" orientation="horizontal" sx={{ alignItems: "center" }}>
        <FormLabel sx={{ mb: 0, mr: 1 }}>Format</FormLabel>
        <Select
          value={format}
          onChange={(event, newValue) => setFormat(newValue)}
          size="sm"
          sx={{ minWidth: 100 }}
        >
          <Option value="original">Original</Option>
          <Option value="mov">MOV</Option>
          <Option value="mp4">MP4</Option>
        </Select>
      </FormControl>
    </Stack>
  );

  const actionButtonsComponent = (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        marginTop: 5,
        alignContent: "center",
        justifyContent: "center",
      }}
    >
      <Button
        variant="solid"
        onClick={processVideoClip}
        disabled={clips.every(c => c.end === "") || !isFfmpegInstalled || ffmpegStatus}
        loading={ffmpegStatus}
      >
        Clip All
      </Button>
      <Button
        variant="solid"
        onClick={() => handleCloseBtn()}
        sx={{
          backgroundColor: "red",
        }}
        disabled={ffmpegStatus}
      >
        Close
      </Button>
    </Stack>
  );

  const ffmpegStatusComponent = (
    <Card variant="soft" color="success" sx={{ marginBottom: 2, marginTop: 2 }}>
      <CardContent>
        <Typography level="body-sm" startDecorator={<HourglassTopIcon />}>
          Your clip is processing ...
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <CssVarsProvider defaultMode="system">
      <CssBaseline />
      <Box sx={{ padding: 2 }}>
        <Stack spacing={2}>
          {clips.map((clip) => (
            <Stack
              key={clip.id}
              direction="row"
              divider={null}
              spacing={1}
              sx={{ justifyContent: "center", alignItems: "center" }}
            >
              <Tooltip title="Start" variant="soft" placement="bottom-start">
                <Input
                  type="text"
                  variant="soft"
                  value={isFfmpegInstalled ? clip.start : "00:00:00"}
                  readOnly
                  disabled={!isFfmpegInstalled}
                  endDecorator={
                    <IconButton
                      onClick={() => handleSetStartTime(clip.id)}
                      disabled={!isFfmpegInstalled}
                      variant="soft"
                      color="success"
                    >
                      <PlayCircleIcon />
                    </IconButton>
                  }
                  sx={{ maxWidth: 140 }}
                />
              </Tooltip>

              {/* Preview Button */}
              {clip.start !== "00:00:00" && clip.end !== "" && (
                <Tooltip title="Preview Clip" variant="soft">
                  <IconButton
                    onClick={() => handlePreview(clip.start, clip.end)}
                    variant="plain"
                    color="primary"
                  >
                    <PlayArrowIcon />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="End" variant="soft" placement="bottom-start">
                <Input
                  type="text"
                  variant="soft"
                  value={isFfmpegInstalled ? clip.end : "00:00:00"}
                  endDecorator={
                    <IconButton
                      onClick={() => handleSetEndTime(clip.id)}
                      disabled={!isFfmpegInstalled}
                      variant="soft"
                      color="danger"
                    >
                      <StopIcon />
                    </IconButton>
                  }
                  sx={{ maxWidth: 140 }}
                  readOnly
                  disabled={!isFfmpegInstalled}
                />
              </Tooltip>
              {/* Status Icon */}
              {clip.status === 'PROCESSING' && <HourglassTopIcon sx={{ color: 'orange' }} />}
              {clip.status === 'COMPLETED' && <CheckCircleIcon sx={{ color: 'green' }} />}
              {clip.status === 'ERROR' && <RemoveDoneIcon sx={{ color: 'red' }} />}
              {/* Remove Button (only if > 1 AND Status is IDLE) */}
              {clips.length > 1 && clip.status === 'IDLE' && (
                <IconButton onClick={() => removeClip(clip.id)} color="danger" variant="plain" size="sm">
                  <RemoveCircleIcon />
                </IconButton>
              )}
            </Stack>
          ))}
          <Button
            variant="outlined"
            startDecorator={<AddCircleIcon />}
            onClick={addClip}
            sx={{ alignSelf: "center" }}
          >
            Add Another Timestamp
          </Button>
        </Stack>
        {clipControlComponent}
        {actionButtonsComponent}
        {ffmpegStatus && ffmpegStatusComponent}
        {dependencyCheckComponent}
      </Box>
    </CssVarsProvider>
  );
};

export default App;
