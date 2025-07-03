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
  Select,
  SelectOption,
  Divider,
  Title,
  Content,
} from "@patternfly/react-core";
import { useExtensionStateContext } from "../../context/ExtensionStateContext";

export const ProfileStep: React.FC = () => {
  const { state, dispatch } = useExtensionStateContext();
  const { profiles, activeProfileId } = state;
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const isProfileSelected = !!activeProfileId;
  const profilesLoaded = profiles.length > 0;

  const handleProfileSelect = (profileId: string) => {
    dispatch({ type: "SET_ACTIVE_PROFILE", payload: profileId });
    setIsSelectOpen(false);
  };

  const handleCreateNewProfile = () => {
    dispatch({ type: "OPEN_PROFILE_MANAGER", payload: {} });
  };

  const handleEditProfile = () => {
    if (activeProfileId) {
      dispatch({ type: "OPEN_PROFILE_MANAGER", payload: {} });
    }
  };

  const selectedProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <Title headingLevel="h1" size="2xl">
          Analysis Profile
        </Title>
        <Content>
          <p>
            Select or create an analysis profile that defines the rules and scope for your migration
            analysis. Profiles help tailor the analysis to your specific technology stack and
            migration goals.
          </p>
        </Content>
      </div>

      <div className="wizard-step-content">

      <Card style={{ marginTop: "20px" }}>
        <CardTitle>Select Analysis Profile</CardTitle>
        <CardBody>
          {!profilesLoaded ? (
            <Alert variant={AlertVariant.info} title="Loading profiles..." isInline />
          ) : (
            <>
              <Select
                toggle={(toggleRef) => (
                  <button
                    ref={toggleRef}
                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                    style={{
                      marginBottom: "16px",
                      width: "100%",
                      padding: "8px",
                      textAlign: "left",
                    }}
                  >
                    {activeProfileId
                      ? profiles.find((p) => p.id === activeProfileId)?.name
                      : "Select an analysis profile..."}
                  </button>
                )}
                onSelect={(_, profileId) => handleProfileSelect(profileId as string)}
                selected={activeProfileId}
                isOpen={isSelectOpen}
                onOpenChange={(isOpen) => setIsSelectOpen(isOpen)}
              >
                {profiles.map((profile) => (
                  <SelectOption key={profile.id} value={profile.id}>
                    {profile.name} {profile.readOnly && "(Built-in)"}
                  </SelectOption>
                ))}
              </Select>

              <Flex>
                <FlexItem>
                  <Button variant="secondary" onClick={handleCreateNewProfile}>
                    Create New Profile
                  </Button>
                </FlexItem>
                {activeProfileId && !selectedProfile?.readOnly && (
                  <FlexItem>
                    <Button variant="link" onClick={handleEditProfile}>
                      Edit Selected Profile
                    </Button>
                  </FlexItem>
                )}
              </Flex>
            </>
          )}
        </CardBody>
      </Card>

      {selectedProfile && (
        <Card style={{ marginTop: "20px" }}>
          <CardTitle>Profile Details</CardTitle>
          <CardBody>
            <Content>
              <h3>{selectedProfile.name}</h3>
              <p>
                <strong>Label Selector:</strong> {selectedProfile.labelSelector}
              </p>

              <Divider style={{ margin: "16px 0" }} />

              <h4>Rules Configuration</h4>
              <p>
                <strong>Use Default Rules:</strong> {selectedProfile.useDefaultRules ? "Yes" : "No"}
              </p>

              {selectedProfile.customRules.length > 0 && (
                <>
                  <p>
                    <strong>Custom Rules:</strong>
                  </p>
                  <ul>
                    {selectedProfile.customRules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                </>
              )}

              {selectedProfile.readOnly && (
                <Alert
                  variant={AlertVariant.info}
                  title="This is a built-in profile"
                  isInline
                  style={{ marginTop: "16px" }}
                >
                  Built-in profiles are pre-configured for common migration scenarios and cannot be
                  modified. You can create a custom profile based on this one if you need different
                  settings.
                </Alert>
              )}
            </Content>
          </CardBody>
        </Card>
      )}

        {isProfileSelected && (
          <Alert
            variant={AlertVariant.success}
            title="Profile selected"
            isInline
            style={{ marginTop: "20px" }}
          >
            Analysis profile is configured. Click &quot;Next&quot; to proceed to analysis execution.
          </Alert>
        )}
      </div>
    </div>
  );
};