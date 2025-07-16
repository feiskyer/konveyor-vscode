import React, { useState, useEffect } from "react";
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
import { getSolution } from "../../hooks/actions";

export const ResolutionStep: React.FC = () => {
  const { state, dispatch } = useExtensionStateContext();
  const { 
    enhancedIncidents, 
    isFetchingSolution, 
    wizardState 
  } = state;

  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  
  // Generate unique keys for incidents - MUST match the format used in loadResults.ts
  const generateIncidentKey = (incident: any) => {
    // Use the same 3-part key format as the backend preservation logic
    return `${incident.violationId}:${incident.uri}:${incident.lineNumber || 'unknown'}`;
  };

  // Initialize selected incidents from wizard state on mount and when wizard state changes
  useEffect(() => {
    // Don't use wizard state for now, just clear selection when component mounts
    // This ensures fresh state when view is reactivated
    setSelectedIncidents([]);
  }, []);

  // Filter unresolved and resolved incidents into separate arrays
  const unresolvedIncidents = enhancedIncidents.filter(incident => !incident.resolved);
  const resolvedIncidents = enhancedIncidents.filter(incident => incident.resolved);
  
  // const selectedIncidentObjects = wizardState.stepData.resolution.selectedIncidents;
  const solutionApplied = wizardState.stepData.resolution.solutionApplied;
  
  const hasIncidents = enhancedIncidents.length > 0;

  const handleIncidentSelection = (incidentKey: string, checked: boolean) => {
    // The incidentKey is generated from unresolvedIncidents array with index
    // So we just need to validate it exists in our selected incidents state
    if (checked) {
      setSelectedIncidents(prev => [...prev, incidentKey]);
    } else {
      setSelectedIncidents(prev => prev.filter(key => key !== incidentKey));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const keys = unresolvedIncidents.map((incident) => {
        return generateIncidentKey(incident);
      });
      setSelectedIncidents(keys);
    } else {
      setSelectedIncidents([]);
    }
  };

  const handleGetSolution = () => {
    // Filter to only include unresolved incidents that are selected
    const incidents = unresolvedIncidents.filter(incident => 
      selectedIncidents.includes(generateIncidentKey(incident))
    );
    
    dispatch(getSolution(incidents, "Low"));
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
                {unresolvedIncidents.length}
              </Label>
            </FlexItem>
            <FlexItem>
              <Checkbox
                id="select-all"
                label="Select All"
                isChecked={selectedIncidents.length === unresolvedIncidents.length && unresolvedIncidents.length > 0}
                onChange={(_, checked) => handleSelectAll(checked)}
                isDisabled={isFetchingSolution || unresolvedIncidents.length === 0}
              />
            </FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <DataList aria-label="Migration issues list">
            {unresolvedIncidents.map((incident, index) => {
              const incidentKey = generateIncidentKey(incident);
              return (
                <DataListItem key={`${incidentKey}-${index}`} aria-labelledby={`incident-${index}`}>
                  <DataListItemRow>
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key="checkbox" width={1}>
                          <Checkbox
                            id={`incident-${incidentKey}`}
                            isChecked={selectedIncidents.includes(incidentKey)}
                            onChange={(_, checked) => 
                              handleIncidentSelection(incidentKey, checked)
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
              );
            })}
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

      {resolvedIncidents.length > 0 && (
        <Card style={{ marginTop: "20px" }}>
          <CardTitle>
            <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
              <FlexItem>
                Resolved Issues
                <Label color="green" style={{ marginLeft: "8px" }}>
                  {resolvedIncidents.length}
                </Label>
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            <DataList aria-label="Resolved issues list">
              {resolvedIncidents.map((incident, index) => {
                const incidentKey = generateIncidentKey(incident);
                return (
                  <DataListItem key={`${incidentKey}-resolved-${index}`} aria-labelledby={`resolved-incident-${index}`}>
                    <DataListItemRow>
                      <DataListItemCells
                        dataListCells={[
                          <DataListCell key="status" width={1}>
                            <CheckCircleIcon 
                              color="var(--pf-global--success-color--100)" 
                              style={{ fontSize: "18px" }}
                            />
                          </DataListCell>,
                          <DataListCell key="details" width={5}>
                            <div style={{ opacity: 0.8 }}>
                              <h4>
                                {incident.violation_name || incident.message}
                                <Label 
                                  color="green" 
                                  style={{ marginLeft: "8px", fontSize: "12px" }}
                                >
                                  Resolved
                                </Label>
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
                );
              })}
            </DataList>
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