import { Composition } from "remotion";
import factscardconfig from "../data/factscardsconfig.json";
import { FactsCardVideo } from "./components/FactsCardTemplate";
import bargraphconfig from "../data/bargraphconfig.json";
import { BarGraph } from "./components/BarGraphTemplate";
import { getAudioData } from "@remotion/media-utils";

import SpliScreenConfig from "../data/splitscreenconfig.json";
import { SplitScreen } from "./components/SplitScreen";
import { TypingVideo } from "./components/TexttypingTemplate/TypingVideo";
import typingdata from "../data/data.json";
import { QuoteComposition } from "./components/QuoteTemplate";
// import quoteData from "../data/quotedata.json";
// import SecondFlipCards from "./components/KpiFlipCardsTemplate";
import FlipCardData from "../data/flipcardsdata.json";
import KpiFlipCards from "./components/KpiFlipCardsTemplate";
import { KenBurnsCarousel } from "./components/KenBurnsSwipe";
import KenBurnsProps from "../data/kenburnsconfig.json";
import { ChatVideo3, ChatVideoProps } from "./components/FakeTextConversation";
import faketextvideoconfig from "../data/faketextconversationconfig.json";
// import { MyRedditVideo } from '../../../../frontend/src/components/remotion_compositions/RedditTemplate';
import redditProps from "../data/redditconfig.json";
import { MyRedditVideo } from "./components/RedditVideoTemplate";
import { StoryTellingVideo } from "./components/StoryTellingTemplate";
import storytellingprops from "../data/storytellingconfig.json";
import {
  SimpleGraphProps,
  SimpleTrendGraph,
} from "./components/CurveLineTrend/SimplifierComponent";
import curveLineTrendProps from "../data/curvelinetrendconfig.json";
import { NewTypingAnimation } from "./components/NewTextTyping/TypingAnimation";
import { calculateDuration, durationIndicatorQuote } from "./helpers";
import newtexttypingconfigs from "../data/newtexttypingconfig.json";
import KineticTypographyIntro, {
  TypographyConfig,
} from "./components/KineticText";
// import { duration } from '@mui/material';

type Derived = React.ComponentProps<typeof ChatVideo3>;

const defaultConfig: TypographyConfig = {
  id: "default-kinetic-v1",
  words: ["KINETIC", "TYPOGRAPHY"],
  colors: {
    primary: "#00f2ff",
    secondary: "#ff4fa3",
    accent: "#ffffff",
  },
  timing: {
    staggerDelay: 5,
    collisionFrame: 45,
    explosionDelay: 20,
  },
  effects: {
    shakeIntensity: 12,
    particleCount: 70,
    ballSize: 120,
  },
};

type RootProps = Derived & {
  chatPath?: string;
  bgVideo?: string;
  chatAudio?: string;
  musicAudio?: string;
  musicBase?: number;
  musicWhileTalking?: number;
  duckAttackMs?: number;
  duckReleaseMs?: number;
};

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const TAIL_PADDING_SEC = 1.0;

