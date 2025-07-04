import React from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Alert,
  AlertVariant,
  Button,
  Flex,
  FlexItem,
  Progress,
  Spinner,
  Title,
  Content,
} from "@patternfly/react-core";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@patternfly/react-icons";
import { useExtensionStateContext } from "../../context/ExtensionStateContext";
import { ViolationsCount } from "../ViolationsCount/ViolationsCount";
import AnalysisResults from "../AnalysisResults";
import { startServer, runAnalysis, stopServer } from "../../hooks/actions";

export const AnalysisStep: React.FC = () => {
  const { state, dispatch } = useExtensionStateContext();
  const { 
    isAnalyzing, 
    isStartingServer, 
    serverState, 
    ruleSets, 
    enhancedIncidents
  } = state;

  const isAnalysisCompleted = enhancedIncidents.length > 0 || ruleSets.length > 0;
  const hasIncidents = enhancedIncidents.length > 0;
  
  const isServerReady = serverState === "running";
  const canRunAnalysis = isServerReady && !isAnalyzing && !isStartingServer;
  
  const totalIncidents = enhancedIncidents.length;
  const totalRuleSets = ruleSets.length;

  const handleStartServer = () => {
    dispatch(startServer());
  };

  const handleRunAnalysis = () => {
    dispatch(runAnalysis());
  };

  const handleStopAnalysis = () => {
    dispatch(stopServer());
  };

  const getServerStatusAlert = () => {
    switch (serverState) {
      case "starting":
      case "readyToInitialize":
      case "initializing":
        return (
          <Alert
            variant={AlertVariant.info}
            title="Starting analysis server..."
            isInline
          >
            <Flex alignItems={{ default: "alignItemsCenter" }}>
              <FlexItem>
                <Spinner size="md" />
              </FlexItem>
              <FlexItem>
                Please wait while the analysis server is being initialized.
              </FlexItem>
            </Flex>
          </Alert>
        );
      case "startFailed":
        return (
          <Alert
            variant={AlertVariant.danger}
            title="Failed to start analysis server"
            isInline
          >
            There was an error starting the analysis server. Please try again.
          </Alert>
        );
      case "running":
        return (
          <Alert
            variant={AlertVariant.success}
            title="Analysis server is running"
            isInline
          >
            <CheckCircleIcon color="var(--pf-global--success-color--100)" />
            {" "}Ready to run analysis.
          </Alert>
        );
      default:
        return (
          <Alert
            variant={AlertVariant.warning}
            title="Analysis server needs to be started"
            isInline
          >
            <ExclamationTriangleIcon color="var(--pf-global--warning-color--100)" />
            {" "}The analysis server must be running to perform code analysis.
          </Alert>
        );
    }
  };

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <Title headingLevel="h1" size="2xl">Code Analysis</Title>
        <Content>
          <p>
            Run static analysis on your codebase to identify migration opportunities and potential issues.
            The analysis will scan your code against the selected profile's rules and generate actionable insights.
          </p>
        </Content>
      </div>

      <div className="wizard-step-content">

      <Card style={{ marginTop: "20px" }}>
        <CardTitle>Analysis Server</CardTitle>
        <CardBody>
          {getServerStatusAlert()}
          
          {!isServerReady && (
            <Button 
              variant="primary" 
              onClick={handleStartServer}
              isLoading={isStartingServer}
              isDisabled={isStartingServer}
              style={{ marginTop: "16px" }}
            >
              {isStartingServer ? "Starting..." : "Start Server"}
            </Button>
          )}
        </CardBody>
      </Card>

      {isServerReady && (
        <Card style={{ marginTop: "20px" }}>
          <CardTitle>Run Analysis</CardTitle>
          <CardBody>
            {isAnalyzing ? (
              <>
                <Alert
                  variant={AlertVariant.info}
                  title="Analysis in progress..."
                  isInline
                  style={{ marginBottom: "16px" }}
                >
                  <Flex alignItems={{ default: "alignItemsCenter" }}>
                    <FlexItem>
                      <Spinner size="md" />
                    </FlexItem>
                    <FlexItem>
                      Scanning your codebase for migration opportunities...
                    </FlexItem>
                  </Flex>
                </Alert>
                
                <Progress 
                  style={{ marginBottom: "16px" }}
                />
                
                <Button variant="secondary" onClick={handleStopAnalysis}>
                  Stop Analysis
                </Button>
              </>
            ) : (
              <>
                <Content style={{ marginBottom: "16px" }}>
                  <p>
                    Start the analysis to scan your codebase for migration opportunities using the selected profile.
                  </p>
                </Content>
                
                <Button 
                  variant="primary" 
                  onClick={handleRunAnalysis}
                  isDisabled={!canRunAnalysis}
                >
                  Run Analysis
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {isAnalysisCompleted && totalIncidents > 0 && (
        <Card style={{ marginTop: "20px" }}>
          <CardTitle>Analysis Results</CardTitle>
          <CardBody>
            <Alert
              variant={AlertVariant.success}
              title="Analysis completed successfully"
              isInline
              style={{ marginBottom: "16px" }}
            >
              Found {totalIncidents} incidents across {totalRuleSets} rule sets.
            </Alert>
            
            <ViolationsCount 
              violationsCount={totalRuleSets}
              incidentsCount={totalIncidents}
            />
            
            <div style={{ marginTop: "20px" }}>
              <AnalysisResults results={[]} />
            </div>
          </CardBody>
        </Card>
      )}

      {isAnalysisCompleted && totalIncidents === 0 && (
        <Alert
          variant={AlertVariant.info}
          title="No issues found"
          isInline
          style={{ marginTop: "20px" }}
        >
          The analysis completed but found no migration issues in your codebase. 
          This could mean your code is already compatible with the target technology,
          or you may need to adjust your analysis profile settings.
        </Alert>
      )}

        {hasIncidents && (
          <Alert
            variant={AlertVariant.success}
            title="Ready for resolution"
            isInline
            style={{ marginTop: "20px" }}
          >
            Analysis found issues that can be addressed with AI assistance. 
            Click "Next" to proceed to the resolution step.
          </Alert>
        )}
      </div>
    </div>
  );
};