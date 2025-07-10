import React from "react";
import { Button, Label, Spinner } from "@patternfly/react-core";
import { OnIcon } from "@patternfly/react-icons";
import "./styles.css";

interface ServerStatusToggleProps {
  isRunning: boolean;
  isStarting: boolean;
  hasWarning: boolean;
  onToggle: () => void;
}

export function ServerStatusToggle({
  isRunning,
  isStarting,
  hasWarning,
  onToggle,
}: ServerStatusToggleProps) {
  return (
    <div>
      <div className="server-status-wrapper">
        {isStarting ? (
          <Spinner size="sm" aria-label="Loading spinner" className="server-status-spinner" />
        ) : (
          <Button
            variant="control"
            size="sm"
            icon={<OnIcon />}
            onClick={onToggle}
            isDisabled={isStarting || hasWarning}
            className="server-action-button"
          >
            {isStarting ? "" : isRunning ? "Stop" : "Start"}
          </Button>
        )}
        <p>Server Status</p>
        <Label color={isRunning ? "green" : "red"} isCompact>
          {isRunning ? "Running" : "Stopped"}
        </Label>
      </div>
    </div>
  );
}
