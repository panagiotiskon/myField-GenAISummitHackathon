import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { deskRecording } from "../../config";
import { DeskHold } from "./DeskHold";
import { SceneFade } from "../components/SceneFade";

/** Plays the captured desk once `deskRecording` points at a file in public/. */
export function Desk() {
  if (!deskRecording) return <DeskHold />;
  return (
    <SceneFade fade={8}>
      <AbsoluteFill style={{ background: "#16261d" }}>
        <OffthreadVideo src={staticFile(deskRecording)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    </SceneFade>
  );
}
