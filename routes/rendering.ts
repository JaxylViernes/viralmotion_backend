import { Router } from "express";
import * as QuoteController from "../controllers/rendering/QuoteTemplateCon.ts";
import * as TextTypingController from "../controllers/rendering/TextTypingCon.ts";
import * as FactCardController from "../controllers/rendering/FactsCardsCon.ts";
import * as BarGraphController from "../controllers/rendering/BarGraphCon.ts";
import * as SplitScreenController from "../controllers/rendering/SplitScreenCon.ts";
import * as KpiFlipCardController from "../controllers/rendering/KpiFlipCardCon.ts";
import * as KenBurnsController from "../controllers/rendering/KenBurnsCarouselCon.ts";
import * as FakeTextController from "../controllers/rendering/FakeTextConversationCon.ts";
import * as RedditController from "../controllers/rendering/RedditNarrationCon.ts";
import * as StoryTellingController from "../controllers/rendering/StoryTellingCon.ts";
import * as CurveLineTrendController from "../controllers/rendering/CurveLineTrendCon.ts";
import * as NewTexttypingController from "../controllers/rendering/NewTextTypingCon.ts";
import * as MainRenderingController from "../controllers/rendering/RenderingCon.ts";
import * as LambdaController from "../controllers/rendering/LambdaRenderingController.ts";

const router = Router();

router.post("/quotetemplate", QuoteController.videoGeneration);

router.post("/quotetemplatewchoices", QuoteController.handleExport);
router.post("/texttypingrender", TextTypingController.handlExport);
router.post("/newtexttypingrender", NewTexttypingController.handlExport);
router.post("/factstemplaterender", FactCardController.handleExport);

router.post("/bargraph", BarGraphController.handleExport);

router.post("/splitscreen", SplitScreenController.handleExport);

router.post("/kpiflipcard", KpiFlipCardController.handleExport);

router.post("/kenburnsswipe", KenBurnsController.handleExport);

router.post("/faketextconvo", FakeTextController.handleExport);

router.post("/redditvideo", RedditController.handleExport);

router.post("/storytelling", StoryTellingController.handleExport);

router.post("/curvelinetrend", CurveLineTrendController.handleExport);

router.post('/render-video', MainRenderingController.handleExport);

router.post('/lambda-render', LambdaController.startLambdaRender);
router.get('/lambda-status/:renderId', LambdaController.getLambdaRenderStatus);

router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

export default router;
