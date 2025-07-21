import React, { useState, useEffect } from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Alert,
  AlertVariant,
  Title,
  Content,
  Checkbox,
  Radio,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Button,
  ExpandableSection,
  CodeBlock,
  CodeBlockCode,
} from "@patternfly/react-core";
import { 
  UserIcon, 
  CogIcon, 
  DesktopIcon, 
  UsersIcon,
  RocketIcon,
  CloudIcon,
  CheckCircleIcon 
} from "@patternfly/react-icons";
import { useExtensionStateContext } from "../../context/ExtensionStateContext";

interface StakeholderRole {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  deploymentTasks: string[];
}

const STAKEHOLDER_ROLES: StakeholderRole[] = [
  {
    id: "developer",
    name: "Developer",
    description: "Handle application deployment and testing",
    icon: UserIcon,
    deploymentTasks: [
      "Deploy application to development environment",
      "Validate application functionality",
      "Monitor deployment logs and metrics",
      "Perform smoke testing"
    ]
  },
  {
    id: "devops-engineer",
    name: "DevOps Engineer", 
    description: "Manage infrastructure and CI/CD deployment",
    icon: CogIcon,
    deploymentTasks: [
      "Configure CI/CD pipelines for AKS deployment",
      "Set up monitoring and observability",
      "Manage secrets and configuration",
      "Handle infrastructure scaling and updates"
    ]
  },
  {
    id: "platform-engineer",
    name: "Platform Engineer",
    description: "Oversee platform architecture and operations",
    icon: DesktopIcon,
    deploymentTasks: [
      "Review platform compliance and security",
      "Configure service mesh and networking",
      "Manage resource quotas and policies",
      "Ensure platform best practices"
    ]
  },
  {
    id: "team-lead",
    name: "Team Lead",
    description: "Coordinate deployment strategy and approval",
    icon: UsersIcon,
    deploymentTasks: [
      "Approve deployment to production",
      "Coordinate cross-team dependencies",
      "Manage deployment rollback strategies",
      "Oversee deployment timeline and milestones"
    ]
  }
];

const DEPLOYMENT_TARGETS = [
  {
    id: "development",
    name: "Development Environment",
    description: "Deploy to development cluster for testing and validation"
  },
  {
    id: "staging", 
    name: "Staging Environment",
    description: "Deploy to staging for pre-production validation"
  },
  {
    id: "production",
    name: "Production Environment", 
    description: "Deploy to production AKS cluster"
  }
];

