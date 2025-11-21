import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda";
import type { Request, Response } from "express";

// Controller to start a Lambda render
export const startLambdaRender = async (req: Request, res: Response) => {
  const { inputProps, compositionId } = req.body;

  console.log("🚀 Starting Lambda render:", compositionId);

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: "us-east-1",
      functionName: process.env.REMOTION_LAMBDA_FUNCTION!,
      serveUrl: process.env.REMOTION_SITE_URL!,
      composition: compositionId,
      inputProps,
      codec: "h264",
      imageFormat: "jpeg",
      maxRetries: 1,
      privacy: "public",
      outName: `${compositionId}-${Date.now()}.mp4`,
    });

    console.log("✅ Render started:", renderId);

    // Return immediately - don't wait for render to complete
    res.json({
      success: true,
      renderId,
      bucketName,
      message: "Render started on Lambda",
      statusUrl: `/generatevideo/lambda-status/${renderId}?bucketName=${bucketName}`,
    });

  } catch (error: any) {
    console.error("❌ Lambda render start failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start render",
      message: error.message,
    });
  }
};

// Controller to check render status
export const getLambdaRenderStatus = async (req: Request, res: Response) => {
  const { renderId } = req.params;
  const { bucketName } = req.query;

  if (!bucketName || typeof bucketName !== 'string') {
    return res.status(400).json({
      success: false,
      error: "Missing bucketName parameter",
    });
  }

  try {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: process.env.REMOTION_LAMBDA_FUNCTION!,
      region: "us-east-1",
    });

    // Check if render is complete
    if (progress.done) {
      console.log("✅ Render complete:", renderId);
      
      res.json({
        success: true,
        done: true,
        url: progress.outputFile,
        sizeInBytes: progress.outputSizeInBytes,
        renderTime: progress.timeToFinish,
        costs: progress.costs,
      });
    } else if (progress.fatalErrorEncountered) {
      console.error("❌ Render failed:", progress.errors);
      
      res.json({
        success: false,
        done: true,
        error: "Render failed",
        errors: progress.errors,
      });
    } else {
      // Still rendering
      res.json({
        success: true,
        done: false,
        progress: progress.overallProgress,
        renderedFrames: progress.framesRendered,
        message: `Rendering... ${Math.round(progress.overallProgress * 100)}%`,
      });
    }

  } catch (error: any) {
    console.error("❌ Failed to get render status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get render status",
      message: error.message,
    });
  }
};