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
import Divider from "@mui/joy/Divider";
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

const App = () => {
  const [currentPos, setCurrentPos] = useState("");
  const [endPos, setEndPos] = useState("");
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
      startPos: currentPos,
      endPos: endPos,
      hwaccel: hwaccel,
      verticalCrop: verticalCrop,
      format: format,
    });
  }

  function handleSetEndTime() {
    getEndTime().then((time) => {
      const formattedEndTime = formatTime(time);
      setEndPos(formattedEndTime);
    });
  }

  function handleSetStartTime() {
    getStartTime().then((time) => {
      const formattedStartTime = formatTime(time);
      setCurrentPos(formattedStartTime);
    });
  }

  function handleCloseBtn() {
    iina.postMessage("closeWindow");
    setEndPos("");
  }

  useEffect(() => {
    const handleTimeUpdate = ({ time }) => {
      // Only auto-update if we haven't manually set a start time (check logic if needed, 
      // but simpler is to let auto-update only run ONCE on load, which is handled by index.js postCurrentTimeOnce)
      // Actually, looking at index.js, postCurrentTimeOnce sends "currentTime" once.
      // So this effect runs once.
      const formattedTime = formatTime(time);
      setCurrentPos(formattedTime);
    };
    const handleDepencencyCheck = ({ isInstalled }) => {
      setIsFfmpegInstalled(isInstalled);
    };

    iina.onMessage("currentTime", handleTimeUpdate);
    iina.onMessage("is-ffmpeg-installed", handleDepencencyCheck);
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

  const startRecordingInputComponent = (
    <Tooltip title="Start" variant="soft" placement="bottom-start">
      <Input
        type="text"
        variant="soft"
        value={isFfmpegInstalled ? currentPos : "00:00:00"}
        readOnly
        disabled={!isFfmpegInstalled}
        endDecorator={
          <IconButton
            onClick={handleSetStartTime}
            disabled={!isFfmpegInstalled}
            variant="soft"
            color="success"
          >
            <PlayCircleIcon />
          </IconButton>
        }
        sx={{
          maxWidth: "100%",
        }}
      />
    </Tooltip>
  );

  const endRecordingInputComponent = (
    <Tooltip title="End" variant="soft" placement="bottom-start">
      <Input
        type="text"
        variant="soft"
        value={isFfmpegInstalled ? endPos : "00:00:00"}
        endDecorator={
          <IconButton
            onClick={handleSetEndTime}
            disabled={!isFfmpegInstalled}
            variant="soft"
            color="danger"
          >
            <StopIcon />
          </IconButton>
        }
        sx={{
          maxWidth: "100%",
        }}
        readOnly
        disabled={!isFfmpegInstalled}
      />
    </Tooltip>
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
        disabled={endPos === "" || !isFfmpegInstalled || ffmpegStatus}
        loading={ffmpegStatus}
      >
        Clip
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
        <Stack
          direction="row"
          divider={<Divider orientation="vertical" />}
          spacing={2}
          sx={{ justifyContent: "center", marginTop: 1, marginBottom: 1 }}
        >
          {startRecordingInputComponent}
          {endRecordingInputComponent}
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