export const RemotionRoot: React.FC = () => {
  const fps = 30;
  const delayStart = 0.5;
  const delayStep = 1;
  const numCards = 4; // Default number of cards
  const flipAnimationTime = 2; // Time for flip animation to complete
  const freezeTime = 1; // Freeze at the end

  // Total duration = start delay + (cards * step delay) + flip animation + freeze
  const calculatedDuration = Math.ceil(
    (delayStart + (numCards - 1) * delayStep + flipAnimationTime + freezeTime) *
      30,
  );
  return (
    <>
      <Composition
        id="GlassFactsVideo"
        component={FactsCardVideo}
        durationInFrames={30 * factscardconfig.duration}
        fps={30}
        height={1920}
        width={1080}
        defaultProps={factscardconfig}
      />
      <Composition
        id="BarGraph"
        component={BarGraph}
        durationInFrames={bargraphconfig.duration * 30}
        fps={30}
        height={1920}
        width={1080}
        defaultProps={bargraphconfig}
      />
      <Composition
        id="SplitScreen"
        component={SplitScreen}
        durationInFrames={60 * SpliScreenConfig.duration} // 10s @ 30fps
        fps={60}
        width={1080}
        height={1920}
        defaultProps={SpliScreenConfig}
      />
      <Composition
        id="TypingVideo"
        component={TypingVideo}
        durationInFrames={fps * typingdata.duration}
        fps={fps}
        height={1920}
        width={1080}
        defaultProps={{
          content: typingdata.content,
          bgimage: typingdata.backgroundImage,
          duration: typingdata.duration,
          fps: fps,
          fontSize: typingdata.fontSize,
          fontColor: typingdata.fontColor,
          fontFamily: typingdata.fontFamily,
          sound: typingdata.sound,
        }}
      />
      {/* <Composition
        id="QuoteComposition"
        component={QuoteComposition}
        durationInFrames={1} // placeholder, gets overridden ✔️
        fps={30}
        height={1920}
        width={1080}
        defaultProps={{
          quote: "Sample",
          author: "sample",
          backgroundImage:
            "https://res.cloudinary.com/dnxc1lw18/image/upload/v1760979566/bg11_deliyh.jpg",
          fontFamily: "Arial, sans-serif",
          fontSize: 1,
          fontColor: "white",
        }}
        calculateMetadata={async ({ props }) => {
          const durationSeconds = durationIndicatorQuote(props.quote.length);
          return {
            props,
            durationInFrames: durationSeconds * 30,
          };
        }}
      /> */}

      <Composition
  id="QuoteComposition"
  component={QuoteComposition}
  durationInFrames={90}  // ← Fixed 3 seconds for testing
  fps={30}
  height={1920}
  width={1080}
  defaultProps={{
    quote: "Sample",
    author: "sample",
    backgroundImage:
      "https://res.cloudinary.com/dnxc1lw18/image/upload/v1760979566/bg11_deliyh.jpg",
    fontFamily: "Arial, sans-serif",
    fontSize: 1,
    fontColor: "white",
  }}
  // Remove calculateMetadata entirely for now
/>

      <Composition
        id="KpiFlipCard"
        component={KpiFlipCards}
        durationInFrames={calculatedDuration}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={FlipCardData}
        calculateMetadata={({ props }) => {
          const actualCards = props.cardsData?.length || numCards;
          const actualDelayStart = props.delayStart ?? delayStart;
          const actualDelayStep = props.delayStep ?? delayStep;

          const duration = Math.ceil(
            (actualDelayStart +
              (actualCards - 1) * actualDelayStep +
              flipAnimationTime +
              freezeTime +
              3) *
              30,
          );

          return {
            durationInFrames: duration,
          };
        }}
      />
      <Composition
        id="KenBurnsCarousel"
        component={KenBurnsCarousel}
        durationInFrames={KenBurnsProps.duration * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={KenBurnsProps}
      />
      <Composition
        id="ChatVideo"
        component={ChatVideo3}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={faketextvideoconfig as ChatVideoProps}
        calculateMetadata={async ({ props }) => {
          const p = {
            ...faketextvideoconfig,
            ...(props ?? {}),
          } as Required<RootProps>;
          const chatPath: string = p.chatPath;

          let lastTime = 0;

          // 1. Check chat JSON timestamps
          try {
            const res = await fetch(chatPath);
            const json = await res.json();

            if (Array.isArray((json as any)?.segments)) {
              const segments = (json as any).segments as Array<{
                start_time?: number;
                end_time?: number;
              }>;
              lastTime = segments.reduce((max, s) => {
                const start = Number(s.start_time) || 0;
                const end = Number(s.end_time) || 0;
                return Math.max(max, start, end);
              }, 0);
            } else if (Array.isArray(json)) {
              const arr = json as Array<{
                timestamp?: number;
                duration?: number;
              }>;
              lastTime = arr.reduce((max, m) => {
                const start = Number(m.timestamp) || 0;
                const dur = Number(m.duration);
                const end = start + (Number.isFinite(dur) ? dur : 1.2);
                return Math.max(max, start, end);
              }, 0);
            }
          } catch {
            lastTime = 0;
          }

          // 2. Check audio duration
          let audioDuration = 0;
          try {
            const audioData = await getAudioData(p.chatAudio);
            audioDuration = audioData.durationInSeconds;
          } catch {
            audioDuration = 0;
          }

          // 3. Pick the longer one
          const finalDuration =
            Math.max(lastTime, audioDuration) + TAIL_PADDING_SEC;
          const durationInFrames = Math.max(1, Math.ceil(finalDuration * FPS));

          return {
            durationInFrames: durationInFrames + 1,
            fps: FPS,
            width: WIDTH,
            height: HEIGHT,
          };
        }}
      />
      <Composition
        id="RedditNarration"
        component={MyRedditVideo}
        durationInFrames={Math.ceil(redditProps.duration * 30)}
        fps={30}
        height={1920}
        width={1080}
        defaultProps={{
          voiceoverPath: redditProps.voiceoverPath,
          duration: redditProps.duration,
          fontSize: redditProps.fontSize,
          fontFamily: redditProps.fontFamily,
          fontColor: redditProps.fontColor,
          sentenceBgColor: redditProps.sentenceBgColor,
          backgroundOverlayColor: "rgba(0,0,0,0.6)",
          backgroundVideo: redditProps.backgroundVideo,
          backgroundMusicPath: redditProps.backgroundMusicPath,
          musicVolume: 0.2,
        }}
      />
      <Composition
        id="StoryTellingVideo"
        component={StoryTellingVideo}
        durationInFrames={Math.ceil(storytellingprops.duration * 30)}
        fps={30}
        height={1920}
        width={1080}
        defaultProps={{
          voiceoverPath: storytellingprops.voiceoverPath,
          duration: storytellingprops.duration,
          fontSize: storytellingprops.fontSize,
          fontFamily: storytellingprops.fontFamily,
          fontColor: storytellingprops.fontColor,
          sentenceBgColor: storytellingprops.sentenceBgColor,
          backgroundOverlayColor: "rgba(0,0,0,0.6)",
          backgroundVideo: storytellingprops.backgroundVideo,
          backgroundMusicPath: storytellingprops.backgroundMusicPath,
          musicVolume: 0.2,
        }}
      />
      <Composition
        id="CurveLineTrend"
        component={SimpleTrendGraph}
        durationInFrames={30 * curveLineTrendProps.duration}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={curveLineTrendProps as SimpleGraphProps}
      />
      <Composition
        id="NewTexTyping"
        component={NewTypingAnimation}
        durationInFrames={calculateDuration(newtexttypingconfigs.phrase)}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{
          phraseData: newtexttypingconfigs.phrase,
          fontIndex: newtexttypingconfigs.fontIndex, // Poppins
          backgroundIndex: newtexttypingconfigs.backgroundIndex, // Ambient Flow
          audioIndex: newtexttypingconfigs.audioIndex, // Soft Keys
        }}
      />
      <Composition
        id="KineticText"
        component={KineticTypographyIntro}
        fps={30}
        defaultProps={{
          config: defaultConfig,
        }}
        width={1080}
        height={1920}
        durationInFrames={240}
      />
    </>
  );
};