export const DeployStep: React.FC = () => {
  const { state, dispatch } = useExtensionStateContext();
  const { wizardState } = state;
  
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>(
    wizardState.stepData.deploy?.selectedStakeholders || []
  );
  const [deploymentTarget, setDeploymentTarget] = useState<string>(
    wizardState.stepData.deploy?.deploymentTarget || "development"
  );
  const [deploymentComplete, setDeploymentComplete] = useState<boolean>(
    wizardState.stepData.deploy?.deploymentComplete || false
  );

  useEffect(() => {
    // Update the wizard state when selections change
    dispatch({
      type: "UPDATE_WIZARD_STATE",
      payload: {
        ...wizardState,
        stepData: {
          ...wizardState.stepData,
          deploy: {
            selectedStakeholders,
            deploymentTarget,
            deploymentComplete
          }
        }
      }
    });
  }, [selectedStakeholders, deploymentTarget, deploymentComplete, dispatch, wizardState]);

  const handleStakeholderToggle = (stakeholderId: string, checked: boolean) => {
    if (checked) {
      setSelectedStakeholders([...selectedStakeholders, stakeholderId]);
    } else {
      setSelectedStakeholders(selectedStakeholders.filter(id => id !== stakeholderId));
    }
  };

  const handleDeploymentTargetChange = (value: string) => {
    setDeploymentTarget(value);
  };

  const handleDeploy = () => {
    // Simulate deployment process
    setDeploymentComplete(true);
    
    // In a real implementation, this would trigger the actual deployment
    dispatch({
      type: "DEPLOY_APPLICATION",
      payload: {
        target: deploymentTarget,
        stakeholders: selectedStakeholders
      }
    });
  };

  const isStepComplete = selectedStakeholders.length > 0 && deploymentTarget && deploymentComplete;

  const renderDeploymentCommands = () => {
    const containerizationData = wizardState.stepData.containerization;
    const isQuarkusProject = containerizationData?.isQuarkusProject;
    
    return (
      <ExpandableSection toggleText="Deployment Commands">
        <Content style={{ marginTop: "16px" }}>
          {isQuarkusProject ? (
            <>
              <p><strong>Quarkus Kubernetes Deployment:</strong></p>
              <CodeBlock>
                <CodeBlockCode>
{`# Build and deploy using Quarkus
mvn clean package -Dquarkus.kubernetes.deploy=true

# Or using Gradle
./gradlew build -Dquarkus.kubernetes.deploy=true

# Verify deployment
kubectl get pods -n default
kubectl get services -n default`}
                </CodeBlockCode>
              </CodeBlock>
            </>
          ) : (
            <>
              <p><strong>Container-kit Generated Deployment:</strong></p>
              <CodeBlock>
                <CodeBlockCode>
{`# Build Docker image
docker build -t myapp:latest .

# Tag for Azure Container Registry
docker tag myapp:latest myregistry.azurecr.io/myapp:latest

# Push to registry
docker push myregistry.azurecr.io/myapp:latest

# Deploy to AKS
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Verify deployment
kubectl get pods
kubectl get services`}
                </CodeBlockCode>
              </CodeBlock>
            </>
          )}
        </Content>
      </ExpandableSection>
    );
  };

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <Title headingLevel="h1" size="2xl">Deploy to AKS</Title>
        <Content>
          <p>
            Deploy your containerized application to Azure Kubernetes Service. 
            Select stakeholders responsible for different aspects of the deployment process.
          </p>
        </Content>
      </div>

      <div className="wizard-step-content">
        <Card style={{ marginTop: "20px" }}>
          <CardTitle>
            <Flex alignItems={{ default: "alignItemsCenter" }}>
              <FlexItem>
                <CloudIcon color="var(--pf-global--info-color--100)" />
              </FlexItem>
              <FlexItem>
                Deployment Target
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            <Content>
              <p>Choose the target environment for deployment:</p>
            </Content>
            
            {DEPLOYMENT_TARGETS.map((target) => (
              <div key={target.id} style={{ marginTop: "16px" }}>
                <Radio
                  id={`target-${target.id}`}
                  name="deployment-target"
                  label={target.name}
                  isChecked={deploymentTarget === target.id}
                  onChange={() => handleDeploymentTargetChange(target.id)}
                  description={target.description}
                />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card style={{ marginTop: "20px" }}>
          <CardTitle>
            <Flex alignItems={{ default: "alignItemsCenter" }}>
              <FlexItem>
                <UsersIcon color="var(--pf-global--info-color--100)" />
              </FlexItem>
              <FlexItem>
                Deployment Stakeholders
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            <Content>
              <p>Select team members responsible for deployment tasks:</p>
            </Content>
            
            <Grid hasGutter style={{ marginTop: "16px" }}>
              {STAKEHOLDER_ROLES.map((role) => {
                const IconComponent = role.icon;
                return (
                  <GridItem key={role.id} span={6}>
                    <Card 
                      isSelectable 
                      isSelected={selectedStakeholders.includes(role.id)}
                      style={{ height: "100%", cursor: "pointer" }}
                      onClick={() => handleStakeholderToggle(role.id, !selectedStakeholders.includes(role.id))}
                    >
                      <CardTitle>
                        <Flex alignItems={{ default: "alignItemsCenter" }}>
                          <FlexItem>
                            <Checkbox
                              id={`stakeholder-${role.id}`}
                              isChecked={selectedStakeholders.includes(role.id)}
                              onChange={(_event, checked) => handleStakeholderToggle(role.id, checked)}
                              aria-label={`Select ${role.name} for deployment`}
                            />
                          </FlexItem>
                          <FlexItem>
                            <IconComponent style={{ marginRight: "8px" }} />
                          </FlexItem>
                          <FlexItem>
                            <strong>{role.name}</strong>
                          </FlexItem>
                        </Flex>
                      </CardTitle>
                      <CardBody>
                        <Content>
                          <p style={{ fontSize: "14px", marginBottom: "12px" }}>
                            {role.description}
                          </p>
                          <div style={{ fontSize: "12px" }}>
                            <strong>Deployment tasks:</strong>
                            <ul style={{ marginTop: "4px", paddingLeft: "16px" }}>
                              {role.deploymentTasks.map((task, idx) => (
                                <li key={idx}>{task}</li>
                              ))}
                            </ul>
                          </div>
                        </Content>
                      </CardBody>
                    </Card>
                  </GridItem>
                );
              })}
            </Grid>
          </CardBody>
        </Card>

        <Card style={{ marginTop: "20px" }}>
          <CardTitle>
            <Flex alignItems={{ default: "alignItemsCenter" }}>
              <FlexItem>
                <RocketIcon color="var(--pf-global--info-color--100)" />
              </FlexItem>
              <FlexItem>
                Deploy Application
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            {!deploymentComplete ? (
              <>
                <Content style={{ marginBottom: "16px" }}>
                  <p>
                    Ready to deploy your application to the selected environment. 
                    The deployment will use the containerization assets generated in the previous step.
                  </p>
                </Content>

                {renderDeploymentCommands()}

                <Button
                  variant="primary"
                  onClick={handleDeploy}
                  isDisabled={selectedStakeholders.length === 0}
                  style={{ marginTop: "16px" }}
                >
                  Deploy to {DEPLOYMENT_TARGETS.find(t => t.id === deploymentTarget)?.name}
                </Button>
              </>
            ) : (
              <Alert
                variant={AlertVariant.success}
                title="Deployment completed successfully"
                isInline
              >
                <CheckCircleIcon color="var(--pf-global--success-color--100)" />
                {" "}Your application has been deployed to {DEPLOYMENT_TARGETS.find(t => t.id === deploymentTarget)?.name}.
                The selected stakeholders have been notified of their deployment responsibilities.
              </Alert>
            )}
          </CardBody>
        </Card>

        {isStepComplete ? (
          <Alert
            variant={AlertVariant.success}
            title="Migration wizard complete"
            isInline
            style={{ marginTop: "20px" }}
          >
            Congratulations! You have successfully completed the AKS migration process. 
            Your application is now containerized and deployed to Azure Kubernetes Service.
          </Alert>
        ) : (
          <Alert
            variant={AlertVariant.info}
            title="Select stakeholders and deploy to complete"
            isInline
            style={{ marginTop: "20px" }}
          >
            Choose deployment stakeholders and deploy your application to finish the migration wizard.
          </Alert>
        )}
      </div>
    </div>
  );
};