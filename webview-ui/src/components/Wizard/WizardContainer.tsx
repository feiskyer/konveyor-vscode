import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Button,
  Flex,
  FlexItem,
  Title,
} from "@patternfly/react-core";
import { WizardStep as KonveyorWizardStep } from "@editor-extensions/shared";
import { useExtensionStateContext } from "../../context/ExtensionStateContext";
import { SetupStep } from "./SetupStep";
import { ProfileStep } from "./ProfileStep";
import { AnalysisStep } from "./AnalysisStep";
import { ResolutionStep } from "./ResolutionStep";
import "./wizard.css";

export const WizardContainer: React.FC = () => {
  const { state, dispatch } = useExtensionStateContext();
  const { wizardState, analysisConfig, activeProfileId, enhancedIncidents } = state;

  const handleNext = () => {
    dispatch({ type: "WIZARD_NEXT_STEP", payload: {} });
  };

  const handleBack = () => {
    dispatch({ type: "WIZARD_PREVIOUS_STEP", payload: {} });
  };

  // Determine if we can navigate forward based on current step completion
  const canNavigateForward = () => {
    switch (wizardState.currentStep) {
      case KonveyorWizardStep.Setup:
        return analysisConfig.providerConfigured && !analysisConfig.providerKeyMissing;
      case KonveyorWizardStep.Profile:
        return activeProfileId !== "";
      case KonveyorWizardStep.Analysis:
        return enhancedIncidents.length > 0;
      case KonveyorWizardStep.Resolution:
        return false; // Last step, no next
      default:
        return false;
    }
  };

  const canNavigateBack = () => {
    return wizardState.currentStep !== KonveyorWizardStep.Setup;
  };

  const renderCurrentStep = () => {
    switch (wizardState.currentStep) {
      case KonveyorWizardStep.Setup:
        return <SetupStep />;
      case KonveyorWizardStep.Profile:
        return <ProfileStep />;
      case KonveyorWizardStep.Analysis:
        return <AnalysisStep />;
      case KonveyorWizardStep.Resolution:
        return <ResolutionStep />;
      default:
        return <SetupStep />;
    }
  };

  const getStepNumber = () => {
    const steps = [
      KonveyorWizardStep.Setup,
      KonveyorWizardStep.Profile,
      KonveyorWizardStep.Analysis,
      KonveyorWizardStep.Resolution,
    ];
    return steps.indexOf(wizardState.currentStep) + 1;
  };

  return (
    <div className="wizard-container">
      <Card className="wizard-card">
        <CardHeader>
          <CardTitle>
            <Title headingLevel="h1" size="2xl">
              Konveyor Migration Wizard
            </Title>
            <p style={{ marginTop: "8px", color: "var(--pf-global--Color--200)" }}>
              Step {getStepNumber()} of 4: {wizardState.currentStep}
            </p>
          </CardTitle>
        </CardHeader>
        <CardBody className="wizard-card-body">
          <div className="wizard-step-body">
            {renderCurrentStep()}
          </div>

          <Flex className="wizard-navigation" style={{ justifyContent: "space-between" }}>
            <FlexItem>
              <Button variant="secondary" onClick={handleBack} isDisabled={!canNavigateBack()}>
                Back
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant="primary" onClick={handleNext} isDisabled={!canNavigateForward()}>
                Next
              </Button>
            </FlexItem>
          </Flex>
        </CardBody>
      </Card>
    </div>
  );
};