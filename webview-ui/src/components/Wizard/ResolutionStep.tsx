import React, { useState } from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Alert,
  AlertVariant,
  Button,
  Flex,
  FlexItem,
  DataList,
  DataListItem,
  DataListCell,
  DataListItemRow,
  DataListItemCells,
  Checkbox,
  Label,
  Spinner,
  Title,
  Content,
} from "@patternfly/react-core";
import { CheckCircleIcon } from "@patternfly/react-icons";
import { useExtensionStateContext } from "../../context/ExtensionStateContext";
import { FileChanges } from "../ResolutionsPage/FileChanges";
import { getSolution } from "../../hooks/actions";

export const ResolutionStep: React.FC = () => {
  const { state, dispatch } = useExtensionStateContext();
  const { 
    enhancedIncidents, 
    isFetchingSolution, 
    solutionData,
    localChanges,
    wizardState 
  } = state;

  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  
  // const selectedIncidentObjects = wizardState.stepData.resolution.selectedIncidents;
  const solutionApplied = wizardState.stepData.resolution.solutionApplied;
  
  const hasIncidents = enhancedIncidents.length > 0;
  const hasSolution = solutionData !== undefined;
  const hasLocalChanges = localChanges.length > 0;

  const handleIncidentSelection = (incidentId: string, checked: boolean) => {
    if (checked) {
      setSelectedIncidents(prev => [...prev, incidentId]);
    } else {
      setSelectedIncidents(prev => prev.filter(id => id !== incidentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIncidents(enhancedIncidents.map(incident => incident.violationId));
    } else {
      setSelectedIncidents([]);
    }
  };

  const handleGetSolution = () => {
    const incidents = enhancedIncidents.filter(incident => 
      selectedIncidents.includes(incident.violationId)
    );
    
    dispatch(getSolution(incidents, "Low"));
  };

  const handleApplyAllChanges = () => {
    // Apply each local change individually
    localChanges.forEach(change => {
      dispatch({ type: "APPLY_FILE", payload: change });
    });
  };

  const handleDiscardAllChanges = () => {
    // Discard each local change individually
    localChanges.forEach(change => {
      dispatch({ type: "DISCARD_FILE", payload: change });
    });
  };

  if (!hasIncidents) {
    return (
      <div className="wizard-step">
        <div className="wizard-step-header">
          <Title headingLevel="h1" size="2xl">Issue Resolution</Title>
          <Content>
            <p>
              Use AI-powered assistance to resolve migration issues found during analysis.
            </p>
          </Content>
        </div>

        <div className="wizard-step-content">
          <Alert
            variant={AlertVariant.success}
            title="Migration analysis completed successfully"
            isInline
            style={{ marginTop: "20px" }}
          >
            <CheckCircleIcon color="var(--pf-global--success-color--100)" />
            {" "}
            No migration issues were found during analysis. Your codebase appears to be compatible
            with the target technology. The migration wizard has completed successfully.
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <Title headingLevel="h1" size="2xl">Issue Resolution</Title>
        <Content>
          <p>
            Select issues to resolve with AI assistance. The AI will analyze the code context
            and generate targeted solutions to help migrate your application.
          </p>
        </Content>
      </div>

      <div className="wizard-step-content">

      <Card style={{ marginTop: "20px" }}>
        <CardTitle>
          <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
            <FlexItem>
              Migration Issues 
              <Label style={{ marginLeft: "8px" }}>
                {enhancedIncidents.length}
              </Label>
            </FlexItem>
            <FlexItem>
              <Checkbox
                id="select-all"
                label="Select All"
                isChecked={selectedIncidents.length === enhancedIncidents.length}
                onChange={(_, checked) => handleSelectAll(checked)}
                isDisabled={isFetchingSolution}
              />
            </FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <DataList aria-label="Migration issues list">
            {enhancedIncidents.map((incident, index) => (
              <DataListItem key={incident.violationId} aria-labelledby={`incident-${index}`}>
                <DataListItemRow>
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key="checkbox" width={1}>
                        <Checkbox
                          id={`incident-${incident.violationId}`}
                          isChecked={selectedIncidents.includes(incident.violationId)}
                          onChange={(_, checked) => 
                            handleIncidentSelection(incident.violationId, checked)
                          }
                          isDisabled={isFetchingSolution}
                        />
                      </DataListCell>,
                      <DataListCell key="details" width={5}>
                        <div>
                          <h4>
                            {incident.violation_name || incident.message}
                          </h4>
                          <p>
                            <strong>File:</strong> {incident.uri}
                            {incident.lineNumber && (
                              <span> (Line {incident.lineNumber})</span>
                            )}
                          </p>
                          {incident.violation_description && (
                            <small>
                              {incident.violation_description}
                            </small>
                          )}
                          {incident.violation_category && (
                            <Label 
                              style={{ 
                                marginTop: "4px",
                                backgroundColor: incident.violation_category === "mandatory" ? "var(--pf-global--danger-color--100)" : "var(--pf-global--info-color--100)",
                                color: "white"
                              }}
                            >
                              {incident.violation_category}
                            </Label>
                          )}
                        </div>
                      </DataListCell>,
                    ]}
                  />
                </DataListItemRow>
              </DataListItem>
            ))}
          </DataList>

          <Flex style={{ marginTop: "20px" }}>
            <FlexItem>
              <Button
                variant="primary"
                onClick={handleGetSolution}
                isDisabled={selectedIncidents.length === 0 || isFetchingSolution}
                isLoading={isFetchingSolution}
              >
                {isFetchingSolution ? "Generating Solution..." : "Get AI Solution"}
              </Button>
            </FlexItem>
            {selectedIncidents.length > 0 && (
              <FlexItem>
                <small>
                  {selectedIncidents.length} issue(s) selected
                </small>
              </FlexItem>
            )}
          </Flex>
        </CardBody>
      </Card>

      {isFetchingSolution && (
        <Card style={{ marginTop: "20px" }}>
          <CardBody>
            <Alert
              variant={AlertVariant.info}
              title="AI is analyzing your code..."
              isInline
            >
              <Flex alignItems={{ default: "alignItemsCenter" }}>
                <FlexItem>
                  <Spinner size="md" />
                </FlexItem>
                <FlexItem>
                  This may take a few moments while the AI examines the code context 
                  and generates targeted solutions.
                </FlexItem>
              </Flex>
            </Alert>
          </CardBody>
        </Card>
      )}

      {hasSolution && hasLocalChanges && (
        <Card style={{ marginTop: "20px" }}>
          <CardTitle>
            <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
              <FlexItem>
                Proposed Changes
                <Label style={{ marginLeft: "8px" }}>
                  {localChanges.length}
                </Label>
              </FlexItem>
              <FlexItem>
                <Flex>
                  <FlexItem>
                    <Button
                      variant="primary"
                      onClick={handleApplyAllChanges}
                      size="sm"
                    >
                      Apply All
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="secondary"
                      onClick={handleDiscardAllChanges}
                      size="sm"
                    >
                      Discard All
                    </Button>
                  </FlexItem>
                </Flex>
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            <Alert
              variant={AlertVariant.success}
              title="Solution generated successfully"
              isInline
              style={{ marginBottom: "16px" }}
            >
              Review the proposed changes and apply them to your codebase.
            </Alert>
            
            <FileChanges 
              changes={localChanges}
              onFileClick={() => {}}
            />
          </CardBody>
        </Card>
      )}

        {solutionApplied && (
          <Alert
            variant={AlertVariant.success}
            title="Resolution completed"
            isInline
            style={{ marginTop: "20px" }}
          >
            AI solutions have been applied to your codebase. You can now run the analysis again
            to verify the fixes or continue with additional modernization steps.
          </Alert>
        )}
      </div>
    </div>
  );
};