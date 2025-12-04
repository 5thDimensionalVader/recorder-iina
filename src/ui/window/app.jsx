import React, { useEffect, useState } from "react";
import { CssVarsProvider, CssBaseline } from "@mui/joy";

// ui imports
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Button from "@mui/joy/Button";

// icons
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import AddCircleIcon from '@mui/icons-material/AddCircle';


export default App = () => {
  const [currentPos, setCurrentPos] = useState("");
  const [endPos, setEndPos] = useState("");

  function formatTime(positionInSec) {
    const hours = Math.floor(positionInSec / 3600);
    const minutes = Math.floor(positionInSec / 60);
    const seconds = Math.floor(positionInSec % 60);
    return [hours, minutes, seconds]
    .map(v => String(v).padStart(2, '0'))
    .join(':');
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

    iina.onMessage("currentTime", handleTimeUpdate);
  }, []);

  useEffect(() => {
    return () => {
      setEndPos("");
    }
  }, []);

  const startRecordingInputComponent = (
    <FormControl>
      <FormLabel>Current Time</FormLabel>
      <Input
        type="text"
        variant="outlined"
        startDecorator={<AddCircleIcon/>}
        value={currentPos}
        readOnly
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
        value={endPos}
        endDecorator={
          <Button
            variant="solid"
            onClick={handleSetEndTime}
          >
            Set End Time
          </Button>
        }
        readOnly
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
        disabled={endPos === ""}
      >
        Process Clip
      </Button>
      <Button
        variant="solid"
        onClick={() => handleCloseBtn()}
        sx={{
          backgroundColor: "red"
        }}
      >
        Cancel
      </Button>
    </Stack>
  );

  return (
    <CssVarsProvider defaultMode="system">
      <CssBaseline />
      {startRecordingInputComponent}
      {endRecordingInputComponent}
      {actionButtonsComponent}
    </CssVarsProvider>
  );
};
