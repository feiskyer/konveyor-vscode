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
  Progress,
  ProgressStep,
  Icon,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
} from "@patternfly/react-icons";
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
        // Allow navigation when analysis is completed, regardless of incidents found
        return wizardState.stepData.analysis.analysisCompleted;
      case KonveyorWizardStep.Resolution:
        // Enable finish when: no issues found OR solutions have been applied
        const noIssuesFound = enhancedIncidents.length === 0;
        const solutionsApplied = wizardState.stepData.resolution.solutionApplied;
        return noIssuesFound || solutionsApplied;
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

  const getStepDisplayName = (step: KonveyorWizardStep) => {
    switch (step) {
      case KonveyorWizardStep.Setup:
        return "Setup";
      case KonveyorWizardStep.Profile:
        return "Profile";
      case KonveyorWizardStep.Analysis:
        return "Analysis";
      case KonveyorWizardStep.Resolution:
        return "Resolution";
      default:
        return step;
    }
  };

  const getStepStatus = (step: KonveyorWizardStep) => {
    const currentStepIndex = getStepNumber() - 1;
    const stepIndex = [
      KonveyorWizardStep.Setup,
      KonveyorWizardStep.Profile,
      KonveyorWizardStep.Analysis,
      KonveyorWizardStep.Resolution,
    ].indexOf(step);

    if (stepIndex < currentStepIndex) {
      return "completed";
    } else if (stepIndex === currentStepIndex) {
      return "current";
    } else {
      // Check if this is the Analysis step and analysis is completed
      // if (step === KonveyorWizardStep.Analysis && wizardState.stepData.analysis.analysisCompleted) {
      //   return "completed";
      // }
      return "pending";
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      KonveyorWizardStep.Setup,
      KonveyorWizardStep.Profile,
      KonveyorWizardStep.Analysis,
      KonveyorWizardStep.Resolution,
    ];

    return (
      <div className="wizard-step-indicator">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const isLast = index === steps.length - 1;

          return (
            <div key={step} className="wizard-step-indicator-item">
              <div className={`wizard-step-circle wizard-step-circle--${status}`}>
                {status === "completed" && (
                  <Icon size="sm">
                    <CheckCircleIcon />
                  </Icon>
                )}
                {status === "current" && (
                  <Icon size="sm">
                    <InProgressIcon />
                  </Icon>
                )}
                {status === "pending" && (
                  <span className="wizard-step-number">{index + 1}</span>
                )}
              </div>
              <div className="wizard-step-label">
                <span className={`wizard-step-title wizard-step-title--${status}`}>
                  {getStepDisplayName(step)}
                </span>
              </div>
              {!isLast && <div className={`wizard-step-connector wizard-step-connector--${status}`} />}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <div className="wizard-header-content">
          <Title headingLevel="h1" size="xl" className="wizard-title">
            Konveyor Migration Wizard
          </Title>
          {renderStepIndicator()}
        </div>
      </div>

      <div className="wizard-main">
        <Card className="wizard-card">
          <CardBody className="wizard-card-body">
            <div className="wizard-step-content">
              {renderCurrentStep()}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="wizard-footer">
        <Flex className="wizard-navigation" justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <Button
              variant="secondary"
              onClick={handleBack}
              isDisabled={!canNavigateBack()}
              className="wizard-nav-button"
            >
              Back
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              onClick={handleNext}
              isDisabled={!canNavigateForward()}
              className="wizard-nav-button"
            >
              {wizardState.currentStep === KonveyorWizardStep.Resolution ? "Finish" : "Next"}
            </Button>
          </FlexItem>
        </Flex>
      </div>
    </div>
  );
};