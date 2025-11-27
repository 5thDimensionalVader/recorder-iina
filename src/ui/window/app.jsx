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


async function getEndTime() {
  return new Promise((resolve, reject) => {
    iina.postMessage("getEndTime");
    iina.onMessage("endTime", ({ time }) => resolve(time));
  });
}

export default App = () => {
  const [currentMin, setCurrentMin] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);

  const [endMin, setEndMin] = useState(0);
  const [endSec, setEndSec] = useState(0);

  function formatTime(positionInSec) {
    const minutes = Math.floor(positionInSec / 60);
    const seconds = Math.floor(positionInSec % 60);
    return { minutes, seconds };
  }

  function handleSetEndTime() {
    getEndTime().then((time) => {
      const formattedTime = formatTime(time);
      setEndMin(formattedTime.minutes);
      setEndSec(formattedTime.seconds);
    });
  }

  useEffect(() => {
    const handleTimeUpdate = ({ time }) => {
      const formattedTime = formatTime(time);
      setCurrentMin(formattedTime.minutes);
      setCurrentSec(formattedTime.seconds);
    };
    iina.onMessage("currentTime", handleTimeUpdate);
  }, []);

  const startRecordingInputComponent = (
    <FormControl>
      <FormLabel>Current Time</FormLabel>
      <Input
        type="text"
        variant="outlined"
        startDecorator={<AddCircleIcon/>}
        value={`${currentMin}:${currentSec}`}
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
        value={`${endMin}:${endSec}`}
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

  return (
    <CssVarsProvider defaultMode="system">
      <CssBaseline />
      {startRecordingInputComponent}
      {endRecordingInputComponent}
    </CssVarsProvider>
  );
};
