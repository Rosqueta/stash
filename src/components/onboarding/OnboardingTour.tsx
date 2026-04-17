import { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { OnboardingCard } from "./OnboardingCard";
import aboutLight from "../../assets/about.png";
import aboutDark from "../../assets/dark-about.png";

// Show M2 only after the user has written a meaningful amount of content
const CONTENT_THRESHOLD = 25;

interface OnboardingTourProps {
  content: string;
}

export function OnboardingTour({ content }: OnboardingTourProps) {
  const { hasSeenVariableHint, markHintSeen, resolved } = useTheme();

  const squirrelSrc = resolved === "dark" ? aboutDark : aboutLight;

  // Once triggered, stays visible regardless of content length changes
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (!hasTriggered && content.length >= CONTENT_THRESHOLD) {
      setHasTriggered(true);
    }
  }, [content, hasTriggered]);

  const showM2 = hasTriggered && !hasSeenVariableHint;

  if (!showM2) return null;

  return (
    <OnboardingCard
      style={{ bottom: 24, right: 24 }}
      squirrelSrc={squirrelSrc}
      title="Make your prompts dynamic"
      description={
        <>
          Select any text to turn it into a{" "}
          <span data-var="">variable</span>
          {". You'll fill it in right before copying. Double-click any variable to remove it."}
        </>
      }
      onDismiss={() => markHintSeen("variable")}
    />
  );
}
