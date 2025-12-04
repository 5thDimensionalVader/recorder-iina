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

// icons
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import RemoveDoneIcon from "@mui/icons-material/RemoveDone";

export default App = () => {
  const [currentPos, setCurrentPos] = useState("");
  const [endPos, setEndPos] = useState("");
  const [isFfmpegInstalled, setIsFfmpegInstalled] = useState(false);

  function formatTime(positionInSec) {
    const hours = Math.floor(positionInSec / 3600);
    const minutes = Math.floor(positionInSec / 60);
    const seconds = Math.floor(positionInSec % 60);
    return [hours, minutes, seconds]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  }

  async function getEndTime() {
    return new Promise((resolve, _reject) => {
      iina.postMessage("getEndTime");
      iina.onMessage("endTime", ({ time }) => resolve(time));
    });
  }

  async function processVideoClip() {
    iina.postMessage("processVideoClip", {
      startPos: currentPos,
      endPos: endPos,
    });
  }

  function handleSetEndTime() {
    getEndTime().then((time) => {
      const formattedEndTime = formatTime(time);
      setEndPos(formattedEndTime);
    });
  }

  function handleCloseBtn() {
    iina.postMessage("closeWindow");
    setEndPos("");
  }

  useEffect(() => {
    const handleTimeUpdate = ({ time }) => {
      const formattedTime = formatTime(time);
      setCurrentPos(formattedTime);
    };
    const handleDepencencyCheck = ({ isInstalled }) => {
      setIsFfmpegInstalled(isInstalled);
    };

    iina.onMessage("currentTime", handleTimeUpdate);
    iina.onMessage("is-ffmpeg-installed", handleDepencencyCheck);
  }, []);

  const dependencyCheckComponent = (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        {isFfmpegInstalled ? (
          <Typography
            level="body-sm"
            startDecorator={
              <DoneAllIcon sx={{ color: "green", marginRight: 1 }} />
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
            ffmpeg isn't installed
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const startRecordingInputComponent = (
    <FormControl>
      <FormLabel>Current Time</FormLabel>
      <Input
        type="text"
        variant="outlined"
        startDecorator={<AddCircleIcon />}
        value={isFfmpegInstalled ? currentPos : "00:00:00"}
        readOnly
        disabled={!isFfmpegInstalled}
      />
    </FormControl>
  );

  const endRecordingInputComponent = (
    <FormControl
      sx={{
        marginTop: 2,
      }}
    >
      <FormLabel>End Time</FormLabel>
      <Input
        type="text"
        variant="outlined"
        startDecorator={<RemoveCircleIcon />}
        value={isFfmpegInstalled ? endPos : "00:00:00"}
        endDecorator={
          <Button variant="solid" onClick={handleSetEndTime} disabled={!isFfmpegInstalled}
          >
            Set End Time
          </Button>
        }
        readOnly
        disabled={!isFfmpegInstalled}
      />
    </FormControl>
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
        disabled={endPos === "" || !isFfmpegInstalled}
      >
        Process Clip
      </Button>
      <Button
        variant="solid"
        onClick={() => handleCloseBtn()}
        sx={{
          backgroundColor: "red",
        }}
      >
        Cancel
      </Button>
    </Stack>
  );

  return (
    <CssVarsProvider defaultMode="system">
      <CssBaseline />
      <Box sx={{ padding: 2 }}>
        {dependencyCheckComponent}
        {startRecordingInputComponent}
        {endRecordingInputComponent}
        {actionButtonsComponent}
      </Box>
    </CssVarsProvider>
  );
};
