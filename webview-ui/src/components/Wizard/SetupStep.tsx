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
  Title,
  Content,
} from "@patternfly/react-core";
import { CheckCircleIcon, ExclamationCircleIcon } from "@patternfly/react-icons";
import { useExtensionStateContext } from "../../context/ExtensionStateContext";
import { configureModelProviderSettings } from "../../hooks/actions";

export const SetupStep: React.FC = () => {
  const { state, dispatch } = useExtensionStateContext();
  const { configErrors, wizardState } = state;

  const providerKeyMissing = configErrors.some(
    (error) => error.type === "provider-key-missing",
  );
  const providerNotConfigured = configErrors.some(
    (error) => error.type === "provider-not-configured",
  );
  const isProviderConfigured = !providerKeyMissing && !providerNotConfigured;
  const isSetupComplete = wizardState.stepData.setup.providerConfigured;

  const handleConfigureProvider = () => {
    dispatch(configureModelProviderSettings());
  };

  const handleValidateProvider = () => {
    // Validation is handled automatically when the provider settings are configured
    // The state will update through the extension's state management
    dispatch(configureModelProviderSettings());
  };

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <Title headingLevel="h1" size="2xl">AI Provider Setup</Title>
        <Content>
          <p>
            Configure your AI provider to enable intelligent code analysis and solution generation.
            AKS Migrate uses AI to provide context-aware suggestions for modernizing your applications.
          </p>
        </Content>
      </div>

      <div className="wizard-step-content">
        <Card style={{ marginTop: "20px" }}>
          <CardTitle>
            <Flex alignItems={{ default: "alignItemsCenter" }}>
              <FlexItem>
                {isProviderConfigured ? (
                  <CheckCircleIcon color="var(--pf-global--success-color--100)" />
                ) : (
                  <ExclamationCircleIcon color="var(--pf-global--danger-color--100)" />
                )}
              </FlexItem>
              <FlexItem>
                AI Provider Configuration
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            {isProviderConfigured ? (
              <Alert
                variant={AlertVariant.success}
                title="AI provider is configured and ready!"
                isInline
              >
                Your AI provider settings are properly configured. You can proceed to the next step.
              </Alert>
            ) : (
              <>
                <Alert
                  variant={AlertVariant.warning}
                  title="AI provider configuration required"
                  isInline
                  style={{ marginBottom: "16px" }}
                >
                  {providerKeyMissing
                    ? "AI provider API key is missing or invalid."
                    : "AI provider is not configured yet."
                  }
                </Alert>

                <Content>
                  <p>AKS Migrate supports multiple AI providers including:</p>
                  <ul>
                    <li>OpenAI (ChatGPT)</li>
                    <li>Azure OpenAI</li>
                    <li>AWS Bedrock</li>
                    <li>Google Gemini</li>
                    <li>Local models via Ollama</li>
                  </ul>
                </Content>

                <Flex style={{ marginTop: "16px" }}>
                  <FlexItem>
                    <Button variant="primary" onClick={handleConfigureProvider}>
                      Configure AI Provider
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button variant="secondary" onClick={handleValidateProvider}>
                      Validate Configuration
                    </Button>
                  </FlexItem>
                </Flex>
              </>
            )}
          </CardBody>
        </Card>

        {isProviderConfigured && (
          <Alert
            variant={AlertVariant.info}
            title="Ready to proceed"
            isInline
            style={{ marginTop: "20px" }}
          >
            Your AI provider is configured. Click &quot;Next&quot; to proceed to profile configuration.
          </Alert>
        )}
      </div>
    </div>
  );
};