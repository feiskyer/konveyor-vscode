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
  Progress,
  Spinner,
  Title,
  Content,
  List,
  ListItem,
  ExpandableSection,
  CodeBlock,
  CodeBlockCode,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  ContainerNodeIcon,
  CubeIcon
} from "@patternfly/react-icons";
import { useExtensionStateContext } from "../../context/ExtensionStateContext";

interface ContainerizationStatus {
  isQuarkusProject: boolean;
  hasKubernetesExtension: boolean;
  dockerfileExists: boolean;
  k8sManifestsExist: boolean;
  projectDetected: boolean;
}

export const ContainerizationStep: React.FC = () => {
  const { state, dispatch } = useExtensionStateContext();
  const { wizardState } = state;

  const [status, setStatus] = useState<ContainerizationStatus>({
    isQuarkusProject: false,
    hasKubernetesExtension: false,
    dockerfileExists: false,
    k8sManifestsExist: false,
    projectDetected: false,
  });

  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false);

  useEffect(() => {
    // Detect project type and existing containerization assets
    detectProjectType();
  }, []);

  const detectProjectType = async () => {
    setIsScanning(true);

    // Simulate project detection logic
    // In real implementation, this would dispatch actions to scan the workspace
    setTimeout(() => {
      const detectedStatus: ContainerizationStatus = {
        isQuarkusProject: true, // Mock detection
        hasKubernetesExtension: true,
        dockerfileExists: false,
        k8sManifestsExist: false,
        projectDetected: true,
      };

      setStatus(detectedStatus);
      setIsScanning(false);

      // Update wizard state
      dispatch({
        type: "UPDATE_WIZARD_STATE",
        payload: {
          ...wizardState,
          stepData: {
            ...wizardState.stepData,
            containerization: {
              ...wizardState.stepData.containerization,
              isQuarkusProject: detectedStatus.isQuarkusProject,
              hasKubernetesExtension: detectedStatus.hasKubernetesExtension,
            }
          }
        }
      });
    }, 2000);
  };

  const handleGenerateAssets = async () => {
    // For container-kit path, use the existing simulation
    setIsGenerating(true);
    setGenerateProgress(0);

    // Simulate asset generation
    const progressInterval = setInterval(() => {
      setGenerateProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsGenerating(false);
          setGenerationComplete(true);

          // Update wizard state
          dispatch({
            type: "UPDATE_WIZARD_STATE",
            payload: {
              ...wizardState,
              stepData: {
                ...wizardState.stepData,
                containerization: {
                  ...wizardState.stepData.containerization,
                  dockerfileGenerated: true,
                  k8sConfigsGenerated: true,
                  deploymentReady: true,
                }
              }
            }
          });

          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleBuildQuarkus = () => {
    // Trigger the actual Maven build for Quarkus projects
    dispatch({
      type: "BUILD_QUARKUS_KUBERNETES",
      payload: {}
    });
  };

  const handleConfigureQuarkus = () => {
    // Open application.properties file for Quarkus configuration
    dispatch({
      type: "FIND_AND_OPEN_FILE",
      payload: "application.properties"
    });
  };

  const handleOpenQuarkusGuide = () => {
    // Open Quarkus Kubernetes deployment guide
    dispatch({
      type: "OPEN_URL",
      payload: "https://quarkus.io/guides/deploying-to-kubernetes"
    });
  };

  const renderQuarkusPath = () => (
    <Card style={{ marginTop: "20px" }}>
      <CardTitle>
        <Flex alignItems={{ default: "alignItemsCenter" }}>
          <FlexItem>
            <CubeIcon color="var(--pf-global--info-color--100)" />
          </FlexItem>
          <FlexItem>Quarkus + Kubernetes Extension Detected</FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Alert
          variant={AlertVariant.success}
          title="Optimized containerization path available"
          isInline
          style={{ marginBottom: "16px" }}
        >
          Your project uses Quarkus with the Kubernetes extension. This provides native
          containerization and deployment capabilities.
        </Alert>

        <Content>
          <p>
            <strong>Recommended approach:</strong>
          </p>
          <List>
            <ListItem>Configure Quarkus Kubernetes properties</ListItem>
            <ListItem>Use Maven/Gradle to build container images</ListItem>
          </List>
        </Content>

        <ExpandableSection toggleText="Quarkus Configuration Example">
          <Content style={{ marginTop: "16px" }}>
            <p>
              Add these properties to your <code>application.properties</code>:
            </p>
            <CodeBlock>
              <CodeBlockCode>
                {`# Setting target to kubernetes
quarkus.kubernetes.deployment-target=kubernetes

# Setting Image registry and tag
quarkus.container-image.registry=myregistry.azurecr.io
quarkus.container-image.group=my-group
quarkus.container-image.name=my-app
quarkus.container-image.tag=v0.1.0
quarkus.container-image.build=true
quarkus.container-image.push=true

# Setting Deployment and Service
quarkus.kubernetes.namespace=default
quarkus.kubernetes.deployment-kind=deployment
quarkus.kubernetes.service-type=load-balancer`}
              </CodeBlockCode>
            </CodeBlock>
          </Content>
        </ExpandableSection>

        <Flex style={{ marginTop: "16px" }}>
          <FlexItem>
            <Button variant="primary" onClick={handleConfigureQuarkus}>
              Configure Quarkus Settings
            </Button>
          </FlexItem>
          <FlexItem>
            <Button variant="secondary" onClick={handleOpenQuarkusGuide}>
              Open Quarkus Guide
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              onClick={handleBuildQuarkus}
              isDisabled={wizardState.stepData.containerization.deploymentReady}
            >
              {wizardState.stepData.containerization.deploymentReady
                ? "Build Complete"
                : "Build Kubernetes Manifests"}
            </Button>
          </FlexItem>
        </Flex>
      </CardBody>
    </Card>
  );

  const renderContainerKitPath = () => (
    <Card style={{ marginTop: "20px" }}>
      <CardTitle>
        <Flex alignItems={{ default: "alignItemsCenter" }}>
          <FlexItem>
            <ContainerNodeIcon color="var(--pf-global--info-color--100)" />
          </FlexItem>
          <FlexItem>
            Container-Kit Containerization
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Alert
          variant={AlertVariant.info}
          title="Generate containerization assets"
          isInline
          style={{ marginBottom: "16px" }}
        >
          Container-kit will generate optimized Dockerfile and Kubernetes manifests for your project.
        </Alert>

        <Content>
          <p><strong>This will generate:</strong></p>
          <List>
            <ListItem>Multi-stage Dockerfile optimized for your technology stack</ListItem>
            <ListItem>Kubernetes deployment manifest</ListItem>
            <ListItem>Kubernetes service configuration</ListItem>
            <ListItem>ConfigMap and Secret templates</ListItem>
            <ListItem>AKS-specific recommendations</ListItem>
          </List>
        </Content>

        {isGenerating && (
          <div style={{ marginTop: "16px" }}>
            <Alert
              variant={AlertVariant.info}
              title="Generating containerization assets..."
              isInline
              style={{ marginBottom: "16px" }}
            >
              <Flex alignItems={{ default: "alignItemsCenter" }}>
                <FlexItem>
                  <Spinner size="md" />
                </FlexItem>
                <FlexItem>
                  Container-kit is analyzing your project and generating assets...
                </FlexItem>
              </Flex>
            </Alert>

            <Progress
              value={generateProgress}
              title="Generation Progress"
              style={{ marginBottom: "16px" }}
            />
          </div>
        )}

        {generationComplete && (
          <Alert
            variant={AlertVariant.success}
            title="Containerization assets generated successfully"
            isInline
            style={{ marginTop: "16px" }}
          >
            <CheckCircleIcon color="var(--pf-global--success-color--100)" />
            {" "}Your Dockerfile and Kubernetes manifests are ready for deployment.
          </Alert>
        )}

        {!isGenerating && !generationComplete && (
          <Button
            variant="primary"
            onClick={handleGenerateAssets}
            style={{ marginTop: "16px" }}
          >
            Generate Container Assets
          </Button>
        )}
      </CardBody>
    </Card>
  );

  const renderProjectDetection = () => (
    <Card style={{ marginTop: "20px" }}>
      <CardTitle>Project Detection</CardTitle>
      <CardBody>
        {isScanning ? (
          <Alert
            variant={AlertVariant.info}
            title="Scanning project structure..."
            isInline
          >
            <Flex alignItems={{ default: "alignItemsCenter" }}>
              <FlexItem>
                <Spinner size="md" />
              </FlexItem>
              <FlexItem>
                Analyzing your project to determine the best containerization approach...
              </FlexItem>
            </Flex>
          </Alert>
        ) : (
          <Alert
            variant={status.projectDetected ? AlertVariant.success : AlertVariant.warning}
            title={status.projectDetected ? "Project analyzed successfully" : "Project detection incomplete"}
            isInline
          >
            {status.projectDetected ? (
              <>
                <InfoCircleIcon color="var(--pf-global--success-color--100)" />
                {" "}Project type: {status.isQuarkusProject ? "Java/Quarkus" : "General"}
              </>
            ) : (
              <>
                <ExclamationTriangleIcon color="var(--pf-global--warning-color--100)" />
                {" "}Unable to determine project type automatically.
              </>
            )}
          </Alert>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <Title headingLevel="h1" size="2xl">Containerization</Title>
        <Content>
          <p>
            Prepare your application for deployment to Azure Kubernetes Service (AKS)
            by generating container images and Kubernetes manifests tailored to your project.
          </p>
        </Content>
      </div>

      <div className="wizard-step-content">
        {renderProjectDetection()}

        {status.projectDetected && (
          <>
            {status.isQuarkusProject && status.hasKubernetesExtension
              ? renderQuarkusPath()
              : renderContainerKitPath()
            }
          </>
        )}

        {(generationComplete || wizardState.stepData.containerization.deploymentReady) && (
          <Alert
            variant={AlertVariant.success}
            title="Ready for deployment"
            isInline
            style={{ marginTop: "20px" }}
          >
            Your application is containerized and ready for AKS deployment.
            You can now proceed to set up CI/CD pipelines or deploy manually using the generated assets.
          </Alert>
        )}
      </div>
    </div>
  );
};